"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { RealtimeChannel } from "@supabase/supabase-js";

export interface BroadcastMessage {
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
    let connectionAttempts = 0;
    const maxAttempts = 3;
    let connectionTimer: NodeJS.Timeout | null = null;

    // Function to create and set up the channel
    const setupChannel = () => {
      // Check if we already have a channel for this room in the cache
      if (channelCache.has(channelName)) {
        console.log(
          "[Supabase Realtime] Using cached channel for:",
          channelName
        );
        channelRef.current = channelCache.get(channelName)!;
        return;
      }

      console.log("[Supabase Realtime] Creating new channel:", channelName);

      // Create a new channel with retry options
      const newChannel = supabase.channel(channelName, {
        config: {
          broadcast: { self: true },
          presence: { key: "" }, // Enable presence to improve connection reliability
        },
        retryIntervalMs: 5000, // Retry every 5 seconds
        retryTimeoutMs: 60000, // Give up after 1 minute
      });

      // Set up message handler
      newChannel.on("broadcast", { event: "message" }, (payload) => {
        console.log("[Supabase Realtime] Received message:", payload);
        const message = payload.payload as BroadcastMessage;
        setMessages((prev) => [...prev, message]);
      });

      // Subscribe to the channel with error handling
      newChannel.subscribe((status) => {
        console.log("[Supabase Realtime] Subscription status:", status);

        if (status === "SUBSCRIBED") {
          setIsConnected(true);
          connectionAttempts = 0; // Reset attempts on success
        } else if (
          status === "CHANNEL_ERROR" ||
          status === "CLOSED" ||
          status === "TIMED_OUT"
        ) {
          setIsConnected(false);

          // If we haven't reached max attempts, try to reconnect
          if (connectionAttempts < maxAttempts) {
            connectionAttempts++;
            console.log(
              `[Supabase Realtime] Connection failed, retrying (${connectionAttempts}/${maxAttempts})...`
            );

            // Clear any existing timer
            if (connectionTimer) clearTimeout(connectionTimer);

            // Try to reconnect after a delay
            connectionTimer = setTimeout(() => {
              console.log("[Supabase Realtime] Attempting to reconnect...");
              newChannel.unsubscribe();

              // Fall back to REST API if realtime is not working
              if (connectionAttempts >= maxAttempts) {
                console.log(
                  "[Supabase Realtime] Max attempts reached, falling back to REST API"
                );
              } else {
                // Try to reconnect
                newChannel.subscribe();
              }
            }, 3000 * connectionAttempts); // Increasing backoff
          }
        }
      });

      // Store in cache and ref
      channelCache.set(channelName, newChannel);
      channelRef.current = newChannel;
    };

    // Set up the channel
    setupChannel();

    // Cleanup function
    return () => {
      // Clear any pending reconnection timer
      if (connectionTimer) clearTimeout(connectionTimer);

      // We don't unsubscribe here to maintain the connection
      // The channel will be reused if the component remounts
    };
  }, [roomId]); // Only depend on roomId

  // Function to send a message to the channel
  const sendMessage = useCallback(
    async (message: BroadcastMessage) => {
      const channel = channelRef.current;
      let success = false;

      // Always try to send to our API first to ensure server-side logic is executed
      try {
        console.log("[Supabase Realtime] Sending message to API:", message);
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
        } else {
          // API call succeeded
          success = true;
        }
      } catch (error) {
        console.error("[Supabase Realtime] Failed to send to API:", error);
      }

      // Try to send through Supabase Realtime if available
      if (channel && isConnected) {
        try {
          console.log(
            "[Supabase Realtime] Sending message via WebSocket:",
            message
          );

          // Send message through Supabase Realtime
          channel.send({
            type: "broadcast",
            event: "message",
            payload: message,
          });

          // Mark as success even if only one method worked
          success = true;
        } catch (error) {
          console.error(
            "[Supabase Realtime] Failed to send via WebSocket:",
            error
          );
        }
      } else {
        console.warn(
          `[Supabase Realtime] Cannot send via WebSocket: ${
            !channel ? "No channel" : "Not connected"
          }`
        );
        // We already tried the API, so we don't need to do anything else here
      }

      return success;
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
    setMessages,
  };
}
