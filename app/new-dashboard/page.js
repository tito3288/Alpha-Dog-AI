"use client";
import ClientDashboard from "./ClientDashboard";

export default function DashboardPage() {
  return (
    <main className="container mx-auto py-8 px-4 space-y-4">
      {/* Logo centered with mx-auto */}
      <img
        src="../ADAPrimary.PNG"
        alt="Company Logo"
        className="mx-auto object-contain h-20 md:h-35 mb-10"
      />
      <h1 className="text-3xl font-bold">Dental Marketing Agency Dashboard</h1>
      <ClientDashboard />
    </main>
  );
}
