export default async function handler(req, res) {
  // CORS headers — allow any origin (public app)
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { stock, date } = req.body;
  if (!stock || !date) return res.status(400).json({ error: "Missing stock or date" });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: "API key not configured" });

  const prompt = `You are a SEBI-aware Indian intraday trading expert. Today's date: ${date}.
Analyze the stock "${stock}" for intraday trading on NSE today.

Consider: current market trend (Nifty ~23,700, Bank Nifty ~55,300, cautious-bullish bias), FII selling (-₹4,521 Cr), DII buying (+₹5,523 Cr), metals/banking/oil-gas sector strength, IT/realty weakness. India VIX ~17.

Respond ONLY with a valid JSON object, no markdown, no backticks:
{
  "name": "company name",
  "symbol": "NSE ticker",
  "sector": "sector",
  "direction": "LONG or SHORT",
  "cmp": <current estimated price number>,
  "entry": <entry price number>,
  "target1": <first target number>,
  "target2": <second target number>,
  "sl": <stop-loss number>,
  "rr": <risk reward ratio number like 2.3>,
  "risk": "Low or Medium or High",
  "rsi": <RSI number>,
  "volume": "High or Normal or Low",
  "news": "Positive or Neutral or Negative",
  "tags": ["tag1","tag2","tag3"],
  "rationale": "2-3 sentence intraday rationale including entry trigger, key level to watch, and exit strategy",
  "risks": ["risk1","risk2","risk3"],
  "bestEntryTime": "e.g. 9:30–10:00 AM",
  "exitBy": "e.g. 2:30 PM"
}`;

  try {
    const anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1000,
        tools: [{ type: "web_search_20250305", name: "web_search" }],
        messages: [{ role: "user", content: prompt }],
      }),
    });

    const data = await anthropicRes.json();

    if (!anthropicRes.ok) {
      return res.status(anthropicRes.status).json({ error: data.error?.message || "Anthropic API error" });
    }

    const text = data.content
      .filter((b) => b.type === "text")
      .map((b) => b.text)
      .join("");

    const clean = text.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(clean);

    return res.status(200).json(parsed);
  } catch (err) {
    console.error("API error:", err);
    return res.status(500).json({ error: "Failed to analyze stock. Please try again." });
  }
}
