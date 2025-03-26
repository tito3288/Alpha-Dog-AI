"use client";

import { useState, useEffect } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "../../lib/firebaseConfig";
import { PlusCircle } from "lucide-react";
import ClientList from "./ClientList";
import AddClientDialog from "./AddClientDialog";
import { Button } from "@/components/ui/button";

export default function ClientDashboard() {
  const [clients, setClients] = useState([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "dentists"), (snapshot) => {
      const fetchedClients = snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          name: data.name ?? data.clinic_name ?? "No Name",
          contactName: data.contactName ?? "",
          email: data.email ?? "",
          // If you want to keep "phone" separate from Twilio:
          phone: data.phone ?? "",
          twilioPhone: data.twilio_phone_number ?? "",
          location: data.location ?? "",
          services: data.services ?? [],
          status: data.status ?? "active",
        };
      });
      setClients(fetchedClients);
    });

    return () => unsubscribe();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-semibold">Dentist Clients</h2>
        <Button onClick={() => setIsDialogOpen(true)}>
          <PlusCircle className="mr-2 h-4 w-4" />
          Add New Client
        </Button>
      </div>

      <ClientList clients={clients} />

      <AddClientDialog open={isDialogOpen} onOpenChange={setIsDialogOpen} />
    </div>
  );
}
