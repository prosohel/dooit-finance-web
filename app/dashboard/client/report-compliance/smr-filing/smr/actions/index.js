"use server";
import { getQueryString } from "@/lib/utils";
import { fetchWithAuth } from "@/services/serverApi";
import { draftCaseReport } from "@/app/dashboard/client/monitoring-and-cases/case-manager/actions";

export const getSMRList = async (queryParams) => {
  const queryString = getQueryString(queryParams);
  const response = await fetchWithAuth(`smr-report?${queryString}`);
  return response.json();
};

export const createSMR = async (formData) => {
  const response = await fetchWithAuth("smr-report/new", {
    method: "POST",
    body: JSON.stringify(formData),
  });
  // revalidateTag('smr-list');
  return response.json();
};

export const updateSMR = async (formData) => {
  const { id, ...data } = formData;
  const response = await fetchWithAuth(`smr-report/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
  return response.json();
};

export const getSMRById = async (id) => {
  const response = await fetchWithAuth(`smr-report/${id}`);
  return response.json();
};

// Draft this case's SMR — our facts (Parts A, C, D, F, H) plus the AI's
// grounds-for-suspicion narrative. Returns OUR SMR document.
export const draftSmrReport = async (ref, opts) => draftCaseReport(ref, 'smr', opts);

// Move a drafted SMR through its review workflow. An approved SMR is what
// makes a case's "SAR filed" derivation true (docs/74 C14).
export const submitSMR = async (id, notes) => {
  const response = await fetchWithAuth(`smr-report/${id}/submit`, {
    method: "PUT",
    body: JSON.stringify({ notes }),
  });
  return response.json();
};

export const approveSMR = async (id, notes) => {
  const response = await fetchWithAuth(`smr-report/${id}/approve`, {
    method: "PUT",
    body: JSON.stringify({ notes }),
  });
  return response.json();
};
