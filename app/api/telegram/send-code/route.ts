import { NextResponse } from 'next/server';
import { TelegramClient, Api } from 'telegram';
import { StringSession } from 'telegram/sessions';

export async function POST(req: Request) {
  try {
    const { apiId, apiHash, phoneNumber } = await req.json();

    if (!apiId || !apiHash || !phoneNumber) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const client = new TelegramClient(new StringSession(''), parseInt(apiId), apiHash, {
      connectionRetries: 5,
      timeout: 30000,
    });

    await client.connect();
    const result = await client.sendCode(
      {
        apiId: parseInt(apiId),
        apiHash: apiHash,
      },
      phoneNumber
    );

    const tempSession = client.session.save() as unknown as string;
    await client.disconnect();

    return NextResponse.json({ 
      phoneCodeHash: result.phoneCodeHash,
      tempSession: tempSession
    });
  } catch (error: any) {
    console.error('Telegram sendCode error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
