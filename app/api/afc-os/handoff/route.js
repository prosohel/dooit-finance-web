import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { issueAfcOsHandoff } from "@/lib/afcOs";

/**
 * POST /api/afc-os/handoff  { userType?, returnTo? }
 *
 * Opens the regulator's AFC OS as the signed-in portal user. The portal
 * authenticates to AFC OS with its own client credentials (server-side) and
 * names the user; AFC OS only agrees when that person already holds an AFC OS
 * membership. The browser receives a single-use URL valid for 15 minutes.
 */
export async function POST(request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ success: false, error: "Not signed in" }, { status: 401 });

  const { userType = null, returnTo = null } = await request.json().catch(() => ({}));
  const { ok, status, data } = await issueAfcOsHandoff({ platformUserId: session.user.id, email: session.user.email, userType, returnTo });

  if (!ok) {
    const error = status === 404 ? "You do not have an AFC OS account. Ask the MLTFPD administrator to invite you." : data?.error || "AFC OS handoff failed";
    return NextResponse.json({ success: false, error }, { status: status === 404 ? 403 : status });
  }
  return NextResponse.json({ success: true, data: { url: data.url, expiresAt: data.expiresAt, context: data.context } });
}
