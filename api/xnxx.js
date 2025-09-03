const axios = require('axios');
const cheerio = require('cheerio');

const getCookiesFromMainSite = async () => {
  try {
    const response = await axios.get('https://www.xnxx.com/');
    const cookies = response.headers['set-cookie'];
    const cookieString = cookies ? cookies.map(cookie => cookie.split(';')[0]).join('; ') : '';
    return cookieString;
  } catch (error) {
    console.error('Error while fetching cookies:', error);
    return null;
  }
};

const search = async (query) => {
  try {
    const cookies = await getCookiesFromMainSite();
    if (!cookies) {
      console.log('No cookies found.');
      return;
    }

    const response = await axios.get(`https://www.xnxx.com/search/${encodeURIComponent(query)}`, {
      headers: {
        'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
        'accept-language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
        'cache-control': 'no-cache',
        'device-memory': '8',
        'pragma': 'no-cache',
        'sec-ch-ua': '"Chromium";v="139", "Not;A=Brand";v="99"',
        'sec-ch-ua-arch': '""',
        'sec-ch-ua-bitness': '""',
        'sec-ch-ua-full-version': '"139.0.7339.0"',
        'sec-ch-ua-full-version-list': '"Chromium";v="139.0.7339.0", "Not;A=Brand";v="99.0.0.0"',
        'sec-ch-ua-mobile': '?1',
        'sec-ch-ua-model': '"CPH2209"',
        'sec-ch-ua-platform': '"Android"',
        'sec-ch-ua-platform-version': '"11.0.0"',
        'sec-fetch-dest': 'document',
        'sec-fetch-mode': 'navigate',
        'sec-fetch-site': 'same-origin',
        'sec-fetch-user': '?1',
        'upgrade-insecure-requests': '1',
        'viewport-width': '980',
        'cookie': cookies,
        'Referer': 'https://www.xnxx.com/',
        'Referrer-Policy': 'no-referrer-when-downgrade',
      },
    });

    const htmlContent = response.data;
    const $ = cheerio.load(htmlContent);

    const videos = [];

    $('.thumb-block').each((i, el) => {
      const videoEl = $(el);

      const videoId = videoEl.attr('data-id') || null;

      const linkEl = videoEl.find('.thumb a').first();
      const videoUrl = linkEl.attr('href') || null;
      const title = linkEl.attr('title') || linkEl.text().trim() || null;

      const imgEl = videoEl.find('.thumb img').first();
      const thumbnail = imgEl.attr('data-src') || imgEl.attr('src') || null;

      const uploaderEl = videoEl.find('.uploader a').first();
      const uploaderName = uploaderEl.find('.name').text().trim() || null;
      const uploaderUrl = uploaderEl.attr('href') || null;

      const metadataEl = videoEl.find('.thumb-under .metadata').first();

      let views = null;
      let rating = null;
      const rightSpan = metadataEl.find('span.right').first();
      if (rightSpan.length) {
        const viewsText = rightSpan.contents().filter(function() {
          return this.type === 'text';
        }).text().trim();
        views = viewsText || null;

        const ratingSpan = rightSpan.find('span.superfluous').first();
        rating = ratingSpan.text().trim() || null;
      }

      let duration = null;
      const metadataText = metadataEl.text().replace(/\s+/g, ' ').trim();
      const durationMatch = metadataText.match(/(\d+\s?(?:min|sec))/i);
      if (durationMatch) {
        duration = durationMatch[1];
      }

      let resolution = null;
      const resolutionEl = metadataEl.find('.video-hd').first();
      if (resolutionEl.length) {
        resolution = resolutionEl.text().replace(/[-\s]/g, '').trim() || null;
      }

      videos.push({
        videoId,
        videoUrl: 'https://www.xnxx.com' + videoUrl,
        title,
        thumbnail,
        uploaderName,
        uploaderUrl: 'https://www.xnxx.com' + uploaderUrl,
        views,
        rating,
        duration,
        resolution
      });
    });

    return videos;
  } catch (error) {
    console.error('Error fetching search results:', error);
  }
};

const download = async (videoUrl) => {
  try {
    const response = await axios.get(videoUrl, {
      headers: {
        'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
        'accept-language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
        'cache-control': 'no-cache',
        'device-memory': '8',
        'pragma': 'no-cache',
        'sec-ch-ua': '"Chromium";v="139", "Not;A=Brand";v="99"',
        'sec-ch-ua-arch': '""',
        'sec-ch-ua-bitness': '""',
        'sec-ch-ua-full-version': '"139.0.7339.0"',
        'sec-ch-ua-full-version-list': '"Chromium";v="139.0.7339.0", "Not;A=Brand";v="99.0.0.0"',
        'sec-ch-ua-mobile': '?1',
        'sec-ch-ua-model': '"CPH2209"',
        'sec-ch-ua-platform': '"Android"',
        'sec-ch-ua-platform-version': '"11.0.0"',
        'sec-fetch-dest': 'document',
        'sec-fetch-mode': 'navigate',
        'sec-fetch-site': 'none',
        'sec-fetch-user': '?1',
        'upgrade-insecure-requests': '1',
        'viewport-width': '980',
      },
    });

    const htmlContent = response.data;
    const $ = cheerio.load(htmlContent);

    const baseDiv = $('#html5video_base');
    const thumbnailUrl = baseDiv.find('a > img').attr('src') || null;
    const lowQualUrl = baseDiv.find('div').eq(1).find('a').attr('href') || null;
    const highQualUrl = baseDiv.find('div').eq(2).find('a').attr('href') || null;

    const result = {
      thumbnailUrl,
      lowQualUrl,
      highQualUrl
    };

    return result;
  } catch (error) {
    console.error('Error fetching video details:', error);
  }
};

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  const { method } = req;

  if (method === "GET") {
    const { search, download } = req.query;

    if (search) {
      if (!search) {
        return res.status(400).json({
          status: 400,
          author: "Yudzxml",
          error: 'Parameter "search" wajib diisi.'
        });
      }
      const data = await search(search);
      return res.status(200).json({
        status: 200,
        author: "Yudzxml",
        data
      });
    }

    if (download) {
      if (!download) {
        return res.status(400).json({
          status: 400,
          author: "Yudzxml",
          error: 'Parameter "download" wajib diisi.'
        });
      }
      const data = await download(download);
      return res.status(200).json({
        status: 200,
        author: "Yudzxml",
        data
      });
    }

    return res.status(400).json({
      status: 400,
      author: "Yudzxml",
      error: 'Parameter "search" atau "download" wajib diisi.'
    });

  } else {
    res.setHeader("Allow", ["GET"]);
    res.status(405).end(`Method ${method} Not Allowed`);
  }
};
