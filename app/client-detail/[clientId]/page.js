"use client";
import { useParams } from "next/navigation";
import ClientDetailView from "./ClientDetailView";

export default function ClientDetailPage() {
  const { clientId } = useParams();

  return (
    <main className="container mx-auto py-8 px-4">
      <ClientDetailView clientId={clientId} />
    </main>
  );
}
