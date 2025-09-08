const { GoogleGenAI } = require('@google/genai');
const axios = require('axios');
const mime = require('mime-types');

const APIKEYS = process.env.GOOGLE_API_KEYS
  ? process.env.GOOGLE_API_KEYS.split(',').map(k => k.trim())
  : [];

const PROMPT = 'Using the nano-banana model, a commercial 1/7 scale figurine of the character in the picture was created, depicting a realistic style and a realistic environment. The figurine is placed on a computer desk with a round transparent acrylic base. There is no text on the base. The computer screen shows the Zbrush modeling process of the figurine. Next to the computer screen is a BANDAI-style toy box with the original painting printed on it.';

// --- Fungsi deteksi MIME dari buffer (magic number) ---
function detectMimeFromBuffer(buffer) {
  if (!buffer || buffer.length < 4) return null;

  const hex = buffer.slice(0, 12).toString('hex').toUpperCase();

  if (hex.startsWith('89504E47')) return 'image/png';          // PNG
  if (hex.startsWith('FFD8FF')) return 'image/jpeg';           // JPEG
  if (hex.startsWith('47494638')) return 'image/gif';          // GIF
  if (hex.startsWith('52494646') && hex.includes('57454250')) return 'image/webp'; // WEBP
  if (hex.startsWith('49492A00') || hex.startsWith('4D4D002A')) return 'image/tiff'; // TIFF
  if (hex.startsWith('424D')) return 'image/bmp';              // BMP

  return null; // fallback ke ekstensi
}

async function fetchImageBufferFromURL(url) {
  const response = await axios.get(url, { responseType: 'arraybuffer' });
  const buffer = Buffer.from(response.data);

  // Cek urutan prioritas: header -> magic number -> ekstensi -> fallback PNG
  const headerMime = response.headers['content-type'];
  const magicMime = detectMimeFromBuffer(buffer);
  const extMime = mime.lookup(url);

  return {
    buffer,
    mime: headerMime || magicMime || extMime || 'image/png'
  };
}

async function toFigureFromURL(imageUrl, customPrompt) {
  if (!imageUrl || typeof imageUrl !== 'string' || !imageUrl.startsWith('http')) {
    throw new Error('Input harus berupa URL gambar yang valid');
  }

  if (!APIKEYS.length) throw new Error('Tidak ada API key yang tersedia di environment variable');
  const prompt = customPrompt && customPrompt.trim().length > 0 ? customPrompt : PROMPT;

  const { buffer: imageBuffer, mime: inputMime } = await fetchImageBufferFromURL(imageUrl);
  const base64Image = imageBuffer.toString('base64');

  const contents = [
    { text: prompt },
    { inlineData: { data: base64Image, mimeType: inputMime } }
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
        if (part.inlineData?.data) {
          const mimeType = part.inlineData?.mimeType || 'image/png';
          return {
            buffer: Buffer.from(part.inlineData.data, 'base64'),
            mime: mimeType
          };
        }
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
    const { buffer, mime } = await toFigureFromURL(imageUrl, prompt);

    res.setHeader('Content-Type', mime);
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
