import RegulatoryUploadsView from "@/views/regulatory-inbox/uploads";

export const metadata = { title: "Uploads to AFC OS" };

/** Documents the reporting organisation sends to Bangladesh Bank for AI gap analysis (docs/77). */
export default function RegulatoryUploadsPage() {
  return <RegulatoryUploadsView />;
}
