import { NextResponse } from "next/server";
import { parse } from "querystring";
import sgMail from "@sendgrid/mail";
import { bucket } from "../../../../lib/firebaseAdmin";
import { getFirestore } from "firebase-admin/firestore";
import axios from "axios";
import { v4 as uuidv4 } from "uuid";

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

export async function POST(req) {
  try {
    const body = await req.text();
    const data = parse(body);
    const { RecordingUrl, From, To, CallSid } = data;

    if (!RecordingUrl) {
      console.warn("⚠️ No Recording URL found in Twilio webhook");
      return NextResponse.json({ error: "No recording URL" }, { status: 400 });
    }

    console.log("🎙️ Twilio Recording URL:", RecordingUrl);

    // Wait a bit for Twilio to finish processing
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // 🔍 Get the matching dentist by their Twilio number
    const firestore = getFirestore();
    const snapshot = await firestore
      .collection("dentists")
      .where("twilio_phone_number", "==", To)
      .get();

    if (snapshot.empty) {
      console.warn("⚠️ No dentist found for Twilio number:", To);
      return NextResponse.json({ error: "Dentist not found" }, { status: 404 });
    }

    const dentist = snapshot.docs[0].data();
    const recipientEmail = dentist.email;

    // Download the recording
    const response = await axios.get(RecordingUrl, {
      responseType: "arraybuffer",
      auth: {
        username: process.env.TWILIO_ACCOUNT_SID,
        password: process.env.TWILIO_AUTH_TOKEN,
      },
    });

    const buffer = Buffer.from(response.data);
    const filename = `voicemails/${CallSid}-${uuidv4()}.wav`;

    const file = bucket.file(filename);
    await file.save(buffer, {
      metadata: {
        contentType: "audio/wav",
        cacheControl: "public, max-age=31536000",
      },
    });

    await file.makePublic();
    const publicUrl = `https://storage.googleapis.com/${bucket.name}/${filename}`;

    const msg = {
      to: recipientEmail,
      from: "voicemail@alphadog-dental.com",
      subject: `📞 New Voicemail from ${From}`,
      text: `You received a voicemail from ${From} to ${To}.\n\nListen to it here: ${publicUrl}\n\nCall SID: ${CallSid}`,
    };

    await sgMail.send(msg);
    console.log("✅ Voicemail email sent to:", recipientEmail);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("❌ Error in handle-recording:", error);
    if (axios.isAxiosError(error)) {
      console.error("🔍 Axios Error Details:", {
        url: error.config?.url,
        status: error.response?.status,
        data: error.response?.data,
      });
    }
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
