const axios = require('axios');
const cheerio = require('cheerio');

const anichin = {
  rekomendasi: async () => {
  try {
    const { data: html } = await axios.get("https://anichin.watch/");
    const $ = cheerio.load(html);
    const animeList = [];

    $('.swiper-slide.item').each((i, el) => {
      const backdropStyle = $(el).find('.backdrop').attr('style') || '';
      const imageMatch = backdropStyle.match(/url\('(.+?)'\)/);
      const image = imageMatch ? imageMatch[1] : null;
      const watchLink = $(el).find('a.watch').attr('href') || null;
      const titleEl = $(el).find('h2 a');
      const title = titleEl.text().trim() || null;
      const jtitle = titleEl.attr('data-jtitle') || null;

      let description = $(el).find('p').first().text().trim() || null;
      if (!description) description = $(el).text().trim().split('…')[0]; // fallback

      animeList.push({ title, jtitle, watchLink, image, description });
    });

    return animeList;
  } catch (err) {
    return [];
  }
},
  popularToday: async () => {
    try {
      const { data: html } = await axios.get('https://anichin.watch/');
      const $ = cheerio.load(html);
      const popularList = [];
      $('div.releases.hothome + div.listupd.normal article.bs').each((i, el) => {
        const aTag = $(el).find('a.tip');
        const ttDiv = aTag.find('.tt');

        popularList.push({
          title: ttDiv.contents().first().text().trim() || null,                 
          episodeTitle: ttDiv.find('h2[itemprop="headline"]').text().trim() || null,
          watchLink: aTag.attr('href') || null,                                  // Link nonton
          image: aTag.find('img').attr('src') || null,                           // Gambar
          type: aTag.find('.typez').text().trim() || null,                       // Tipe (Donghua, Anime, dll)
          episode: aTag.find('.bt .epx').text().trim() || null,                 // Episode
          subOrDub: aTag.find('.bt .sb').text().trim() || null                   // Sub/Dub
        });
      });

      return popularList;
    } catch (err) {
      console.error('Error scraping popular anime:', err);
      return [];
    }
  },
  search: async (query) => {
    try {
      const params = new URLSearchParams();
      params.append('action', 'ts_ac_do_search');
      params.append('ts_ac_query', query);

      const { data } = await axios.post(
        'https://anichin.watch/wp-admin/admin-ajax.php',
        params.toString(),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
            'X-Requested-With': 'XMLHttpRequest'
          }
        }
      );

      // Ambil data anime
      const results = data?.anime?.[0]?.all || [];
      return results.map(item => ({
        id: item.ID,
        title: item.post_title,
        link: item.post_link,
        image: item.post_image,
        type: item.post_type,
        episode: item.post_ep,
        latest: item.post_latest,
        subOrDub: item.post_sub,
        genres: item.post_genres
      }));
    } catch (err) {
      console.error('Error searching anime:', err);
      return [];
    }
  },
  latestRelease: async () => {
  try {
    const { data: html } = await axios.get('https://anichin.watch/');
    const $ = cheerio.load(html);

    const latest = [];

    $('.listupd .bs').each((i, el) => {
      const elSel = $(el).find('.bsx a');
      const title = elSel.attr('title');
      const url = elSel.attr('href');
      const episode = elSel.find('.bt .epx').text();
      const sub = elSel.find('.bt .sb').text();
      const type = elSel.find('.typez').text();
      const img = elSel.find('img').attr('src');

      latest.push({ title, url, episode, sub, type, img });
    });

    return latest;
  } catch (err) {
    console.error(err);
    return [];
   }
 },
  detail: async (url) => {
  try {
    const { data: html } = await axios.get(url);
    const $ = cheerio.load(html);
    const title = $("h1.entry-title").text().trim() || null;
    const episode = $("meta[itemprop='episodeNumber']").attr("content") || null;
    const released =
      $("span.updated").text().trim() ||
      $("span.year").text().match(/\w+ \d{1,2}, \d{4}/)?.[0] ||
      null;
    const authorTag = $("span.vcard.author a").first();
    const author = authorTag.text().trim() || null;
    const seriesTag =
      $("span.year a").last().length > 0
        ? $("span.year a").last()
        : $("a[href*='series']").first();
    const series = seriesTag.text().trim() || null;
    const mainVideo = $(".player-embed iframe").attr("src") || null;

    const mirrors = [];
    $("select.mirror option").each((i, el) => {
      let encoded = $(el).attr("value");
      const mirrorName = $(el).text().trim();
      let mirrorUrl = null;
      if (encoded) {
        try {
          const isBase64 = /^[A-Za-z0-9+/=]+$/.test(encoded);
          if (isBase64) {
            const decodedHtml = Buffer.from(encoded, "base64").toString("utf-8");
            const $iframe = cheerio.load(decodedHtml);
            mirrorUrl = $iframe("iframe").attr("src") || null;
          } else {
            mirrorUrl = encoded;
          }
          if (mirrorUrl) {
            mirrors.push({
              name: mirrorName,
              url: encodeURI(mirrorUrl.startsWith("http") ? mirrorUrl : `https:${mirrorUrl}`)
            });
          }
        } catch (e) {}
      }
    });

    const image = $(".single-info .thumb img").attr("src") || null;
    const animeTitle = $(".single-info .infox h2[itemprop='partOfSeries']").text().trim() || null;
    const altTitle = $(".single-info .infox .alter").text().trim() || null;
    const rating = $(".single-info .rating strong").text().replace("Rating", "").trim() || null;

    const details = {};
    $(".single-info .info-content .spe span").each((i, el) => {
      const text = $(el).text().trim();
      const [key, val] = text.split(":").map(t => t.trim());
      if (key && val) {
        details[key.replace(/\s+/g, "_").toLowerCase()] = val;
      }
    });

    const genres = [];
    $(".single-info .genxed a").each((i, el) => {
      genres.push($(el).text().trim());
    });

    const description = $(".single-info .desc.mindes").text().trim() || null;

    const sidebarEpisodes = [];
    $('#sidebar #singlepisode .episodelist li').each((i, el) => {
      const epLink = $(el).find('a').attr('href');
      const epTitle = $(el).find('.playinfo h3').text().trim();
      const epDate = $(el).find('.playinfo span').text().trim();
      const epThumb = $(el).find('.thumbnel img').attr('src');

      sidebarEpisodes.push({
        title: epTitle,
        link: epLink,
        date: epDate,
        thumbnail: epThumb
      });
    });

    return {
      title,
      episode,
      released,
      author,
      series,
      mainVideo,
      mirrors,
      anime: {
        animeTitle,
        altTitle,
        image,
        rating,
        ...details,
        genres,
        description
      },
      sidebarEpisodes
    };
  } catch (err) {
    console.error(err);
    return null;
  }
},
  populerDonghua: async () => {
  try {
    const { data: html } = await axios.get("https://anichin.watch/");
    const $ = cheerio.load(html);

    const result = {};

    $(".serieslist.pop.wpop").each((i, el) => {
      const listClass = $(el).attr("class") || "";
      let range = "unknown";

      if (listClass.includes("wpop-weekly")) range = "weekly";
      else if (listClass.includes("wpop-monthly")) range = "monthly";
      else if (listClass.includes("wpop-alltime")) range = "alltime";

      const items = [];

      $(el).find("ul li").each((j, li) => {
        const link = $(li).find(".imgseries a.series").attr("href") || null;
        const title = $(li).find(".imgseries a.series img").attr("title") || null;
        const img = $(li).find(".imgseries a.series img").attr("src") || null;

        const genres = [];
        $(li).find(".leftseries span a").each((k, g) => {
          const genreText = $(g).text().trim();
          if (genreText) genres.push(genreText);
        });

        const rating = $(li).find(".numscore").text().trim() || null;

        items.push({ title, link, img, genres, rating });
      });

      result[range] = items.length ? items : [];
    });
    return JSON.parse(JSON.stringify(result));
  } catch (err) {
    console.error("Error fetching populerDonghua:", err);
    return { weekly: [], monthly: [], alltime: [] };
  }
},
  getGenresFromLinks: async () => {
    try {
      const { data: html } = await axios.get("https://anichin.watch/");
      const $ = cheerio.load(html);
      const genres = [];
      $('a[href*="/genres/"]').each((i, el) => {
        const href = $(el).attr("href");
        if (href) {
          const match = href.match(/\/genres\/([^\/]+)/);
          if (match) genres.push(match[1]);
        }
      });
      return [...new Set(genres)];
    } catch (err) {
      console.error("Error:", err.message);
      return [];
    }
  },
  genres: async (genre, page = 1) => {
    try {
      // cek apakah genre valid
      const validGenres = await anichin.getGenresFromLinks();
      if (!validGenres.includes(genre)) {
        return { error: `Genre "${genre}" tidak ditemukan. Pilih salah satu dari: ${validGenres.join(", ")}` };
      }

      const url = `https://anichin.watch/genres/${genre}/page/${page}/`;
      const { data: html } = await axios.get(url);
      const $ = cheerio.load(html);

      const results = [];

      $(".listupd article.bs").each((i, el) => {
        const linkElement = $(el).find("a");
        const title = linkElement.attr("title")?.trim();
        const url = linkElement.attr("href");
        const img = $(el).find("img").attr("src");
        const status =
          $(el).find(".status").text().trim() ||
          $(el).find(".epx").text().trim();
        const type = $(el).find(".typez").text().trim();
        const subtitle = $(el).find(".sb").text().trim();

        results.push({ title, url, img, status, type, subtitle });
      });

      return results;
    } catch (err) {
      console.error("Error scraping:", err.message);
      return [];
    }
  },
  info: async (url) => {
  try {
    const { data: html } = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
                      '(KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36'
      }
    });

    const $ = cheerio.load(html);

    // ----- Judul -----
    // Dari atribut title gambar
    const imgEl = $('.thumb img[itemprop="image"]');
    const title = imgEl.length ? imgEl.attr('title') || '' : '';

    // Judul alternatif
    const titleAlt = $('.alter').text().trim();

    // ----- Info dasar -----
    const info = {};
    $('.info-content .spe span').each((i, el) => {
      const key = $(el).find('b').text().replace(':','').trim();
      const value = $(el).text().replace($(el).find('b').text(),'').trim();
      if (key) info[key] = value;
    });

    // ----- Genres -----
    const genres = [];
    $('.genxed a').each((i, el) => {
      genres.push($(el).text().trim());
    });

    // ----- Thumbnail -----
    const Thumb = $('.thumb img').attr('src') || '';
    const mainThumb = $('.ime img').attr('src') || '';

    // ----- Rating -----
    const ratingText = $('.rt .rating strong').text().trim();
    const rating = ratingText ? parseFloat(ratingText.replace('Rating','').trim()) : null;

    // ----- Episode list -----
    const episodes = [];
    $('li[data-index]').each((i, el) => {
      const aTag = $(el).find('a');
      const epNum = $(el).find('.epl-num').text().trim();
      const epTitle = $(el).find('.epl-title').text().trim();
      const epSub = $(el).find('.epl-sub span.status').text().trim();
      const epDate = $(el).find('.epl-date').text().trim();
      const epLink = aTag.attr('href');
      episodes.push({ epNum, epTitle, epSub, epDate, epLink });
    });

    // ----- Sinopsis -----
    let synopsis = '';
    const synpDiv = $('.bixbox.synp .entry-content');
    if (synpDiv.length) {
      synpDiv.find('a').remove();
      const fullText = synpDiv.text().trim().replace(/\s+/g, ' ');
      synopsis = fullText.split(':')[0]; // ambil sampai tanda ':'
    }

    return {
      title,
      titleAlt,
      info,
      genres,
      mainThumb,
      Thumb,
      rating,
      synopsis,
      episodes
    };

  } catch(err) {
    console.error('Gagal parsing HTML:', err.message);
    return null;
  }
 }
}

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
    const { action, query, url, genre, page } = req.query;

    if (!action) {
      return res.status(400).json({ error: 'Parameter "action" wajib diisi' });
    }

    let result;

    switch (action) {
      case 'rekomendasi':
        result = await anichin.rekomendasi();
        break;

      case 'popularToday':
        result = await anichin.popularToday();
        break;

      case 'search':
        if (!query) return res.status(400).json({ error: 'Parameter "query" wajib diisi untuk search' });
        result = await anichin.search(query);
        break;

      case 'latestRelease':
        result = await anichin.latestRelease();
        break;

      case 'detail':
        if (!url) return res.status(400).json({ error: 'Parameter "url" wajib diisi untuk detail' });
        result = await anichin.detail(url);
        break;

      case 'populerDonghua':
        result = await anichin.populerDonghua();
        break;

      case 'getGenresFromLinks':
        result = await anichin.getGenresFromLinks();
        break;

      case 'genres':
        if (!genre) return res.status(400).json({ error: 'Parameter "genre" wajib diisi untuk genres' });
        result = await anichin.genres(genre, page || 1);
        break;
        case 'info':
        if (!url) return res.status(400).json({ error: 'Parameter "url" wajib diisi untuk genres' });
        result = await anichin.info(url);
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