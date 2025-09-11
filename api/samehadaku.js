const axios = require("axios");
const cheerio = require("cheerio");

const samehadaku = {
  base: "https://v1.samehadaku.how",
  getLinkVideo: async function (url) {
    try {
      console.log("🔍 Fetching URL:", url);

      // Request GET awal untuk ambil HTML dan cookie
      const response = await axios.get(url, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/115 Safari/537.36",
        },
      });

      const html = response.data;
      const setCookieHeader = response.headers["set-cookie"] || [];
      // Gabungkan cookie menjadi string untuk header
      const cookie = setCookieHeader
        .map((c) => c.split(";")[0])
        .join("; ");

      console.log("✅ HTML fetched, length:", html.length);
      console.log("🍪 Cookies obtained:", cookie);

      const $ = cheerio.load(html);

      const servers = [];
      $(".east_player_option").each((i, el) => {
        const post = $(el).attr("data-post");
        const nume = $(el).attr("data-nume");
        const type = $(el).attr("data-type");
        if (post && nume && type) {
          servers.push({
            label: $(el).text().trim(),
            post,
            nume,
            type,
          });
        }
      });
      console.log("🎥 Found servers:", servers);

      const streamResults = [];
      for (let s of servers) {
        console.log(`➡️ Requesting stream for server: ${s.label}`);

        const { data: ajaxResp } = await axios.post(
          `${this.base}/wp-admin/admin-ajax.php`,
          new URLSearchParams({
            action: "player_ajax",
            post: s.post,
            nume: s.nume,
            type: s.type,
          }).toString(),
          {
            headers: {
              "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
              "X-Requested-With": "XMLHttpRequest",
              "Cookie": cookie,
              "Referer": url,
              "User-Agent":
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/115 Safari/537.36",
            },
          }
        );

        console.log(`📥 Response length for ${s.label}:`, ajaxResp.length);

        const match = ajaxResp.match(/<iframe[^>]+src="([^"]+)"/);
        const streamUrl = match ? match[1] : null;
        console.log(`🔗 Stream URL for ${s.label}:`, streamUrl);

        streamResults.push({
          quality: s.label,
          url: streamUrl,
        });
      }

      const downloads = {};

      $(".download-eps").each((i, el) => {
        const type = $(el).find("p b").text().trim();
        downloads[type] = downloads[type] || {};
        console.log(`📂 Download type found: ${type}`);

        $(el)
          .find("ul li")
          .each((j, li) => {
            const quality = $(li).find("strong").text().trim();
            const urls = [];
            $(li)
              .find("span a")
              .each((k, a) => {
                const url = $(a).attr("href");
                if (url) urls.push(url);
              });
            downloads[type][quality] = urls;
            console.log(`  - Quality: ${quality}, URLs:`, urls);
          });
      });

      console.log("✅ Finished parsing streams and downloads");

      return {
        streams: streamResults,
        downloads: JSON.stringify(downloads, null, 2),
      };
    } catch (err) {
      console.error("❌ Error:", err.message);
      return { streams: [], downloads: "{}" };
    }
  },
  latest: async function(page = 1) {
  const url = `${this.base}/anime-terbaru/page/${page}/`;

  try {
    const { data: html } = await axios.get(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
      }
    });
    const $ = cheerio.load(html);
    const animeList = [];

    $('li[itemscope][itemtype="http://schema.org/CreativeWork"]').each((i, el) => {
      const title = $(el).find('h2.entry-title a').text().trim();
      const link = $(el).find('h2.entry-title a').attr('href');
      const image = $(el).find('div.thumb img').attr('src');
      const episode = $(el).find('span b:contains("Episode")').next('author').text().trim();
      const author = $(el).find('span.author author').text().trim();
      const released = $(el).find('span:contains("Released on")').text().replace('Released on:', '').trim();

      animeList.push({ title, link, image, episode, author, released });
    });

    return animeList;
  } catch (err) {
    console.error('Error fetching page:', err.message);
    return [];
  }
 },
  search: async function(page = 1, query = '') {
  try {
    const url = `${this.base}/page/${page}/?s=${encodeURIComponent(query)}`;

    const { data: html } = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/115 Safari/537.36'
      }
    });

    const $ = cheerio.load(html);
    const animeList = [];

    $('article.animpost').each((i, el) => {
      const title = $(el).find('.animposx .title h2').text().trim();
      const link = $(el).find('.animposx a').attr('href');
      const img = $(el).find('.animposx img.anmsa').attr('src');
      const type = $(el).find('.animposx .type').first().text().trim();
      const score = $(el).find('.animposx .score').text().trim();
      const views = $(el).find('.stooltip .metadata span').eq(2).text().trim();

      const genres = [];
      $(el).find('.stooltip .genres a').each((j, g) => {
        genres.push($(g).text().trim());
      });

      const description = $(el).find('.stooltip .ttls').text().trim();

      animeList.push({ title, link, img, type, score, views, genres, description });
    });

    return JSON.stringify(animeList, null, 2);
  } catch (err) {
    console.error('Gagal scrap:', err.message);
    return JSON.stringify([]);
  }
 },
  getTopAnime: async function() {
    try {
        const { data: html } = await axios.get(this.base, {
            headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" }
        });

        const $ = cheerio.load(html);
        const topAnimes = [];

        $('.topten-animesu ul li').each((i, el) => {
            const aTag = $(el).find('a.series');
            const animeUrl = aTag.attr('href');
            const title = aTag.find('.judul').text().trim();
            const rating = parseFloat(aTag.find('.rating').text().trim());
            const img = aTag.find('img').attr('src');
            const top = aTag.find('.is-topten b').last().text().trim();

            topAnimes.push({ top: Number(top), title, url: animeUrl, rating, img });
        });

        return JSON.stringify(topAnimes, null, 2);
    } catch {
        return JSON.stringify([]);
    }
},
  jadwalUpdate: async function() {
  try {
    const url = `${this.base}/jadwal-rilis/`;
    const { data: html } = await axios.get(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/115 Safari/537.36"
      }
    });

    const $ = cheerio.load(html);
    const schedule = [];

    // ambil daftar hari dari halaman utama
    $('#the-days ul li .east_days_option').each((i, el) => {
      const dayName = $(el).find('span').text().trim();
      const dayAttr = $(el).attr('data-day');
      const typeAttr = $(el).attr('data-type');

      schedule.push({
        day: dayAttr,
        name: dayName,
        type: typeAttr,
        anime: []
      });
    });

    for (const item of schedule) {
      try {
        const apiUrl = `https://v1.samehadaku.how/wp-json/custom/v1/all-schedule?perpage=20&day=${item.day}&type=${item.type}`;
        const { data } = await axios.get(apiUrl, {
          headers: {
            "Accept": "application/json, text/javascript, */*; q=0.01",
            "X-Requested-With": "XMLHttpRequest",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/115 Safari/537.36"
          }
        });

        item.anime = data.map(anime => ({
          id: anime.id,
          title: anime.title,
          url: anime.url,
          description: anime.content.replace(/<\/?[^>]+(>|$)/g, ""),
          image: anime.featured_img_src,
          genre: anime.genre,
          type: anime.east_type,
          schedule: anime.east_schedule,
          time: anime.east_time,
          score: anime.east_score
        }));
      } catch (err) {
        console.error(`Gagal ambil data anime untuk ${item.day}:`, err.message);
      }
    }
    return JSON.stringify(schedule, null, 2);
  } catch (err) {
    console.error('Error fetching schedule:', err.message);
    return '[]';
  }
},
  detail: async function(url) {
  try {
    const { data: html } = await axios.get(url, {
      headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/115 Safari/537.36",
      },
    });

    const $ = cheerio.load(html);

    // Ambil info gambar & judul
    const img = $(".thumb img.anmsa").attr("src");
    const title = $(".thumb img.anmsa").attr("title");
    const alt = $(".thumb img.anmsa").attr("alt");

    // Ambil rating
    const ratingValue = $(".archiveanime-rating [itemprop='ratingValue']").text();
    const ratingCount = $(".archiveanime-rating [itemprop='ratingCount']").attr("content");

    // Ambil deskripsi
    let description = "";
const descDiv = $(".desc [itemprop='description']");

// Ambil semua .html-div jika ada
descDiv.find(".html-div").each((i, el) => {
  const text = $(el).text().trim();
  if (text.length > 20 && !description.includes(text)) {
    description += text + "\n";
  }
});

description = description.trim();

// Fallback kalau kosong
if (!description) {
  description = $(".entry-content.entry-content-single p").text().trim();
}

    // Ambil genre
    const genres = [];
    $(".genre-info a").each((i, el) => {
      const genre = $(el).text().trim();
      if (genre) genres.push(genre);
    });

    // Ambil detail anime
    const details = {};
    $(".anime.infoanime .spe span").each((i, el) => {
      const keyEl = $(el).find("b").first();
      if (keyEl.length) {
        const key = keyEl.text().replace(":", "").trim();
        keyEl.remove();
        const value = $(el).text().trim();
        details[key] = value;
      }
    });

    // Ambil daftar episode
    const episodes = [];
$(".lstepsiode.listeps ul li").each((i, el) => {
  const epsNumber = $(el).find(".epsright .eps a").text().trim();
  const epsTitle  = $(el).find(".epsleft .lchx a").text().trim();
  const epsLink   = $(el).find(".epsleft .lchx a").attr("href");
  const epsDate   = $(el).find(".epsleft .date").text().trim();
  episodes.push({
    number: epsNumber,
    title: epsTitle,
    link: epsLink,
    date: epsDate
  });
});

    return { img, title, alt, ratingValue, ratingCount, description, genres, details, episodes };
  } catch (err) {
    console.error("Error parsing:", err.message);
    return null;
    }
  },
  genre: async function (genre, page = 1) {
  try {
    const url = `https://v1.samehadaku.how/genre/${genre}/page/${page}/`;
    const { data: html } = await axios.get(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/115 Safari/537.36"
      }
    });

    const $ = cheerio.load(html);
    const animeList = [];

    $('.animepost').each((i, el) => {
      const anime = {};
      const animelink = $(el).find('.animposx a');
      const stooltip = $(el).find('.stooltip');

      anime.title = animelink.attr('title') || '';
      anime.url = animelink.attr('href') || '';
      anime.thumbnail = animelink.find('img.anmsa').attr('src') || '';
      anime.type = animelink.find('.type').text().trim() || '';
      anime.score = animelink.find('.score').text().trim() || '';
      anime.status = animelink.find('.data .type').text().trim() || '';
      anime.views = stooltip.find('.metadata span').eq(2).text().trim() || '';
      anime.description = stooltip.find('.ttls').text().trim() || '';
      anime.genres = [];
      stooltip.find('.genres .mta a').each((i, g) => {
        anime.genres.push($(g).text().trim());
      });

      animeList.push(anime);
    });

    const pageText = $('.pagination span').first().text().trim();
    const match = pageText.match(/Page (\d+) of (\d+)/i);
    const pageNow = match ? parseInt(match[1], 10) : 1;
    const pageEnd = match ? parseInt(match[2], 10) : 1;

    return JSON.stringify({ animeList, pageNow, pageEnd });
  } catch (err) {
    return { animeList: [], pageNow: 1, pageEnd: 1 };
    }
  }
};

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*'); 
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  const { method } = req;
  if (method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end(`Method ${method} Not Allowed`);
  }

  try {
    const { action, query, url, page, genre } = req.query;

    if (!action) {
      return res.status(400).json({ error: 'Parameter "action" wajib diisi' });
    }

    let result;

    switch (action) {
      case 'getlinkvideo':
        if (!url) return res.status(400).json({ error: 'Parameter "url" wajib diisi untuk ambil data video' });
        result = await samehadaku.getLinkVideo(url);
        break;

      case 'latest':
        if (!page) return res.status(400).json({ error: 'Parameter "page" wajib diisi untuk ambil data anime terbaru!' });
        result = await samehadaku.latest(page);
        break;

      case 'search':
        if (!query) return res.status(400).json({ error: 'Parameter "query" wajib diisi untuk search' });
        result = await samehadaku.search(page, query);
        break;
      case 'detail':
        if (!url) return res.status(400).json({ error: 'Parameter "url" wajib diisi untuk detail anime' });
        result = await samehadaku.detail(url);
        break;

      case 'gettopanime':
        result = await samehadaku.getTopAnime();
        break;

      case 'jadwalupdate':
        result = await samehadaku.jadwalUpdate();
        break;
      case 'genre':
        if (!genre) return res.status(400).json({ error: 'Parameter "genre" wajib diisi untuk search by genre' });
        result = await samehadaku.genre(genre, page);
        break;
        
      default:
        return res.status(400).json({ error: `Action "${action}" tidak dikenal` });
    }

    return res.status(200).json({
      status: 200,
      author: "Yudzxml",
      result
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Terjadi kesalahan pada server', detail: err.message });
  }
};