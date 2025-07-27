const { createCanvas, registerFont, loadImage } = require('canvas');
const path = require('path');
const fs = require('fs').promises;
const fs2 = require('fs');
const axios = require('axios');
const FormData = require('form-data');

const TEMP_DIR = '/tmp';

async function downloadBuffer(url) {
  const response = await axios.get(url, { responseType: 'arraybuffer' });
  return Buffer.from(response.data, 'binary');
}

async function saveBufferToTempFile(buffer, ext = 'tmp') {
  await fs.mkdir(TEMP_DIR, { recursive: true });
  const filePath = path.join(TEMP_DIR, `tmp_${Date.now()}.${ext}`);
  await fs.writeFile(filePath, buffer);
  return filePath;
}

async function catbox(filePath) {
  const data = new FormData();
  data.append('reqtype', 'fileupload');
  data.append('userhash', '');
  data.append('fileToUpload', fs2.createReadStream(filePath));

  const config = {
    method: 'POST',
    url: 'https://catbox.moe/user/api.php',
    headers: {
      ...data.getHeaders()
    },
    data: data,
  };

  const api = await axios.request(config);
  return api.data; // langsung URL string
}

async function generateImage(name, ppUrl, bgUrl, fontUrl) {
  const fontBuffer = await downloadBuffer(fontUrl);
  const fontPath = await saveBufferToTempFile(fontBuffer, 'otf');
  registerFont(fontPath, { family: 'LEMONMILK' });

  const ppBuffer = await downloadBuffer(ppUrl);
  const ppPath = await saveBufferToTempFile(ppBuffer, 'jpg');

  const bgBuffer = await downloadBuffer(bgUrl);
  const bgPath = await saveBufferToTempFile(bgBuffer, 'png');

  const canvasWidth = 1280;
  const canvasHeight = 720;
  const canvas = createCanvas(canvasWidth, canvasHeight);
  const ctx = canvas.getContext('2d');

  const backgroundImage = await loadImage(bgPath);
  ctx.drawImage(backgroundImage, 0, 0, canvasWidth, canvasHeight);

  const profileImage = await loadImage(ppPath);
  const radius = 220;
  const x = (canvasWidth - radius * 2) / 2;
  const y = (canvasHeight - radius * 2) / 2 - 71;

  ctx.save();
  ctx.beginPath();
  ctx.arc(x + radius, y + radius, radius, 0, Math.PI * 2);
  ctx.closePath();
  ctx.clip();
  ctx.drawImage(profileImage, x, y, radius * 2, radius * 2);
  ctx.restore();

  ctx.font = '55px "LEMONMILK"';
  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 2;
  ctx.textAlign = 'center';
  ctx.strokeText(name, canvasWidth / 2, 632);
  ctx.fillText(name, canvasWidth / 2, 632);

  // cleanup
  await fs.unlink(fontPath);
  await fs.unlink(ppPath);
  await fs.unlink(bgPath);

  return canvas.toBuffer('image/png');
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.statusCode = 405;
    return res.end(JSON.stringify({ error: 'Use POST method' }));
  }

  let body = '';

  req.on('data', chunk => body += chunk);
  req.on('end', async () => {
    try {
      const { name, pp, iwelcome } = JSON.parse(body);

      if (!name || !pp || !iwelcome) {
        res.statusCode = 400;
        return res.end(JSON.stringify({ error: 'Missing name, pp, or iwelcome' }));
      }

      const fontUrl = 'https://raw.githubusercontent.com/Yudzxml/UploaderV2/main/tmp/cd87c6ef.otf';

      const imageBuffer = await generateImage(name, pp, iwelcome, fontUrl);
      const imagePath = await saveBufferToTempFile(imageBuffer, 'png');

      const uploadedUrl = await catbox(imagePath);
      await fs.unlink(imagePath);

      res.setHeader('Content-Type', 'application/json');
      res.statusCode = 200;
      return res.end(JSON.stringify({
        success: true,
        author: 'Yudzxml',
        message: 'Generated & Uploaded successfully',
        url: uploadedUrl
      }));
    } catch (err) {
      console.error(err);
      res.statusCode = 500;
      return res.end(JSON.stringify({ error: 'Internal Server Error', detail: err.message }));
    }
  });
};
