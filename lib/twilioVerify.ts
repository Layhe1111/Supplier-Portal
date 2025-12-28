const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_VERIFY_SERVICE_SID = process.env.TWILIO_VERIFY_SERVICE_SID;

const getTwilioConfig = () => {
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_VERIFY_SERVICE_SID) {
    throw new Error('Twilio Verify is not configured');
  }

  return {
    accountSid: TWILIO_ACCOUNT_SID,
    authToken: TWILIO_AUTH_TOKEN,
    serviceSid: TWILIO_VERIFY_SERVICE_SID,
  };
};

const callVerifyApi = async (
  endpoint: 'Verifications' | 'VerificationCheck',
  params: Record<string, string>
) => {
  const { accountSid, authToken, serviceSid } = getTwilioConfig();
  const auth = Buffer.from(`${accountSid}:${authToken}`).toString('base64');
  const body = new URLSearchParams(params);

  const res = await fetch(
    `https://verify.twilio.com/v2/Services/${serviceSid}/${endpoint}`,
    {
      method: 'POST',
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body,
    }
  );

  const payload = await res.json().catch(() => null);
  if (!res.ok) {
    const message = payload?.message || 'Twilio verification request failed';
    const error = new Error(message) as Error & { status?: number };
    error.status = res.status;
    throw error;
  }

  return payload;
};

export const sendTwilioVerification = async (phone: string) =>
  callVerifyApi('Verifications', { To: phone, Channel: 'sms' });

export const checkTwilioVerification = async (phone: string, code: string) =>
  callVerifyApi('VerificationCheck', { To: phone, Code: code });
