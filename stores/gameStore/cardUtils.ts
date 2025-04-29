import { Card, Suit } from "@/app/types/game";

// Create a complete deck of cards
export function createDeck(): Card[] {
  const suits: Suit[] = ["hearts", "diamonds", "clubs", "spades"];
  const ranks = [
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
  ] as const;

  const deck: Card[] = [];

  suits.forEach((suit) => {
    ranks.forEach((rank) => {
      deck.push({
        id: `${rank}_of_${suit}`,
        suit,
        rank,
      });
    });
  });

  return deck;
}

// Shuffle a deck using Fisher-Yates algorithm
export function shuffleDeck(deck: Card[]): Card[] {
  // Create a copy of the deck to avoid mutating the original
  const shuffled = [...deck];

  // Fisher-Yates shuffle algorithm
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  return shuffled;
}

// Determine the winner of a trick
export function determineTrickWinner(
  trick: Card[],
  trumpSuit: Suit | null
): { playerId: string; playerName: string } {
  if (trick.length === 0) {
    return { playerId: "", playerName: "Unknown" };
  }

  // Get the lead suit (the suit of the first card played)
  const leadSuit = trick[0].suit;

  // Get the rank ordering for comparing cards
  const rankOrder = [
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

  // Find the highest card based on game rules
  let winningCard = trick[0];
  let winningPlayerIndex = 0;

  for (let i = 1; i < trick.length; i++) {
    const card = trick[i];
    const isTrump = trumpSuit && card.suit === trumpSuit;
    const isWinningCardTrump = trumpSuit && winningCard.suit === trumpSuit;

    // If current card is trump and winning card is not, current card wins
    if (isTrump && !isWinningCardTrump) {
      winningCard = card;
      winningPlayerIndex = i;
    }
    // If both cards are trump or neither is trump, compare based on rank
    else if (
      (isTrump && isWinningCardTrump) ||
      (!isTrump && !isWinningCardTrump)
    ) {
      // If same suit, compare ranks
      if (card.suit === winningCard.suit) {
        const cardRankIndex = rankOrder.indexOf(card.rank);
        const winningRankIndex = rankOrder.indexOf(winningCard.rank);

        if (cardRankIndex > winningRankIndex) {
          winningCard = card;
          winningPlayerIndex = i;
        }
      }
      // If current card follows lead suit and winning card doesn't, current card wins
      else if (card.suit === leadSuit && winningCard.suit !== leadSuit) {
        winningCard = card;
        winningPlayerIndex = i;
      }
    }
  }

  // In a real implementation, you'd map the winning player index to a real player
  return {
    playerId: `player-${winningPlayerIndex}`,
    playerName: `Player ${winningPlayerIndex + 1}`,
  };
}

// Helper function to get the next player
export function getNextPlayer(currentPlayer: string): string {
  return currentPlayer === "Player 1"
    ? "Player 2"
    : currentPlayer === "Player 2"
    ? "Player 3"
    : currentPlayer === "Player 3"
    ? "Player 4"
    : "Player 1";
}
