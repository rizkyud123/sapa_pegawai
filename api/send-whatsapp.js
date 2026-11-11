export default async function handler(req, res) {
  // CORS Headers for API requests from the app
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ status: false, reason: "Method Not Allowed" });
  }

  try {
    const { phone, message } = req.body || {};
    if (!phone || !message) {
      return res.status(400).json({ status: false, reason: "Nomor telepon dan pesan harus diisi" });
    }

    const tokenFonnte = 'FaRp7B4ZtDZxFP3Ck2pT';
    const accountToken = '142TamsyazYbMtkew74hocBQhh2BdUfF9LfbyKpgJg1S9AuN';

    const params = new URLSearchParams();
    params.append('target', phone);
    params.append('message', message);
    params.append('countryCode', '62');
    params.append('token', tokenFonnte);
    params.append('account', accountToken);

    console.log(`[Vercel Serverless] Proxying request for phone: ${phone}`);

    const response = await fetch('https://api.fonnte.com/send', {
      method: 'POST',
      headers: {
        'Authorization': tokenFonnte,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    const responseText = await response.text();
    console.log(`[Vercel Serverless] Fonnte Response:`, responseText);

    let result;
    try {
      result = JSON.parse(responseText);
    } catch (err) {
      return res.status(500).json({
        status: false,
        reason: `Invalid JSON response from Fonnte: ${responseText}`
      });
    }

    if (!response.ok) {
      return res.status(response.status).json({
        status: false,
        reason: result?.reason || result?.message || `Fonnte returned HTTP ${response.status}`
      });
    }

    return res.status(200).json(result);
  } catch (error) {
    console.error("[Vercel Serverless] Request failed:", error);
    return res.status(500).json({
      status: false,
      reason: error.message || "Internal server error"
    });
  }
}
