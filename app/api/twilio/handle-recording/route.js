import { NextResponse } from "next/server";
import { parse } from "querystring";
import sgMail from "@sendgrid/mail";

// Set your SendGrid API Key from env
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

    // Construct the full recording URL (Twilio gives it without .mp3 extension sometimes)
    const recordingLink = `${RecordingUrl}.mp3`;

    const msg = {
      to: process.env.EMAIL_TO, // where to send the voicemail
      from: "voicemail@alphadog-dental.com", // must be verified in SendGrid (or domain-authenticated)
      subject: `📞 New Voicemail from ${From}`,
      text: `You received a voicemail from ${From} to ${To}.\n\nListen to it here: ${recordingLink}\n\nCall SID: ${CallSid}`,
    };

    await sgMail.send(msg);
    console.log("✅ Voicemail email sent via SendGrid");

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("❌ Error in handle-recording:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
