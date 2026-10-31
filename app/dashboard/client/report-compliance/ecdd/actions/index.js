"use server";

import { getQueryString } from "@/lib/utils";
import { fetchWithAuth } from "@/services/serverApi";
import { revalidateTag } from "next/cache";
import { draftCaseReport } from "@/app/dashboard/client/monitoring-and-cases/case-manager/actions";

export async function createEcdd(formData) {
  const response = await fetchWithAuth("ecdd-report", {
    method: "POST",
    body: JSON.stringify(formData),
  });
  revalidateTag("ecdds");
  return response.json();
}

export async function getEcdds(queryParams) {
  try {
    const queryString = getQueryString(queryParams);
    const response = await fetchWithAuth(`ecdd-report?${queryString}`, {
      next: { tags: ["ecdds"] },
    });
    return response.json();
  } catch (error) {
    console.log("ecdd error", error);
  }
}

export async function getEcddById(id) {
  const response = await fetchWithAuth(`ecdd-report/${id}`);
  return response.json();
}

export async function updateEcdd(formData) {
  const { id, ...data } = formData;
  const response = await fetchWithAuth(`ecdd-report/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
  revalidateTag("ecdds");
  return response.json();
}

export async function deleteEcdd(id) {
  const response = await fetchWithAuth(`ecdd-report/${id}`, {
    method: "DELETE",
  });
  revalidateTag("ecdds");
  return response.json();
}

// Draft this case's ECDD: facts from our API, narrative from the AI service.
// `ref` is a Case id/uid or the originating Alert's id/uid. Returns OUR
// persisted EcddReport document (docs/74 §6.3) — never the AI's own payload.
export const draftEcddReport = async (ref, opts) => draftCaseReport(ref, 'ecdd', opts);

export const getEcddByCaseNumber = async (caseNumber) => {
  const response = await fetchWithAuth(`ecdd-report/case/${caseNumber}`);
  return response.json();
};
