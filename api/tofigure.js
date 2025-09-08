const { GoogleGenAI } = require('@google/genai');
const axios = require('axios');

const APIKEYS = process.env.GOOGLE_API_KEYS
  ? process.env.GOOGLE_API_KEYS.split(',').map(k => k.trim())
  : [];

const PROMPT = 'Using the nano-banana model, a commercial 1/7 scale figurine of the character in the picture was created, depicting a realistic style and a realistic environment. The figurine is placed on a computer desk with a round transparent acrylic base. There is no text on the base. The computer screen shows the Zbrush modeling process of the figurine. Next to the computer screen is a BANDAI-style toy box with the original painting printed on it.';

async function fetchImageBufferFromURL(url) {
  const response = await axios.get(url, { responseType: 'arraybuffer' });
  return Buffer.from(response.data);
}

async function toFigureFromURL(imageUrl, customPrompt) {
  if (!imageUrl || typeof imageUrl !== 'string' || !imageUrl.startsWith('http')) {
    throw new Error('Input harus berupa URL gambar yang valid');
  }

  if (!APIKEYS.length) throw new Error('Tidak ada API key yang tersedia di environment variable');
  const prompt = customPrompt && customPrompt.trim().length > 0 ? customPrompt : PROMPT;
  const imageBuffer = await fetchImageBufferFromURL(imageUrl);
  const base64Image = imageBuffer.toString('base64');

  const contents = [
    { text: prompt },
    { inlineData: { data: base64Image } } // tanpa mimeType
  ];

  let lastError;
  for (const key of APIKEYS) {
    try {
      const ai = new GoogleGenAI({ apiKey: key });
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image-preview',
        contents
      });

      const parts = response?.candidates?.[0]?.content?.parts || [];
      for (const part of parts) {
        if (part.inlineData?.data) return Buffer.from(part.inlineData.data, 'base64');
      }

      lastError = new Error('Gagal mendapatkan gambar dari AI dengan key ini');
    } catch (err) {
      lastError = err;
      continue;
    }
  }
  throw lastError;
}

module.exports = async (req, res) => {
  const { method } = req;

  const handleRequest = async (imageUrl, prompt) => {
    if (!imageUrl) throw new Error('Parameter "url" wajib diisi.');
    const buffer = await toFigureFromURL(imageUrl, prompt);

    // Default ke PNG aja
    res.setHeader('Content-Type', 'image/png');
    res.send(buffer);
  };

  try {
    let url, prompt;

    if (method === "POST") {
      url = req.body.url;
      prompt = req.body.prompt;
      await handleRequest(url, prompt);
    } else if (method === "GET") {
      url = req.query.url;
      prompt = req.query.prompt; 
      await handleRequest(url, prompt);
    } else {
      res.setHeader("Allow", ["GET", "POST"]);
      return res.status(405).end(`Method ${method} Not Allowed`);
    }
  } catch (err) {
    res.status(500).json({ status: 500, author: "Yudzxml", error: err.message });
  }
};
