import { NextResponse } from "next/server";
import { parse } from "querystring";
import sgMail from "@sendgrid/mail";
import { bucket } from "../../../../lib/firebaseAdmin";
import axios from "axios";
import { v4 as uuidv4 } from "uuid";

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

    console.log("🎙️ Twilio Recording URL:", RecordingUrl);

    // Wait a bit in case Twilio hasn't finished processing the recording
    await new Promise((resolve) => setTimeout(resolve, 2000)); // 2-second delay

    // Use Twilio's original .wav URL directly
    const recordingUrl = RecordingUrl;

    const response = await axios.get(recordingUrl, {
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
      to: "bryan@alphadogagency.com",
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

    // Optional: log more if it's an Axios error
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
