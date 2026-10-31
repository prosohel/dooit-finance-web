import { redirect } from "next/navigation";

// Alert details moved to /alerts/[id]; forward the id and any ?tab= deep link.
export default async function LegacyAlertDetailsRedirect({ params, searchParams }) {
  const { id } = await params;
  const { tab } = await searchParams;
  redirect(`/dashboard/client/monitoring-and-cases/alerts/${id}${tab ? `?tab=${encodeURIComponent(tab)}` : ""}`);
}
