# Product Requirements Document (PRD)

## Product Name: Turup's Gambit

**Author:** Rishikesh

Last Updated: April 29, 2025

## 1. Overview

Turup's Gambit is a real-time fantasy-medieval multiplayer card game. It offers two game modes (Classic and Frenzy), immersive UI/UX, social and replay features, and supports both desktop and mobile play.

## 2. Goals & Objectives

- Deliver an engaging multiplayer card game experience.
- Provide responsive, cross-device gameplay.
- Ensure smooth, real-time gameplay with animations and audio.
- Support social features (chat, emojis) and authentication.
- Offer a replay system for post-game analysis.

## 3. Features

### Core Gameplay

- Real-time multiplayer using Supabase Realtime
- Classic and Frenzy modes
- Card animations (shuffling, playing, floating, flying)
- Turn timer
- Trump bidding system
- Replay recording & playback

### User Interface

- Dark fantasy medieval theme with Tailwind Zinc colors
- Monospace fonts
- Responsive game board layout
- Card interaction and animations
- Loading skeleton states

### Social & Communication

- Real-time chat with typing indicator
- Emoji reactions and in-game emotes
- Player presence indicators
- Bot players for filling empty slots

### Audio & Visuals

- Background music and sound effects
- Audio player and volume controls
- Visual feedback and particle effects
- Card animations and transitions

### Authentication & Profile

- Anonymous login
- Email/password & social OAuth
- Profile page with stats
- Protected routes

### Replay System

- Move-by-move playback
- Game summary and stats
- Replay export

### Theme Support

- Light and dark modes
- Theme persistence

## 4. Technical Requirements

### Frontend

- **Framework:** Next.js 15 (App Router)
- **UI:** React 19, Tailwind CSS, shadcn/ui, Radix UI
- **Animation:** Framer Motion
- **State Management:** Zustand

### Backend/Infra

- **Real-time:** Supabase Realtime
- **Auth:** Supabase Auth
- **Database:** Supabase PostgreSQL
- **Storage:** Supabase Storage

### Testing

- Unit tests (Jest)
- Component tests (React Testing Library)
- E2E tests (Cypress)
- Accessibility tests

### Deployment

- Vercel hosting
- CI/CD with GitHub Actions
- Environment variable management

## 5. UX Requirements

- Mobile-first, adaptive layout
- Smooth animation across devices
- Persistent audio, theme, and auth state
- Skeleton loaders for all components
- Toast notifications for important events

## 6. Success Metrics

- Daily active users (DAU)
- Retention rate
- Number of completed games
- Chat message volume
- Replay views

## 7. Game Modes

### Classic Mode

- Four players in two teams
- Initial deal of 5 cards
- Trump selection voting
- Bidding phase
- Final deal of 8 more cards
- Play 13 tricks
- First team to win 7 tricks claims a baazi

### Frenzy Mode

- Faster gameplay with 15-second turns
- Random trump selection
- No bidding phase
- Special powers based on trump suit:
  - Hearts: Extra points for heart tricks
  - Spades: Lead with any card after winning
  - Diamonds: See one opponent's card
  - Clubs: Play one card out of turn

## 8. Future Enhancements

- Spectator mode
- Custom lobbies
- Leaderboards
- Seasonal themes
- Friends system & matchmaking
- Mobile app

## 9. Known Risks

- Network instability affecting gameplay
- Race conditions in real-time updates
- Animation or audio lag on low-end devices
- Authentication edge cases

## 10. Project Timeline

- **Phase 1:** Core game mechanics and UI (Completed)
- **Phase 2:** Social features and authentication (Completed)
- **Phase 3:** Replay system and advanced animations (Completed)
- **Phase 4:** Performance optimization and testing (In Progress)
- **Phase 5:** Launch and monitoring (Planned)

## 11. Technical Architecture

### Data Flow

1. User authenticates with Supabase Auth
2. Game state stored in Zustand stores
3. Actions synchronized via Supabase Realtime
4. Database updates for persistent data
5. Realtime updates for all connected clients

### Key Components

- Game board with responsive layout
- Trump selection voting system
- Bidding interface
- Card play mechanics
- Chat and emoji system
- Audio player with controls
- Replay viewer

## 12. Appendices

- See DOCUMENTATION.md for technical deep dive
- See DATABASE.md for database schema
- See REALTIME_IMPLEMENTATION.md for realtime architecture
- See FLOW.md for detailed game flow
