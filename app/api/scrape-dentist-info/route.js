import axios from "axios";
import * as cheerio from "cheerio";
import { NextResponse } from "next/server";
import { admin } from "../../../lib/firebaseAdmin"; // ✅ Reuse centralized Firebase Admin config

// ✅ Scrapes dentist website and saves info to Firestore
export async function scrapeAndStoreDentistData(website_url, dentist_id) {
  try {
    const response = await axios.get(website_url);
    const $ = cheerio.load(response.data);

    // 🧼 Clean up full body text for pattern matching
    const rawText = $("body").text().replace(/\s+/g, " ").trim();

    const cleanText = (str) =>
      str
        .replace(/\s+/g, " ")
        .replace(/[\n\t]+/g, "")
        .trim();

    // 🕒 Extract hours from visible header pattern
    const hours =
      cleanText(
        $(".qodef-e-title-text")
          .filter((_, el) => {
            const text = $(el).text().trim();
            return (
              text.match(/\d{1,2}:\d{2}/) &&
              !text.toLowerCase().includes("confirm") &&
              text.length < 100
            );
          })
          .first()
          .text()
      ) || "";

    // 📍 Extract address from maps links or typical classes
    const address =
      $('*[itemprop="address"]').text().trim() ||
      $("address").first().text().trim() ||
      $("[href*='maps']").first().text().trim() ||
      $("[class*=address], [id*=address]").first().text().trim() ||
      $(".qodef-m-title-text")
        .filter((_, el) =>
          $(el)
            .text()
            .match(
              /\d{1,5} .* (Street|St\.|Avenue|Ave\.|Road|Rd\.|Boulevard|Blvd\.|Highway|Hwy|Drive|Dr\.)/
            )
        )
        .first()
        .text()
        .trim() ||
      "";

    // 🧾 Extract services from structured or fallback text
    const servicesMatch = rawText.match(/(Services:?)\s*([A-Z\s,&]+)/i);
    const servicesString = servicesMatch?.[2]?.trim() || "";

    // ✅ Split into array
    const servicesArray = (
      servicesString.match(/[A-Z][a-z]+(?:\s[A-Z][a-z]+)*/g) || []
    )
      .map((s) => s.trim())
      .filter((s) => s.length > 2 && !s.toLowerCase().includes("service"));

    // ✅ Always update with full structure, even if values are empty
    await admin
      .firestore()
      .collection("dentists")
      .doc(dentist_id)
      .update({
        scraped_data: {
          hours,
          address,
          services: servicesArray,
          last_scraped: new Date().toISOString(),
        },
      });

    console.log("✅ Scraped and saved to Firestore:", dentist_id);
  } catch (err) {
    console.error("❌ Scrape error:", err.message);
    throw err;
  }
}

// ✅ Optional API route to trigger scraping via POST request
export async function POST(req) {
  try {
    const { website_url, dentist_id } = await req.json();

    if (!website_url || !dentist_id) {
      return NextResponse.json(
        { error: "Missing website_url or dentist_id" },
        { status: 400 }
      );
    }

    await scrapeAndStoreDentistData(website_url, dentist_id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("❌ API POST error:", error);
    return NextResponse.json({ error: "Scraping failed" }, { status: 500 });
  }
}
