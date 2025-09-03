const axios = require('axios');

module.exports = async (req, res) => {
  // Set header CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-filename');
  res.setHeader('Content-Type', 'application/json');

  // Handle preflight request
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'GET') {
    // Ambil query parameter category, misal ?category=tebakheroml
    const category = req.query.category;
    if (!category) {
      return res.status(400).json({ error: 'Query parameter category wajib diisi' });
    }

    try {
      // Ambil data JSON dari URL
      const url = 'https://raw.githubusercontent.com/Yudzxml/UploaderV2/main/tmp/eceb970d.json';
      const response = await axios.get(url);
      const data = response.data;

      // Cek apakah category ada di data
      if (!data.hasOwnProperty(category)) {
        return res.status(404).json({ error: `Kategori '${category}' tidak ditemukan` });
      }

      let items = data[category];

      // Jika items bukan array, kirim error
      if (!Array.isArray(items)) {
        return res.status(500).json({ error: `Data kategori '${category}' tidak berbentuk array` });
      }

      // Fungsi untuk mengacak array (Fisher-Yates shuffle)
      function shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
      }

      // Acak data
      items = shuffleArray(items);

      // Kirim data acak ke client
      return res.status(200).json({
        success: true,
        category,
        count: items.length,
        data: items,
      });
    } catch (error) {
      console.error('Error fetching or processing data:', error);
      return res.status(500).json({ error: 'Gagal mengambil data dari sumber' });
    }
  }

  return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
};
