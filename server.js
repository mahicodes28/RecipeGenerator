require("dotenv").config();
const express = require("express");
const cors = require("cors");
const OpenAI = require("openai");

const app = express();
const PORT = process.env.PORT || 3001;

// CORS
app.use(cors({ origin: "*", methods: "GET,POST" }));
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  next();
});

// OpenAI Client
const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// MAIN SSE API
app.get("/recipeStream", async (req, res) => {
  const { ingredients, mealType, cuisine, cookingTime, complexity } = req.query;

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  const prompt = `
Generate a cooking recipe using:
Ingredients: ${ingredients}
Meal Type: ${mealType}
Cuisine: ${cuisine}
Cooking Time: ${cookingTime}
Complexity: ${complexity}

Instructions:
- Give a warm and natural tone.
- Provide a local-language recipe title.
- Output step-by-step method.
`;

  try {
    const stream = await client.chat.completions.create({
      model: "gpt-4o-mini",
      stream: true,
      messages: [{ role: "user", content: prompt }],
    });

    for await (const chunk of stream) {
      const text = chunk.choices[0]?.delta?.content || "";
      if (text) {
        res.write(`data: ${JSON.stringify({ action: "chunk", chunk: text })}\n\n`);
      }
    }

    res.write(`data: ${JSON.stringify({ action: "close" })}\n\n`);
    res.end();

  } catch (err) {
    console.error("❌ OpenAI Error:", err);

    res.write(`data: ${JSON.stringify({
      action: "chunk",
      chunk: "⚠️ Error generating recipe. Please try again."
    })}\n\n`);

    res.write(`data: ${JSON.stringify({ action: "close" })}\n\n`);
    res.end();
  }
});

const path = require("path");

// Serve React build
app.use(express.static(path.join(__dirname, "dist")));

app.get("*", (_req, res) => {
  res.sendFile(path.join(__dirname, "dist", "index.html"));
});

// Start Server
app.listen(PORT, () => {
  console.log(`🟢 Backend running on http://localhost:${PORT}`);
});
