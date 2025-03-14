import { NextResponse } from "next/server";
import { db } from "../../../../lib/firebaseConfig";
import { collection, getDocs } from "firebase/firestore";
import twilio from "twilio";
import { parse } from "querystring"; // Parse Twilio webhook data

// Twilio Credentials
// Load environment variables
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;

// Initialize Twilio
const client = twilio(accountSid, authToken);

export async function POST(req) {
    try {
        const body = await req.text();
        const data = parse(body);
        const { From, To } = data; // "To" is the Twilio number

        console.log("Incoming Call Data:", data);

        // ✅ Step 1: Fetch the Dentist's Phone Number from Firestore
        const dentistsCollection = collection(db, "dentists");
        const snapshot = await getDocs(dentistsCollection);
        const dentists = snapshot.docs.map(doc => doc.data());

        // Find the dentist associated with this Twilio number
        const dentist = dentists.find(d => d.twilio_number === To);

        if (!dentist) {
            console.error("❌ Dentist not found for this number.");
            return NextResponse.json({ error: "Dentist not found" }, { status: 404 });
        }

        console.log(`📞 Forwarding call to: ${dentist.phone_number}`);

        // ✅ Step 2: Generate TwiML to Forward Call
        const twiml = new twilio.twiml.VoiceResponse();
        twiml.dial(dentist.phone_number); // Forward call to the dentist's real number

        return new Response(twiml.toString(), { headers: { "Content-Type": "text/xml" } });

    } catch (error) {
        console.error("❌ Error processing call:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}