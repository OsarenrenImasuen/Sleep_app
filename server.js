// server.js — serves the Slumber app and proxies AI chat requests to Groq (free tier).
// The Groq API key stays here, server-side. It is NEVER sent to the browser.
require("dotenv").config();
const express = require("express");
const path = require("path");
 
const app = express();
app.use(express.json());
app.use(express.static(__dirname)); // serves sleepweb.html, sleep.js, etc.
 
const GROQ_API_KEY = process.env.GROQ_API_KEY;
if (!GROQ_API_KEY) {
  console.warn("⚠️  GROQ_API_KEY is not set. Set it in your environment or a .env file before starting the AI chat feature.");
}
 
const GROQ_MODEL = "llama-3.3-70b-versatile"; // free tier, fast, no credit card needed
 
app.post("/api/sleep-chat", async (req, res) => {
  try {
    const { message, sleepLog, summary } = req.body;
 
    if (!message || typeof message !== "string") {
      return res.status(400).json({ error: "Missing 'message' in request body." });
    }
 
    // Build a compact, readable summary of the user's recent nights for the model.
    const recentNights = (sleepLog || [])
      .slice(-14) // last two weeks keeps the prompt small and relevant
      .map(n => `${n.date}: bed ${n.bedtime} → wake ${n.wake}, ${n.hoursSlept}h`)
      .join("\n");
 
    const systemPrompt = `You are a friendly, knowledgeable sleep habits coach inside a sleep-tracking app called Dreambetter.
You are given a user's recent sleep log and summary stats. Answer their question using that data.
Be specific and reference their actual numbers/patterns when relevant. Keep answers concise (a few sentences to a short paragraph).
You are not a doctor. Do not diagnose sleep disorders. For signs of a possible medical issue (e.g. chronic insomnia, sleep apnea symptoms, extreme fatigue), gently suggest they talk to a doctor, alongside whatever practical observation you can offer.
Also offer Advice on how to improve sleep quality, sleep hygiene, and bedtime routines, if the user asks about it, regardless of if they have logged any hours.
 
User's sleep summary: ${summary.nights} nights logged, average ${summary.avgHours}h/night, current level "${summary.level}".
 
Recent nights:
${recentNights || "No nights logged yet."}`;
 
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        max_tokens: 400,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: message }
        ]
      })
    });
 
    if (!response.ok) {
      const errText = await response.text();
      console.error("Groq API error:", response.status, errText);
      return res.status(502).json({ error: "AI service error." });
    }
 
    const data = await response.json();
    const reply = data?.choices?.[0]?.message?.content
      || "Sorry, I didn't get a usable response that time — try asking again.";
 
    res.json({ reply });
  } catch (err) {
    console.error("Chat endpoint error:", err);
    res.status(500).json({ error: "Something went wrong." });
  }
});
 
const PORT = process.env.PORT || 5500;
app.listen(PORT, () => {
  console.log(`Slumber running at http://localhost:${PORT}/sleepweb.html`);
});