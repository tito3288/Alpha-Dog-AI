import { NextResponse } from "next/server";
import { db } from "../../../../lib/firebaseConfig";
import {
  collection,
  doc,
  getDoc,
  updateDoc,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import twilio from "twilio";
import OpenAI from "openai";

async function getMissedCallDocument(call_sid, retries = 5, delay = 2000) {
  console.log(
    `⏳ Initial wait before fetching missed call document (${call_sid})...`
  );
  await new Promise((resolve) => setTimeout(resolve, 3000)); // 3-second buffer before retries start

  const missedCallRef = doc(db, "missed_calls", call_sid);
  for (let i = 0; i < retries; i++) {
    const missedCallSnap = await getDoc(missedCallRef);
    if (missedCallSnap.exists()) {
      return missedCallSnap;
    }
    console.warn(
      `🔄 Retrying to fetch missed call document (${call_sid}), Attempt ${i + 1}`
    );
    await new Promise((resolve) => setTimeout(resolve, delay));
  }
  return null;
}

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
      return NextResponse.json(
        { error: "Empty request body" },
        { status: 400 }
      );
    }

    const data = JSON.parse(textBody);
    const { patient_number, twilio_phone_number, call_sid, clinic_name } = data;

    if (!patient_number || !twilio_phone_number || !call_sid || !clinic_name) {
      return NextResponse.json(
        { error: "Missing required data" },
        { status: 400 }
      );
    }

    console.log(
      `📌 Fetching booking URL and follow-up delay for: ${clinic_name}`
    );

    // 🔹 Step 1: Retrieve Dentist Data from Firestore
    const q = query(
      collection(db, "dentists"),
      where("twilio_phone_number", "==", twilio_phone_number)
    );
    const querySnapshot = await getDocs(q);

    let bookingUrl = "";
    let followUpDelayInSeconds = 30; // Default delay of 30 seconds

    if (!querySnapshot.empty) {
      const dentistData = querySnapshot.docs[0].data();
      bookingUrl = dentistData.booking_url || "";
      followUpDelayInSeconds = (dentistData.follow_up_delay || 0) * 60; // Convert minutes to seconds
    } else {
      console.warn(`⚠️ No dentist data found for clinic: ${clinic_name}`);
    }

    // 🔹 Step 2: Generate AI Response using OpenAI
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

    let aiMessage = aiResponse.choices[0].message.content.trim();

    // 🔹 Step 3: Append Booking URL only once at the end of the message
    if (bookingUrl) {
      aiMessage += `\n\nBook online: ${bookingUrl}`;
    }

    console.log(`🤖 AI Message Generated: ${aiMessage}`);

    // 🔹 Step 4: Introduce Dentist-Specific Follow-Up Delay
    console.log(
      `⏳ Waiting ${followUpDelayInSeconds} seconds before sending follow-up SMS...`
    );
    await new Promise((resolve) =>
      setTimeout(resolve, followUpDelayInSeconds * 1000)
    ); // Convert to milliseconds

    console.log(
      `📩 Attempting to trigger AI Follow-up SMS for CallSid: ${call_sid}`
    );

    // 🔹 Step 5: Send SMS via Twilio
    await client.messages.create({
      body: aiMessage,
      from: twilio_phone_number,
      to: patient_number,
    });

    console.log(`📨 SMS Sent to ${patient_number}`);

    // 🔹 Step 6: Update Firestore to Mark Follow-Up as Completed
    const missedCallSnap = await getMissedCallDocument(call_sid);

    if (!missedCallSnap || !missedCallSnap.exists()) {
      console.error(
        `❌ Error: Missed call document (${call_sid}) not found in Firestore after retries.`
      );
    } else {
      await updateDoc(doc(db, "missed_calls", call_sid), {
        follow_up_status: "Completed"
      });
      console.log(`✅ Firestore Updated for ${call_sid}`);
    }

    return NextResponse.json({
      success: true,
      message: "Follow-up SMS sent & Firestore updated!",
    });
  } catch (error) {
    console.error("❌ Error processing AI follow-up:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
