import crypto from 'crypto';

function getSecret(): string {
  const s = process.env.JWT_SECRET;
  if (!s) throw new Error('JWT_SECRET not configured');
  return s;
}

export interface OAuthStatePayload {
  userId: string;
  clientId?: string;
}

/**
 * Encodes an OAuth state with HMAC-SHA256 signature to prevent forgery.
 * Format: base64url({ data: JSON, sig: hex })
 */
export function encodeState(payload: OAuthStatePayload): string {
  const nonce = crypto.randomBytes(16).toString('hex');
  const data = JSON.stringify({ ...payload, nonce });
  const sig = crypto.createHmac('sha256', getSecret()).update(data).digest('hex');
  return Buffer.from(JSON.stringify({ data, sig })).toString('base64url');
}

/**
 * Decodes and verifies an OAuth state. Throws 400 on any tampering.
 */
export function decodeState(state: string): OAuthStatePayload {
  let parsed: { data: string; sig: string };
  try {
    parsed = JSON.parse(Buffer.from(state, 'base64url').toString('utf8'));
  } catch {
    throw Object.assign(new Error('Invalid OAuth state'), { status: 400 });
  }

  const expected = crypto.createHmac('sha256', getSecret()).update(parsed.data).digest('hex');
  if (!crypto.timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(parsed.sig, 'hex'))) {
    throw Object.assign(new Error('Invalid OAuth state signature'), { status: 400 });
  }

  try {
    const { userId, clientId } = JSON.parse(parsed.data) as OAuthStatePayload & { nonce: string };
    return { userId, clientId };
  } catch {
    throw Object.assign(new Error('Malformed OAuth state payload'), { status: 400 });
  }
}
