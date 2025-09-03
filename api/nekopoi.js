const cheerio = require('cheerio');

async function getCokiesAndFetch() {
  const url = 'https://nekopoi.care/';
  
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
      'accept-language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
      'cache-control': 'no-cache',
      'pragma': 'no-cache',
      'sec-ch-ua': '"Chromium";v="139", "Not;A=Brand";v="99"',
      'sec-ch-ua-mobile': '?1',
      'sec-ch-ua-platform': '"Android"',
      'sec-fetch-dest': 'document',
      'sec-fetch-mode': 'navigate',
      'sec-fetch-site': 'same-origin',
      'sec-fetch-user': '?1',
      'upgrade-insecure-requests': '1',
      'Referer': 'https://nekopoi.care/',
      'Referrer-Policy': 'same-origin',
    },
  });

  const htmlContent = await response.text();
  const cookies = response.headers.get('set-cookie');
  return { htmlContent, cookies };
}

async function latest() {
  const { htmlContent } = await getCokiesAndFetch();
  const $ = cheerio.load(htmlContent);
  const episodes = [];
  
  $('.eropost').each((index, element) => {
    const title = $(element).find('h2 a').text();
    const link = $(element).find('h2 a').attr('href');
    const imgSrc = $(element).find('.eroimg img').attr('src');
    const date = $(element).find('span').first().text().trim();

    episodes.push({
      title,
      link,
      imgSrc,
      date
    });
  });

  return episodes
}

async function search(query) {
  try {
    const { cookies } = await getCokiesAndFetch();
    const searchUrl = `https://nekopoi.care/search/${encodeURIComponent(query)}`;

    const response = await fetch(searchUrl, {
      headers: {
        "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
        "accept-language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
        "cache-control": "no-cache",
        "pragma": "no-cache",
        "sec-ch-ua": "\"Chromium\";v=\"139\", \"Not;A=Brand\";v=\"99\"",
        "sec-ch-ua-mobile": "?1",
        "sec-ch-ua-platform": "\"Android\"",
        "sec-fetch-dest": "document",
        "sec-fetch-mode": "navigate",
        "sec-fetch-site": "same-origin",
        "sec-fetch-user": "?1",
        "upgrade-insecure-requests": "1",
        "cookie": cookies,
        "Referer": "https://nekopoi.care/",
        "Referrer-Policy": "same-origin"
      },
      method: "GET"
    });

    if (!response.ok) {
      throw new Error('Network response was not ok');
    }

    const htmlContent = await response.text();
    const $ = cheerio.load(htmlContent);
    const videoData = [];

    $('li').each((index, element) => {
      const title = $(element).find('h2 a').text().trim();
      const link = $(element).find('h2 a').attr('href');
      
      if (!title || !link) {
        return;
      }

      const imageUrl = $(element).find('img').attr('src') || 'No image';
      const descriptionParagraphs = $(element).find('.desc p');
      
      const parody = descriptionParagraphs.first().text().split(':')[1]?.trim() || 'No parody';
      const producers = descriptionParagraphs.eq(1).text().split(':')[1]?.trim() || 'No producers';
      const duration = descriptionParagraphs.eq(2).text().split(':')[1]?.trim() || 'No duration';
      const size = descriptionParagraphs.eq(3).text().split(':')[1]?.trim() || 'No size';

      videoData.push({
        title,
        link,
        imageUrl,
        parody,
        producers,
        duration,
        size
      });
    });

    return videoData;
  } catch (error) {
    console.error('Error fetching video data:', error);
    throw new Error('Failed to fetch video data');
  }
}

async function detail(videoDetailUrl) {
  try {
    const { cookies } = await getCokiesAndFetch();
    const response = await fetch(videoDetailUrl, {
      headers: {
        "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
        "accept-language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
        "cache-control": "no-cache",
        "pragma": "no-cache",
        "sec-ch-ua": "\"Chromium\";v=\"139\", \"Not;A=Brand\";v=\"99\"",
        "sec-ch-ua-mobile": "?1",
        "sec-ch-ua-platform": "\"Android\"",
        "sec-fetch-dest": "document",
        "sec-fetch-mode": "navigate",
        "sec-fetch-site": "same-origin",
        "sec-fetch-user": "?1",
        "upgrade-insecure-requests": "1",
        "cookie": cookies,
        "Referer": "https://nekopoi.care/",
        "Referrer-Policy": "same-origin"
      },
      method: "GET"
    });

    if (!response.ok) {
      throw new Error('Network response was not ok');
    }

    const htmlContent = await response.text();
    const $ = cheerio.load(htmlContent);

    const title = $('.eroinfo h1').text().trim();
    const viewDate = $('.eroinfo p').text().trim();
    const imageUrl = $('.thm img').attr('src');

    const parody = $('.konten p:contains("Parody")').text().split(':')[1]?.trim() || 'No parody';
    const producers = $('.konten p:contains("Producers")').text().split(':')[1]?.trim() || 'No producers';
    const duration = $('.konten p:contains("Duration")').text().split(':')[1]?.trim() || 'No duration';
    const size = $('.konten p:contains("Size")').text().split(':')[1]?.trim() || 'No size';

    const downloadLinks = [];
    $('.boxdownload .liner').each((index, element) => {
      const resolution = $(element).find('.name').text().trim();
      const links = [];
      $(element).find('.listlink a').each((i, linkElement) => {
        links.push($(linkElement).attr('href'));
      });
      downloadLinks.push({ resolution, links });
    });

    const iframeLinks = [];
    $('#show-stream iframe').each((index, element) => {
      const iframeSrc = $(element).attr('src');
      let resolution = '';
      if (index === 0) resolution = '360P';
      if (index === 1) resolution = '460P';
      if (index === 2) resolution = '720P';
      iframeLinks.push({ iframeSrc, resolution });
    });

    return JSON.stringify({
      title,
      viewDate,
      imageUrl,
      parody,
      producers,
      duration,
      size,
      iframeLinks,
      downloadLinks
    });
  } catch (error) {
    console.error('Error fetching page data:', error);
    throw new Error('Failed to fetch page data');
  }
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  const { method } = req;

  if (method === 'GET') {
    const { search: query, download: videoUrl, detail: videoDetailUrl, latest: latestEpisodes } = req.query;

    // Endpoint for search
    if (query) {
      const data = await search(query);
      return res.status(200).json({
        status: 200,
        author: 'Yudzxml',
        data
      });
    }

    // Endpoint for detailed video info
    if (videoDetailUrl) {
      const data = await detail(videoDetailUrl);
      return res.status(200).json({
        status: 200,
        author: 'Yudzxml',
        data
      });
    }

    // Endpoint for latest episodes
    if (latestEpisodes) {
      const data = await latest();
      return res.status(200).json({
        status: 200,
        author: 'Yudzxml',
        data
      });
    }

    // If no valid parameter is passed
    if (!query && !videoDetailUrl && !latestEpisodes) {
      return res.status(400).json({
        status: 400,
        author: 'Yudzxml',
        error: 'Parameter "search", "detail", atau "latest" wajib diisi.'
      });
    }

  } else {
    res.setHeader('Allow', ['GET']);
    res.status(405).end(`Method ${method} Not Allowed`);
  }
};