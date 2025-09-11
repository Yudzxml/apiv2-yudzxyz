const axios = require('axios');
const qs = require('qs');
const cheerio = require('cheerio');

// Fungsi utama untuk download TikTok
async function tikdownloader(tiktokUrl) {
  try {
    const postData = qs.stringify({ q: tiktokUrl, lang: 'id' });
    const response = await axios.post(
      'https://tikdownloader.io/api/ajaxSearch',
      postData,
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
          'Accept': '*/*',
          'X-Requested-With': 'XMLHttpRequest'
        },
        timeout: 15000
      }
    );

    const html = response.data.data;
    const $ = cheerio.load(html);

    const images = [];
    $('img[src]').each((i, el) => {
      const src = $(el).attr('src');
      if (src) images.push(src);
    });

    const videos = [];
    $('video').each((i, el) => {
      const src = $(el).attr('data-src') || $(el).attr('src');
      if (src) videos.push(src);
    });

    const downloads = [];
    $('a[href]').each((i, el) => {
      const href = $(el).attr('href');
      if (href && href.includes('dl.snapcdn.app')) downloads.push(href);
    });

    return { images, videos, downloads };
  } catch (error) {
    return { error: error.message, images: [], videos: [], downloads: [] };
  }
}

// Fallback API untuk info TikTok
async function getTikTokInfo(url) {
  if (!url) return { success: false, message: 'URL TikTok tidak boleh kosong', raw: null };
  try {
    const resp = await axios.post(
      'https://downloader.bot/api/tiktok/info',
      { url },
      {
        headers: {
          'Accept': 'application/json, text/plain, */*',
          'Content-Type': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/116.0.5845.97 Safari/537.36'
        },
        timeout: 15000
      }
    );

    if (!resp.data.status) return { success: false, message: resp.data.error || 'Unknown error', raw: resp.data };
    return { success: true, data: resp.data.data };
  } catch (err) {
    return { success: false, message: 'Gagal mengambil info TikTok', raw: err.response?.data || err.message };
  }
}

// Export handler untuk Vercel / API endpoint
module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  const { method } = req;

  if (method === 'GET') {
    const { url } = req.query;
    if (!url) return res.status(400).json({ status: 400, author: "Yudzxml", error: 'Parameter "url" wajib diisi.' });

    try {
      // Ambil data TikTok via tikdownloader
      let links = await tikdownloader(url);

      // Jika downloads kosong, fallback ke API lain
      if ((!links.downloads || links.downloads.length === 0) && !links.error) {
        const infoFallback = await getTikTokInfo(url);
        if (infoFallback.success) {
          links.downloads = infoFallback.data.download || [];
          links.videos = infoFallback.data.video ? [infoFallback.data.video] : [];
          links.images = infoFallback.data.thumbnail ? [infoFallback.data.thumbnail] : [];
        }
      }

      return res.status(200).json({
        status: 200,
        author: "Yudzxml",
        url,
        links
      });

    } catch (err) {
      return res.status(500).json({ status: 500, author: "Yudzxml", error: err.message });
    }

  } else {
    res.setHeader("Allow", ["GET"]);
    res.status(405).end(`Method ${method} Not Allowed`);
  }
};