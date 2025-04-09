"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { RealtimeChannel } from "@supabase/supabase-js";

interface BroadcastMessage {
  type: string;
  payload: any;
}

// Create a stable reference to channels to prevent recreation
const channelCache = new Map<string, RealtimeChannel>();

export function useSupabaseRealtime(roomId: string) {
  const [isConnected, setIsConnected] = useState(false);
  const [messages, setMessages] = useState<BroadcastMessage[]>([]);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const roomIdRef = useRef<string>(roomId);

  // Update the ref when roomId changes
  useEffect(() => {
    roomIdRef.current = roomId;
  }, [roomId]);

  // Initialize the channel once
  useEffect(() => {
    if (!roomId) return;

    const channelName = `room:${roomId}`;

    // Check if we already have a channel for this room in the cache
    if (channelCache.has(channelName)) {
      console.log("[Supabase Realtime] Using cached channel for:", channelName);
      channelRef.current = channelCache.get(channelName)!;
      return;
    }

    console.log("[Supabase Realtime] Creating new channel:", channelName);

    // Create a new channel
    const newChannel = supabase.channel(channelName, {
      config: {
        broadcast: { self: true },
      },
    });

    // Set up message handler
    newChannel.on("broadcast", { event: "message" }, (payload) => {
      console.log("[Supabase Realtime] Received message:", payload);
      const message = payload.payload as BroadcastMessage;
      setMessages((prev) => [...prev, message]);
    });

    // Subscribe to the channel
    newChannel.subscribe((status) => {
      console.log("[Supabase Realtime] Subscription status:", status);
      setIsConnected(status === "SUBSCRIBED");
    });

    // Store in cache and ref
    channelCache.set(channelName, newChannel);
    channelRef.current = newChannel;

    // Cleanup function
    return () => {
      // We don't unsubscribe here to maintain the connection
      // The channel will be reused if the component remounts
    };
  }, [roomId]); // Only depend on roomId

  // Function to send a message to the channel
  const sendMessage = useCallback(
    async (message: BroadcastMessage) => {
      const channel = channelRef.current;

      if (!channel) {
        console.warn("[Supabase Realtime] Cannot send message, no channel");
        return false;
      }

      if (!isConnected) {
        console.warn("[Supabase Realtime] Cannot send message, not connected");
        return false;
      }

      console.log("[Supabase Realtime] Sending message:", message);

      // Send message through Supabase Realtime
      channel.send({
        type: "broadcast",
        event: "message",
        payload: message,
      });

      // Also send to our API to handle server-side logic
      try {
        const response = await fetch("/api/realtime", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(message),
        });

        if (!response.ok) {
          console.error(
            "[Supabase Realtime] API error:",
            await response.text()
          );
        }
      } catch (error) {
        console.error("[Supabase Realtime] Failed to send to API:", error);
      }

      return true;
    },
    [isConnected] // Only depend on isConnected
  );

  // Global cleanup function for the application
  useEffect(() => {
    // This will run when the application is closed/refreshed
    return () => {
      // Clean up all channels when the application is closed
      if (typeof window !== "undefined") {
        window.addEventListener("beforeunload", () => {
          channelCache.forEach((channel, name) => {
            console.log("[Supabase Realtime] Cleaning up channel:", name);
            channel.unsubscribe();
          });
          channelCache.clear();
        });
      }
    };
  }, []);

  return {
    isConnected,
    sendMessage,
    messages,
  };
}
