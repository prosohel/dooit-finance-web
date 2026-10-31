import { auth } from "@/auth";
import { BASE_URL } from "@/services/serverApi";
import { NextResponse } from "next/server";

/**
 * Streams the ECDD PDF from the API with the caller's bearer token attached.
 *
 * The browser cannot call the API directly for this — the download is a plain
 * navigation/fetch with no place to put the Authorization header, and the token
 * must not be put in a query string where it would land in access logs. So the
 * request is proxied here, where the session is already available server-side.
 */
export async function GET(request, { params }) {
  const { id } = await params;
  const session = await auth();
  const token = session?.user?.accessToken;

  const response = await fetch(`${BASE_URL}ecdd-report/${id}/export-pdf`, {
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
        response.headers.get("Content-Disposition") ?? `attachment; filename=ECDD-${id}.pdf`,
    },
  });
}
