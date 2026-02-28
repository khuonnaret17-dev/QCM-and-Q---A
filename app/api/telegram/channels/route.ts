import { NextResponse } from 'next/server';
import { TelegramClient, Api } from 'telegram';
import { StringSession } from 'telegram/sessions';

export async function POST(req: Request) {
  try {
    const { apiId, apiHash, sessionString } = await req.json();

    const client = new TelegramClient(new StringSession(sessionString), parseInt(apiId), apiHash, {
      connectionRetries: 5,
      timeout: 30000,
    });

    await client.connect();
    const dialogs = await client.getDialogs({});
    
    const channels = dialogs
      .filter(d => d.isChannel || d.isGroup)
      .map(d => ({
        id: d.id?.toString() || '',
        title: d.title || 'Untitled',
        type: d.isChannel ? 'Channel' : 'Group'
      }));

    await client.disconnect();
    return NextResponse.json({ channels });
  } catch (error: any) {
    console.error('Telegram channels error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
