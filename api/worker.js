const ALLOWED_ORIGIN = "https://drhaden105-art.github.io";
const MODEL = "gemini-3.8-flash";

function cors(origin) {
  return {
    "Access-Control-Allow-Origin": origin === ALLOWED_ORIGIN ? ALLOWED_ORIGIN : "null",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Vary": "Origin"
  };
}
function json(data, status, origin) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...cors(origin), "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" }
  });
}
function validYouTubeUrl(value) {
  try {
    const u = new URL(value);
    if (!["youtube.com", "www.youtube.com", "m.youtube.com", "youtu.be"].includes(u.hostname)) return false;
    if (u.hostname === "youtu.be") return /^\/[A-Za-z0-9_-]{11}$/.test(u.pathname);
    return u.pathname === "/watch" && /^[A-Za-z0-9_-]{11}$/.test(u.searchParams.get("v") || "");
  } catch { return false; }
}
function extractText(data) {
  if (typeof data.output_text === "string") return data.output_text;
  const parts = [];
  for (const step of data.steps || []) {
    for (const item of step.content || []) if (typeof item.text === "string") parts.push(item.text);
  }
  return parts.join("\n");
}
export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") || "";
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors(origin) });
    if (origin !== ALLOWED_ORIGIN) return json({ error: "This website is not authorized to use the sermon analysis service." }, 403, origin);
    if (request.method !== "POST") return json({ error: "Use POST to analyze a sermon." }, 405, origin);
    if (!env.GEMINI_API_KEY) return json({ error: "The AI service is not configured yet. Ask the church administrator to finish setup." }, 503, origin);
    try {
      const body = await request.json();
      const youtubeUrl = String(body.youtubeUrl || "").trim();
      const notes = String(body.notes || "").slice(0, 5000);
      if (!validYouTubeUrl(youtubeUrl)) return json({ error: "Enter a valid public YouTube video link." }, 400, origin);
      const prompt = [
        "Analyze the actual sermon video, including the preacher's spoken audio and relevant visual context. Do not use or infer the sermon title from the YouTube page title.",
        "Identify the central biblical message, main themes, and any Bible passages explicitly mentioned. Do not invent scripture references; if uncertain, leave them out.",
        "Create one clear, compelling, church-appropriate sermon title that accurately reflects the message. Also provide a concise summary and a visual background theme for a thumbnail.",
        notes ? "Additional user-provided context (use only as supporting context, not as a replacement for analyzing the video): " + notes : "",
        "Return ONLY valid JSON with this shape: { title: string, summary: string, scriptures: string[], backgroundTheme: string }. Do not include markdown fences."
      ].filter(Boolean).join("\n\n");
      const upstream = await fetch("https://generativelanguage.googleapis.com/v1beta/interactions", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": env.GEMINI_API_KEY },
        body: JSON.stringify({
          model: MODEL,
          input: [
            { type: "video", uri: youtubeUrl },
            { type: "text", text: prompt }
          ]
        })
      });
      const raw = await upstream.json().catch(() => ({}));
      if (!upstream.ok) {
        const message = raw.error?.message || "The video analysis provider could not analyze this video.";
        return json({ error: message }, upstream.status === 429 ? 429 : 502, origin);
      }
      const text = extractText(raw);
      const cleaned = text.replace(/^\s*```(?:json)?\s*/i, "").replace(/\s*```\s*$/, "");
      let parsed;
      try { parsed = JSON.parse(cleaned); }
      catch { return json({ error: "The AI returned an unreadable result. Please try again." }, 502, origin); }
      if (!parsed.title || typeof parsed.title !== "string") return json({ error: "The AI did not return a sermon title." }, 502, origin);
      return json({
        title: parsed.title.slice(0, 180),
        summary: String(parsed.summary || "").slice(0, 1200),
        scriptures: Array.isArray(parsed.scriptures) ? parsed.scriptures.slice(0, 12).map(x => String(x).slice(0, 100)) : [],
        backgroundTheme: String(parsed.backgroundTheme || "").slice(0, 300)
      }, 200, origin);
    } catch (error) {
      return json({ error: "Could not process this request. Check the video link and try again." }, 400, origin);
    }
  }
};
