import { NextResponse } from "next/server";
import { db } from "../../../../lib/firebaseConfig";
import { collection, addDoc } from "firebase/firestore";
import twilio from "twilio";
import { parse } from "querystring"; // Parse Twilio webhook data

// Twilio Credentials
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;

// Initialize Twilio
const client = twilio(accountSid, authToken);

export async function POST(req) {
  try {
    const body = await req.text(); 
    const data = parse(body); 
    const { From, CallStatus } = data; 

    console.log("Received Call Data:", data);

    // ✅ Check if call was missed
    if (CallStatus === "no-answer" || CallStatus === "completed") {
      console.log("Missed Call Detected. Logging to Firestore...");

      await addDoc(collection(db, "missed_calls"), {
        patient_number: From,
        timestamp: new Date(),
      });

      return NextResponse.json({ success: true, message: "Missed call logged!" });
    }

    // ✅ Return a TwiML Response for voicemail
    const twiml = new twilio.twiml.VoiceResponse();

    // This here is very important to simulate ringing ⬇️
    twiml.pause({ length: 20 }); // Simulate ringing before voicemail

    twiml.say("Thank you for calling. Please leave a message after the beep.");
    twiml.record({
      maxLength: 30,
      action: "https://YOUR-NGROK-URL/api/twilio/handle-recording" // Handle recorded messages
    });

    return new Response(twiml.toString(), { headers: { "Content-Type": "text/xml" } });

  } catch (error) {
    console.error("Error processing call:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}