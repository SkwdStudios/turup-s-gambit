// Helper functions for bot voting

/**
 * Makes bots vote for trump suits
 * @param botPlayers Array of bot players
 * @param roomId Current room ID
 * @param sendMessage Function to send messages
 */
export function makeBotVote(
  botPlayers: any[],
  roomId: string,
  sendMessage: (message: any) => void,
  votingComplete: boolean
) {
  if (botPlayers.length === 0 || votingComplete) return;
  
  // Available suits
  const suits = ["hearts", "diamonds", "clubs", "spades"];
  
  // Add a slight delay for each bot to make it seem more natural
  botPlayers.forEach((bot, index) => {
    setTimeout(() => {
      // Choose a random suit for the bot to vote for
      const randomSuit = suits[Math.floor(Math.random() * suits.length)];
      console.log(`Bot ${bot.name} is voting for ${randomSuit}`);
      
      // Send the vote
      sendMessage({
        type: "game:select-trump",
        payload: { roomId, suit: randomSuit, botId: bot.id }
      });
    }, 1000 + (index * 1500)); // Stagger bot votes
  });
}
