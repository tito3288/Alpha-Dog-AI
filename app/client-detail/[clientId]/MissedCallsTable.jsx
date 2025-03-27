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
import { db } from "../../../lib/firebaseConfig";
import { collection, getDocs } from "firebase/firestore";

export default function MissedCallsTable({ missedCalls }) {
  const [expandedCallId, setExpandedCallId] = useState(null);
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [conversationMessages, setConversationMessages] = useState([]);

  function formatDate(timestamp) {
    if (!timestamp) return "";
    if (timestamp.seconds) {
      const date = new Date(timestamp.seconds * 1000);
      return date.toLocaleString();
    }
    const date = new Date(timestamp);
    return date.toLocaleString();
  }

  function getFollowUpBadge(call) {
    const status = call.follow_up_status?.toLowerCase();
    if (status === "pending") {
      return <Badge className="bg-[#b3d334] text-[#2d5329]">Pending</Badge>;
    } else if (status === "completed") {
      return <Badge variant="outline">Completed</Badge>;
    } else {
      return (
        <Badge variant="secondary">{call.follow_up_status || "Unknown"}</Badge>
      );
    }
  }

  const toggleExpandRow = async (callId) => {
    if (expandedCallId === callId) {
      setExpandedCallId(null);
      setConversationMessages([]);
    } else {
      setExpandedCallId(callId);
      await fetchConversation(callId);
    }
  };

  const fetchConversation = async (callId) => {
    try {
      const convoRef = collection(db, "missed_calls", callId, "conversations");
      const convoSnap = await getDocs(convoRef);
      const sortedMessages = convoSnap.docs
        .map((doc) => doc.data())
        .sort((a, b) => a.timestamp?.seconds - b.timestamp?.seconds);
      setConversationMessages(sortedMessages);
    } catch (error) {
      console.error("❌ Failed to fetch conversation:", error);
    }
  };

  const handleViewMessage = async (call) => {
    setSelectedMessage({
      message: call.ai_message,
      timestamp: call.ai_message_timestamp,
      status: call.ai_message_status,
    });
    await fetchConversation(call.id);
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
                        <div className="text-sm">
                          {call.patient_number || "Unknown"}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="destructive">
                          {call.call_status || "Missed"}
                        </Badge>
                      </TableCell>
                      <TableCell>{getFollowUpBadge(call)}</TableCell>
                      <TableCell>
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
                        >
                          <MessageSquare className="h-4 w-4 mr-2" />
                          View Message
                        </Button>
                      </TableCell>
                    </TableRow>
                    {expandedCallId === callId && (
                      <TableRow>
                        <TableCell colSpan={7} className="bg-muted/50 p-4">
                          <div className="space-y-4">
                            <h4 className="font-medium">AI Message Sent:</h4>
                            <div className="bg-background p-3 rounded-md border text-sm">
                              {call.ai_message || "No message sent"}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              Sent at {formatDate(call.ai_message_timestamp)} •
                              Status: {call.ai_message_status || "unknown"}
                            </div>
                            {conversationMessages.length > 0 && (
                              <div className="pt-4">
                                <h4 className="font-medium">Conversation:</h4>
                                <div className="space-y-2 text-sm">
                                  {conversationMessages.map((msg, i) => (
                                    <div
                                      key={i}
                                      className={`p-2 rounded-md border w-fit max-w-[80%] ${
                                        msg.from === "user"
                                          ? "bg-white border-gray-300"
                                          : "bg-blue-50 border-blue-300 ml-auto"
                                      }`}
                                    >
                                      <div className="text-muted-foreground text-xs mb-1">
                                        {msg.from === "user" ? "Patient" : "AI"}
                                      </div>
                                      <div>{msg.message}</div>
                                      <div className="text-xs text-muted-foreground mt-1">
                                        {formatDate(msg.timestamp)}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
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
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>AI Message + Conversation</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-muted p-4 rounded-lg">
              <p>{selectedMessage?.message}</p>
            </div>
            <div className="text-sm text-muted-foreground">
              <p>Sent: {formatDate(selectedMessage?.timestamp)}</p>
              <p>Status: {selectedMessage?.status}</p>
            </div>
            {conversationMessages.length > 0 && (
              <div className="pt-4">
                <h4 className="font-medium mb-2">Conversation:</h4>
                <div className="space-y-2 text-sm">
                  {conversationMessages.map((msg, i) => (
                    <div
                      key={i}
                      className={`p-2 rounded-md border w-fit max-w-[80%] ${
                        msg.from === "user"
                          ? "bg-white border-gray-300"
                          : "bg-blue-50 border-blue-300 ml-auto"
                      }`}
                    >
                      <div className="text-muted-foreground text-xs mb-1">
                        {msg.from === "user" ? "Patient" : "AI"}
                      </div>
                      <div>{msg.message}</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {formatDate(msg.timestamp)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
