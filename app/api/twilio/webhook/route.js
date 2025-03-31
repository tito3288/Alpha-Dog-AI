import { NextResponse } from "next/server";
import { db } from "../../../../lib/firebaseConfig";
import {
  collection,
  doc,
  setDoc,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import twilio from "twilio";
import { parse } from "querystring"; // Parse Twilio webhook data

// Twilio Credentials
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;

const client = twilio(accountSid, authToken);

// 🔹 Use dynamic base URL from environment
const baseUrl = process.env.VERCEL_URL || "http://localhost:3000";

export async function POST(req) {
  try {
    const body = await req.text();
    const data = parse(body);
    const { From, To, CallStatus, CallSid } = data;

    console.log("Received Call Data:", data);
    console.log(`🟡 CallStatus Received: ${CallStatus}`);

    let clinicName = "Unknown Clinic";
    const dentistsRef = collection(db, "dentists");
    const q = query(dentistsRef, where("twilio_phone_number", "==", To));
    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
      clinicName = querySnapshot.docs[0].data().clinic_name;
    } else {
      console.warn(`⚠️ No clinic found for Twilio number: ${To}`);
    }

    console.log(`🔹 Associated Clinic: ${clinicName}`);

    if (
      ["no-answer", "busy", "failed", "completed"].includes(
        CallStatus.toLowerCase()
      )
    ) {
      console.log(`🟢 Missed call: ${CallSid}, Status: ${CallStatus}`);

      await setDoc(doc(db, "missed_calls", CallSid), {
        call_sid: CallSid,
        patient_number: From,
        call_status: "missed",
        dentist_phone_number: To,
        clinic_name: clinicName,
        follow_up_status: "Pending",
        timestamp: new Date(),
      });

      console.log(`✅ Missed call saved to Firestore: ${CallSid}`);

      await new Promise((resolve) => setTimeout(resolve, 3000));

      console.log(`📩 Sending follow-up to: ${From}`);

      const response = await fetch(`${baseUrl}/api/twilio/send-followup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patient_number: From,
          twilio_phone_number: To,
          call_sid: CallSid,
          clinic_name: clinicName,
        }),
      });

      if (!response.ok) {
        console.error(
          `❌ Failed to send follow-up: ${response.status} ${response.statusText}`
        );
        return NextResponse.json(
          { error: "Follow-up request failed" },
          { status: 500 }
        );
      }

      const responseData = await response.json();
      console.log("✅ Follow-up response:", responseData);
    }

    const twiml = new twilio.twiml.VoiceResponse();
    twiml.pause({ length: 20 });
    twiml.say(
      "Thank you for calling. We missed your call, but we’ll follow up with a text message shortly to assist you. If you prefer not to receive messages, reply STOP to opt out. Please leave a message after the beep."
    );
    twiml.record({
      maxLength: 30,
      action: `${baseUrl}/api/twilio/handle-recording`,
    });

    return new Response(twiml.toString(), {
      headers: { "Content-Type": "text/xml" },
    });
  } catch (error) {
    console.error("❌ Error in webhook:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
