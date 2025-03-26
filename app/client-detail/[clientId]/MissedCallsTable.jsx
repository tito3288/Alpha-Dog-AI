"use client";

import React, { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MessageSquare, ChevronDown, ChevronUp } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function MissedCallsTable({ missedCalls }) {
  const [expandedCallId, setExpandedCallId] = useState(null);
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  function formatDate(timestamp) {
    if (!timestamp) return "";
    // If it's a Firestore Timestamp object:
    if (timestamp.seconds) {
      const date = new Date(timestamp.seconds * 1000);
      return date.toLocaleString();
    }
    // If it's a JS Date string or something else:
    const date = new Date(timestamp);
    return date.toLocaleString();
  }

  const toggleExpandRow = (callId) => {
    if (expandedCallId === callId) {
      setExpandedCallId(null);
    } else {
      setExpandedCallId(callId);
    }
  };

  const handleViewMessage = (call) => {
    // We assume the AI message is stored in call.ai_message, etc.
    setSelectedMessage({
      message: call.ai_message,
      timestamp: call.ai_message_timestamp,
      status: call.ai_message_status,
    });
    setIsDialogOpen(true);
  };

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px]"></TableHead>
              <TableHead>Caller</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Follow-Up Status</TableHead>
              <TableHead>Follow-Up Type</TableHead>
              <TableHead>Time</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {missedCalls.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center">
                  No missed calls recorded.
                </TableCell>
              </TableRow>
            ) : (
              missedCalls.map((call) => {
                const callId = call.id;
                return (
                  <React.Fragment key={callId}>
                    <TableRow className="group">
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => toggleExpandRow(callId)}
                          aria-label={
                            expandedCallId === callId
                              ? "Collapse row"
                              : "Expand row"
                          }
                        >
                          {expandedCallId === callId ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                        </Button>
                      </TableCell>
                      <TableCell className="font-medium">
                        {/* We only have patient_number, no patientName */}
                        <div className="text-sm">
                          {call.patient_number || "Unknown"}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="destructive">
                          {call.call_status || "Missed"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            call.follow_up_status?.toLowerCase() === "completed"
                              ? "outline"
                              : "secondary"
                          }
                        >
                          {call.follow_up_status || "Pending"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {/* If you store follow_up_type, show it, otherwise "Text Message" */}
                        <Badge variant="outline">
                          {call.follow_up_type || "Text Message"}
                        </Badge>
                      </TableCell>
                      <TableCell>{formatDate(call.timestamp)}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewMessage(call)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <MessageSquare className="h-4 w-4 mr-2" />
                          View Message
                        </Button>
                      </TableCell>
                    </TableRow>
                    {expandedCallId === callId && (
                      <TableRow>
                        <TableCell colSpan={7} className="bg-muted/50 p-4">
                          <div className="space-y-2">
                            <h4 className="font-medium">AI Message Sent:</h4>
                            <div className="bg-background p-3 rounded-md border text-sm">
                              {call.ai_message || "No message sent"}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              Sent at {formatDate(call.ai_message_timestamp)}
                              {" • "}
                              Status: {call.ai_message_status || "unknown"}
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>AI Message</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-muted p-4 rounded-lg">
              <p>{selectedMessage?.message}</p>
            </div>
            <div className="text-sm text-muted-foreground">
              <p>Sent: {formatDate(selectedMessage?.timestamp)}</p>
              <p>Status: {selectedMessage?.status}</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
