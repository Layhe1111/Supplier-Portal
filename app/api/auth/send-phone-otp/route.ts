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
    const rawMessage = error instanceof Error ? error.message : 'Unexpected error';
    const message = rawMessage.includes('Messages to China require use case vetting')
      ? '中国号码暂时未支持，正在开发中。'
      : rawMessage;
    return NextResponse.json(
      { error: message },
      { status }
    );
  }
}
