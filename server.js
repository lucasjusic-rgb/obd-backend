import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import OpenAI from 'openai';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Groq exposes an OpenAI-compatible endpoint, so we can reuse the
// official `openai` npm package and just point it at Groq's base URL.
const groq = new OpenAI({
  apiKey: process.env.GROQ_API_KEY,
  baseURL: 'https://api.groq.com/openai/v1',
});

// Free, fast, solid general-purpose model on Groq. Swap if you want to try
// another (see console.groq.com for the current model list).
const MODEL = 'openai/gpt-oss-120b';

const MECHANIC_SYSTEM_PROMPT = `You are an ASE-certified master mechanic AI embedded in a car diagnostics app.
You are given a diagnostic trouble code (DTC) and live sensor data from the vehicle.
Respond ONLY with valid JSON, no markdown fences, no extra text, in exactly this shape:
{
  "diagnosis": "plain-English explanation of what this code means and likely root causes, 2-4 sentences",
  "recommendation": "what the driver should do next: drive it, get it checked soon, or stop driving now — and why",
  "urgency": "low" | "medium" | "high",
  "estimated_cost_min": number,
  "estimated_cost_max": number
}`;

const CHAT_SYSTEM_PROMPT = `You are a friendly, knowledgeable AI car mechanic embedded in a diagnostics app.
Answer the driver's question directly and helpfully, in plain conversational English.
Keep answers concise (2-5 sentences) unless the question needs more detail.
If vehicle context (live sensor data, active trouble codes) is provided, use it to ground your answer.`;

// POST /api/diagnose
// body: { code, raw_description, vehicle, live_data }
app.post('/api/diagnose', async (req, res) => {
  try {
    const { code, raw_description, vehicle, live_data } = req.body;

    const completion = await groq.chat.completions.create({
      model: MODEL,
      messages: [
        { role: 'system', content: MECHANIC_SYSTEM_PROMPT },
        {
          role: 'user',
          content: `Vehicle: ${vehicle}\nDTC: ${code} (${raw_description})\nLive data: ${JSON.stringify(live_data)}`,
        },
      ],
      temperature: 0.3,
      response_format: { type: 'json_object' },
    });

    const text = completion.choices[0]?.message?.content ?? '{}';
    const parsed = JSON.parse(text);
    res.json(parsed);
  } catch (err) {
    console.error('Diagnose error:', err);
    res.status(500).json({ error: 'Failed to get diagnosis', detail: String(err) });
  }
});

// POST /api/diagnose/chat
// body: { message, history: [{role, text}], context: { live_data, active_codes } }
app.post('/api/diagnose/chat', async (req, res) => {
  try {
    const { message, history = [], context = {} } = req.body;

    const messages = [
      { role: 'system', content: `${CHAT_SYSTEM_PROMPT}\n\nCurrent vehicle context: ${JSON.stringify(context)}` },
      ...history.map((h) => ({ role: h.role === 'user' ? 'user' : 'assistant', content: h.text })),
      { role: 'user', content: message },
    ];

    const completion = await groq.chat.completions.create({
      model: MODEL,
      messages,
      temperature: 0.5,
    });

    const reply = completion.choices[0]?.message?.content ?? "I didn't get a clear answer — try rephrasing?";
    res.json({ reply });
  } catch (err) {
    console.error('Chat error:', err);
    res.status(500).json({ error: 'Failed to get chat reply', detail: String(err) });
  }
});

app.get('/health', (req, res) => res.json({ status: 'ok' }));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`AI Mechanic backend listening on http://localhost:${PORT}`);
});
