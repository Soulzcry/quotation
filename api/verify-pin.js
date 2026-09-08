export default function handler(req, res) {
  // Hanya benarkan kaedah POST
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Kaedah tidak dibenarkan' });
  }

  const { pin } = req.body || {};
  const correctPin = process.env.PIN_KEY;

  if (!correctPin) {
    return res.status(500).json({ success: false, message: 'Ralat pelayan: PIN_KEY belum ditetapkan dalam persekitaran .env' });
  }

  if (String(pin).trim() === String(correctPin).trim()) {
    // Jana token sesi ringkas
    const sessionToken = Buffer.from(`session_auth_${Date.now()}`).toString('base64');
    return res.status(200).json({ success: true, token: sessionToken });
  }

  return res.status(401).json({ success: false, message: 'PIN tidak sah. Sila cuba lagi.' });
}
