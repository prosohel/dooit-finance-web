import { redirect } from "next/navigation";

// The alert queue lives at /alerts now; keep old bookmarks working.
export default function LegacyCaseListRedirect() {
  redirect("/dashboard/client/monitoring-and-cases/alerts");
}
