const FormData = require('form-data');

function encodeBase64(obj) {
  const json = JSON.stringify(obj);
  const urlEncoded = encodeURIComponent(json);
  return btoa(urlEncoded);
}

function generateFileId() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

async function getLinkDownload(trackUrl) {
  try {
    const token = await generateFileId();
    const form = new FormData();
    form.append("post_id", "25");
    form.append("form_id", "45dddc7");
    form.append("referer_title", "Free Spotify Music Downloads - SpotiDownloads");
    form.append("queried_id", "25");
    form.append("form_fields[music_url]", trackUrl);
    form.append("action", "elementor_pro_forms_send_form");
    form.append("referrer", `https://spotidownloads.com/downloads/?file=${token}`);

    const response = await fetch("https://spotidownloads.com/wp-admin/admin-ajax.php", {
      method: "POST",
      headers: {
        accept: "application/json, text/javascript, */*; q=0.01",
        "accept-language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
        "cache-control": "no-cache",
        pragma: "no-cache",
        "sec-ch-ua": '"Chromium";v="139", "Not;A=Brand";v="99"',
        "sec-ch-ua-mobile": "?1",
        "sec-ch-ua-platform": '"Android"',
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-origin",
        "x-requested-with": "XMLHttpRequest",
        referer: `https://spotidownloads.com/downloads/?file=${token}`,
        "referrer-policy": "strict-origin-when-cross-origin",
      },
      body: form,
    });

    // 🔥 Ambil cookies dari response header
    const rawCookies = response.headers.raw()["set-cookie"];
    const cookie = rawCookies && rawCookies.length > 0 
  ? rawCookies[0].split(";")[0] 
  : null;

    const resPonSe = await response.json();
    console.log("Response JSON:", JSON.stringify(resPonSe, null, 2));

    const redirectUrl = resPonSe.data.data["1"].redirect_url;
    const afterEqual = redirectUrl.split("=").pop();
    console.info("UUID: " + afterEqual);

    return {
      uuid: afterEqual,
      cookie
    };
  } catch (err) {
    throw new Error(`Gagal request: ${err.message}`);
  }
}

async function downloadMusic(spoUrl) {
  if (!spoUrl) throw new Error("Spotify URL kosong");
  const { uuid, cookie } = await getLinkDownload(spoUrl);
  const api = await (await fetch(`https://yydz.my.id/api/spotify?url=${spoUrl}`)).json();
  console.log("RESULT API: " + api)
  const resultSearch = api.data[0];
  console.log("RESULT HASIL: " + resultSearch)
  const buffer = await encodeBase64(resultSearch) 
  const url = `https://spotidownloads.com/wp-admin/admin-ajax.php?action=process_music_download&data=` + buffer;
  const headers = {
    "accept": "*/*",
    "accept-language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
    "cache-control": "no-cache",
    "pragma": "no-cache",
    "sec-ch-ua": "\"Chromium\";v=\"139\", \"Not;A=Brand\";v=\"99\"",
    "sec-ch-ua-mobile": "?1",
    "sec-ch-ua-platform": "\"Android\"",
    "Referer": `https://spotidownloads.com/download/?file=${uuid}`,
    "cookie": cookie,
    "Referrer-Policy": "strict-origin-when-cross-origin"
  };

  try {
    const res = await fetch(url, { method: "GET", headers });
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    const arrayBuffer = await res.arrayBuffer();
    const finalBuffer = Buffer.from(arrayBuffer);
    return finalBuffer;
  } catch (err) {
    console.error("❌ Download failed:", err.message);
    return null;
  }
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.sendStatus(204);
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

  try {
    let result = await downloadMusic(url);

    if (Buffer.isBuffer(result)) result = { buffer: result };
    if (!result.buffer) throw new Error("Buffer kosong dari downloadMusic");

    const mime = result.mime || "audio/mpeg";
    const filename = result.filename || "api-yydz.mp3";

    res.setHeader("Content-Type", mime);
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    return res.status(200).send(result.buffer);

  } catch (err) {
    return res.status(500).json({
      author: "Yudzxml",
      status: 500,
      error: err.message || "Terjadi kesalahan internal",
    });
  }
};