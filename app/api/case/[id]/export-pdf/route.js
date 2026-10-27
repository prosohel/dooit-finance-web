import { auth } from "@/auth";
import { BASE_URL } from "@/services/serverApi";
import { NextResponse } from "next/server";

/**
 * Streams the Case Summary PDF from the API with the caller's bearer token
 * attached. Mirrors the SMR/ECDD/GFS export-pdf proxy routes: a download or
 * window.open is a plain fetch with nowhere to put an Authorization header,
 * and the token must not travel in a query string.
 *
 * `?disposition=inline` is passed through so Print can open the document in
 * the browser's PDF viewer instead of downloading it.
 */
export async function GET(request, { params }) {
  const { id } = await params;
  const session = await auth();
  const token = session?.user?.accessToken;

  const disposition =
    new URL(request.url).searchParams.get("disposition") === "inline" ? "?disposition=inline" : "";

  const response = await fetch(`${BASE_URL}cases/${id}/export-pdf${disposition}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    return NextResponse.json({ success: false }, { status: response.status });
  }

  const buffer = await response.arrayBuffer();
  return new NextResponse(buffer, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition":
        response.headers.get("Content-Disposition") ?? `attachment; filename=CASE-${id}.pdf`,
    },
  });
}
