"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Send } from "lucide-react"

interface ChatProps {
  roomId: string
  players: string[]
}

interface ChatMessage {
  id: number
  sender: string
  text: string
  timestamp: Date
}

export function Chat({ roomId, players }: ChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [newMessage, setNewMessage] = useState("")
  const scrollAreaRef = useRef<HTMLDivElement>(null)

  // Add some initial messages
  useEffect(() => {
    if (players.length > 0) {
      setMessages([
        {
          id: 1,
          sender: "System",
          text: `Welcome to game room ${roomId}!`,
          timestamp: new Date(),
        },
        {
          id: 2,
          sender: players[1],
          text: "Hello everyone, good luck!",
          timestamp: new Date(Date.now() - 60000),
        },
        {
          id: 3,
          sender: players[2],
          text: "May the best team win!",
          timestamp: new Date(Date.now() - 30000),
        },
      ])
    }
  }, [roomId, players])

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight
    }
  }, [messages])

  const handleSendMessage = () => {
    if (!newMessage.trim()) return

    const message: ChatMessage = {
      id: Date.now(),
      sender: players[0] || "You",
      text: newMessage.trim(),
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, message])
    setNewMessage("")

    // Simulate AI response
    setTimeout(() => {
      const responses = [
        "Interesting move!",
        "Well played!",
        "I see your strategy...",
        "Hmm, not what I expected.",
        "Let me think about this...",
      ]

      const aiMessage: ChatMessage = {
        id: Date.now() + 1,
        sender: players[Math.floor(Math.random() * (players.length - 1)) + 1],
        text: responses[Math.floor(Math.random() * responses.length)],
        timestamp: new Date(),
      }

      setMessages((prev) => [...prev, aiMessage])
    }, 2000)
  }

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  }

  return (
    <div className="h-full flex flex-col border-2 border-primary/30 rounded-lg bg-card/80 backdrop-blur-sm overflow-hidden">
      <div className="p-3 border-b border-border/50">
        <h3 className="font-medieval text-lg">Game Chat</h3>
      </div>

      <ScrollArea className="flex-1 p-3" ref={scrollAreaRef}>
        <div className="space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex flex-col ${message.sender === (players[0] || "You") ? "items-end" : "items-start"}`}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs text-muted-foreground">{formatTime(message.timestamp)}</span>
                <span className={`text-sm font-medium ${message.sender === "System" ? "text-secondary" : ""}`}>
                  {message.sender}
                </span>
              </div>
              <div
                className={`px-3 py-2 rounded-lg max-w-[80%] ${
                  message.sender === (players[0] || "You")
                    ? "bg-primary/20 text-primary-foreground"
                    : message.sender === "System"
                      ? "bg-secondary/20 text-secondary-foreground"
                      : "bg-muted text-foreground"
                }`}
              >
                {message.text}
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>

      <div className="p-3 border-t border-border/50">
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault()
            handleSendMessage()
          }}
        >
          <Input
            className="medieval-input"
            placeholder="Type a message..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
          />
          <Button type="submit" size="icon" className="medieval-button">
            <Send size={18} />
          </Button>
        </form>
      </div>
    </div>
  )
}

