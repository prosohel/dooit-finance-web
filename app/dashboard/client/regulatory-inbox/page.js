import RegulatoryInboxView from "@/views/regulatory-inbox";

export const metadata = { title: "Regulatory Inbox" };

/** Everything Bangladesh Bank (MLTFPD) and BFIU send this reporting organisation, and the replies it owes. */
export default function RegulatoryInboxPage() {
  return <RegulatoryInboxView />;
}
