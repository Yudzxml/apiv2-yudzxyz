// =========================
// Dependencies
// =========================
const axios = require("axios");
const FormData = require("form-data");
const crypto = require("crypto");

// =========================
// Konstanta
// =========================
const Keyyy =
  "05120a7d-66b6-4973-b8c4-d3604f7087e7:baef4baa908c8010604ade6d3076274b";
const BASE_URL = "https://ai-apps.codergautam.dev";

// =========================
// Helper Functions
// =========================
function acakName(len = 10) {
  const chars = "abcdefghijklmnopqrstuvwxyz";
  return Array.from({ length: len }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

async function delay(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

// =========================
// Fal-AI (BananaEdit) - Primary API
// =========================
async function BananaEdit(
  imageUrl,
  prompt = "Using the nano-banana model, a commercial 1/7 scale figurine of the character in the picture was created, depicting a realistic style and a realistic environment. The figurine is placed on a computer desk with a round transparent acrylic base. There is no text on the base. The computer screen shows the Zbrush modeling process of the figurine. Next to the computer screen is a BANDAI-style toy box with the original painting printed on it."
) {
  // Step 1: Kirim job
  const create = await axios.post(
    "https://queue.fal.run/fal-ai/gemini-25-flash-image/edit",
    {
      prompt,
      num_images: 1,
      output_format: "jpeg",
      image_urls: [imageUrl],
    },
    {
      headers: {
        Authorization: `Key ${Keyyy}`,
        Accept: "application/json",
        "Content-Type": "application/json",
        "User-Agent": "@fal-ai/client/1.6.2",
      },
    }
  );

  const { status_url: statusUrl, response_url: responseUrl } = create.data;

  // Step 2: Polling status
  let status = "WAIT";
  while (status !== "COMPLETED") {
    const res = await axios.get(statusUrl, {
      headers: { Authorization: `Key ${Keyyy}` },
    });
    status = res.data.status;

    if (status === "FAILED") {
      throw new Error("❌ Proses gagal dijalankan oleh Fal-AI server.");
    }
    if (status !== "COMPLETED") await delay(2000);
  }

  // Step 3: Ambil hasil
  const result = await axios.get(responseUrl, {
    headers: { Authorization: `Key ${Keyyy}` },
  });

  if (!result.data?.images?.length) {
    throw new Error("Tidak ada hasil gambar dari API Fal-AI.");
  }

  const imageUrlOut = result.data.images[0].url;
  const img = await axios.get(imageUrlOut, { responseType: "arraybuffer" });

  return {
    buffer: Buffer.from(img.data),
    mime: "image/jpeg",
  };
}

// =========================
// Fallback (PhotoGPT)
// =========================
async function autoregist() {
  const uid = crypto.randomBytes(12).toString("hex");
  const email = `gienetic${Date.now()}@nyahoo.com`;

  const payload = {
    uid,
    email,
    displayName: acakName(),
    photoURL: "https://i.pravatar.cc/150",
    appId: "photogpt",
  };

  const res = await axios.post(`${BASE_URL}/photogpt/create-user`, payload, {
    headers: {
      "content-type": "application/json",
      accept: "application/json",
      "user-agent": "okhttp/4.9.2",
    },
  });

  if (res.data.success) return uid;
  throw new Error("Register gagal cuy: " + JSON.stringify(res.data));
}

async function img2img(imageBuffer, prompt) {
  const uid = await autoregist();

  const form = new FormData();
  form.append("image", imageBuffer, { filename: "input.jpg", contentType: "image/jpeg" });
  form.append("prompt", prompt);
  form.append("userId", uid);

  const uploadRes = await axios.post(`${BASE_URL}/photogpt/generate-image`, form, {
    headers: {
      ...form.getHeaders(),
      accept: "application/json",
      "user-agent": "okhttp/4.9.2",
      "accept-encoding": "gzip",
    },
  });

  if (!uploadRes.data.success) throw new Error(JSON.stringify(uploadRes.data));

  const { pollingUrl } = uploadRes.data;
  let status = "pending";
  let resultUrl = null;

  while (status !== "Ready") {
    const pollRes = await axios.get(pollingUrl, {
      headers: { accept: "application/json", "user-agent": "okhttp/4.9.2" },
    });
    status = pollRes.data.status;
    if (status === "Ready") {
      resultUrl = pollRes.data.result.url;
      break;
    }
    await delay(3000);
  }

  if (!resultUrl) throw new Error("Gagal mendapatkan hasil gambar (fallback).");

  const resultImg = await axios.get(resultUrl, { responseType: "arraybuffer" });
  return {
    buffer: Buffer.from(resultImg.data),
    mime: "image/jpeg",
  };
}

// =========================
// Main Export
// =========================
module.exports = async (req, res) => {
  const { method } = req;
  console.log(`[API] Incoming request: ${method} ${req.url}`);

  async function handleRequest(imageUrl, prompt) {
    if (!imageUrl) throw new Error('Parameter "url" wajib diisi.');

    try {
      // coba pakai Fal-AI
      const { buffer, mime } = await BananaEdit(imageUrl, prompt);
      res.setHeader("Content-Type", mime);
      return res.send(buffer);
    } catch (e1) {
      console.warn("[WARN] Fal-AI gagal, fallback ke PhotoGPT:", e1.message);

      // fallback pakai PhotoGPT
      const imgRes = await axios.get(imageUrl, { responseType: "arraybuffer" });
      const { buffer, mime } = await img2img(imgRes.data, prompt);
      res.setHeader("Content-Type", mime);
      return res.send(buffer);
    }
  }

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
    console.error(`[API] Final error: ${err.message}`);
    res.status(500).json({ status: 500, author: "Yudzxml", error: err.message });
  }
};
