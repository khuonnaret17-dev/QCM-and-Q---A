import { NextResponse } from 'next/server';
import { TelegramClient, Api } from 'telegram';
import { StringSession } from 'telegram/sessions';

export async function POST(req: Request) {
  try {
    const { apiId, apiHash, phoneNumber, phoneCodeHash, phoneCode, password, tempSession } = await req.json();

    const client = new TelegramClient(new StringSession(tempSession || ''), parseInt(apiId), apiHash, {
      connectionRetries: 5,
      timeout: 30000,
    });

    await client.connect();
    
    await client.invoke(
      new Api.auth.SignIn({
        phoneNumber,
        phoneCodeHash,
        phoneCode,
      })
    );

    const sessionString = client.session.save() as unknown as string;
    await client.disconnect();

    return NextResponse.json({ sessionString });
  } catch (error: any) {
    console.error('Telegram signIn error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
