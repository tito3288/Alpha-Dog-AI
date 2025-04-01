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
import { parse } from "querystring";

async function getMissedCallDocument(call_sid, retries = 3, delay = 1000) {
  console.log(
    `⏳ Waiting before fetching missed call document (${call_sid})...`
  );
  await new Promise((resolve) => setTimeout(resolve, 1000)); // 1-second buffer

  for (let i = 0; i < retries; i++) {
    const missedCallQuery = query(
      collection(db, "missed_calls"),
      where("call_sid", "==", call_sid)
    );
    const missedCallSnap = await getDocs(missedCallQuery);

    if (!missedCallSnap.empty) {
      console.log(`✅ Missed call document found on attempt ${i + 1}`);
      return missedCallSnap.docs[0]; // Return the first matched document
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
const twilio_phone_number = process.env.TWILIO_PHONE_NUMBER;

// OpenAI Credentials
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Initialize Twilio
const client = twilio(accountSid, authToken);

// Define baseUrl to ensure the protocol is included.
const envUrl = process.env.VERCEL_URL;
const baseUrl =
  envUrl && envUrl.startsWith("http")
    ? envUrl
    : envUrl
      ? `https://${envUrl}`
      : "http://localhost:3000";

export async function POST(req) {
  try {
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
    let followUpDelayInSeconds = 0;

    if (!querySnapshot.empty) {
      const dentistData = querySnapshot.docs[0].data();
      bookingUrl = dentistData.booking_url || "";
      // If follow_up_delay = 0.5, that means 30 seconds
      followUpDelayInSeconds = (dentistData.follow_up_delay || 0) * 60;
    } else {
      console.warn(`⚠️ No dentist data found for clinic: ${clinic_name}`);
    }

    // 🔹 Step 2: Generate AI Response using OpenAI
    let aiMessage = "";
    try {
      const aiResponse = await openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: `You are a friendly receptionist for ${clinic_name}. 
            - Write a short and polite SMS to follow up on a missed call. 
            - Use only the clinic's name and do not include placeholders like '[Your Name]'. 
            - Ensure the message is natural, professional, and complete.
            - Encourage the patient to call back to book an appointment.
            - Avoid overly apologetic language such as "sorry for the inconvenience" or "we apologize for..." — keep the tone confident and helpful.`,
          },
          {
            role: "user",
            content: `A patient called but the call was missed. Generate a complete follow-up SMS for them. 
            - Do not include phrases like "we're sorry" or "we apologize."
            - The message should be polite, professional, and informative.
            - The clinic name is ${clinic_name}. 
            - Encourage the patient to call back and schedule an appointment.`,
          },
        ],
        max_tokens: 100,
      });
      aiMessage = aiResponse.choices[0].message.content.trim();
    } catch (error) {
      console.error("❌ OpenAI error:", error);
      throw error;
    }

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
    ); // e.g., 0.5 => 30 seconds

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

    // 🔹 Step 6: Update Firestore to Mark Follow-Up as Completed & store the AI message
    const missedCallSnap = await getMissedCallDocument(call_sid);
    if (!missedCallSnap || !missedCallSnap.exists()) {
      console.error(
        `❌ Error: Missed call document (${call_sid}) not found in Firestore after retries.`
      );
      // ...
      // [Fallback logic remains the same]
    } else {
      const docId = missedCallSnap.id;
      await updateDoc(doc(db, "missed_calls", docId), {
        follow_up_status: "Completed",
        ai_message: aiMessage,
        ai_message_timestamp: new Date(),
        ai_message_status: "sent",
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
