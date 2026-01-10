import { NextResponse } from 'next/server';
import { sendTwilioVerification } from '@/lib/twilioVerify';
import { validateE164Phone } from '@/lib/phoneValidation';

export async function POST(request: Request) {
  try {
    const { phone } = await request.json();
    const validation = validateE164Phone(phone);
    if (!validation.ok) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }
    await sendTwilioVerification(validation.normalized);
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
