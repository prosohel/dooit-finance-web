import { auth } from "@/auth";
import { BASE_URL } from "@/services/serverApi";
import { NextResponse } from "next/server";

/**
 * Streams the GFS PDF from the API with the caller's bearer token attached.
 *
 * A download is a plain fetch with nowhere to put an Authorization header, and
 * the token must not travel in a query string where it would land in access
 * logs — so the request is proxied here, where the session is already available
 * server-side. Mirrors the SMR and ECDD export-pdf proxy routes.
 */
export async function GET(request, { params }) {
  const { id } = await params;
  const session = await auth();
  const token = session?.user?.accessToken;

  const response = await fetch(`${BASE_URL}gfs-report/${id}/export-pdf`, {
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
        response.headers.get("Content-Disposition") ?? `attachment; filename=GFS-${id}.pdf`,
    },
  });
}
