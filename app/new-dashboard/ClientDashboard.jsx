"use client";

import { useState, useEffect } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "../../lib/firebaseConfig";
import { PlusCircle, LogOut } from "lucide-react";
import ClientList from "./ClientList";
import AddClientDialog from "./AddClientDialog";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/auth-context";

export default function ClientDashboard() {
  const [clients, setClients] = useState([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const { logout } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    await logout();
    router.push("/login");
  };

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
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        {" "}
        <h2 className="text-2xl font-semibold hidden sm:block">
          Dentist Clients
        </h2>{" "}
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={handleLogout}
            className="border-primary/20 text-primary"
          >
            <LogOut className="mr-2 h-4 w-4" />
            Log Out
          </Button>
          <Button
            onClick={() => setIsDialogOpen(true)}
            className="bg-[#b3d334] hover:bg-[#418235] hover:text-white text-primary font-medium"
          >
            <PlusCircle className="mr-2 h-4 w-4" />
            Add New Client
          </Button>
        </div>
      </div>

      <ClientList clients={clients} />

      <AddClientDialog open={isDialogOpen} onOpenChange={setIsDialogOpen} />
    </div>
  );
}
