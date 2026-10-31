import React from "react";
import SofUploadClient from "./SofUploadClient";

export default async function SofUploadPage({ searchParams }) {
  // `client` identifies the requesting tenant for co-branding — stamped into
  // the link by the API (buildSofUrl) and verified server-side against the
  // customer's relations before any branding is returned.
  const { cid, client } = await searchParams;

  return <SofUploadClient cid={cid} clientId={client} />;
}
