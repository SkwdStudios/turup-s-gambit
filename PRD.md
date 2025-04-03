Product Requirements Document (PRD)

Product Name: Turup's Gambit

Author: Rishikesh

Last Updated: April 3, 2025

1. Overview

Turup's Gambit is a real-time fantasy-medieval multiplayer card game. It offers two game modes (Classic and Frenzy), immersive UI/UX, social and replay features, and supports both desktop and mobile play.

2. Goals & Objectives

Deliver an engaging multiplayer card game experience.

Provide responsive, cross-device gameplay.

Ensure smooth, real-time gameplay with animations and audio.

Support social features (chat, emojis) and authentication.

Offer a replay system for post-game analysis.

3. Features

Core Gameplay

Real-time multiplayer (WebSocket + WebRTC)

Classic and Frenzy modes

Card animations (shuffling, playing, floating, flying)

Turn timer

Trump bidding system

Replay recording & playback

User Interface

Dark fantasy medieval theme with Tailwind Zinc colors

Monospace fonts

Responsive game board layout

Card interaction and animations

Social & Communication

Real-time chat with typing indicator

Emoji reactions and in-game emotes

Player presence indicators

Audio & Visuals

Background music and sound effects

Audio player and volume controls

Visual feedback and particle effects

Authentication & Profile

Anonymous login

Email/password & social OAuth

Profile page with stats

Replay System

Move-by-move playback

Game summary and stats

Replay export

Theme Support

Light and dark modes

Theme persistence

4. Technical Requirements

Frontend

Framework: Next.js 15 (App Router)

UI: React 19, Tailwind CSS, shadcn/ui, Radix UI

Animation: Framer Motion

Backend/Infra

Real-time: WebSocket (ws), WebRTC

State Management: React Context + Custom Hooks

Auth: use-auth hook + third-party providers

Data: Game state synced via sockets, replays stored

Testing

Unit, component, integration, E2E, accessibility

Geo-proxied Playwright tests

Deployment

Vercel hosting

CI/CD with environment variables

5. UX Requirements

Mobile-first, adaptive layout

Smooth animation across devices

Persistent audio, theme, and auth state

6. Success Metrics

Daily active users (DAU)

Retention rate

Number of completed games

Chat message volume

Replay views

7. Future Enhancements

Spectator mode

Custom lobbies

Leaderboards

Seasonal themes

Friends system & matchmaking

8. Known Risks

Network instability affecting gameplay

Race conditions in real-time updates

Animation or audio lag on low-end devices

9. Appendices

See DOCUMENTATION.md for technical deep dive.

See roeintheglasses-turup-s-gambits.txt for narrative, lore, and aesthetic foundation.
