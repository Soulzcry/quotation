import { createSessionToken, pinsMatch } from '../lib/session.js';

export default function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Kaedah tidak dibenarkan' });
  }

  const { pin } = req.body || {};
  const correctPin = process.env.PIN_KEY;

  if (!correctPin) {
    return res.status(500).json({
      success: false,
      message: 'PIN_KEY belum dikonfigurasikan di Environment Variables.'
    });
  }

  if (pinsMatch(pin, correctPin)) {
    return res.status(200).json({
      success: true,
      token: createSessionToken()
    });
  }

  return res.status(401).json({ success: false, message: 'PIN tidak sah. Sila cuba lagi.' });
}
