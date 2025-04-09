// Test script for Supabase Realtime
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Create Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// Test room ID
const roomId = 'TEST123';
const channelName = `room:${roomId}`;

// Create a channel
const channel = supabase.channel(channelName);

// Subscribe to the channel
channel
  .on('broadcast', { event: 'message' }, (payload) => {
    console.log('Received message:', payload);
  })
  .subscribe((status) => {
    console.log('Subscription status:', status);
    
    if (status === 'SUBSCRIBED') {
      // Send a test message
      channel.send({
        type: 'broadcast',
        event: 'message',
        payload: {
          type: 'room:joined',
          payload: {
            id: roomId,
            players: [
              { id: '1', name: 'Player 1' },
              { id: '2', name: 'Player 2' }
            ]
          }
        }
      });
      
      // Send another test message after 2 seconds
      setTimeout(() => {
        channel.send({
          type: 'broadcast',
          event: 'message',
          payload: {
            type: 'player:joined',
            payload: { id: '3', name: 'Player 3' }
          }
        });
        
        // Unsubscribe after 5 seconds
        setTimeout(() => {
          console.log('Unsubscribing...');
          channel.unsubscribe();
          console.log('Test completed');
        }, 3000);
      }, 2000);
    }
  });

console.log('Test script running...');
