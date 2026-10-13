import express from "express";
import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Middleware
app.use(express.json({ limit: "1mb" }));
app.use(express.static(path.join(__dirname, "public")));

// ---------- Ollama settings (from .env) ----------
const OLLAMA_URL = (process.env.OLLAMA_URL || "http://127.0.0.1:11434").replace(
  /\/$/,
  "",
);
const MODEL = process.env.OLLAMA_MODEL || "qwen3.5:4b";
// Set OLLAMA_THINK=false in .env to skip the model's "thinking" phase (faster replies)
const THINK_OFF = String(process.env.OLLAMA_THINK).toLowerCase() === "false";

const SYSTEM_PROMPT =
  "You are Zoro, a helpful, friendly AI assistant. " +
  "Give clear, useful answers. When the user is learning " +
  "to code, explain things in beginner-friendly steps.";

// Health check (also tells you if Ollama is reachable)
app.get("/api/health", async (_req, res) => {
  try {
    const r = await fetch(`${OLLAMA_URL}/api/tags`);
    res.json({
      ok: r.ok,
      provider: "Ollama",
      model: MODEL,
      ollamaUrl: OLLAMA_URL,
    });
  } catch {
    res.status(503).json({
      ok: false,
      provider: "Ollama",
      model: MODEL,
      error: "Cannot reach Ollama. Is it running?",
    });
  }
});

app.get("/test-route", (_req, res) => {
  res.send("Correct Zoro Ollama server is running!");
});

// List the models you have downloaded in Ollama
app.get("/api/models", async (_req, res) => {
  try {
    const r = await fetch(`${OLLAMA_URL}/api/tags`);
    const data = await r.json();
    res.json((data.models || []).map((m) => m.name));
  } catch (error) {
    res
      .status(500)
      .json({ error: "Could not reach Ollama: " + (error?.message || error) });
  }
});

// Chat API (streams the reply as plain text)
app.post("/api/chat", async (req, res) => {
  console.log("Chat request received:", new Date().toLocaleTimeString());

  const input = req.body?.messages;

  if (!Array.isArray(input) || input.length === 0) {
    return res
      .status(400)
      .json({ error: "messages must be a non-empty array." });
  }

  // Keep only valid messages, last 30, starting with a user message
  const history = input
    .filter(
      (item) =>
        item &&
        (item.role === "user" || item.role === "assistant") &&
        typeof item.content === "string" &&
        item.content.trim().length > 0,
    )
    .slice(-30)
    .map((item) => ({
      role: item.role,
      content: item.content.slice(0, 12000),
    }));

  while (history.length > 0 && history[0].role !== "user") history.shift();

  if (history.length === 0) {
    return res.status(400).json({ error: "Please send a valid user message." });
  }

  // Stop generating if the browser disconnects
  const controller = new AbortController();
  res.on("close", () => {
    if (!res.writableEnded) controller.abort();
  });

  try {
    console.log("Using Ollama model:", MODEL, "| messages:", history.length);

    const body = {
      model: MODEL,
      messages: [{ role: "system", content: SYSTEM_PROMPT }, ...history],
      stream: true,
      options: { num_predict: 1200 },
    };
    if (THINK_OFF) body.think = false;

    const ollamaRes = await fetch(`${OLLAMA_URL}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    if (!ollamaRes.ok) {
      let message = `Ollama error ${ollamaRes.status}`;
      try {
        const err = await ollamaRes.json();
        if (err?.error) message = err.error;
      } catch {}
      if (ollamaRes.status === 404) {
        message += `. Run: ollama pull ${MODEL}`;
      }
      console.error("Ollama error:", message);
      return res.status(500).json({ error: message });
    }

    res.status(200);
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("X-Content-Type-Options", "nosniff");

    // Ollama streams one JSON object per line
    const decoder = new TextDecoder();
    let buffer = "";

    function handleLine(line) {
      if (!line.trim()) return;
      try {
        const data = JSON.parse(line);
        if (data.error) throw new Error(data.error);
        const text = data.message?.content;
        if (text) res.write(text);
      } catch (error) {
        if (error.message && !(error instanceof SyntaxError)) throw error;
      }
    }

    for await (const chunk of ollamaRes.body) {
      buffer += decoder.decode(chunk, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop();
      lines.forEach(handleLine);
    }
    handleLine(buffer);

    res.end();
  } catch (error) {
    if (error.name === "AbortError") return; // browser closed the connection

    console.error("========== OLLAMA ERROR ==========");
    console.error("Message:", error?.message);
    if (error?.cause?.code === "ECONNREFUSED") {
      console.error(
        "Ollama is not running. Start the Ollama app or run: ollama serve",
      );
    }
    console.error("==================================");

    const friendly =
      error?.cause?.code === "ECONNREFUSED"
        ? "Cannot reach Ollama. Start the Ollama app (or run: ollama serve)."
        : error?.message || "Unknown Ollama error";

    if (res.headersSent) {
      res.end();
    } else {
      res.status(500).json({ error: friendly });
    }
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Zoro AI is running at http://localhost:${PORT}`);
  console.log("AI provider: Ollama (" + OLLAMA_URL + ")");
  console.log("Configured model:", MODEL);
});
