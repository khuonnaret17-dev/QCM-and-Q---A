import { NextResponse } from 'next/server';
import { TelegramClient, Api } from 'telegram';
import { StringSession } from 'telegram/sessions';

export async function POST(req: Request) {
  const { apiId, apiHash, sessionString, sourceChannel, targetChannel } = await req.json();

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const sendUpdate = (msg: string, type: 'info' | 'success' | 'error' = 'info', progress?: {current: number, total: number}) => {
        controller.enqueue(encoder.encode(JSON.stringify({ msg, type, progress }) + '\n'));
      };

      try {
        const client = new TelegramClient(new StringSession(sessionString), parseInt(apiId), apiHash, {
          connectionRetries: 5,
          timeout: 30000, // 30 seconds timeout for requests
        });

        await client.connect();
        sendUpdate("Connected to Telegram", "info");

        // Get entities
        sendUpdate("Resolving channels...", "info");
        const source = await client.getEntity(sourceChannel);
        const target = await client.getEntity(targetChannel);

        sendUpdate("Fetching members from source...", "info");
        // Use a reasonable limit to avoid timeout on large groups
        const participants = await client.getParticipants(source, { limit: 200 });
        
        sendUpdate(`Found ${participants.length} members. Starting migration...`, "info", { current: 0, total: participants.length });

        for (let i = 0; i < participants.length; i++) {
          const user = participants[i];
          try {
            // Delay to avoid flood
            await new Promise(resolve => setTimeout(resolve, 3000 + Math.random() * 2000));
            
            await client.invoke(new Api.channels.InviteToChannel({
              channel: target,
              users: [user.id]
            }));

            sendUpdate(`Added ${user.firstName || user.username || user.id}`, "success", { current: i + 1, total: participants.length });
          } catch (err: any) {
            sendUpdate(`Failed to add ${user.firstName || user.username}: ${err.message}`, "error", { current: i + 1, total: participants.length });
            if (err.message.includes('PEER_FLOOD')) {
              sendUpdate("Rate limit reached. Stopping.", "error");
              break;
            }
          }
        }

        sendUpdate("Migration completed.", "info");
        await client.disconnect();
        controller.close();
      } catch (error: any) {
        sendUpdate("Critical Error: " + error.message, "error");
        controller.close();
      }
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'application/x-ndjson',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
