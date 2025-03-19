import { NextResponse } from "next/server";
import { db } from "../../../../lib/firebaseConfig";
import { collection, addDoc, getDocs, query, where } from "firebase/firestore";
import { parse } from "querystring";

export async function POST(req) {
    try {
        const body = await req.text();
        const data = parse(body);
        const { From, CallStatus, CallSid, To, CallDuration } = data;

        console.log("📞 Call Status Update Received:", data);
        console.log(`🟡 CallStatus in status-callback: ${CallStatus}`);

        // ✅ Only process missed calls
        if (["no-answer", "busy", "failed"].includes(CallStatus.toLowerCase()) || (CallStatus.toLowerCase() === "completed" && CallDuration > 5)) {
            console.log(`🟢 This call qualifies as a missed call: ${CallSid}, Status: ${CallStatus}`);

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

            console.log(`🏥 Clinic Name Retrieved: ${clinicName}`);

            // ✅ Log missed call in Firestore
            await addDoc(collection(db, "missed_calls"), {
                call_sid: CallSid,
                patient_number: From,
                call_status: "missed",
                dentist_phone_number: To,
                clinic_name: clinicName,
                follow_up_status: "Pending",
                timestamp: new Date(),
            });

            console.log(`📩 Attempting to trigger AI Follow-up SMS for CallSid: ${CallSid}`);

            // ✅ Trigger AI Follow-Up Message with Correct Clinic Name
            const response = await fetch("https://f910-69-174-154-43.ngrok-free.app/api/twilio/send-followup", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    patient_number: From,
                    twilio_phone_number: To,
                    call_sid: CallSid,
                    clinic_name: clinicName, // ✅ Pass correct clinic name
                }),
            });

            console.log(`🔄 Fetch request to send-followup completed. Status: ${response.status} ${response.statusText}`);

            if (!response.ok) {
                console.error(`❌ Error triggering send-followup: ${response.status} ${response.statusText}`);
                return NextResponse.json({ error: "Failed to trigger follow-up" }, { status: 500 });
            }

            const responseData = await response.json();
            console.log("📩 Follow-up API Response:", responseData);
        }

        return NextResponse.json({ success: true, message: "Call status logged!" });
    } catch (error) {
        console.error("❌ Error processing call status update:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}