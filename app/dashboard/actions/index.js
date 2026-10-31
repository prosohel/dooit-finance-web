"use server";

import { fetchWithAuth } from "@/services/serverApi";

export const getAllEntityTypes = async () => {
  // Entity types are reference data: the same list for everybody, and it barely
  // ever changes. Caching it for an hour keeps navigation from hitting the API
  // again on every page. Next keys its cache on the request (the Authorization
  // header included), so one user's list can never be served to another.
  // Call revalidateTag("entity-type") if the list is ever edited.
  const response = await fetchWithAuth("entity-type", {
    next: { revalidate: 3600, tags: ["entity-type"] },
  });
  const data = await response.json();
  const options = data?.data?.map((item) => ({
    label: item.name,
    value: item._id,
    ...item,
  }));
  return {
    ...data,
    data: options,
  };
};

export const getLawyerDashboardSummary = async () => {
  const response = await fetchWithAuth("lawyer-dashboard/summary");
  return response.json();
};
