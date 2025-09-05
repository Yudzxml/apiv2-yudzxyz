const cheerio = require("cheerio");

const BASE_URL = "https://tv6.lk21official.cc";
const BASE_URL_POSTER = "https://poster.lk21.party/wp-content/uploads";

const lk21 = {
  latest: async function (page = 1) {
    const url = `${BASE_URL}/latest/page/${page}`;
    try {
      const res = await fetch(url, {
        method: "GET",
        headers: {
          "sec-ch-ua": '"Chromium";v="139", "Not;A=Brand";v="99"',
          "sec-ch-ua-mobile": "?1",
          "sec-ch-ua-platform": '"Android"',
          "upgrade-insecure-requests": "1",
          "user-agent":
            "Mozilla/5.0 (Linux; Android 11; CPH2209) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Mobile Safari/537.36",
          accept:
            "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
          "accept-language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
          "cache-control": "no-cache",
          pragma: "no-cache",
        },
        referrer: url,
        referrerPolicy: "strict-origin-when-cross-origin",
        mode: "cors",
        credentials: "omit",
        redirect: "follow",
      });

      const html = await res.text();
      const $ = cheerio.load(html);

      const movies = [];

      $("article[itemscope][itemtype='https://schema.org/Movie']").each((_, el) => {
        const title = $(el).find("h3.poster-title").text().trim();
        const relativeLink = $(el).find("a[itemprop='url']").attr("href");
        const link = relativeLink ? BASE_URL + relativeLink : null;
        const year = $(el).find("span.year").text().trim();
        const rating = $(el).find("span[itemprop='ratingValue']").text().trim();
        const genre = $(el).find("meta[itemprop='genre']").attr("content");
        const duration = $(el).find("span.duration").text().trim();
        const image = $(el).find("img[itemprop='image']").attr("src");

        movies.push({ title, link, year, rating, genre, duration, image });
      });

      const paginationText = $("h3").first().text().trim();
      const match = paginationText.match(/Halaman\s+(\d+)\s+dari\s+(\d+)/i);
      const currentPage = match ? parseInt(match[1]) : page;
      const totalPages = match ? parseInt(match[2]) : null;

      return { currentPage, totalPages, movies };
    } catch (err) {
      console.log(err);
      return {
        status: 500,
        data: "Webnya mokad le klo ga domainya udh di ganti",
      };
    }
  },

  search: async function (query = "", page = 1) {
    try {
      const response = await fetch(
        `https://search.lk21.party/search.php?s=${encodeURIComponent(query)}&page=${page}`,
        {
          headers: {
            accept: "application/json, text/plain, */*",
            "accept-language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
            "sec-ch-ua": '"Chromium";v="139", "Not;A=Brand";v="99"',
            "sec-ch-ua-mobile": "?1",
            "sec-ch-ua-platform": '"Android"',
            "x-requested-with": "XMLHttpRequest",
          },
          referrer: "https://tv6.lk21official.cc/",
          referrerPolicy: "strict-origin-when-cross-origin",
          method: "GET",
          mode: "cors",
          credentials: "omit",
        }
      );

      if (!response.ok)
        throw new Error(`❌ Fetch gagal: ${response.status} ${response.statusText}`);

      const json = await response.json();

      const modifiedData = json.data.map((item) => ({
        ...item,
        slug: BASE_URL + "/" + item.slug,
        poster: BASE_URL_POSTER + "/" + item.poster,
      }));

      return {
        status: 200,
        ...json,
        data: modifiedData,
      };
    } catch (err) {
      console.log(err);
      return {
        status: 404,
        data: "Movie gada lekk",
      };
    }
  },

  detail: async function (url) {
    if (!url) {
      return {
        status: 404,
        data: "Urlnya jangan kosong le, ambil dari search atau latest",
      };
    }

    try {
      const response = await fetch(url, {
        method: "GET",
        headers: {
          "sec-ch-ua": '"Chromium";v="139", "Not;A=Brand";v="99"',
          "sec-ch-ua-mobile": "?1",
          "sec-ch-ua-platform": '"Android"',
          "upgrade-insecure-requests": "1",
          "user-agent":
            "Mozilla/5.0 (Linux; Android 11; CPH2209) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Mobile Safari/537.36",
          accept:
            "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
          "accept-language": "en-US,en;q=0.9,id;q=0.8",
          "cache-control": "no-cache",
          pragma: "no-cache",
        },
        referrer: url,
        referrerPolicy: "strict-origin-when-cross-origin",
      });

      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

      const html = await response.text();
      const $ = cheerio.load(html);

      const title = $(".movie-info h1").text().trim();
      const infoTags = $(".info-tag span")
        .map((i, el) => $(el).text().trim())
        .get();
      const rating = infoTags[0] || null;
      const format = infoTags[1] || null;
      const resolution = infoTags[2] || null;
      const duration = infoTags[3] || null;
      const genres = $(".tag-list .tag a")
        .map((i, el) => $(el).text().trim())
        .get();
      const downloadLink =
        $(".movie-action a.btn-small[href^='http']").attr("href") || null;
      const subtitle = $(".detail p:contains('Subtitle') a").text().trim() || null;
      const director = $(".detail p:contains('Sutradara') a").text().trim() || null;
      const actors = $(".detail p:contains('Bintang Film') a")
        .map((i, el) => $(el).text().trim())
        .get();
      const country = $(".detail p:contains('Negara') a").text().trim() || null;
      const synopsis = $(".synopsis").text().trim();
      const poster = $(".detail picture img").attr("src");
      const trailer = $("a.yt-lightbox").attr("href");

      const streamList = [];
      $("#player-list a").each((i, el) => {
        streamList.push({
          name: $(el).data("server"),
          url: $(el).data("url"),
          iframe: $(el).attr("href"),
        });
      });

      return JSON.stringify({
  status: 200,
  data: {
    title,
    rating,
    format,
    resolution,
    duration,
    genres,
    country,
    director,
    actors,
    subtitle,
    downloadLink,
    synopsis,
    poster,
    trailer,
    streamList,
  },
});
    } catch (err) {
      console.log(err);
      return {
        status: 500,
        data: "Webnya mokad le klo ga domainya udh di ganti",
      };
    }
  },
};


module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  const { method } = req;

  if (method === "GET") {
    const { action, query, page = 1, url } = req.query;

    try {
      let data;
      switch (action) {
        case "search":
          if (!query) {
            return res.status(400).json({ status: 400, author: "Yudzxml", error: "Parameter 'query' diperlukan untuk action search." });
          }
          data = await lk21.search(query, page);
          break;

        case "latest":
          data = await lk21.latest(page);
          break;

        case "detail":
          if (!url) {
            return res.status(400).json({ status: 400, author: "Yudzxml", error: "Parameter 'url' diperlukan untuk action detail." });
          }
          data = await lk21.detail(url);
          break;

        default:
          return res.status(400).json({
            status: 400,
            author: "Yudzxml",
            error: 'Gunakan query "action=search|latest|detail".'
          });
      }

      return res.status(200).json({ status: 200,
        author: "Yudzxml",
        data 
      });
    } catch (e) {
      return res.status(500).json({
        status: 500,
        author: "Yudzxml",
        error: e.message
      });
    }
  } else {
    res.setHeader("Allow", ["GET"]);
    res.status(405).end(`Method ${method} Not Allowed`);
  }
};