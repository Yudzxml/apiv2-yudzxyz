const axios = require("axios");

const Keyyy =
  "05120a7d-66b6-4973-b8c4-d3604f7087e7:baef4baa908c8010604ade6d3076274b";

async function BananaEdit(
  imageUrl,
  prompt = "Using the nano-banana model, a commercial 1/7 scale figurine of the character in the picture was created, depicting a realistic style and a realistic environment. The figurine is placed on a computer desk with a round transparent acrylic base. There is no text on the base. The computer screen shows the Zbrush modeling process of the figurine. Next to the computer screen is a BANDAI-style toy box with the original painting printed on it."
) {
  try {
    // Step 1: Kirim job ke fal-ai
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

    // Step 2: Polling status sampai COMPLETED
    let status = "WAIT";
    while (status !== "COMPLETED") {
      const res = await axios.get(statusUrl, {
        headers: { Authorization: `Key ${Keyyy}` },
      });
      status = res.data.status;

      if (status === "FAILED") {
        throw new Error("❌ Proses gagal dijalankan oleh server.");
      }

      if (status !== "COMPLETED") {
        await new Promise((r) => setTimeout(r, 2000));
      }
    }

    // Step 3: Ambil hasil dari response URL
    const result = await axios.get(responseUrl, {
      headers: { Authorization: `Key ${Keyyy}` },
    });

    if (!result.data?.images?.length) {
      throw new Error("Tidak ada hasil gambar dari API.");
    }

    const imageUrlOut = result.data.images[0].url;
    const img = await axios.get(imageUrlOut, { responseType: "arraybuffer" });

    return {
      buffer: Buffer.from(img.data),
      mime: "image/jpeg",
    };
  } catch (err) {
    throw new Error(err.response?.data?.error || err.message);
  }
}

module.exports = async (req, res) => {
  const { method } = req;
  console.log(`[module.exports] Incoming request: ${method} ${req.url}`);

  const handleRequest = async (imageUrl, prompt) => {
    console.log(
      `[handleRequest] url=${imageUrl}, prompt=${
        prompt ? prompt.substring(0, 50) + "..." : "(default)"
      }`
    );

    if (!imageUrl) throw new Error('Parameter "url" wajib diisi.');

    const { buffer, mime } = await BananaEdit(imageUrl, prompt);
    console.log(
      `[handleRequest] Sending response with MIME: ${mime}, size=${buffer.length} bytes`
    );

    res.setHeader("Content-Type", mime);
    res.send(buffer);
  };

  try {
    let url, prompt;

    if (method === "POST") {
      url = req.body.url;
      prompt = req.body.prompt;
      console.log("[module.exports] Handling POST request");
      await handleRequest(url, prompt);
    } else if (method === "GET") {
      url = req.query.url;
      prompt = req.query.prompt;
      console.log("[module.exports] Handling GET request");
      await handleRequest(url, prompt);
    } else {
      console.warn(`[module.exports] Method not allowed: ${method}`);
      res.setHeader("Allow", ["GET", "POST"]);
      return res.status(405).end(`Method ${method} Not Allowed`);
    }
  } catch (err) {
    console.error(`[module.exports] Final error: ${err.message}`);
    res
      .status(500)
      .json({ status: 500, author: "Yudzxml", error: err.message });
  }
};
