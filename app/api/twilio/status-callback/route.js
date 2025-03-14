import { NextResponse } from "next/server";
import { db } from "../../../../lib/firebaseConfig";
import { collection, addDoc } from "firebase/firestore";
import { parse } from "querystring"; // Parse Twilio webhook data

export async function POST(req) {
    try {
        const body = await req.text();
        const data = parse(body);
        const { From, CallStatus, CallSid, To } = data; // 🔹 "To" is the Twilio number receiving the call

        console.log("📞 Call Status Update Received:", data);

        // ✅ Log the final status of the call
        if (["completed", "no-answer", "busy", "failed"].includes(CallStatus)) {
            console.log("📌 Logging final call status to Firestore...");

            await addDoc(collection(db, "missed_calls"), {
                patient_number: From,   // Caller (Patient's Phone)
                call_status: "missed", // Call status
                call_sid: CallSid,      // Unique Twilio Call ID
                twilio_phone_number: To, // 🔹 Store the Twilio number used
                follow_up_status: "Pending", // ✅ Now tracking follow-up status
                follow_up_type: "Not Assigned", // ✅ Default value
                timestamp: new Date(),
            });

            return NextResponse.json({ success: true, message: "Call status logged!" });
        }

        return NextResponse.json({ message: "Call update received." });
    } catch (error) {
        console.error("❌ Error processing call status update:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}