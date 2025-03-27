import { NextResponse } from "next/server";
import { db } from "../../../../lib/firebaseConfig";
import { collection, addDoc, getDocs, query, where } from "firebase/firestore";
import twilio from "twilio";
import { parse } from "querystring"; // Parse Twilio webhook data

// Twilio Credentials
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;

// Initialize Twilio
const client = twilio(accountSid, authToken);

export async function POST(req) {
  try {
    const body = await req.text();
    const data = parse(body);
    const { From, To, CallStatus, CallSid } = data;

    console.log("Received Call Data:", data);
    console.log(`🟡 CallStatus Received: ${CallStatus}`);

    // 🔹 Step 1: Retrieve the clinic_name dynamically from Firestore
    let clinicName = "Unknown Clinic"; // Default fallback

    const dentistsRef = collection(db, "dentists");
    const q = query(dentistsRef, where("twilio_phone_number", "==", To));
    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
      clinicName = querySnapshot.docs[0].data().clinic_name;
    } else {
      console.warn(`⚠️ No clinic found for Twilio number: ${To}`);
    }

    console.log(`🔹 Associated Clinic: ${clinicName}`);

    // ✅ Identify missed calls (no answer or voicemail)
    if (
      ["no-answer", "busy", "failed", "completed"].includes(
        CallStatus.toLowerCase()
      )
    ) {
      console.log(
        `🟢 This call qualifies as a missed call: ${CallSid}, Status: ${CallStatus}`
      );
      console.log("Missed Call Detected. Logging to Firestore...");
      console.log(
        `🟢 Logging missed call for CallSid: ${CallSid}, Status: ${CallStatus}`
      );

      await setDoc(doc(db, "missed_calls", CallSid), {
        call_sid: CallSid,
        patient_number: From,
        call_status: "missed",
        dentist_phone_number: To,
        clinic_name: clinicName,
        follow_up_status: "Pending",
        timestamp: new Date(),
      });
      console.log(
        `✅ Missed call saved to Firestore with call_sid: ${CallSid}`
      );

      // Small delay before calling follow-up
      await new Promise((resolve) => setTimeout(resolve, 3000));

      // ✅ Call AI SMS API after logging the missed call
      console.log(
        `📩 Attempting to trigger AI Follow-up SMS for ${clinicName}, CallStatus: ${CallStatus}`
      );

      const response = await fetch(
        "https://39f7-69-174-154-43.ngrok-free.app/api/twilio/send-followup",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            patient_number: From,
            twilio_phone_number: To,
            call_sid: CallSid,
            clinic_name: clinicName,
          }),
        }
      );

      console.log(
        `🔄 Fetch request sent to send-followup. Waiting for response...`
      );

      if (!response.ok) {
        console.error(
          `❌ Error triggering send-followup: ${response.status} ${response.statusText}`
        );
        return NextResponse.json(
          { error: "Failed to trigger follow-up" },
          { status: 500 }
        );
      }

      const responseData = await response.json();
      console.log("📩 Follow-up API Response:", responseData);
    }

    // ✅ Return a TwiML Response for voicemail (AFTER logging & follow-up trigger)
    const twiml = new twilio.twiml.VoiceResponse();
    twiml.pause({ length: 20 });
    twiml.say(
      "Thank you for calling. We missed your call, but we’ll follow up with a text message shortly to assist you. If you prefer not to receive messages, reply STOP to opt out. Please leave a message after the beep."
    );

    twiml.record({
      maxLength: 30,
      action:
        "https://39f7-69-174-154-43.ngrok-free.app/api/twilio/handle-recording",
    });

    return new Response(twiml.toString(), {
      headers: { "Content-Type": "text/xml" },
    });
  } catch (error) {
    console.error("Error processing call:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
