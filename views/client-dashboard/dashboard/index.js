"use client";

import { DashboardHeader } from "./dashboard-header";
import { MetricCard } from "./metric-card";
import { RiskBreakdownChart } from "./risk-breakdown";
import { RiskTrendChart } from "./risk-trend";
import { AlertsOverview } from "./alerts-overview";
import { KYCStatusChart } from "./kyc-status";
import { SMROverview } from "./smr-overview";
import { ComplianceStatus } from "./compliance-status";
import { TransactionChannels } from "./transaction-channel";
import { executiveMetrics } from "@/lib/dashboard-data";
import { Users, Banknote, AlertCircle, FileText } from "lucide-react";

/** Taka, in crore for anything from one crore up and in lakh below that: "৳2.8 cr", "৳35 lakh". */
const bdt = (n) => (n >= 1e7 ? `৳${(n / 1e7).toFixed(1)} cr` : `৳${Math.round(n / 1e5)} lakh`);

export default function ClientDashboardPage() {
  return (
    <div className="min-h-screen ">
      <DashboardHeader />

      <main className=" ">
        {/* Executive Summary Cards */}
        <section className="mb-16">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 ">
            <MetricCard
              title="Total Customers"
              value={executiveMetrics.totalCustomers.value}
              change={executiveMetrics.totalCustomers.change}
              trend={executiveMetrics.totalCustomers.trend}
              icon={<Users className="h-5 w-5" />}
            />
            <MetricCard
              title="Risk Exposure"
              value={bdt(executiveMetrics.riskExposure.value)}
              change={executiveMetrics.riskExposure.change}
              trend={executiveMetrics.riskExposure.trend}
              icon={<Banknote className="h-5 w-5" />}
            />
            <MetricCard
              title="Open Alerts"
              value={executiveMetrics.openAlerts.value}
              change={executiveMetrics.openAlerts.change}
              trend={executiveMetrics.openAlerts.trend}
              icon={<AlertCircle className="h-5 w-5" />}
            />
            <MetricCard
              title="SMR Cases"
              value={executiveMetrics.smrCases.value}
              change={executiveMetrics.smrCases.change}
              trend={executiveMetrics.smrCases.trend}
              icon={<FileText className="h-5 w-5" />}
            />
          </div>
        </section>

        {/* Risk Assessment Section */}
        <section className="mb-16">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <RiskTrendChart />
            </div>
            <div className="lg:col-span-1">
              <RiskBreakdownChart />
            </div>
          </div>
        </section>

        {/* Alerts & KYC Section */}
        <section className="mb-16">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <AlertsOverview />
            </div>
            <div className="lg:col-span-1">
              <KYCStatusChart />
            </div>
          </div>
        </section>

        {/* SMR & Compliance Section */}
        <section className="mb-16">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <SMROverview />
            <ComplianceStatus />
          </div>
        </section>

        {/* Transaction Analytics Section */}
        <section className="mb-16">
          <TransactionChannels />
        </section>

        {/* Footer */}
        <footer className="border-t border-border pt-6 mt-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
            <p>Dooit.AI Compliance Dashboard - Data refreshed every 15 minutes</p>
            <p>Last updated: {new Date().toLocaleString()}</p>
          </div>
        </footer>
      </main>
    </div>
  );
}
