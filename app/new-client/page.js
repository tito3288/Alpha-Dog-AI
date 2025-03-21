"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { db } from "../../lib/firebaseConfig";
import { collection, addDoc } from "firebase/firestore";

export default function AddClient() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: "",
    clinic_name: "",
    phone_number: "",
    booking_url: "",
    message_template:
      "Hi, we missed your call! Need an appointment?",
    follow_up_delay: 5,
  });

    // ✅ Function to format phone number to E.164 (+1XXXXXXXXXX)
    const formatPhoneNumber = (number) => {
      let cleaned = number.replace(/\D/g, ""); // Remove non-numeric characters
      if (!cleaned.startsWith("1")) {
        cleaned = "1" + cleaned; // Add country code if missing (Assuming US)
      }
      return `+${cleaned}`;
    };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const formattedPhoneNumber = formatPhoneNumber(formData.twilio_phone_number);
  
      await addDoc(collection(db, "dentists"), {
        clinic_name: formData.clinic_name,
        twilio_phone_number: formattedPhoneNumber,
        booking_url: formData.booking_url, // ✅ Ensure Booking URL is included
        message_template: formData.message_template,
        follow_up_delay: formData.follow_up_delay,
      });
  
      router.push("/dashboard"); // Redirect to dashboard after submission
    } catch (error) {
      console.error("Error adding client: ", error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-6 text-black">
      <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-lg">
        <h1 className="text-2xl font-bold mb-4">Add New Client</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            name="clinic_name"
            placeholder="Clinic Name"
            value={formData.clinic_name}
            onChange={handleChange}
            className="w-full p-2 border border-gray-300 rounded"
            required
          />
          <input
            type="tel"
            name="twilio_phone_number"
            placeholder="Twilio Number for Dentist"
            value={formData.twilio_phone_number}
            onChange={handleChange}
            className="w-full p-2 border border-gray-300 rounded"
            required
          />
          <input
            type="url"
            name="booking_url"
            placeholder="Booking URL"
            value={formData.booking_url}
            onChange={handleChange}
            className="w-full p-2 border border-gray-300 rounded"
            required
          />
          <textarea
            name="message_template"
            value={formData.message_template}
            onChange={handleChange}
            className="w-full p-2 border border-gray-300 rounded"
            required
          ></textarea>
          <input
            type="number"
            name="follow_up_delay"
            placeholder="Follow-Up Delay (minutes)"
            value={formData.follow_up_delay}
            onChange={handleChange}
            className="w-full p-2 border border-gray-300 rounded"
            required
          />
          <button
            type="submit"
            className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-lg w-full"
          >
            Save Client
          </button>
        </form>
      </div>
    </div>
  );
}
