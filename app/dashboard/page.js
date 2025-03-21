"use client";

import { useEffect, useState } from "react";
import { db } from "../../lib/firebaseConfig";
import { collection, getDocs, query, where } from "firebase/firestore";
import Link from "next/link";

const formatPhoneNumber = (phoneNumber) => {
  if (!phoneNumber) return "";
  const cleaned = phoneNumber.replace(/\D/g, ""); // Remove non-numeric characters
  if (cleaned.length === 11 && cleaned.startsWith("1")) {
    return `(${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7)}`;
  } else if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  }
  return phoneNumber; // Return original if it doesn't match expected format
};

export default function Dashboard() {
  const [clients, setClients] = useState([]);
  const [selectedDentist, setSelectedDentist] = useState(null);
  const [missedCalls, setMissedCalls] = useState([]);

  useEffect(() => {
    const fetchClients = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "dentists"));
        const clientsData = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setClients(clientsData);
      } catch (error) {
        console.error("Error fetching clients:", error);
      }
    };

    fetchClients();
  }, []);

  // Fetch missed calls for a selected dentist
  const fetchMissedCalls = async (twilioPhoneNumber) => {
    if (!twilioPhoneNumber) {
      console.error("Error: Twilio phone number is undefined.");
      return;
    }

    try {
      const missedCallsRef = collection(db, "missed_calls");
      const q = query(
        missedCallsRef,
        where("dentist_phone_number", "==", twilioPhoneNumber)
      );
      const querySnapshot = await getDocs(q);

      let calls = [];
      querySnapshot.forEach((doc) => {
        calls.push(doc.data());
      });

      setMissedCalls(calls);
      setSelectedDentist(twilioPhoneNumber);
    } catch (error) {
      console.error("Error fetching missed calls:", error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-6 text-black">
      <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-lg">
        <h1 className="text-2xl font-bold mb-4">Dentist Clients</h1>

        {clients.length === 0 ? (
          <p>No clients added yet.</p>
        ) : (
          <ul className="space-y-2">
            {clients.map((client) => (
              <li
                key={client.id}
                className="p-2 border rounded bg-gray-50 flex justify-between items-center"
              >
                <span>{client.clinic_name}</span>
                <button
                  onClick={() => fetchMissedCalls(client.twilio_phone_number)}
                  className="bg-blue-500 hover:bg-blue-600 text-white text-sm font-bold py-1 px-3 rounded-lg"
                >
                  View Missed Calls
                </button>
              </li>
            ))}
          </ul>
        )}

        <Link href="/new-client">
          <button className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded-lg w-full mt-4">
            Add New Client
          </button>
        </Link>
      </div>

      {/* Display Missed Calls Section */}
      {selectedDentist && (
        <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-lg mt-6">
          <h2 className="text-xl font-bold mb-2">
            Missed Calls for {formatPhoneNumber(selectedDentist)}
          </h2>

          {missedCalls.length === 0 ? (
            <p>No missed calls found.</p>
          ) : (
            <ul className="space-y-2">
              {missedCalls.map((call, index) => (
                <li key={index} className="p-2 border rounded bg-gray-50">
                  <p>
                    <strong>Patient Number:</strong>{" "}
                    {formatPhoneNumber(call.patient_number)}
                  </p>
                  <p>
                    <strong>Status:</strong> {call.call_status}
                  </p>
                  <p>
                    <strong>Follow-Up Status:</strong>{" "}
                    {call.follow_up_status || "Not Available"}
                  </p>{" "}
                  {/* ✅ New Line */}
                  <p>
                    <strong>Follow-Up Type:</strong>{" "}
                    {call.follow_up_type || "Text Message"}
                  </p>{" "}
                  {/* ✅ New Line */}
                  <p>
                    <strong>Time:</strong>{" "}
                    {new Date(call.timestamp.seconds * 1000).toLocaleString()}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
