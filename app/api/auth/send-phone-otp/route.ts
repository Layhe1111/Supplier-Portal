import { NextResponse } from 'next/server';
import { sendTwilioVerification } from '@/lib/twilioVerify';

const normalizePhone = (value: unknown) => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const normalized = trimmed.replace(/[^+\d]/g, '');
  if (!normalized.startsWith('+')) return null;
  if (!/^\+\d{6,15}$/.test(normalized)) return null;
  return normalized;
};

export async function POST(request: Request) {
  try {
    const { phone } = await request.json();
    const normalized = normalizePhone(phone);
    if (!normalized) {
      return NextResponse.json({ error: 'Invalid phone number' }, { status: 400 });
    }
    if (normalized.startsWith('+86')) {
      return NextResponse.json(
        {
          error:
            'Mainland China SMS is under review. We are currently onboarding this service. / 中國大陸短信正在審核中，我們正在開通服務。',
        },
        { status: 400 }
      );
    }

    await sendTwilioVerification(normalized);
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
