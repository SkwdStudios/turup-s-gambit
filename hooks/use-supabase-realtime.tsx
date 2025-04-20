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

      // Special handling for room creation and joining
      // These messages should be retried if they fail
      const isRoomCreationMessage =
        message.type === "player:joined" ||
        message.type === "room:join" ||
        message.type === "room:create";

      // For room creation/joining messages, we'll retry a few times
      const maxRetries = isRoomCreationMessage ? 3 : 1;
      let retryCount = 0;
      let lastError = null;

      while (retryCount < maxRetries) {
        // Always try to send to our API first to ensure server-side logic is executed
        try {
          console.log(
            `[Supabase Realtime] Sending message to API (attempt ${
              retryCount + 1
            }/${maxRetries}):`,
            message
          );
          const response = await fetch("/api/realtime", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(message),
          });

          if (!response.ok) {
            const errorText = await response.text();
            console.error(
              `[Supabase Realtime] API error (attempt ${
                retryCount + 1
              }/${maxRetries}):`,
              errorText
            );

            // Store the error for potential retry
            lastError = new Error(errorText);

            // If this is a "Room not found" error and we're trying to create/join a room,
            // we should retry after a delay
            if (isRoomCreationMessage && errorText.includes("Room not found")) {
              retryCount++;
              if (retryCount < maxRetries) {
                console.log(
                  `[Supabase Realtime] Retrying room creation/join in ${
                    retryCount * 1000
                  }ms...`
                );
                await new Promise((resolve) =>
                  setTimeout(resolve, retryCount * 1000)
                );
                continue; // Try again
              }
            }
          } else {
            // API call succeeded
            success = true;
            break; // Exit the retry loop
          }
        } catch (error) {
          console.error(
            `[Supabase Realtime] Failed to send to API (attempt ${
              retryCount + 1
            }/${maxRetries}):`,
            error
          );
          lastError = error;
        }

        // If we're here and it's a room creation message, retry
        if (isRoomCreationMessage && retryCount < maxRetries - 1) {
          retryCount++;
          console.log(
            `[Supabase Realtime] Retrying room creation/join in ${
              retryCount * 1000
            }ms...`
          );
          await new Promise((resolve) =>
            setTimeout(resolve, retryCount * 1000)
          );
        } else {
          break; // Exit the retry loop for non-room creation messages or if we've reached max retries
        }
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
          lastError = error;
        }
      } else {
        console.warn(
          `[Supabase Realtime] Cannot send via WebSocket: ${
            !channel ? "No channel" : "Not connected"
          }`
        );
        // We already tried the API, so we don't need to do anything else here
      }

      // If this is a room creation/join message and it failed, we should show a more user-friendly error
      if (!success && isRoomCreationMessage && lastError) {
        // Don't show an alert for every error to avoid spamming the user
        // Just log it to the console
        console.error(
          "[Supabase Realtime] Failed to create/join room after multiple attempts",
          lastError
        );

        // For room creation messages, we'll add the message to a retry queue
        // This will be handled by the auto-retry mechanism in the useEffect
        if (typeof window !== "undefined") {
          // Store the failed message in sessionStorage for potential retry
          try {
            const retryQueue = JSON.parse(
              sessionStorage.getItem("realtime-retry-queue") || "[]"
            );
            retryQueue.push(message);
            sessionStorage.setItem(
              "realtime-retry-queue",
              JSON.stringify(retryQueue)
            );
            console.log(
              "[Supabase Realtime] Added message to retry queue",
              message
            );
          } catch (e) {
            console.error(
              "[Supabase Realtime] Failed to add message to retry queue",
              e
            );
          }
        }
      }

      return success;
    },
    [isConnected] // Only depend on isConnected
  );

  // Retry mechanism for failed messages
  useEffect(() => {
    if (!isConnected || !roomId) return;

    // Check if there are any failed messages in the retry queue
    if (typeof window !== "undefined") {
      try {
        const retryQueue = JSON.parse(
          sessionStorage.getItem("realtime-retry-queue") || "[]"
        );
        if (retryQueue.length > 0) {
          console.log(
            "[Supabase Realtime] Found messages in retry queue, attempting to resend",
            retryQueue
          );

          // Clear the retry queue
          sessionStorage.setItem("realtime-retry-queue", "[]");

          // Attempt to resend each message with a delay
          retryQueue.forEach((message: BroadcastMessage, index: number) => {
            // Only retry messages for the current room
            if (message.payload && message.payload.roomId === roomId) {
              setTimeout(() => {
                console.log(
                  "[Supabase Realtime] Retrying message from queue",
                  message
                );
                sendMessage(message).then((success) => {
                  console.log(
                    "[Supabase Realtime] Retry result:",
                    success ? "Success" : "Failed"
                  );
                });
              }, index * 1000); // Stagger retries
            }
          });
        }
      } catch (e) {
        console.error("[Supabase Realtime] Failed to process retry queue", e);
      }
    }
  }, [isConnected, roomId, sendMessage]);

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
