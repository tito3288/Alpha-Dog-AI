"use client";

import { useAuth } from "@/context/auth-context";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import NewDashboard from "./new-dashboard/page";

export default function Home() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/login"); // Redirect if not logged in
    }
  }, [isLoading, user, router]);

  if (isLoading || !user) {
    return null; // Or a loader/spinner if you prefer
  }

  return (
    <div>
      <NewDashboard />
    </div>
  );
}
