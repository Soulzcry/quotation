import { isAllowedPrefix, requireAuth } from '../lib/session.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Kaedah tidak dibenarkan' });
  }

  if (!requireAuth(req, res)) return;

  const { prefix } = req.body || {};
  if (!isAllowedPrefix(prefix)) {
    return res.status(400).json({ error: 'Prefix dokumen tidak sah' });
  }

  const year = new Date().getFullYear();
  const counterKey = `counter:${prefix}:${year}`;

  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    return res.status(500).json({
      error: 'Pangkalan data Upstash Redis belum disambungkan dalam Vercel.'
    });
  }

  try {
    const redisResponse = await fetch(`${url}/incr/${encodeURIComponent(counterKey)}`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    const data = await redisResponse.json();
    const newCount = data.result;
    const seq = String(newCount).padStart(4, '0');
    const quoteNo = `${prefix}/${year}/${seq}`;

    return res.status(200).json({ success: true, quoteNo, count: newCount });
  } catch (error) {
    console.error('Ralat Upstash INCR:', error);
    return res.status(500).json({ error: 'Gagal menaikkan nombor siri dokumen' });
  }
}
