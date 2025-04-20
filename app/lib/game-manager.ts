import { GameRoom, Player, GameState, Card, Suit, Rank } from "../types/game";

export class GameManager {
  private rooms: Map<string, GameRoom>;
  private static instance: GameManager;

  private constructor() {
    this.rooms = new Map();
  }

  public static getInstance(): GameManager {
    if (!GameManager.instance) {
      GameManager.instance = new GameManager();
    }
    return GameManager.instance;
  }

  public getRooms(): Map<string, GameRoom> {
    return this.rooms;
  }

  private generateRoomId(): string {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  }

  private createNewRoom(): GameRoom {
    const roomId = this.generateRoomId();
    const newRoom: GameRoom = {
      id: roomId,
      players: [],
      gameState: {
        currentTurn: null,
        trumpSuit: null,
        currentBid: 0,
        currentBidder: null,
        trickCards: {},
        roundNumber: 0,
        gamePhase: "waiting",
        leadSuit: null,
        teams: {
          royals: [],
          rebels: [],
        },
        scores: {
          royals: 0,
          rebels: 0,
        },
        consecutiveTricks: {
          royals: 0,
          rebels: 0,
        },
        lastTrickWinner: null,
        dealerIndex: 0,
        trumpCaller: null,
      },
      createdAt: Date.now(),
      lastActivity: Date.now(),
    };
    this.rooms.set(roomId, newRoom);
    return newRoom;
  }

  public findOrCreateRoom(): GameRoom {
    // Find a room with less than 4 players
    for (const room of this.rooms.values()) {
      if (room.players.length < 4 && room.gameState.gamePhase === "waiting") {
        return room;
      }
    }
    // If no suitable room found, create a new one
    return this.createNewRoom();
  }

  public addPlayerToRoom(
    roomId: string,
    playerName: string,
    playerId?: string,
    isBot?: boolean
  ): Player {
    const room = this.rooms.get(roomId);
    if (!room) {
      throw new Error("Room not found");
    }

    if (room.players.length >= 4) {
      throw new Error("Room is full");
    }

    // Check if player already exists in the room
    const existingPlayer = room.players.find((p) => p.name === playerName);
    if (existingPlayer) {
      return existingPlayer;
    }

    // Generate a deterministic ID based on the player name if not provided
    // This ensures the same player always gets the same ID
    const id =
      playerId ||
      `player_${playerName.replace(/\s+/g, "_").toLowerCase()}_${Math.random()
        .toString(36)
        .substring(2, 6)}`;

    // Check if this is the first player (should be host)
    const isFirstPlayer = room.players.length === 0;

    const newPlayer: Player = {
      id,
      name: playerName,
      hand: [],
      score: 0,
      isReady: false,
      isHost: isFirstPlayer, // First player is always the host
      isBot: isBot || false, // Set isBot property if provided
    };

    console.log(
      `Adding player ${playerName} to room ${
        room.id
      }, isHost: ${isFirstPlayer}, isBot: ${isBot || false}`
    );

    room.players.push(newPlayer);
    room.lastActivity = Date.now();
    return newPlayer;
  }

  public removePlayerFromRoom(roomId: string, playerId: string): void {
    const room = this.rooms.get(roomId);
    if (!room) return;

    room.players = room.players.filter((p) => p.id !== playerId);
    room.lastActivity = Date.now();

    // If room is empty, remove it
    if (room.players.length === 0) {
      this.rooms.delete(roomId);
    } else if (room.players.length > 0) {
      // Assign new host if needed
      const hasHost = room.players.some((p) => p.isHost);
      if (!hasHost) {
        room.players[0].isHost = true;
      }
    }
  }

  public getRoom(roomId: string): GameRoom | undefined {
    return this.rooms.get(roomId);
  }

  public updateGameState(roomId: string, gameState: Partial<GameState>): void {
    const room = this.rooms.get(roomId);
    if (!room) return;

    room.gameState = { ...room.gameState, ...gameState };
    room.lastActivity = Date.now();
  }

  public cleanupStaleRooms(maxAge: number = 30 * 60 * 1000): void {
    const now = Date.now();
    for (const [roomId, room] of this.rooms.entries()) {
      if (now - room.lastActivity > maxAge) {
        this.rooms.delete(roomId);
      }
    }
  }

  private generateDeck(): Card[] {
    const deck: Card[] = [];
    const suits: Suit[] = ["hearts", "diamonds", "clubs", "spades"];
    const ranks: Rank[] = [
      "2",
      "3",
      "4",
      "5",
      "6",
      "7",
      "8",
      "9",
      "10",
      "J",
      "Q",
      "K",
      "A",
    ];

    for (const suit of suits) {
      for (const rank of ranks) {
        deck.push({
          suit,
          rank,
          id: `${suit}-${rank}`,
        });
      }
    }

    return this.shuffleDeck(deck);
  }

  private shuffleDeck(deck: Card[]): Card[] {
    const shuffled = [...deck];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  public startGame(roomId: string): void {
    const room = this.rooms.get(roomId);
    if (!room) return;

    if (room.players.length !== 4) {
      throw new Error("Game can only start with 4 players");
    }

    // Set up teams - partners sit opposite each other (0,2 and 1,3)
    const royals = [room.players[0].id, room.players[2].id]; // The Royals team
    const rebels = [room.players[1].id, room.players[3].id]; // The Rebels team

    // Generate and shuffle the deck
    const deck = this.generateDeck();

    // Initial deal - 5 cards per player
    const initialCardsPerPlayer = 5;
    room.players.forEach((player, index) => {
      const start = index * initialCardsPerPlayer;
      const end = start + initialCardsPerPlayer;
      player.hand = deck.slice(start, end);
    });

    // Store the deck for later use when dealing remaining cards
    room.deck = deck;

    // Set the dealer (random for the first game)
    const dealerIndex = Math.floor(Math.random() * 4);

    // The player to the dealer's left is the trump caller
    const trumpCallerIndex = (dealerIndex + 1) % 4;
    const trumpCaller = room.players[trumpCallerIndex].id;

    // Update game state
    room.gameState = {
      ...room.gameState,
      currentTurn: trumpCaller, // Trump caller goes first
      trumpSuit: null,
      currentBid: 0,
      currentBidder: null,
      trickCards: {},
      roundNumber: 1,
      gamePhase: "initial_deal", // Start with initial deal phase
      teams: {
        royals,
        rebels,
      },
      scores: {
        royals: 0,
        rebels: 0,
      },
      consecutiveTricks: {
        royals: 0,
        rebels: 0,
      },
      lastTrickWinner: null,
      dealerIndex,
      trumpCaller,
      trumpVotes: {}, // Initialize empty trump votes
      playersVoted: [], // Initialize empty players voted array
    };

    room.lastActivity = Date.now();
  }

  // Method to handle trump voting
  public voteForTrump(roomId: string, playerId: string, suit: Suit): void {
    const room = this.rooms.get(roomId);
    if (!room) return;

    if (room.gameState.gamePhase !== "initial_deal") {
      throw new Error("Cannot vote for trump when not in initial deal phase");
    }

    // Check if player has already voted
    if (room.gameState.playersVoted?.includes(playerId)) {
      throw new Error("Player has already voted");
    }

    // Record the vote
    if (!room.gameState.trumpVotes) {
      room.gameState.trumpVotes = {};
    }
    if (!room.gameState.playersVoted) {
      room.gameState.playersVoted = [];
    }

    room.gameState.trumpVotes[playerId] = suit;
    room.gameState.playersVoted.push(playerId);

    // Check if all players have voted
    if (room.gameState.playersVoted.length === room.players.length) {
      // Count votes for each suit
      const voteCount: Record<Suit, number> = {
        hearts: 0,
        diamonds: 0,
        clubs: 0,
        spades: 0,
      };

      // Count votes
      Object.values(room.gameState.trumpVotes).forEach((votedSuit) => {
        voteCount[votedSuit]++;
      });

      // Find the suit with the most votes
      let maxVotes = 0;
      let selectedSuit: Suit | null = null;

      (Object.entries(voteCount) as [Suit, number][]).forEach(
        ([suit, count]) => {
          if (count > maxVotes) {
            maxVotes = count;
            selectedSuit = suit;
          }
        }
      );

      // If there's a tie, use the trump caller's vote
      if (maxVotes === 1 && room.gameState.trumpCaller) {
        selectedSuit =
          room.gameState.trumpVotes[room.gameState.trumpCaller] || selectedSuit;
      }

      // Set the trump suit
      room.gameState.trumpSuit = selectedSuit;

      // Move to bidding phase
      room.gameState.gamePhase = "bidding";
    }

    room.lastActivity = Date.now();
  }

  // Method to deal the remaining 8 cards after trump selection
  public dealRemainingCards(roomId: string): void {
    const room = this.rooms.get(roomId);
    if (!room) return;

    if (room.gameState.gamePhase !== "bidding") {
      throw new Error("Cannot deal remaining cards before trump selection");
    }

    // Use the stored deck if available, otherwise generate a new one
    let remainingDeck: Card[];

    if (room.deck) {
      // Use the stored deck
      const dealtCards = room.players.flatMap((player) => player.hand);
      remainingDeck = room.deck.filter(
        (card) => !dealtCards.some((dealtCard) => dealtCard.id === card.id)
      );
    } else {
      // Generate a new deck and filter out already dealt cards
      const deck = this.generateDeck();
      const dealtCards = room.players.flatMap((player) => player.hand);
      remainingDeck = deck.filter(
        (card) => !dealtCards.some((dealtCard) => dealtCard.id === card.id)
      );
    }

    // Deal 8 more cards to each player
    const additionalCardsPerPlayer = 8;
    room.players.forEach((player, index) => {
      const start = index * additionalCardsPerPlayer;
      const end = start + additionalCardsPerPlayer;
      const additionalCards = remainingDeck.slice(start, end);
      player.hand = [...player.hand, ...additionalCards];
    });

    // Update game state to final deal phase
    room.gameState.gamePhase = "final_deal";
    room.lastActivity = Date.now();
  }

  // Method to start the playing phase after final deal
  public startPlayingPhase(roomId: string): void {
    const room = this.rooms.get(roomId);
    if (!room) return;

    if (room.gameState.gamePhase !== "final_deal") {
      throw new Error("Cannot start playing before final deal");
    }

    // The player to the dealer's left leads the first trick
    const firstPlayerIndex = (room.gameState.dealerIndex + 1) % 4;
    const firstPlayerId = room.players[firstPlayerIndex].id;

    // Update game state to playing phase
    room.gameState.gamePhase = "playing";
    room.gameState.currentTurn = firstPlayerId;
    room.gameState.leadSuit = null; // No lead suit yet
    room.lastActivity = Date.now();
  }

  // Method to handle playing a card
  public playCard(roomId: string, playerId: string, card: Card): void {
    const room = this.rooms.get(roomId);
    if (!room) return;

    if (room.gameState.gamePhase !== "playing") {
      throw new Error("Cannot play card when game is not in playing phase");
    }

    if (room.gameState.currentTurn !== playerId) {
      throw new Error("Not your turn");
    }

    // Find the player
    const playerIndex = room.players.findIndex((p) => p.id === playerId);
    if (playerIndex === -1) {
      throw new Error("Player not found");
    }
    const player = room.players[playerIndex];

    // Check if the player has the card
    const cardIndex = player.hand.findIndex((c) => c.id === card.id);
    if (cardIndex === -1) {
      throw new Error("Player does not have this card");
    }

    // Check if the player is following suit
    if (room.gameState.leadSuit && card.suit !== room.gameState.leadSuit) {
      // Check if the player has any cards of the lead suit
      const hasSuit = player.hand.some(
        (c) => c.suit === room.gameState.leadSuit
      );
      if (hasSuit) {
        throw new Error("Must follow suit");
      }
    }

    // If this is the first card played in the trick, set the lead suit
    if (Object.keys(room.gameState.trickCards).length === 0) {
      room.gameState.leadSuit = card.suit;
    }

    // Remove the card from the player's hand
    player.hand = player.hand.filter((c) => c.id !== card.id);

    // Add the card to the trick
    room.gameState.trickCards[playerId] = card;

    // If all players have played a card, determine the winner of the trick
    if (Object.keys(room.gameState.trickCards).length === 4) {
      this.resolveTrick(roomId);
    } else {
      // Move to the next player (clockwise)
      const nextPlayerIndex = (playerIndex + 1) % 4;
      room.gameState.currentTurn = room.players[nextPlayerIndex].id;
    }

    room.lastActivity = Date.now();
  }

  // Method to resolve a trick and determine the winner
  private resolveTrick(roomId: string): void {
    const room = this.rooms.get(roomId);
    if (!room) return;

    const { trickCards, leadSuit, trumpSuit, teams } = room.gameState;
    const trickEntries = Object.entries(trickCards);

    // Determine the winning card
    let winningEntry = trickEntries[0];
    let winningCard = winningEntry[1];

    for (let i = 1; i < trickEntries.length; i++) {
      const [playerId, card] = trickEntries[i];

      // Trump beats all non-trump cards
      if (
        trumpSuit &&
        card.suit === trumpSuit &&
        winningCard.suit !== trumpSuit
      ) {
        winningEntry = [playerId, card];
        winningCard = card;
        continue;
      }

      // If both cards are trump, higher trump wins
      if (
        trumpSuit &&
        card.suit === trumpSuit &&
        winningCard.suit === trumpSuit
      ) {
        if (this.getCardValue(card) > this.getCardValue(winningCard)) {
          winningEntry = [playerId, card];
          winningCard = card;
        }
        continue;
      }

      // If no trumps involved, higher card of lead suit wins
      if (card.suit === leadSuit && winningCard.suit === leadSuit) {
        if (this.getCardValue(card) > this.getCardValue(winningCard)) {
          winningEntry = [playerId, card];
          winningCard = card;
        }
      }
    }

    const winningPlayerId = winningEntry[0];

    // Determine which team won the trick
    const winningTeam = teams.royals.includes(winningPlayerId)
      ? "royals"
      : "rebels";
    const losingTeam = winningTeam === "royals" ? "rebels" : "royals";

    // Update scores
    room.gameState.scores[winningTeam]++;

    // Update consecutive tricks
    if (
      room.gameState.lastTrickWinner &&
      ((teams.royals.includes(room.gameState.lastTrickWinner) &&
        winningTeam === "royals") ||
        (teams.rebels.includes(room.gameState.lastTrickWinner) &&
          winningTeam === "rebels"))
    ) {
      // Same team won consecutive tricks
      room.gameState.consecutiveTricks[winningTeam]++;
    } else {
      // Reset consecutive tricks for the winning team
      room.gameState.consecutiveTricks[winningTeam] = 1;
      // Reset consecutive tricks for the losing team
      room.gameState.consecutiveTricks[losingTeam] = 0;
    }

    // Check if a team has won 7 consecutive tricks (baazi)
    if (room.gameState.consecutiveTricks[winningTeam] >= 7) {
      room.gameState.gamePhase = "finished";
      return;
    }

    // Check if a team has won 7 tricks total
    if (room.gameState.scores[winningTeam] >= 7) {
      // Check if all 13 tricks have been played (kot/grand baazi)
      if (
        room.gameState.scores[winningTeam] +
          room.gameState.scores[losingTeam] >=
        13
      ) {
        room.gameState.gamePhase = "finished";
        return;
      }
    }

    // Update last trick winner
    room.gameState.lastTrickWinner = winningPlayerId;

    // Clear the trick cards
    room.gameState.trickCards = {};
    room.gameState.leadSuit = null;

    // Winner of the trick leads the next one
    room.gameState.currentTurn = winningPlayerId;

    // Check if the game is over (all cards played)
    const allCardsPlayed = room.players.every((p) => p.hand.length === 0);
    if (allCardsPlayed) {
      room.gameState.gamePhase = "finished";
    }
  }

  // Helper method to get the numeric value of a card for comparison
  private getCardValue(card: Card): number {
    const rankValues: Record<Rank, number> = {
      "2": 2,
      "3": 3,
      "4": 4,
      "5": 5,
      "6": 6,
      "7": 7,
      "8": 8,
      "9": 9,
      "10": 10,
      J: 11,
      Q: 12,
      K: 13,
      A: 14,
    };
    return rankValues[card.rank];
  }
}
