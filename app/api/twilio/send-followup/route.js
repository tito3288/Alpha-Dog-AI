import { NextResponse } from "next/server";
import { db } from "../../../../lib/firebaseConfig";
import { collection, doc, updateDoc, getDoc } from "firebase/firestore";
import twilio from "twilio";
import OpenAI from "openai";

// Twilio Credentials
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;

// OpenAI Credentials
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Initialize Twilio
const client = twilio(accountSid, authToken);

export async function POST(req) {
  try {
    // Ensure the request has a valid JSON body
    const textBody = await req.text();
    if (!textBody) {
      return NextResponse.json({ error: "Empty request body" }, { status: 400 });
    }

    const data = JSON.parse(textBody);
    const { patient_number, twilio_phone_number, call_sid, clinic_name } = data;

    if (!patient_number || !twilio_phone_number || !call_sid || !clinic_name) {
      return NextResponse.json({ error: "Missing required data" }, { status: 400 });
    }

    console.log(`📌 Generating AI Message for: ${patient_number}`);

    // 🔹 Step 1: Generate AI Response using OpenAI
    const aiResponse = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: `You are a friendly receptionist for ${clinic_name}. 
          - Write a short and polite SMS to follow up on a missed call. 
          - Use only the clinic's name and do not include placeholders like '[Your Name]'. 
          - Ensure the message is natural, professional, and complete.
          - Encourage the patient to call back to book an appointment.`,
        },
        {
          role: "user",
          content: `A patient called but the call was missed. Generate a complete follow-up SMS for them. 
          - Make sure it does not contain placeholders like '[Your Name]' or any other non-dynamic text. 
          - The clinic name is ${clinic_name}. 
          - The message should be polite and informative.
          - Encourage the patient to call back and schedule an appointment.`,
        },
      ],
      max_tokens: 100,
    });

    const aiMessage = aiResponse.choices[0].message.content.trim();
    console.log(`🤖 AI Message Generated: ${aiMessage}`);

    // 🔹 Step 2: Send SMS via Twilio
    await client.messages.create({
      body: aiMessage,
      from: twilio_phone_number,
      to: patient_number,
    });

    console.log(`📨 SMS Sent to ${patient_number}`);

    // 🔹 Step 3: Update Firestore to Mark Follow-Up as Completed
    const missedCallRef = doc(db, "missed_calls", call_sid);
    const missedCallSnap = await getDoc(missedCallRef);
    
    if (!missedCallSnap.exists()) {
      console.error(`❌ Error: Missed call document (${call_sid}) not found in Firestore.`);
    } else {
      await updateDoc(missedCallRef, {
        follow_up_type: "SMS",
        follow_up_status: "Completed",
      });
      console.log(`✅ Firestore Updated for ${call_sid}`);
    }

    return NextResponse.json({ success: true, message: "Follow-up SMS sent & Firestore updated!" });

  } catch (error) {
    console.error("❌ Error processing AI follow-up:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}