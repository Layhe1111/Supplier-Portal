import { NextResponse } from 'next/server';
import { sendTwilioVerification } from '@/lib/twilioVerify';

export async function POST(request: Request) {
  try {
    const { phone } = await request.json();
    if (typeof phone !== 'string' || !phone.trim()) {
      return NextResponse.json({ error: 'Missing phone number' }, { status: 400 });
    }
    await sendTwilioVerification(phone.trim());
    return NextResponse.json({ ok: true });
  } catch (error) {
    const status =
      typeof (error as { status?: number })?.status === 'number'
        ? (error as { status: number }).status
        : 500;
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unexpected error' },
      { status }
    );
  }
}
