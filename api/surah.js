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

async function getListSurah() {
  const { data } = await axios.get("https://web-api.qurankemenag.net/quran-surah", { headers });
  return data.data.map(surah => ({
    nomor: surah.id,
    latin: surah.latin.trim(),
    arti: surah.translation,
    jumlah_ayat: surah.num_ayah
  }));
}

async function getAllAyat(surahInput) {
  const list = await getListSurah();
  const found = list.find(s =>
    s.latin.toLowerCase() === surahInput.toLowerCase() ||
    s.nomor === Number(surahInput)
  );
  if (!found) return { error: "Surah tidak ditemukan" };

  const { data } = await axios.get(
    `https://web-api.qurankemenag.net/quran-ayah?start=0&limit=${found.jumlah_ayat}&surah=${found.nomor}`,
    { headers }
  );

  return {
    surah: found.latin,
    arti_surah: found.arti,
    ayat: data.data.map(a => ({
      ayat: a.ayah,
      arab: a.arabic,
      latin: a.latin.trim(),
      terjemahan: a.translation
    }))
  };
}

/**
// AMBIL AYAT 1 = AL FATIHA
(async () => {
  console.log(await getAllAyat("1"));
})();

// AMBIL LIST AYAT 
(async () => {
  console.log(await getListSurah());
})();

**/