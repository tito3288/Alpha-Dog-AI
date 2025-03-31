import { NextResponse } from "next/server";
import { db } from "../../../../lib/firebaseConfig";
import {
  doc,
  setDoc,
  collection,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import twilio from "twilio";
import { parse } from "querystring";

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;

const client = twilio(accountSid, authToken);

// Define baseUrl so it always includes the protocol.
const envUrl = process.env.VERCEL_URL;
const baseUrl =
  envUrl && envUrl.startsWith("http")
    ? envUrl
    : envUrl
      ? `https://${envUrl}`
      : "http://localhost:3000";

export async function POST(req) {
  try {
    const body = await req.text();
    const data = parse(body);

    // We can also parse CallDuration if we want to treat short "completed" calls as missed
    const { From, To, CallStatus, CallSid, CallDuration } = data;

    console.log("📞 Call Status Update Received:", data);
    console.log(`🟡 CallStatus in status-callback: ${CallStatus}`);

    // 🔹 1) Retrieve the clinic name from Firestore
    const dentistsRef = collection(db, "dentists");
    const q = query(dentistsRef, where("twilio_phone_number", "==", To));
    const querySnapshot = await getDocs(q);

    let clinicName = "Unknown Clinic";
    if (!querySnapshot.empty) {
      const docData = querySnapshot.docs[0].data();
      clinicName = docData.clinic_name ?? docData.name ?? "Unknown Clinic";
    }
    console.log(`🏥 Clinic Name Retrieved: ${clinicName}`);

    // 🔹 2) Identify "missed" calls
    const isMissed =
      ["no-answer", "busy", "failed"].includes(CallStatus.toLowerCase()) ||
      (CallStatus.toLowerCase() === "completed" && Number(CallDuration) <= 30);

    if (isMissed) {
      console.log(
        `🟢 This call qualifies as a missed call: ${CallSid}, Status: ${CallStatus}`
      );

      // 🔹 3) Save the missed call to Firestore
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

      // 🔹 4) Trigger AI Follow-up SMS
      console.log(
        `📩 Attempting to trigger AI Follow-up SMS for CallSid: ${CallSid}`
      );

      // Use the proper baseUrl here
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

      console.log(
        `🔄 Fetch request to send-followup completed. Status: ${response.status} ${response.statusText}`
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

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("❌ Error processing call status update:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
