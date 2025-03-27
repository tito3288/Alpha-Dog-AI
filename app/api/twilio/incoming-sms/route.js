import { NextResponse } from "next/server";
import { db } from "../../../../lib/firebaseConfig";
import OpenAI from "openai";
import twilio from "twilio";
import { parse } from "querystring";
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  Timestamp,
  orderBy,
  limit,
} from "firebase/firestore";

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

  // 🔍 Pull clinic name + booking URL
  let clinic_name = "the dental office";
  let booking_url = "";

  const dentistQuery = query(
    collection(db, "dentists"),
    where("twilio_phone_number", "==", to)
  );
  const dentistSnap = await getDocs(dentistQuery);
  if (!dentistSnap.empty) {
    const docData = dentistSnap.docs[0].data();
    clinic_name = docData.clinic_name ?? clinic_name;
    booking_url = docData.booking_url ?? "";
  }

  // 🤖 Generate AI reply
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

    // 🔄 Find the related missed call doc to get the call_sid
    const callQuery = query(
      collection(db, "missed_calls"),
      where("patient_number", "==", from),
      where("dentist_phone_number", "==", to)
    );
    const callSnap = await getDocs(callQuery);
    if (!callSnap.empty) {
      const callDoc = callSnap.docs[0];
      const call_sid = callDoc.id;

      const convoRef = collection(
        db,
        "missed_calls",
        call_sid,
        "conversations"
      );

      // Store both user message and AI reply
      await addDoc(convoRef, {
        from: "user",
        message: messageBody,
        timestamp: Timestamp.now(),
      });

      await addDoc(convoRef, {
        from: "ai",
        message: replyText,
        timestamp: Timestamp.now(),
      });
    } else {
      console.warn("⚠️ No matching missed_calls doc found for", from, to);

      console.warn(
        "⚠️ No matching missed_calls doc found to log conversation."
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("❌ Error in AI reply handler:", error);
    return NextResponse.json(
      { error: "Failed to process message" },
      { status: 500 }
    );
  }
}
