import { auth } from "@/auth";
import { NISA_URL } from "@/services/serverApi";

export async function POST(request) {
  const session = await auth();
  const email = session?.user?.email;
  if (!session?.user?.accessToken || !email) {
    return Response.json({ success: false, message: "Not authenticated" }, { status: 401 });
  }

  const { question } = await request.json();
  if (!question?.trim()) {
    return Response.json({ success: false, message: "Question is required" }, { status: 400 });
  }

  try {
    const upstream = await fetch(`${NISA_URL}ask_stream_response_v1`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": process.env.NEXT_PUBLIC_NISA_API_KEY,
        Authorization: `Bearer ${session.user.accessToken}`,
      },
      body: JSON.stringify({ question, email }),
      signal: request.signal,
    });

    if (!upstream.ok || !upstream.body) {
      return Response.json(
        { success: false, message: "Upstream error" },
        { status: upstream.status || 502 }
      );
    }

    return new Response(upstream.body, {
      headers: {
        "Content-Type": upstream.headers.get("Content-Type") || "text/plain; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        "X-Accel-Buffering": "no",
      },
    });
  } catch (error) {
    return Response.json(
      { success: false, message: "Service unavailable", error: error.message },
      { status: 503 }
    );
  }
}
