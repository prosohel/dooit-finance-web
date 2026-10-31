import AlertDetails from "@/views/monitoring-and-cases/alert-details/AlertDetails";

// /dashboard/client/monitoring-and-cases/alerts/[id]?tab=<tab-id>
// (Formerly /case-list/details/[id]; that path now redirects here.)
export default async function AlertDetailsPage({ params, searchParams }) {
  const { id } = await params;
  const { tab } = await searchParams;
  return <AlertDetails id={id} initialTab={tab} />;
}
