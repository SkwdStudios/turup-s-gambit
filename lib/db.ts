// This is a mock database implementation
// In a real application, this would be replaced with a real database connection

import { v4 as uuidv4 } from "uuid"

// Mock user data
const users = [
  {
    id: "1",
    username: "Sir Lancelot",
    email: "lancelot@camelot.com",
    password: "password123",
    avatar: "/assets/avatar.jpg",
    isAnonymous: false,
  },
  {
    id: "2",
    username: "Merlin",
    email: "merlin@camelot.com",
    password: "wizard123",
    avatar: "/assets/team-member-3.jpg",
    isAnonymous: false,
  },
  {
    id: "3",
    username: "Guinevere",
    email: "guinevere@camelot.com",
    password: "queen123",
    avatar: "/assets/team-member-2.jpg",
    isAnonymous: false,
  },
  {
    id: "4",
    username: "Arthur",
    email: "arthur@camelot.com",
    password: "king123",
    avatar: "/assets/team-member-1.jpg",
    isAnonymous: false,
  },
  {
    id: "5",
    username: "Morgana",
    email: "morgana@camelot.com",
    password: "witch123",
    avatar: "/assets/team-member-4.jpg",
    isAnonymous: false,
  },
]

// Mock game data
const games = [
  {
    id: "1",
    roomId: "ABC123",
    mode: "classic",
    players: ["1", "2", "3", "4"],
    status: "completed",
    winner: "team1",
    createdAt: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: "2",
    roomId: "DEF456",
    mode: "frenzy",
    players: ["1", "3", "4", "5"],
    status: "completed",
    winner: "team2",
    createdAt: new Date(Date.now() - 43200000).toISOString(),
  },
  {
    id: "3",
    roomId: "GHI789",
    mode: "classic",
    players: ["2", "3", "4", "5"],
    status: "completed",
    winner: "team1",
    createdAt: new Date(Date.now() - 21600000).toISOString(),
  },
]

// Mock database operations
export const db = {
  users: {
    findByEmail: async (email: string) => {
      return users.find((user) => user.email === email) || null
    },
    findById: async (id: string) => {
      return users.find((user) => user.id === id) || null
    },
    usernameExists: async (username: string) => {
      return users.some((user) => user.username.toLowerCase() === username.toLowerCase())
    },
    createAnonymous: async (username: string) => {
      const newUser = {
        id: uuidv4(),
        username,
        avatar: `/placeholder.svg?height=200&width=200&text=${username.charAt(0)}`,
        isAnonymous: true,
        password: "",
      }
      users.push(newUser)
      return newUser
    },
    create: async (userData: any) => {
      const newUser = {
        id: uuidv4(),
        ...userData,
        isAnonymous: false,
      }
      users.push(newUser)
      return newUser
    },
  },
  games: {
    create: async (gameData: any) => {
      const newGame = {
        id: uuidv4(),
        ...gameData,
        createdAt: new Date().toISOString(),
      }
      games.push(newGame)
      return newGame
    },
    findByRoomId: async (roomId: string) => {
      return games.find((game) => game.roomId === roomId) || null
    },
    findByUserId: async (userId: string) => {
      return games.filter((game) => game.players.includes(userId))
    },
    update: async (id: string, data: any) => {
      const index = games.findIndex((game) => game.id === id)
      if (index !== -1) {
        games[index] = { ...games[index], ...data }
        return games[index]
      }
      return null
    },
  },
}

