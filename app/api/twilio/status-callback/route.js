import { NextResponse } from "next/server";
import { db } from "../../../../lib/firebaseConfig";
import { collection, addDoc } from "firebase/firestore";
import { parse } from "querystring"; // Parse Twilio webhook data

export async function POST(req) {
    try {
        const body = await req.text();
        const data = parse(body);
        const { From, CallStatus, CallSid } = data;

        console.log("📞 Call Status Update Received:", data);

        // ✅ Log the final status of the call
        if (["completed", "no-answer", "busy", "failed"].includes(CallStatus)) {
            console.log("📌 Logging final call status to Firestore...");

            await addDoc(collection(db, "missed_calls"), {
                patient_number: From,
                call_status: CallStatus,
                call_sid: CallSid,
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