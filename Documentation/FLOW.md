# Turup's Gambit - Game Flow Documentation

## Classic Mode (Court Piece Style)

### Overview

This is a detailed game flow for Turup's Gambit Classic Mode, based on the traditional Court Piece (also known as Court Piece, Hokm, or Rung). The game is played by four players in teams of two, using a standard 52-card deck.

---

## 1. Players and Teams

- **Total Players**: 4
- **Team Formation**: 2 teams of 2 players each
- **Seating Arrangement**: Teammates sit opposite each other in a cross setup

---

## 2. Deck

- Standard **52-card deck** (no jokers)
- Card ranks from high to low: A, K, Q, J, 10, 9, 8, 7, 6, 5, 4, 3, 2

---

## 3. Objective

- **Primary Goal**: Win more tricks than the opposing team
- **Win Conditions**:
  - Win **7 tricks first** to claim a **baazi**
  - Win **all 13 tricks** to claim a **kot** (or **grand baazi**) for bonus points

---

## 4. Game Setup and Flow

### 4.1 Waiting Room

- Players join the game room
- Host can start the game when 4 players have joined
- Bots can be added to fill empty slots
- Teams are automatically assigned

### 4.2 Initial Deal Phase

- Dealer deals **5 cards** to each player in a clockwise direction
- Players review their initial hand

### 4.3 Trump Selection Phase

- All players vote for their preferred trump suit based on their initial 5 cards
- Players can see the number of cards they have in each suit
- The system tallies votes and determines the final trump suit
- If tied, a random selection is made from the tied suits
- The host can force bots to vote

### 4.4 Bidding Phase

- Players place bids on how many tricks they think their team will win
- Minimum bid is 7 (required to win)
- Maximum bid is 13 (all tricks)
- Players can see other players' bids
- Bidding proceeds in a clockwise direction

### 4.5 Final Deal Phase

- After bidding is complete, the remaining **8 cards** are dealt to each player
- Each player now has **13 cards total**

### 4.6 Playing Phase

- The highest bidder leads the first trick
- Play proceeds clockwise
- Players must follow the suit of the leading card if possible
- If a player cannot follow suit, they may play any card including trumps
- Trump cards beat all non-trump cards
- The highest card of the led suit wins unless a trump is played
- The winner of a trick leads the next trick

### 4.7 Game End

- Game ends when one team wins 7 tricks or all 13 tricks have been played
- Winning 7+ tricks grants a baazi to that team
- Winning all 13 tricks grants a kot (grand baazi)
- Score is calculated based on the number of tricks won
- Players can view a game summary and replay

---

## 5. Card Play Rules

### 5.1 Following Suit

- **Mandatory**: Players must follow the led suit if they have cards of that suit
- **Exception**: If a player has no cards of the led suit, they may play any card

### 5.2 Trick Winner Determination

1. If no trumps are played, the highest card of the led suit wins
2. If trumps are played, the highest trump card wins regardless of other cards
3. In case of identical ranks, the first one played wins

### 5.3 Card Hierarchy

- **Within Trump Suit**: A (high) → 2 (low)
- **Within Non-Trump Suits**: A (high) → 2 (low)

---

## 6. Frenzy Mode

### Overview

Frenzy Mode adds excitement with special rules and faster gameplay:

- **Bidding**: No bidding phase
- **Trump Selection**: Randomly assigned trump suit
- **Turn Timer**: Shorter turn timer (15 seconds)
- **Special Powers**: Each suit grants a special power when used as trump
  - Hearts: Extra point for each heart trick
  - Spades: Can lead with any card after winning a trick
  - Diamonds: See one opponent's card
  - Clubs: One card can be played out of turn

---

## 7. UI/UX Flow

### 7.1 Game Board Layout

- Central play area shows cards in play
- Player hands are displayed at their respective positions
- Trump suit indicator is prominently displayed
- Current trick count and score are always visible
- Turn indicator shows whose turn it is
- Timer shows remaining time for the current turn

### 7.2 Special Indicators

- Current player highlight
- Valid card highlighting
- Trump card highlighting
- Trick winner animation
- Game phase transition animations

### 7.3 Interactive Elements

- Clickable cards in hand
- Trump selection interface
- Bidding interface
- Chat and emoji reactions
- Game controls (settings, exit, etc.)

---

## 8. Game Progression Sequence

1. **Pre-Game**: Room creation, player joining, team assignment
2. **Game Start**: Initial deal of 5 cards
3. **Trump Selection**: All players vote on trump suit
4. **Bidding**: Players bid on number of tricks
5. **Final Deal**: Remaining 8 cards dealt
6. **Gameplay**: 13 tricks played in sequence
7. **Scoring**: Points calculated based on tricks won
8. **End Game**: Results displayed, option to play again or return to lobby

---

## 9. Strategic Elements

- **Trump Management**: Strategic use of trump cards
- **Card Counting**: Tracking played cards
- **Team Signaling**: Implicit communication through card play
- **Trick Planning**: Multi-trick strategy
- **Trump Conservation**: Saving trump cards for critical moments
- **Suit Control**: Maintaining control of non-trump suits

---

## Summary

Turup's Gambit provides an engaging digital implementation of the classic Court Piece card game with enhanced visual effects, social features, and multiple game modes. The game balances traditional gameplay with modern digital features for an optimal gaming experience.
