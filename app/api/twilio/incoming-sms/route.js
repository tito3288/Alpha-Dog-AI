import { NextResponse } from "next/server";
import { db } from "../../../../lib/firebaseConfig";
import OpenAI from "openai";
import twilio from "twilio";
import { parse } from "querystring";
import { collection, query, where, getDocs } from "firebase/firestore";

// Twilio setup
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const client = twilio(accountSid, authToken);

// OpenAI setup
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(req) {
  const body = await req.text();
  const data = parse(body);

  const from = data.From;
  const to = data.To;
  const messageBody = data.Body;

  console.log(`📥 Received message from ${from}: "${messageBody}"`);

  // 🔍 Pull clinic name + booking URL from Firestore using "to" (Twilio number)
  let clinic_name = "the dental office";
  let booking_url = "";

  const q = query(
    collection(db, "dentists"),
    where("twilio_phone_number", "==", to)
  );
  const snapshot = await getDocs(q);

  if (!snapshot.empty) {
    const docData = snapshot.docs[0].data();
    clinic_name = docData.clinic_name ?? clinic_name;
    booking_url = docData.booking_url ?? "";
  }

  // 🤖 Generate AI reply with dynamic booking logic
  try {
    const aiReply = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: `You are a friendly receptionist for ${clinic_name}. 
          - Respond briefly and helpfully to patient SMS inquiries. 
          - Do not apologize excessively. 
          - Always encourage the patient to call the clinic or book online. 
          - After 5 replies in a conversation, stop answering questions and instead reply: 
            "To assist you further, please book online here: ${booking_url}"`,
        },
        {
          role: "user",
          content: messageBody,
        },
      ],
      max_tokens: 100,
    });

    const replyText = aiReply.choices[0].message.content.trim();
    console.log(`🤖 Replying with: ${replyText}`);

    await client.messages.create({
      from: to,
      to: from,
      body: replyText,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("❌ Error in AI reply handler:", error);
    return NextResponse.json(
      { error: "Failed to process message" },
      { status: 500 }
    );
  }
}
