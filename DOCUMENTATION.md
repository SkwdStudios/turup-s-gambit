# Turup's Gambit Documentation

## Project Overview
Turup's Gambit is a modern card game built with Next.js, featuring real-time multiplayer gameplay and medieval aesthetics.

## Detailed Component Documentation

### Game Components
1. **Game Board (game-board.tsx)** - Main game interface that renders the playing area, player hands, and game state.
2. **Bidding Panel (bidding-panel.tsx)** - Handles player bids with interactive UI and validation logic.
3. **Card Components (card.tsx)** - Renders individual cards with animations and click handlers.
4. **Trump Bidding (trump-bidding.tsx)** - Manages trump suit selection with visual indicators.

### UI Components
1. **Navbar (navbar.tsx)** - Provides main navigation with responsive design and auth state awareness.
2. **Chat System (chat.tsx)** - Real-time messaging with emoji support and message history.
3. **Audio Player (audio-player.tsx)** - Controls background music with volume and track selection.
4. **Theme Provider (theme-provider.tsx)** - Implements dark/light mode with context-based theming.

### Hooks
1. **use-auth** - Manages authentication state, token storage, and user session.
2. **use-game-state** - Central game logic including turn management and scoring.
3. **use-music-player** - Audio control logic with playlist management.

### Utilities
1. **db.ts** - Database connection and query utilities.
2. **utils.ts** - Helper functions for game logic and data transformation.

## Tech Stack
- **Framework:** Next.js 15
- **Styling:** Tailwind CSS
- **UI Components:**
  - Radix UI
  - Shadcn/ui
- **Authentication:** Custom auth system (with anonymous login support)
- **State Management:** React Context + Custom Hooks
- **Animations:** Framer Motion

## Directory Structure
```
app/
  about/ - Static about page
  game/
    [roomId]/ - Dynamic game room routes
  login/ - Authentication pages
  privacy-policy/ - Legal documentation
  profile/ - User profile management
  reset-password/ - Password recovery flow
components/
  game-components/ - Core game UI elements
    bidding-panel.tsx - Bid interface
    card.tsx - Card rendering
    game-board.tsx - Main game layout
    trump-bidding.tsx - Trump selection UI
  ui/ - Reusable UI components
    (shadcn/ui components)
  audio-player.tsx - Music controls
  chat.tsx - In-game messaging
  navbar.tsx - Navigation bar
hooks/
  use-auth.tsx - Auth state management
  use-game-state.tsx - Game logic
  use-music-player.tsx - Audio controls
lib/
  db.ts - Database utilities
  utils.ts - Helper functions
public/
  assets/ - Game assets
    (game assets)
```

## Key Components
### Game Components
1. **Game Board** - Main game interface
2. **Bidding Panel** - Handles player bids
3. **Card Components** - Card display and animations
4. **Trump Bidding** - Trump selection system

### UI Components
1. **Navbar** - Main navigation
2. **Chat System** - In-game communication
3. **Audio Player** - Background music control
4. **Theme Provider** - Dark/light mode support

## Hooks
1. **use-auth** - Authentication logic
2. **use-game-state** - Game state management
3. **use-music-player** - Audio controls

## Data Flow
1. Game state is managed via React Context and custom hooks
2. UI components subscribe to game state changes
3. Player actions trigger state updates through custom hooks

## Assets
- Audio files for background music
- Placeholder images for cards and user avatars
- Game logo and branding elements