"use server";
// Public, no-login SOF upload flow — the customer id (cid) in the URL is
// the only credential (mirrors app/accept-invite/scan-qr/action.js's plain
// unauthenticated fetch pattern). There is no rotating token: the link is
// stable and auto-provisioned server-side per customer.
import { BASE_URL } from "@/services/serverApi";

// `clientId` (optional) is the requesting tenant from the link's ?client=
// param — the API brands the page for it after verifying it against the
// customer's relations.
export const validateSofCustomer = async (cid, clientId) => {
  const query = `cid=${encodeURIComponent(cid || "")}${
    clientId ? `&client=${encodeURIComponent(clientId)}` : ""
  }`;
  const response = await fetch(`${BASE_URL}sof-verification/validate?${query}`, {
    method: "GET",
  });
  return response.json();
};

// formData: { cid, docType, file }
export const uploadSofDocument = async (formData) => {
  const response = await fetch(`${BASE_URL}sof-verification/upload`, {
    method: "POST",
    body: formData,
  });
  return response.json();
};
