/**
 * Netlify Function — Gemini API Proxy
 *
 * Acts as a transparent proxy to Google's Generative Language API.
 * The client sends the full Gemini payload (contents, systemInstruction, tools, etc.)
 * and this function injects the API key server-side so it's never exposed in the bundle.
 *
 * Request body: { model?: string, ...rest of Gemini generateContent payload }
 * Response: Gemini API response passed through directly
 */

function jsonError(message, status = 500) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

export default async function handler(request) {
  if (request.method !== 'POST') {
    return jsonError('Method not allowed', 405);
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return jsonError('GEMINI_API_KEY is not configured on the server. Add it in Netlify → Site settings → Environment variables.', 500);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return jsonError('Invalid JSON body', 400);
  }

  // Extract model from body (defaults to gemini-2.0-flash), pass everything else straight to Google
  const { model = 'gemini-2.0-flash', ...geminiPayload } = body;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;

  let response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      body: JSON.stringify(geminiPayload),
    });
  } catch (e) {
    return jsonError(`Network error calling Gemini: ${e?.message || 'unknown'}`, 502);
  }

  const responseText = await response.text();

  return new Response(responseText, {
    status: response.status,
    headers: { 'content-type': 'application/json' },
  });
}
