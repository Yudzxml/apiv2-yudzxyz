const axios = require('axios');

module.exports = async (req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-filename');
  res.setHeader('Content-Type', 'application/json');

  // Log request method
  console.log(`Received request: ${req.method}`);

  // Handle preflight request
  if (req.method === 'OPTIONS') {
    console.log('Handling preflight OPTIONS request');
    return res.status(200).end();
  }

  if (req.method === 'GET') {
    const category = req.query.category;
    console.log(`Query parameter category: ${category}`);

    if (!category) {
      console.log('Category query parameter missing');
      return res.status(400).json({ error: 'Query parameter category wajib diisi' });
    }

    try {
      const url = 'https://raw.githubusercontent.com/Yudzxml/UploaderV2/main/tmp/48eca072.json';
      console.log(`Fetching data from: ${url}`);
      const response = await axios.get(url);
      const data = response.data;
      console.log('Data fetched successfully');
      
      console.log('Response data:', data);

      // Validate data format
      if (typeof data !== 'object' || data === null) {
        console.log('Data format tidak valid');
        return res.status(500).json({ error: 'Format data sumber tidak valid' });
      }

      // Check if category exists
      if (!Object.prototype.hasOwnProperty.call(data, category)) {
        console.log(`Kategori '${category}' tidak ditemukan`);
        return res.status(404).json({ error: `Kategori '${category}' tidak ditemukan` });
      }

      let items = data[category];
      console.log(`Items sebelum di-shuffle:`, items);

      // Validate that items is an array
      if (!Array.isArray(items)) {
        console.log(`Data kategori '${category}' tidak berbentuk array`);
        return res.status(500).json({ error: `Data kategori '${category}' tidak berbentuk array` });
      }

      // Function to shuffle array
      function shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
      }

      // Shuffle items
      items = shuffleArray(items);
      console.log(`Items setelah di-shuffle:`, items);

      // Respond with data
      console.log('Mengirim data ke client');
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

  // Method Not Allowed
  console.log(`Method ${req.method} tidak diizinkan`);
  return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
};
