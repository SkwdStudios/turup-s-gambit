import prisma from '../prisma';
import { v4 as uuidv4 } from 'uuid';

export const db = {
  users: {
    findByEmail: async (email: string) => {
      return prisma.user.findUnique({
        where: { email }
      });
    },
    findById: async (id: string) => {
      return prisma.user.findUnique({
        where: { id }
      });
    },
    usernameExists: async (username: string) => {
      const user = await prisma.user.findUnique({
        where: { username }
      });
      return !!user;
    },
    createAnonymous: async (username: string) => {
      return prisma.user.create({
        data: {
          id: uuidv4(),
          username,
          avatar: `/placeholder.svg?height=200&width=200&text=${username.charAt(0)}`,
          isAnonymous: true
        }
      });
    },
    create: async (userData: any) => {
      return prisma.user.create({
        data: {
          id: uuidv4(),
          ...userData,
          isAnonymous: false
        }
      });
    },
  },
  games: {
    create: async (gameData: any) => {
      return prisma.game.create({
        data: {
          id: uuidv4(),
          ...gameData,
          players: {
            create: gameData.players.map((userId: string, index: number) => ({
              userId,
              team: Math.floor(index / 2) + 1,
              position: index + 1
            }))
          }
        },
        include: {
          players: true
        }
      });
    },
    findByRoomId: async (roomId: string) => {
      return prisma.game.findUnique({
        where: { roomId },
        include: {
          players: {
            include: {
              user: true
            }
          },
          session: true,
          replay: true
        }
      });
    },
    findByUserId: async (userId: string) => {
      return prisma.game.findMany({
        where: {
          players: {
            some: {
              userId
            }
          }
        },
        include: {
          players: {
            include: {
              user: true
            }
          },
          session: true,
          replay: true
        },
        orderBy: {
          createdAt: 'desc'
        }
      });
    },
    update: async (id: string, data: any) => {
      return prisma.game.update({
        where: { id },
        data,
        include: {
          players: {
            include: {
              user: true
            }
          },
          session: true,
          replay: true
        }
      });
    },
    createSession: async (gameId: string) => {
      return prisma.gameSession.create({
        data: {
          gameId
        }
      });
    },
    createReplay: async (gameId: string, moves: any, summary: any) => {
      return prisma.gameReplay.create({
        data: {
          gameId,
          moves,
          summary
        }
      });
    }
  }
};