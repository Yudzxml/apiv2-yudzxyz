async function capcut(url) {
  try {
    const response = await fetch('https://www.genviral.io', {
      method: 'GET',
      headers: {
        'Accept': '*/*',
        'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      },
    });

    const cookies = response.headers.get('set-cookie');
    let cookieHeader = '';
    if (cookies) {
      cookieHeader = cookies.split(',').map(cookie => cookie.trim()).join('; ');
    }

    const apiResponse = await fetch('https://www.genviral.io/api/tools/social-downloader', {
      method: 'POST',
      headers: {
        'accept': '*/*',
        'content-type': 'application/json',
        'cookie': cookieHeader,
      },
      body: JSON.stringify({
        url: url,
      }),
    });

    const apiData = await apiResponse.json();
    return apiData

  } catch (error) {
    console.error('Error occurred:', error);
  }
}

module.exports = async (req, res) => {
    console.info('New request:', req.method, req.query);

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(204).end();

    if (req.method !== 'GET') {
        res.setHeader('Allow', 'GET, OPTIONS');
        return res.status(405).json({
            author: "Yudzxml",
            status: 405,
            error: `Method ${req.method} Not Allowed`,
        });
    }

    const { url } = req.query;
    if (!url) {
        return res.status(400).json({
            author: "Yudzxml",
            status: 400,
            error: 'Parameter "url" wajib diisi',
        });
    }

    const result = await capcut(url);
    return res.status(result.status).json({
        status: 200,
        author: "Yudzxml",
        data: result
    });
};