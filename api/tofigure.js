const { GoogleGenAI } = require('@google/genai')
const axios = require('axios')
const APIKEYS = process.env.GOOGLE_API_KEYS
  ? process.env.GOOGLE_API_KEYS.split(',').map(k => k.trim())
  : []

const PROMPT = 'A hyper-detailed 1/7 commercial figurine of the character from the photo, crafted with the nano-banana model. The figurine is showcased in a realistic studio-like environment, placed neatly on a modern computer desk. It stands on a glossy, transparent acrylic base without any text. On the computer screen, the ZBrush sculpting process of the figurine is displayed, adding authenticity to the scene. Beside the monitor, a premium BANDAI-style toy box is presented, featuring the official illustration artwork printed in high resolution. The overall lighting emphasizes a professional product shoot, with a cinematic and realistic atmosphere.'

async function fetchImageBufferFromURL(url) {
  const response = await axios.get(url, { responseType: 'arraybuffer' })
  return Buffer.from(response.data)
}

async function toFigureFromURL(imageUrl, mime = 'image/png', prompt = PROMPT) {
  if (!imageUrl || typeof imageUrl !== 'string' || !imageUrl.startsWith('http')) {
    throw new Error('Input harus berupa URL gambar yang valid')
  }

  if (!APIKEYS.length) throw new Error('Tidak ada API key yang tersedia di environment variable')

  const imageBuffer = await fetchImageBufferFromURL(imageUrl)
  const base64Image = imageBuffer.toString('base64')
  const contents = [
    { text: prompt },
    { inlineData: { mimeType: mime, data: base64Image } }
  ]

  let lastError
  for (const key of APIKEYS) {
    try {
      const ai = new GoogleGenAI({ apiKey: key })
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image-preview',
        contents
      })

      const parts = response?.candidates?.[0]?.content?.parts || []
      for (const part of parts) {
        if (part.inlineData?.data) return Buffer.from(part.inlineData.data, 'base64')
      }

      lastError = new Error('Gagal mendapatkan gambar dari AI dengan key ini')
    } catch (err) {
      lastError = err
      continue
    }
  }
  throw lastError
}

module.exports = async (req, res) => {
  const { method } = req;

  const handleRequest = async (imageUrl, mime) => {
    if (!imageUrl) throw new Error('Parameter "url" wajib diisi.');
    const buffer = await toFigureFromURL(imageUrl, mime);

    res.setHeader('Content-Type', mime);
    res.send(buffer);
  }

  try {
    let url, mime = 'image/png';

    if (method === "POST") {
      url = req.body.url;
      if (req.body.mime) mime = req.body.mime;
      await handleRequest(url, mime);
    } else if (method === "GET") {
      url = req.query.url;
      if (req.query.mime) mime = req.query.mime;
      await handleRequest(url, mime);
    } else {
      res.setHeader("Allow", ["GET", "POST"]);
      return res.status(405).end(`Method ${method} Not Allowed`);
    }
  } catch (err) {
    res.status(500).json({ status: 500, author: "Yudzxml", error: err.message });
  }
};
