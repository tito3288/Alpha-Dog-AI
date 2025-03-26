"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { db } from "../../lib/firebaseConfig";
import { collection, addDoc } from "firebase/firestore";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";

const MARKETING_SERVICES = [
  { id: "seo", label: "SEO" },
  { id: "social", label: "Social Media" },
  { id: "ppc", label: "PPC" },
  { id: "website", label: "Website Design" },
  { id: "content", label: "Content Marketing" },
  { id: "email", label: "Email Marketing" },
  { id: "local-seo", label: "Local SEO" },
];

const formatPhoneNumber = (number) => {
  if (!number) return "";
  let cleaned = number.replace(/\D/g, "");
  if (!cleaned.startsWith("1")) {
    cleaned = "1" + cleaned;
  }
  return `+${cleaned}`;
};

export default function AddClientDialog({ open, onOpenChange }) {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: "",
    contactName: "",
    email: "",
    phone: "",
    location: "",
    twilio_phone_number: "",
    booking_url: "",
    follow_up_delay: 0.5, // Default follow-up delay in minutes
    services: [],
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleServiceToggle = (service) => {
    setFormData((prev) => {
      const services = prev.services.includes(service)
        ? prev.services.filter((s) => s !== service)
        : [...prev.services, service];
      return { ...prev, services };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const formattedTwilioNumber = formatPhoneNumber(
        formData.twilio_phone_number
      );

      const clientData = {
        name: formData.name,
        contactName: formData.contactName,
        email: formData.email,
        phone: formData.phone,
        location: formData.location,
        twilio_phone_number: formattedTwilioNumber,
        booking_url: formData.booking_url,
        follow_up_delay: Number(formData.follow_up_delay),
        services: formData.services,
        status: "active",
      };

      await addDoc(collection(db, "dentists"), clientData);
      router.push("/new-dashboard");

      setFormData({
        name: "",
        contactName: "",
        email: "",
        phone: "",
        location: "",
        twilio_phone_number: "",
        booking_url: "",
        follow_up_delay: 5,
        services: [],
      });
      onOpenChange(false);
    } catch (error) {
      console.error("Error adding client: ", error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add New Dentist Client</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Practice Name</Label>
              <Input
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="contactName">Contact Person</Label>
              <Input
                id="contactName"
                name="contactName"
                value={formData.contactName}
                onChange={handleChange}
                required
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                name="location"
                value={formData.location}
                onChange={handleChange}
                required
              />
            </div>
            {/* New Fields */}
            <div className="grid gap-2">
              <Label htmlFor="twilio_phone_number">Twilio Phone Number</Label>
              <Input
                id="twilio_phone_number"
                name="twilio_phone_number"
                value={formData.twilio_phone_number}
                onChange={handleChange}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="booking_url">Booking URL</Label>
              <Input
                id="booking_url"
                name="booking_url"
                value={formData.booking_url}
                onChange={handleChange}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="follow_up_delay">Follow-Up Delay (minutes)</Label>
              <Input
                id="follow_up_delay"
                name="follow_up_delay"
                type="number"
                placeholder="Follow-Up Delay (minutes)"
                value={formData.follow_up_delay}
                onChange={handleChange}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label>Marketing Services</Label>
              <div className="grid grid-cols-2 gap-2">
                {MARKETING_SERVICES.map((service) => (
                  <div key={service.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={service.id}
                      checked={formData.services.includes(service.label)}
                      onCheckedChange={() => handleServiceToggle(service.label)}
                    />
                    <Label htmlFor={service.id} className="text-sm font-normal">
                      {service.label}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit">Add Client</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
