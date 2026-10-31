import { auth } from "@/auth";
import { BASE_URL } from "@/services/serverApi";
import { NextResponse } from "next/server";

/**
 * Streams a screened trade document from the API.
 *
 * The browser cannot fetch it directly: "View document" is a plain navigation
 * with nowhere to put an Authorization header, and the token must not go in a
 * query string where it would land in access logs. So the request is proxied
 * here, where the session is already available server-side. Same shape as the
 * ECDD / SMR / GFS / dismissal proxies.
 *
 * The API in turn proxies the OSINT Engine, which holds the file — its shared
 * key stays there.
 */
export async function GET(request, { params }) {
  const { reportId, fileId } = await params;

  const session = await auth();
  const token = session?.user?.accessToken;
  if (!token) {
    return NextResponse.json({ success: false, message: "Not authenticated" }, { status: 401 });
  }

  const response = await fetch(`${BASE_URL}tbml/reports/${reportId}/files/${fileId}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });

  if (!response.ok) {
    return NextResponse.json({ success: false }, { status: response.status });
  }

  const buffer = await response.arrayBuffer();
  return new NextResponse(buffer, {
    status: 200,
    headers: {
      "Content-Type": response.headers.get("Content-Type") || "application/octet-stream",
      // `inline` so the analyst reads the invoice in a tab next to the finding
      // rather than downloading it to look at it.
      "Content-Disposition":
        response.headers.get("Content-Disposition") || `inline; filename="${fileId}"`,
    },
  });
}
