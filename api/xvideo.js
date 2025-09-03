const cheerio = require('cheerio');

async function search(query) {
  try {
    const url = `https://www.xvideos.com/?k=${encodeURIComponent(query)}&premium=`;

    const response = await fetch(url, {
      "headers": {
        "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
        "accept-language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
        "cache-control": "no-cache",
        "device-memory": "8",
        "pragma": "no-cache",
        "sec-ch-ua": "\"Chromium\";v=\"139\", \"Not;A=Brand\";v=\"99\"",
        "sec-ch-ua-arch": "\"\"",
        "sec-ch-ua-bitness": "\"\"",
        "sec-ch-ua-full-version": "\"139.0.7339.0\"",
        "sec-ch-ua-full-version-list": "\"Chromium\";v=\"139.0.7339.0\", \"Not;A=Brand\";v=\"99.0.0.0\"",
        "sec-ch-ua-mobile": "?1",
        "sec-ch-ua-model": "\"CPH2209\"",
        "sec-ch-ua-platform": "\"Android\"",
        "sec-ch-ua-platform-version": "\"11.0.0\"",
        "sec-fetch-dest": "document",
        "sec-fetch-mode": "navigate",
        "sec-fetch-site": "same-origin",
        "sec-fetch-user": "?1",
        "upgrade-insecure-requests": "1",
        "viewport-width": "980",
        "Referer": "https://www.xvideos.com/",
        "Referrer-Policy": "no-referrer-when-downgrade"
      },
      "method": "GET"
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch page: ${response.statusText}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    const videoData = [];

    $('.frame-block.thumb-block').each((index, element) => {
      const videoInfo = {};

      const titleTag = $(element).find('.title a');
      videoInfo.title = titleTag.attr('title');
      videoInfo.url = 'https://www.xvideos.com' + titleTag.attr('href');

      const imgTag = $(element).find('img');
      videoInfo.thumbnail = imgTag.attr('data-src');

      const durationTag = $(element).find('.duration');
      videoInfo.duration = durationTag.text().trim();

      const authorTag = $(element).find('.name');
      videoInfo.author = authorTag.text();

      videoData.push(videoInfo);
    });

    return videoData

  } catch (error) {
    console.error('Error:', error);
  }
}
async function detail(videoUrl) {
  try {
    const response = await fetch(url, {
      "headers": {
        "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
        "accept-language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
        "cache-control": "no-cache",
        "device-memory": "8",
        "pragma": "no-cache",
        "sec-ch-ua": "\"Chromium\";v=\"139\", \"Not;A=Brand\";v=\"99\"",
        "sec-ch-ua-arch": "\"\"",
        "sec-ch-ua-bitness": "\"\"",
        "sec-ch-ua-full-version": "\"139.0.7339.0\"",
        "sec-ch-ua-full-version-list": "\"Chromium\";v=\"139.0.7339.0\", \"Not;A=Brand\";v=\"99.0.0.0\"",
        "sec-ch-ua-mobile": "?1",
        "sec-ch-ua-model": "\"CPH2209\"",
        "sec-ch-ua-platform": "\"Android\"",
        "sec-ch-ua-platform-version": "\"11.0.0\"",
        "sec-fetch-dest": "document",
        "sec-fetch-mode": "navigate",
        "sec-fetch-site": "same-origin",
        "sec-fetch-user": "?1",
        "upgrade-insecure-requests": "1",
        "viewport-width": "980",
        "Referer": url,
        "Referrer-Policy": "no-referrer-when-downgrade"
      },
      "method": "GET"
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch page: ${response.statusText}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    const jsonData = $('script[type="application/ld+json"]').html();
    const videoMetadata = JSON.parse(jsonData);
    return videoMetadata;
  } catch (error) {
    console.error('Error:', error);
  }
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  const { method } = req;

  if (method === 'GET') {
    const { search: query, detail: videoUrl } = req.query;

    if (query) {
      const data = await search(query);
      return res.status(200).json({
        status: 200,
        author: 'Yudzxml',
        data
      });
    }

    if (videoUrl) {
      const data = await detail(videoUrl);
      return res.status(200).json({
        status: 200,
        author: 'Yudzxml',
        data
      });
    }

    return res.status(400).json({
      status: 400,
      author: 'Yudzxml',
      error: 'Parameter "search" atau "detail" wajib diisi.'
    });
  } else {
    res.setHeader('Allow', ['GET']);
    res.status(405).end(`Method ${method} Not Allowed`);
  }
};