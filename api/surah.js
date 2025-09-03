/*
NAME: SURAH
DESKRIPSI: AMBIL DATA SURAH BESERTA LATIN DAN TERJEMAHAN SECARA LENGKAP
BASE: https://quran.kemenag.go.id/
AUTHOR: YUDZXML STORE 77
CREATE: 15 - 08 - 2025
*/

const axios = require("axios");

const headers = {
  "Accept": "application/json, text/plain, */*",
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115 Safari/537.36",
  "Referer": "https://quran.kemenag.go.id/",
  "Origin": "https://quran.kemenag.go.id"
};

// Function to get list of Surahs
async function getListSurah() {
  try {
    const { data } = await axios.get("https://web-api.qurankemenag.net/quran-surah", { headers });
    return data.data.map(surah => ({
      nomor: surah.id,
      latin: surah.latin.trim(),
      arti: surah.translation,
      jumlah_ayat: surah.num_ayah
    }));
  } catch (error) {
    console.error("Error fetching surah list:", error);
    throw new Error("Could not fetch surah list");
  }
}

// Function to get all Ayat (verses) of a specific Surah
async function getAllAyat(surahInput) {
  try {
    const list = await getListSurah();
    const found = list.find(surah => 
      surah.latin.toLowerCase() === surahInput.toLowerCase() || 
      surah.nomor === Number(surahInput)
    );
    
    if (!found) return { status: 404, error: "Surah tidak ditemukan" };

    const { data } = await axios.get(
      `https://web-api.qurankemenag.net/quran-ayah?start=0&limit=${found.jumlah_ayat}&surah=${found.nomor}`,
      { headers }
    );

    return {
      status: 200,
      surah: found.latin,
      arti_surah: found.arti,
      ayat: data.data.map(a => ({
        ayat: a.ayah,
        arab: a.arabic,
        latin: a.latin.trim(),
        terjemahan: a.translation
      }))
    };
  } catch (error) {
    console.error("Error fetching ayat:", error);
    return { status: 500, error: "Internal Server Error" };
  }
}

// Main handler function for the API endpoint
module.exports = async (req, res) => {
  console.info('New request:', req.method, req.query);

  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle pre-flight OPTIONS request
  if (req.method === 'OPTIONS') return res.status(204).end();

  // Only allow GET requests
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET, OPTIONS');
    return res.status(405).json({
      author: "Yudzxml",
      status: 405,
      error: `Method ${req.method} Not Allowed`,
    });
  }

  // Ensure the 'q' query parameter is present
  const { q } = req.query;
  if (!q) {
    return res.status(400).json({
      author: "Yudzxml",
      status: 400,
      error: 'Parameter "q" wajib diisi',
    });
  }

  // Call the getAllAyat function and send response
  const result = await getAllAyat(q);
  
  // If an error occurred, send the error response
  if (result.error) {
    return res.status(result.status).json({
      author: "Yudzxml",
      status: result.status,
      error: result.error
    });
  }

  // Send the successful response
  return res.status(result.status).json({
    status: 200,
    author: "Yudzxml",
    ...result
  });
};