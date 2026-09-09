export default async function handler(req, res) {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    return res.status(500).json({ error: 'Upstash belum disambungkan' });
  }

  // A. SIMPAN SEBUT HARGA (POST)
  if (req.method === 'POST') {
    const quotationData = req.body;
    const { quoteNo } = quotationData;

    if (!quoteNo) return res.status(400).json({ error: 'No sebut harga tiada' });

    try {
      // 1. Simpan rekod penuh
      await fetch(`${url}/set/quote:${encodeURIComponent(quoteNo)}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify(quotationData)
      });

      // 2. Tambah ke senarai indeks untuk dropdown (LPUSH)
      await fetch(`${url}/lpush/quote_index/${encodeURIComponent(quotationData.companyCode)}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          quoteNo: quoteNo,
          custName: quotationData.customer.name,
          date: quotationData.date
        })
      });

      return res.status(200).json({ success: true });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  // B. AMBIL SENARAI SEBUT HARGA (GET)
  if (req.method === 'GET') {
    const { companyCode, quoteNo } = req.query;

    try {
      // Jika minta 1 sebut harga spesifik:
      if (quoteNo) {
        const response = await fetch(`${url}/get/quote:${encodeURIComponent(quoteNo)}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await response.json();
        return res.status(200).json({ success: true, data: JSON.parse(data.result) });
      }

      // Jika minta senarai indeks sebut harga:
      const response = await fetch(`${url}/lrange/quote_index:${encodeURIComponent(companyCode)}/0/50`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      const list = (data.result || []).map(item => typeof item === 'string' ? JSON.parse(item) : item);
      return res.status(200).json({ success: true, list });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  return res.status(405).end();
}
