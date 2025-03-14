"use client";

import { useEffect, useState } from "react";
import { db } from "../../lib/firebaseConfig";
import { collection, getDocs } from "firebase/firestore";
import Link from "next/link";

export default function Dashboard() {
  const [clients, setClients] = useState([]);

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

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-6 text-black">
      <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-lg">
        <h1 className="text-2xl font-bold mb-4">Dentist Clients</h1>

        {clients.length === 0 ? (
          <p>No clients added yet.</p>
        ) : (
          <ul className="space-y-2">
            {clients.map((client) => (
              <li key={client.id} className="p-2 border rounded bg-gray-50">
                {client.clinic_name}
              </li>
            ))}
          </ul>
        )}

        <Link href="/new-client">
          <button className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-lg w-full mt-4">
            Add New Client
          </button>
        </Link>
      </div>
    </div>
  );
}
