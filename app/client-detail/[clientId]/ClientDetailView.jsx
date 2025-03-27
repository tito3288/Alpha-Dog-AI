"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import MissedCallsTable from "./MissedCallsTable"; // We'll convert that next
import { db } from "@/lib/firebaseConfig";
import {
  doc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
} from "firebase/firestore";

// This is our new JavaScript version of ClientDetailView
export default function ClientDetailView({ clientId }) {
  const [client, setClient] = useState(null);
  const [missedCalls, setMissedCalls] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const docRef = doc(db, "dentists", clientId);
        const docSnap = await getDoc(docRef);

        if (!docSnap.exists()) {
          console.warn("No client found with ID:", clientId);
          setIsLoading(false);
          return;
        }

        // Now docSnap definitely exists:
        const clientData = docSnap.data();
        setClient({ ...clientData, id: docSnap.id });

        // Then do your missed_calls query, using clientData
        const missedCallsRef = collection(db, "missed_calls");
        const q = query(
          missedCallsRef,
          where(
            "dentist_phone_number",
            "==",
            clientData.twilio_phone_number ?? "???"
          )
        );
        const missedCallsSnap = await getDocs(q);

        let calls = [];
        missedCallsSnap.forEach((callDoc) => {
          const data = callDoc.data();
          calls.push({
            id: callDoc.id,
            call_sid: data.call_sid,
            patient_number: data.patient_number,
            call_status: data.call_status,
            follow_up_status: data.follow_up_status,
            ai_message: data.ai_message,
            ai_message_timestamp: data.ai_message_timestamp,
            ai_message_status: data.ai_message_status,
            timestamp: data.timestamp,
          });
        });

        setMissedCalls(calls);
      } catch (error) {
        console.error("Error fetching client or missed calls:", error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  }, [clientId]);

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!client) {
    return <div>Client not found</div>;
  }

  // Filter your calls if needed for “complete” vs “pending”
  const completedCalls = missedCalls.filter(
    (call) => call.follow_up_status?.toLowerCase() === "completed"
  );
  const pendingCalls = missedCalls.filter(
    (call) => call.follow_up_status?.toLowerCase() === "pending"
  );

  return (
    <div className="space-y-6">
      <Link
        href="/new-dashboard"
        className="
        inline-flex
        items-center
        px-3
        py-2
        rounded-md
        bg-transparent
        hover:bg-gray-100
        text-sm
        font-medium
        text-gray-600
        hover:text-gray-900
        transition-colors
      "
      >
        &larr; Back to Dashboard
      </Link>
      <div>
        <h1 className="text-3xl font-bold">
          {client.clinic_name || client.name}
        </h1>
        <p className="text-muted-foreground">
          {client.contactName} • {client.location}
        </p>
      </div>

      <Tabs defaultValue="missed-calls" className="w-full">
        <TabsList className="bg-[#b3d334]/20">
          <TabsTrigger
            value="missed-calls"
            className="
              data-[state=active]:bg-[#b3d334]
              data-[state=active]:text-[#2d5329]
              data-[state=active]:shadow-sm
              data-[state=inactive]:hover:bg-[#b3d334]/20
              data-[state=inactive]:text-gray-600
              px-3 py-2
              rounded-md
              transition-colors
            "
          >
            Missed Calls
          </TabsTrigger>
          <TabsTrigger
            value="analytics"
            className="
              data-[state=active]:bg-[#b3d334]
              data-[state=active]:text-[#2d5329]
              data-[state=active]:shadow-sm
              data-[state=inactive]:hover:bg-[#b3d334]/20
              data-[state=inactive]:text-gray-600
              px-3 py-2
              rounded-md
              transition-colors
            "
          >
            Analytics
          </TabsTrigger>
          <TabsTrigger
            value="settings"
            className="
              data-[state=active]:bg-[#b3d334]
              data-[state=active]:text-[#2d5329]
              data-[state=active]:shadow-sm
              data-[state=inactive]:hover:bg-[#b3d334]/20
              data-[state=inactive]:text-gray-600
              px-3 py-2
              rounded-md
              transition-colors
            "
          >
            Settings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="missed-calls" className="space-y-6 mt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-2xl">{missedCalls.length}</CardTitle>
                <CardDescription>Total Missed Calls</CardDescription>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-2xl">
                  {completedCalls.length}
                </CardTitle>
                <CardDescription>Completed Follow-ups</CardDescription>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-2xl">
                  {pendingCalls.length}
                </CardTitle>
                <CardDescription>Pending Follow-ups</CardDescription>
              </CardHeader>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Missed Calls</CardTitle>
              <CardDescription>
                Track missed calls and automated follow-ups for{" "}
                {client.clinic_name || client.name}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <MissedCallsTable missedCalls={missedCalls} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics">
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Analytics</CardTitle>
              <CardDescription>
                View performance metrics for {client.clinic_name || client.name}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Analytics dashboard coming soon.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings">
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Client Settings</CardTitle>
              <CardDescription>
                Manage settings for {client.clinic_name || client.name}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Settings dashboard coming soon.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
