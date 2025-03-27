"use client";

import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Mail, Phone, MapPin } from "lucide-react";

// Helper to format phone numbers
function formatPhoneNumber(numberString) {
  if (!numberString) return "";
  let cleaned = numberString.replace(/\D/g, "");
  if (cleaned.length === 11 && cleaned.startsWith("1")) {
    cleaned = cleaned.slice(1);
  }
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  }
  return numberString;
}

export default function ClientList({ clients }) {
  if (!clients || clients.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">
          No clients added yet. Add your first client to get started.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {clients.map((client) => (
        <Link
          key={client.id}
          href={`/client-detail/${client.id}`}
          className="block"
        >
          <Card
            className="
              rounded-lg 
              overflow-hidden 
              transform transition 
              hover:scale-[1.02] 
              hover:shadow-lg 
              focus:outline-none 
              focus:ring-2 
              focus:ring-offset-2 
              focus:ring-blue-500
            "
          >
            <CardHeader>
              <CardTitle>{client.name}</CardTitle>
              <CardDescription>{client.contactName}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {/* Email */}
                <div className="flex items-center text-sm">
                  <Mail className="mr-2 h-4 w-4 text-muted-foreground" />
                  <span>{client.email}</span>
                </div>

                {/* Main phone */}
                {client.phone && (
                  <div className="flex items-center text-sm">
                    <Phone className="mr-2 h-4 w-4 text-muted-foreground" />
                    <span>{formatPhoneNumber(client.phone)}</span>
                  </div>
                )}

                {/* Twilio phone */}
                {client.twilioPhone && (
                  <div className="flex items-center text-sm">
                    <Phone className="mr-2 h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">Twilio:</span>
                    <span className="ml-1">
                      {formatPhoneNumber(client.twilioPhone)}
                    </span>
                  </div>
                )}

                {/* Location */}
                <div className="flex items-center text-sm">
                  <MapPin className="mr-2 h-4 w-4 text-muted-foreground" />
                  <span>{client.location}</span>
                </div>

                {/* Services */}
                <div className="pt-2">
                  <div className="text-sm font-medium mb-1">Services:</div>
                  <div className="flex flex-wrap gap-1">
                    {client.services.map((service) => (
                      <Badge key={service} variant="secondary" className="bg-[#b3d334]">
                        {service}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
}
