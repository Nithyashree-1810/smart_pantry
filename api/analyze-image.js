import Groq from "groq-sdk";
import multer from "multer";
import fs from "fs/promises";
import { promisify } from "util";

// Multer setup for serverless
const upload = multer({ dest: "/tmp/" });
const uploadMiddleware = upload.single("image");
const runMiddleware = promisify(uploadMiddleware);

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export const config = {
  api: {
    bodyParser: false, // Multer handles parsing
  },
};

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

    await runMiddleware(req, res);

    if (!req.file) return res.status(400).json({ error: "No image uploaded" });

    const imageBuffer = await fs.readFile(req.file.path);
    const base64Image = imageBuffer.toString("base64");

    const response = await groq.chat.completions.create({
      model: "llava-v1.5-7b",
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: "Extract expiry date and any readable text from this image. Return simple text only." },
            { type: "image", image_bytes: base64Image },
          ],
        },
      ],
      temperature: 0,
    });

    res.status(200).json({ text: response.choices[0].message.content.trim() });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message || "Analysis failed" });
  }
}
