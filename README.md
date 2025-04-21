# Turup's Gambit

A modern card game built with Next.js, featuring real-time multiplayer gameplay and medieval aesthetics.

## Features

- 🎮 Multiple Game Modes
  - Classic Mode
  - Frenzy Mode
- 🎨 Medieval-themed UI with modern aesthetics
- 👥 Real-time multiplayer support
- 🎵 Immersive background music
- 🎯 Game replay system
- 🌓 Light/Dark theme support
- 📱 Responsive design for all devices

## Tech Stack

- **Framework:** Next.js 15
- **Styling:** Tailwind CSS
- **UI Components:**
  - Radix UI
  - Shadcn/ui
- **Authentication:** Custom auth system (with anonymous login support)
- **State Management:** Zustand
- **Animations:** Framer Motion

## Getting Started

### Prerequisites

- Node.js 20+
- pnpm (recommended), npm, or yarn

### Installation

1. Clone the repository:
```bash
git clone https://github.com/SkwdStudios/turup-s-gambit.git
cd turup-s-gambit
```

2. Install dependencies:
```bash
pnpm install
```

3. Run the development server:
```bash
pnpm dev
```

## State Management

This project uses Zustand for state management. The state is organized into several stores:

### Auth Store (`stores/authStore.ts`)

Manages authentication state:
- User information
- Login/logout functionality
- Anonymous authentication

### Game Store (`stores/gameStore.ts`)

Manages game-related state:
- Room information
- Player information
- Game status and phase
- Game mechanics (cards, tricks, trump suit)
- Real-time communication

### UI Store (`stores/uiStore.ts`)

Manages UI-related state:
- Modal visibility
- Loading states
- Card selection
- Toast messages

### Settings Store (`stores/settingsStore.ts`)

Manages user preferences:
- Theme settings
- Music and sound effect settings