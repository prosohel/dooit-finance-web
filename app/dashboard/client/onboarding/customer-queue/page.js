import React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import CustomerQueueList from "@/views/onboarding/customer-queue/list";

import CustomerQueueHeader from "@/views/onboarding/customer-queue/header";
import PendingCollection from "@/views/onboarding/customer-queue/list/PendingCollection";
import Rejected from "@/views/onboarding/customer-queue/list/Rejected";
import Verified from "@/views/onboarding/customer-queue/list/Verified";
import CustomerDashboard from "@/views/onboarding/customer-queue/list/Dashboard";
import { getCustomerStats } from "./actions";

// This page reads the signed-in user's cookies through `getCustomerStats`, so it
// can never be prerendered. Say so explicitly: the try/catch below swallows the
// DynamicServerError Next throws during export, and without this flag the route
// can be baked into static HTML carrying one user's counts.
export const dynamic = "force-dynamic";

export default async function Page() {
  let stats = null;
  try {
    const res = await getCustomerStats();
    if (res?.success) stats = res.data;
  } catch (err) {
    console.error("Failed to load customer queue stats", err);
  }

  const kycCounts = (stats?.kyc?.distribution ?? []).reduce((acc, d) => {
    acc[d.status] = d.value;
    return acc;
  }, {});
  const totalCount = stats?.total ?? 0;
  const pendingCount = kycCounts.pending ?? 0;
  const rejectedCount = kycCounts.rejected ?? 0;
  // The "In Review" tab below filters kycStatus="verified", so its badge
  // must reflect the verified count to match the rows it actually shows.
  const inReviewCount = kycCounts.verified ?? 0;

  return (
    <div>
      <div>
        <CustomerQueueHeader />
        <CustomerDashboard initialStats={stats} />
        <Tabs defaultValue="all-applications">
          <TabsList>
            <TabsTrigger value="all-applications">
              All
              <Badge variant="secondary">{totalCount}</Badge>
            </TabsTrigger>
            <TabsTrigger value="pending-collection">
              Pending
              <Badge variant="secondary">{pendingCount}</Badge>
            </TabsTrigger>
            <TabsTrigger value="rejected-applications">
              Rejected
              {rejectedCount > 0 && <Badge variant="secondary">{rejectedCount}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="in_review">
              In Review
              {inReviewCount > 0 && <Badge variant="secondary">{inReviewCount}</Badge>}
            </TabsTrigger>
          </TabsList>
          <TabsContent value="all-applications">
            <CustomerQueueList kycStatus="" />
          </TabsContent>
          <TabsContent value="pending-collection">
            <PendingCollection kycStatus="pending" />
          </TabsContent>
          <TabsContent value="rejected-applications">
            <Rejected kycStatus="rejected" />
          </TabsContent>
          <TabsContent value="in_review">
            <Verified kycStatus="verified" />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
