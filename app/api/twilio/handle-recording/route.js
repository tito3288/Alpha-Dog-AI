import { NextResponse } from "next/server";
import { parse } from "querystring";
import sgMail from "@sendgrid/mail";
import { bucket } from "../../../../lib/firebaseAdmin";
import axios from "axios";
import { v4 as uuidv4 } from "uuid";
import path from "path";

// Set your SendGrid API Key
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

    // Fetch the .mp3 from Twilio
    const recordingUrl = RecordingUrl.endsWith(".mp3")
      ? RecordingUrl
      : `${RecordingUrl}.mp3`;

    const response = await axios.get(recordingUrl, {
      responseType: "arraybuffer",
      auth: {
        username: process.env.TWILIO_ACCOUNT_SID,
        password: process.env.TWILIO_AUTH_TOKEN,
      },
    });

    const buffer = Buffer.from(response.data);
    const filename = `voicemails/${CallSid}-${uuidv4()}.mp3`;

    // Upload to Firebase Storage
    const file = bucket.file(filename);
    await file.save(buffer, {
      metadata: {
        contentType: "audio/mpeg",
        cacheControl: "public, max-age=31536000",
      },
    });

    // Make it publicly accessible
    await file.makePublic();
    const publicUrl = `https://storage.googleapis.com/${bucket.name}/${filename}`;

    // Send email via SendGrid
    const msg = {
      to: process.env.EMAIL_TO,
      from: "voicemail@alphadog-dental.com",
      subject: `📞 New Voicemail from ${From}`,
      text: `You received a voicemail from ${From} to ${To}.\n\nListen to it here: ${publicUrl}\n\nCall SID: ${CallSid}`,
    };

    await sgMail.send(msg);
    console.log(
      "✅ Voicemail email sent via SendGrid with Firebase Storage link"
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("❌ Error in handle-recording:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
