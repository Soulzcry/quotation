import { createHmac, timingSafeEqual } from 'crypto';

const SESSION_TTL_MS = 12 * 60 * 60 * 1000;
const ALLOWED_PREFIXES = new Set([
  'MZR/QT',
  'MZR/DO',
  'MZR/INV',
  'MZR/RC',
  'ALT/EST',
  'ALT/DO',
  'ALT/INV',
  'ALT/RC'
]);

function sessionSecret() {
  return process.env.SESSION_SECRET || process.env.PIN_KEY || '';
}

function hmacHex(payload) {
  return createHmac('sha256', sessionSecret()).update(payload).digest('hex');
}

function safeEqualString(a, b) {
  const left = Buffer.from(String(a));
  const right = Buffer.from(String(b));
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

export function createSessionToken() {
  const issuedAt = Date.now();
  const expiresAt = issuedAt + SESSION_TTL_MS;
  const payload = `${issuedAt}.${expiresAt}`;
  return `${payload}.${hmacHex(payload)}`;
}

export function verifySessionToken(token) {
  if (!token || typeof token !== 'string') return false;
  if (!sessionSecret()) return false;

  const parts = token.split('.');
  if (parts.length !== 3) return false;

  const [issuedAt, expiresAt, signature] = parts;
  if (!/^\d+$/.test(issuedAt) || !/^\d+$/.test(expiresAt)) return false;

  const payload = `${issuedAt}.${expiresAt}`;
  const expected = hmacHex(payload);
  if (!safeEqualString(signature, expected)) return false;
  if (Date.now() > Number(expiresAt)) return false;
  return true;
}

export function pinsMatch(inputPin, storedPin) {
  return safeEqualString(String(inputPin).trim(), String(storedPin).trim());
}

export function getBearerToken(req) {
  const header = req.headers.authorization || req.headers.Authorization || '';
  const match = String(header).match(/^Bearer\s+(.+)$/i);
  return match ? match[1].trim() : '';
}

export function requireAuth(req, res) {
  if (!verifySessionToken(getBearerToken(req))) {
    res.status(401).json({
      success: false,
      error: 'Sesi tidak sah atau telah tamat. Sila log masuk semula.'
    });
    return false;
  }
  return true;
}

export function isAllowedPrefix(prefix) {
  return ALLOWED_PREFIXES.has(String(prefix || ''));
}
