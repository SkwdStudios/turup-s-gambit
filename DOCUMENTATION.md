# Turup's Gambit Documentation

## Project Overview

Turup's Gambit is a modern card game built with Next.js 15, featuring real-time multiplayer gameplay, medieval aesthetics, and rich interactive features. The game implements a sophisticated bidding system, real-time card animations, and social features to create an engaging multiplayer experience.

## Architecture Overview

The application follows a layered architecture pattern:

1. **Presentation Layer**: React components and UI elements
2. **Business Logic Layer**: Custom hooks and game state management
3. **Data Layer**: WebSocket connections and database interactions
4. **Infrastructure Layer**: Authentication, routing, and utility functions

## Detailed Component Documentation

### Game Components

1. **Game Board (game-board.tsx)**

   - Main game interface that renders the playing area
   - Handles player hands and game state visualization
   - Implements responsive layout for different screen sizes
   - Manages card positioning and game flow

2. **Bidding Panel (bidding-panel.tsx)**

   - Interactive bid interface with validation
   - Real-time bid updates across players
   - Visual feedback for valid/invalid bids
   - Bid history tracking

3. **Card Components**:

   - **card.tsx**
     - Individual card rendering with animations
     - Click handlers for card selection
     - Card state management (selected, played, etc.)
     - Visual effects for card interactions
   - **card-shuffle-animation.tsx**
     - Smooth shuffling animations
     - Physics-based card movement
     - Configurable animation parameters
   - **floating-cards.tsx**
     - Floating card effects for emphasis
     - Parallax movement based on mouse position
     - Performance-optimized animations
   - **flying-cards.tsx**
     - Card movement between positions
     - Trajectory calculations
     - Collision detection and handling

4. **Trump Bidding (trump-bidding.tsx)**

   - Trump suit selection interface
   - Visual indicators for selected trump
   - Animation effects for trump reveal
   - Validation of trump selection rules

5. **Game Mode Selector (game-mode-selector.tsx)**

   - Mode selection interface
   - Mode-specific rule explanations
   - Player count validation
   - Mode transition animations

6. **Turn Timer (turn-timer.tsx)**

   - Configurable turn duration
   - Visual countdown display
   - Time extension handling
   - Turn timeout actions

7. **Replay Summary (replay-summary.tsx)**
   - Game replay visualization
   - Player statistics display
   - Move-by-move analysis
   - Export functionality

### UI Components

1. **Navbar (navbar.tsx)**

   - Responsive navigation design
   - Authentication state management
   - Theme toggle integration
   - Mobile menu implementation

2. **Chat System**:

   - **chat.tsx**
     - Real-time message synchronization
     - Message history management
     - Typing indicators
     - Message formatting
   - **emoji-display.tsx**
     - Emoji rendering optimization
     - Custom emoji support
     - Emoji search functionality
   - **emoji-reactions.tsx**
     - Quick reaction system
     - Reaction counting
     - Animation effects
   - **in-game-emotes.tsx**
     - Game-specific emote system
     - Emote cooldown management
     - Emote visibility controls

3. **Audio System**:

   - **audio-player.tsx**
     - Audio context management
     - Playlist handling
     - Volume controls
     - Audio state persistence
   - **music-controls.tsx**
     - Playback controls
     - Track information display
     - Audio visualization
     - Mute/unmute functionality

4. **Theme Provider (theme-provider.tsx)**

   - Theme state management
   - CSS variable injection
   - Theme transition animations
   - System theme detection

5. **Login Modal (login-modal.tsx)**

   - Multiple authentication methods
   - Form validation
   - Error handling
   - Loading states

6. **Visual Effects (visual-effects.tsx)**
   - Particle effects
   - Screen transitions
   - Highlight effects
   - Performance optimization

### Hooks

1. **use-auth**

   - Token management
   - Session persistence
   - Authentication state
   - User profile management

2. **use-game-state**

   - Game rules implementation
   - Turn management
   - Score calculation
   - Game phase transitions

3. **use-music-player**
   - Audio playback control
   - Playlist management
   - Volume state
   - Audio effects

## Tech Stack Details

### Core Technologies

- **Next.js 15**

  - App Router implementation
  - Server-side rendering
  - API route handlers
  - Middleware support

- **React 19**

  - Concurrent features
  - Server components
  - Suspense boundaries
  - Error boundaries

- **TypeScript**
  - Strict type checking
  - Custom type definitions
  - Interface definitions
  - Type safety

### UI Framework

- **Tailwind CSS**

  - Custom theme configuration
  - Responsive design utilities
  - Animation classes
  - Dark mode support

- **Radix UI**

  - Accessible components
  - Unstyled primitives
  - Custom styling
  - Component composition

- **Shadcn/ui**
  - Pre-built components
  - Theme integration
  - Component variants
  - Customization options

### State Management

- **React Context**

  - Global state management
  - Performance optimization
  - State updates
  - Context providers

- **Custom Hooks**
  - Reusable logic
  - State abstraction
  - Side effects
  - Performance optimization

### Real-time Features

- **WebSocket (ws)**
  - Connection management
  - Message handling
  - Reconnection logic
  - Error handling

### Form Handling

- **React Hook Form**

  - Form validation
  - Error handling
  - Form state
  - Performance optimization

- **Zod**
  - Schema validation
  - Type inference
  - Error messages
  - Custom validators

### Animation and Effects

- **Framer Motion**
  - Component animations
  - Gesture handling
  - Animation orchestration
  - Performance optimization

### Additional Libraries

- **date-fns** - Date formatting and manipulation
- **Recharts** - Data visualization
- **Sonner** - Toast notifications
- **Embla Carousel** - Slider components
- **Vaul** - Drawer components
- **React Resizable Panels** - Layout management

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
  game-board.tsx - Main game layout
  bidding-panel.tsx - Bid interface
  card.tsx - Card rendering
  card-shuffle-animation.tsx - Shuffle effects
  floating-cards.tsx - Floating card animations
  flying-cards.tsx - Card movement animations
  game-mode-selector.tsx - Game mode selection
  turn-timer.tsx - Turn timing system
  replay-summary.tsx - Game replay interface
  chat.tsx - In-game messaging
  emoji-display.tsx - Emoji rendering
  emoji-reactions.tsx - Reaction system
  in-game-emotes.tsx - Game emotes
  audio-player.tsx - Music controls
  music-controls.tsx - Audio interface
  navbar.tsx - Navigation bar
  login-modal.tsx - Authentication UI
  theme-provider.tsx - Theme management
  visual-effects.tsx - Visual effects
  ui/ - Reusable UI components
    (shadcn/ui components)
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

## Key Features

### Real-time Multiplayer

- WebSocket-based synchronization
- Player presence detection
- Game state replication
- Conflict resolution
- Connection recovery

### Rich Animations

- Card movement physics
- Shuffling effects
- Visual feedback
- Performance optimization
- Animation coordination

### Social Features

- Real-time chat
- Emoji reactions
- Player avatars
- Presence indicators
- Social interactions

### Audio System

- Background music
- Sound effects
- Volume control
- Audio state persistence
- Performance optimization

### Game Modes

- Multiple rule sets
- Mode-specific UI
- Rule validation
- Mode transitions
- Player count management

### Replay System

- Game recording
- Move playback
- Statistics tracking
- Analysis tools
- Export functionality

### Responsive Design

- Mobile-first approach
- Adaptive layouts
- Touch interactions
- Performance optimization
- Cross-device testing

### Theme Support

- Dark/light modes
- Custom themes
- Theme transitions
- System preference detection
- Theme persistence

## Data Flow

### Game State Management

1. State initialization
2. Player actions
3. State validation
4. State updates
5. UI synchronization

### Real-time Communication

1. WebSocket connection
2. Message handling
3. State synchronization
4. Error recovery
5. Connection management

### Audio and Visual Effects

1. Effect triggers
2. Animation coordination
3. Performance optimization
4. State management
5. Cleanup handling

## Assets Management

- Audio files (MP3, WAV)
- Card images (SVG, PNG)
- User avatars (WebP)
- Emoji sets (SVG)
- Game logo (SVG)
- Branding elements (SVG, PNG)

## Performance Optimization

- Code splitting
- Lazy loading
- Image optimization
- Animation performance
- State management
- Memory management

## Security Considerations

- Authentication
- Authorization
- Data validation
- Input sanitization
- Error handling
- Secure communication

## Testing Strategy

- Unit tests
- Component tests
- Integration tests
- E2E tests
- Performance tests
- Accessibility tests

## Deployment

- Vercel hosting
- CI/CD pipeline
- Environment configuration
- Build optimization
- Monitoring setup
