"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
import { useRouter } from "next/navigation"
import { db } from "@/lib/db"

export interface User {
  id: string
  username: string
  email?: string
  avatar?: string
  isAnonymous: boolean
}

interface AuthContextType {
  user: User | null
  isLoading: boolean
  login: (email: string, password: string) => Promise<void>
  loginAnonymously: (username: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  // Check for existing session on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        // In a real app, this would be an API call to validate the session
        const storedUser = localStorage.getItem("courtPieceUser")
        if (storedUser) {
          setUser(JSON.parse(storedUser))
        }
      } catch (error) {
        console.error("Auth check failed:", error)
      } finally {
        setIsLoading(false)
      }
    }

    checkAuth()
  }, [])

  const login = async (email: string, password: string) => {
    setIsLoading(true)
    try {
      // In a real app, this would be an API call to your auth endpoint
      // Simulate API call and database query
      await new Promise((resolve) => setTimeout(resolve, 1000))

      // Find user in "database"
      const user = await db.users.findByEmail(email)

      if (!user || user.password !== password) {
        throw new Error("Invalid credentials")
      }

      const authUser: User = {
        id: user.id,
        username: user.username,
        email: user.email,
        avatar: user.avatar,
        isAnonymous: false,
      }

      // Store user in localStorage (in a real app, this would be a secure HTTP-only cookie)
      localStorage.setItem("courtPieceUser", JSON.stringify(authUser))
      setUser(authUser)
    } catch (error) {
      console.error("Login failed:", error)
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  const loginAnonymously = async (username: string) => {
    setIsLoading(true)
    try {
      // In a real app, this would be an API call to your auth endpoint
      // Simulate API call and database query
      await new Promise((resolve) => setTimeout(resolve, 1000))

      // Check if username exists
      const exists = await db.users.usernameExists(username)
      if (exists) {
        throw new Error("Username already exists")
      }

      // Create anonymous user
      const newUser = await db.users.createAnonymous(username)

      const authUser: User = {
        id: newUser.id,
        username: newUser.username,
        avatar: newUser.avatar,
        isAnonymous: true,
      }

      // Store user in localStorage (in a real app, this would be a secure HTTP-only cookie)
      localStorage.setItem("courtPieceUser", JSON.stringify(authUser))
      setUser(authUser)
    } catch (error) {
      console.error("Anonymous login failed:", error)
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  const logout = () => {
    localStorage.removeItem("courtPieceUser")
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, isLoading, login, loginAnonymously, logout }}>{children}</AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}

