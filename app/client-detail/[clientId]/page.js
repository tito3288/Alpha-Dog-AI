"use client";
import { useParams } from "next/navigation";
import ClientDetailView from "./ClientDetailView";
import { AppHeader } from "/app/new-dashboard/AppHeader";

export default function ClientDetailPage() {
  const { clientId } = useParams();

  return (
    <main className="container mx-auto py-8 px-4">
      <AppHeader />
      <ClientDetailView clientId={clientId} />
    </main>
  );
}
