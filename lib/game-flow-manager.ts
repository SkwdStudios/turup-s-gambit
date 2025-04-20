/**
 * Game Flow Manager
 *
 * This module provides a simplified, sequential approach to managing game flow.
 * It coordinates the various phases of the game and ensures proper timing between UI updates.
 */

// Game flow states
export type GameFlowState =
  | "initializing" // Game is being set up
  | "waiting" // Waiting for players to join
  | "preparing" // Game is about to start
  | "dealing" // Cards are being dealt
  | "trump_selection" // Trump suit selection phase
  | "playing" // Main gameplay
  | "round_end" // End of a round
  | "game_end"; // End of the game

// Global state to track game flow
let currentFlowState: GameFlowState = "initializing";
let isUIReady = false;
let isBotVotingInProgress = false;
let lastStateChangeTime = 0;
let registeredCallbacks: Record<string, Function[]> = {};

/**
 * Set the current game flow state
 */
export function setGameFlowState(state: GameFlowState): void {
  const previousState = currentFlowState;
  currentFlowState = state;
  lastStateChangeTime = Date.now();

  console.log(`[GameFlow] State changed: ${previousState} -> ${state}`);

  // Trigger callbacks for this state change
  triggerCallbacks("stateChange", { previous: previousState, current: state });
  triggerCallbacks(state, {});
}

/**
 * Get the current game flow state
 */
export function getGameFlowState(): GameFlowState {
  return currentFlowState;
}

/**
 * Set the UI ready state
 */
export function setUIReadyState(ready: boolean): void {
  const previousState = isUIReady;
  isUIReady = ready;

  console.log(
    `[GameFlow] UI ready state changed: ${previousState} -> ${ready}`
  );

  // Trigger callbacks for UI ready state change
  triggerCallbacks("uiReadyChange", {
    previous: previousState,
    current: ready,
  });
}

/**
 * Get the UI ready state
 */
export function isUIReadyState(): boolean {
  return isUIReady;
}

/**
 * Set the bot voting state
 */
export function setBotVotingState(inProgress: boolean): void {
  const previousState = isBotVotingInProgress;
  isBotVotingInProgress = inProgress;

  console.log(
    `[GameFlow] Bot voting state changed: ${previousState} -> ${inProgress}`
  );

  // Trigger callbacks for bot voting state change
  triggerCallbacks("botVotingChange", {
    previous: previousState,
    current: inProgress,
  });
}

/**
 * Get the bot voting state
 */
export function isBotVotingInProgressState(): boolean {
  return isBotVotingInProgress;
}

/**
 * Register a callback for a specific event
 */
export function registerCallback(event: string, callback: Function): void {
  if (!registeredCallbacks[event]) {
    registeredCallbacks[event] = [];
  }

  registeredCallbacks[event].push(callback);
  console.log(`[GameFlow] Registered callback for event: ${event}`);
}

/**
 * Unregister a callback for a specific event
 */
export function unregisterCallback(event: string, callback: Function): void {
  if (registeredCallbacks[event]) {
    registeredCallbacks[event] = registeredCallbacks[event].filter(
      (cb) => cb !== callback
    );
    console.log(`[GameFlow] Unregistered callback for event: ${event}`);
  }
}

/**
 * Trigger callbacks for a specific event
 */
function triggerCallbacks(event: string, data: any): void {
  if (registeredCallbacks[event]) {
    console.log(
      `[GameFlow] Triggering ${registeredCallbacks[event].length} callbacks for event: ${event}`
    );
    registeredCallbacks[event].forEach((callback) => {
      try {
        callback(data);
      } catch (error) {
        console.error(
          `[GameFlow] Error in callback for event ${event}:`,
          error
        );
      }
    });
  }
}

/**
 * Reset all game flow state
 */
export function resetGameFlow(): void {
  currentFlowState = "initializing";
  isUIReady = false;
  isBotVotingInProgress = false;
  lastStateChangeTime = 0;

  console.log(`[GameFlow] Game flow reset`);

  // Trigger reset callback
  triggerCallbacks("reset", {});
}

/**
 * Execute a function only if the UI is ready
 */
export function executeWhenUIReady(
  fn: Function,
  maxWaitMs: number = 5000
): void {
  if (isUIReady) {
    try {
      fn();
    } catch (error) {
      console.error(
        `[GameFlow] Error executing function when UI is ready:`,
        error
      );
    }
    return;
  }

  console.log(
    `[GameFlow] Waiting for UI to be ready before executing function`
  );

  // Set up a timeout to check periodically
  const startTime = Date.now();
  const checkInterval = setInterval(() => {
    if (isUIReady) {
      clearInterval(checkInterval);
      clearTimeout(timeoutId);
      console.log(`[GameFlow] UI is now ready, executing function`);
      try {
        fn();
      } catch (error) {
        console.error(
          `[GameFlow] Error executing function when UI is ready:`,
          error
        );
      }
    } else if (Date.now() - startTime > maxWaitMs) {
      clearInterval(checkInterval);
      console.log(
        `[GameFlow] Timed out waiting for UI to be ready, executing function anyway`
      );
      try {
        fn();
      } catch (error) {
        console.error(
          `[GameFlow] Error executing function after timeout:`,
          error
        );
      }
    }
  }, 100);

  // Set up a timeout to force execution after maxWaitMs
  const timeoutId = setTimeout(() => {
    clearInterval(checkInterval);
    console.log(
      `[GameFlow] Timed out waiting for UI to be ready, executing function anyway`
    );
    try {
      fn();
    } catch (error) {
      console.error(
        `[GameFlow] Error executing function after timeout:`,
        error
      );
    }
  }, maxWaitMs);
}

/**
 * Schedule a function to run after a delay, but only if the game state hasn't changed
 */
export function scheduleIfStateUnchanged(
  fn: Function,
  delayMs: number,
  requiredState: GameFlowState
): void {
  const currentState = currentFlowState;

  setTimeout(() => {
    if (
      currentFlowState === currentState &&
      currentFlowState === requiredState
    ) {
      console.log(
        `[GameFlow] Executing scheduled function in state: ${currentState}`
      );
      try {
        fn();
      } catch (error) {
        console.error(
          `[GameFlow] Error executing scheduled function in state ${currentState}:`,
          error
        );
      }
    } else {
      console.log(
        `[GameFlow] Skipping scheduled function because state changed: ${currentState} -> ${currentFlowState}`
      );
    }
  }, delayMs);
}
