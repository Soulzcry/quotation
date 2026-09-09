import { requireAuth } from '../lib/session.js';

function redisEnv() {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  return { url, token };
}

async function redisCall(url, token, path, body) {
  const options = {
    headers: { Authorization: `Bearer ${token}` }
  };
  if (body !== undefined) {
    options.method = 'POST';
    options.body = typeof body === 'string' ? body : JSON.stringify(body);
  }
  const response = await fetch(`${url}${path}`, options);
  return response.json();
}

function parseRedisValue(value) {
  if (value == null) return null;
  return typeof value === 'string' ? JSON.parse(value) : value;
}

export default async function handler(req, res) {
  if (!requireAuth(req, res)) return;

  const { url, token } = redisEnv();
  if (!url || !token) {
    return res.status(500).json({ error: 'Upstash belum disambungkan' });
  }

  if (req.method === 'POST') {
    const quotationData = req.body || {};
    const { quoteNo, companyCode, docType } = quotationData;

    if (!quoteNo) return res.status(400).json({ error: 'Nombor rujukan tiada' });
    if (!companyCode) return res.status(400).json({ error: 'Kod syarikat tiada' });

    try {
      await redisCall(url, token, `/set/quote:${encodeURIComponent(quoteNo)}`, quotationData);

      const shouldIndex = !docType || docType === 'QUOT';
      if (shouldIndex) {
        const indexKey = encodeURIComponent(companyCode);
        const existing = await redisCall(url, token, `/lrange/quote_index:${indexKey}/0/199`);
        const list = (existing.result || []).map(parseRedisValue);
        const alreadyIndexed = list.some(item => item && item.quoteNo === quoteNo);

        if (!alreadyIndexed) {
          await redisCall(url, token, `/lpush/quote_index:${indexKey}`, {
            quoteNo,
            custName: quotationData.customer?.name || '',
            date: quotationData.date
          });
        }
      }

      return res.status(200).json({ success: true });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  if (req.method === 'GET') {
    const { companyCode, quoteNo } = req.query;

    try {
      if (quoteNo) {
        const data = await redisCall(url, token, `/get/quote:${encodeURIComponent(quoteNo)}`);
        const parsed = parseRedisValue(data.result);
        return res.status(200).json({ success: true, data: parsed });
      }

      if (!companyCode) {
        return res.status(400).json({ error: 'Kod syarikat tiada' });
      }

      const data = await redisCall(
        url,
        token,
        `/lrange/quote_index:${encodeURIComponent(companyCode)}/0/50`
      );
      const seen = new Set();
      const list = (data.result || [])
        .map(parseRedisValue)
        .filter(item => {
          if (!item || !item.quoteNo || seen.has(item.quoteNo)) return false;
          seen.add(item.quoteNo);
          return true;
        });

      return res.status(200).json({ success: true, list });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  return res.status(405).json({ message: 'Kaedah tidak dibenarkan' });
}
