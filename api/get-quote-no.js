export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Kaedah tidak dibenarkan' });
  }

  const { prefix } = req.body || {}; // Cth: 'MZR/QT' atau 'ALT/EST'
  if (!prefix) {
    return res.status(400).json({ error: 'Prefix syarikat diperlukan' });
  }

  const year = new Date().getFullYear();
  const counterKey = `counter:${prefix}:${year}`;

  // Mengambil pembolehubah persekitaran yang baru disambungkan oleh Vercel tadi
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    return res.status(500).json({
      error: 'Pangkalan data KV/Upstash belum disambungkan ke projek ini di Vercel.'
    });
  }

  try {
    // Panggil arahan INCR secara REST terus ke Upstash Redis
    const redisResponse = await fetch(`${url}/incr/${encodeURIComponent(counterKey)}`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    const data = await redisResponse.json();
    const newCount = data.result; // Menghasilkan angka 1, 2, 3...
    const seq = String(newCount).padStart(4, '0');
    const quoteNo = `${prefix}/${year}/${seq}`;

    return res.status(200).json({ success: true, quoteNo, count: newCount });
  } catch (error) {
    console.error('Ralat Redis:', error);
    return res.status(500).json({ error: 'Gagal menaikkan nombor siri sebut harga' });
  }
}
