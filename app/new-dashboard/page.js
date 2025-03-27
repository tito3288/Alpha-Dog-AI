"use client";
import { AppHeader } from "./AppHeader";
import ClientDashboard from "./ClientDashboard";

export default function DashboardPage() {
  return (
    <main className="container mx-auto py-8 px-4 space-y-4">
      <AppHeader />
      <ClientDashboard />
    </main>
  );
}
