import WorkflowGallery from "@/views/workflow-studio/gallery";
import { getWorkflows } from "./actions";

export const metadata = { title: "Workflow Studio" };

// Server component: this fetches, the view only renders. Filters are read
// from the URL (see gallery/index.js), so changing a filter is a navigation
// that lands back here with new searchParams — not a client-side re-fetch.
export default async function WorkflowStudioPage({ searchParams }) {
  const params = await searchParams;
  const qs = new URLSearchParams(
    Object.entries(params || {}).filter(([, v]) => v)
  ).toString();

  const res = await getWorkflows(qs);

  return (
    <WorkflowGallery
      workflows={res?.data ?? []}
      total={res?.total ?? 0}
      error={res?.success === false ? res.message : null}
    />
  );
}
