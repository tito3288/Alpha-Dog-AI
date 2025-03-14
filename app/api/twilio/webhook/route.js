import { NextResponse } from "next/server";
import { db } from "../../../../lib/firebaseConfig";
import { collection, addDoc } from "firebase/firestore";
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

        // ✅ Identify missed calls (no answer or voicemail)
        if (CallStatus === "no-answer" || CallStatus === "busy" || CallStatus === "failed") {
            console.log("Missed Call Detected. Logging to Firestore...");

            await addDoc(collection(db, "missed_calls"), {
                call_sid: CallSid,
                patient_number: From,
                call_status: "missed", // Explicitly marked as "missed"
                dentist_phone_number: To,
                follow_up_status: "Pending", // New field to track follow-up progress

                timestamp: new Date(),
            });
        }

        // ✅ Return a TwiML Response for voicemail
        const twiml = new twilio.twiml.VoiceResponse();

        // Simulate ringing before voicemail
        twiml.pause({ length: 20 });

        twiml.say("Thank you for calling. Please leave a message after the beep.");
        twiml.record({
            maxLength: 30,
            action: "https://YOUR-NGROK-URL/api/twilio/handle-recording",
        });

        return new Response(twiml.toString(), { headers: { "Content-Type": "text/xml" } });

    } catch (error) {
        console.error("Error processing call:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}