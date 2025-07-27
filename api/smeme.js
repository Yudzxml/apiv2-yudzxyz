const { createCanvas, registerFont, loadImage } = require('canvas');
const fs = require('fs');
const fsAsync = require('fs').promises;
const path = require('path');
const os = require('os');
const axios = require('axios');
const FormData = require('form-data');

module.exports = async (req, res) => {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const {
    text = '',
    text2 = '',
    pp,
    borderWidth = 4,
    fontUrl = 'https://raw.githubusercontent.com/Yudzxml/UploaderV2/main/tmp/cd87c6ef.otf'
  } = req.method === 'POST' ? req.body : req.query;

  if (!pp) {
    return res.status(400).json({ error: 'Parameter "pp" diperlukan' });
  }

  try {
    // Helper: download file dari URL dan simpan sementara
    const downloadToTempFile = async (url, ext = '.tmp') => {
      const response = await axios.get(url, { responseType: 'arraybuffer' });
      const filePath = path.join(os.tmpdir(), `${Date.now()}_${Math.random().toString(36).slice(2)}${ext}`);
      await fsAsync.writeFile(filePath, response.data);
      return filePath;
    };

    // Helper: upload ke Catbox
    const catbox = async (filePath) => {
      const form = new FormData();
      form.append('reqtype', 'fileupload');
      form.append('fileToUpload', fs.createReadStream(filePath));
      const response = await axios.post('https://catbox.moe/user/api.php', form, {
        headers: form.getHeaders()
      });
      return { result: { url: response.data } };
    };

    // Download font dan register
    const fontPath = await downloadToTempFile(fontUrl, '.otf');
    const fontFamily = 'CustomFont';
    registerFont(fontPath, { family: fontFamily });

    // Download gambar
    const imagePath = await downloadToTempFile(pp, '.png');
    const image = await loadImage(imagePath);

    const canvasWidth = image.width;
    const canvasHeight = image.height;
    const canvas = createCanvas(canvasWidth, canvasHeight);
    const ctx = canvas.getContext('2d');

    ctx.drawImage(image, 0, 0, canvasWidth, canvasHeight);

    const fontSize = 100;
    ctx.font = `${fontSize}px ${fontFamily}`;
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = borderWidth;
    ctx.textAlign = 'center';

    const drawMultilineText = (text, startY, direction = 1) => {
      const maxLineWidth = canvasWidth - 40;
      let words = text.split(' ');
      let line = '';
      let lines = [];

      for (let word of words) {
        const testLine = line + word + ' ';
        if (ctx.measureText(testLine).width > maxLineWidth) {
          lines.push(line);
          line = word + ' ';
        } else {
          line = testLine;
        }
      }
      lines.push(line);

      if (direction === -1) lines = lines.reverse();

      for (let i = 0; i < lines.length; i++) {
        ctx.strokeText(lines[i].trim(), canvasWidth / 2, startY);
        ctx.fillText(lines[i].trim(), canvasWidth / 2, startY);
        startY += fontSize * 1.2 * direction;
      }
    };

    // Gambar teks atas dan bawah
    drawMultilineText(text, fontSize);
    drawMultilineText(text2, canvasHeight - 20, -1);

    // Simpan hasil ke buffer, unggah, dan bersihkan file sementara
    const resultPath = path.join(os.tmpdir(), `output_${Date.now()}.png`);
    await fsAsync.writeFile(resultPath, canvas.toBuffer('image/png'));

    const upload = await catbox(resultPath);

    // Bersihkan file sementara
    await fsAsync.unlink(fontPath);
    await fsAsync.unlink(imagePath);
    await fsAsync.unlink(resultPath);

    return res.status(200).json({
      status: 200,
      author: 'Yudzxml',
      result: {
        url: upload.result.url
      }
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: error.message
    });
  }
};
