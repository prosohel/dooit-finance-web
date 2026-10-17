// Client-side reader for the Nisa streaming endpoint (proxied via /api/nisa/stream).
// Calls onChunk with each piece of text as it arrives. Supports plain text and SSE ("data: ...") streams.
export const getChatStreams = async (body, onChunk, signal) => {
  const response = await fetch(`${process.env.NEXT_PUBLIC_CHAT_URL}ask_stream_response_v1`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": process.env.NEXT_PUBLIC_NISA_API_KEY,
    },
    body: JSON.stringify(body),
    signal,
  });

  if (!response.ok || !response.body) {
    throw new Error("Network response was not ok");
  }

  const isSSE = response.headers.get("Content-Type")?.includes("text/event-stream");
  const reader = response.body.getReader();
  const decoder = new TextDecoder("utf-8");
  let buffer = "";

  const handleSSELine = (line) => {
    if (!line.startsWith("data:")) return;
    const data = line.slice(5).replace(/^ /, "");
    if (!data || data === "[DONE]") return;
    try {
      onChunk(JSON.parse(data));
    } catch {
      onChunk({ type: "chunk", text: data });
    }
  };

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    const text = decoder.decode(value, { stream: true });

    if (!isSSE) {
      onChunk({ type: "chunk", text });
      continue;
    }

    buffer += text;
    const lines = buffer.split(/\r?\n/);
    buffer = lines.pop();
    lines.forEach(handleSSELine);
  }

  const rest = decoder.decode();
  if (isSSE) {
    (buffer + rest).split(/\r?\n/).forEach(handleSSELine);
  } else if (rest) {
    onChunk({ type: "chunk", text: rest });
  }
};
