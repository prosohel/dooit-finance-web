"use client";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import ClientSidebar from "./(layout)/ClientSidebar";
import { SiteHeader } from "@/components/site-header";
import { EncryptDecryptFAB } from "@/components/EncryptBtn";
import ChatBotNissa from "@/components/nisa-ai";
import AppBreadcrumb from "@/components/AppBreadcrumb";

export default function ClientLayout({ children }) {
  return (
    <SidebarProvider
      style={{
        "--sidebar-width": "calc(var(--spacing) * 72)",
        // Sets a 60px rail: 36px menu buttons between the inset variant's 12px padding.
        "--sidebar-width-icon": "2.625rem",
        "--header-height": "calc(var(--spacing) * 12)",
      }}
    >
      <ClientSidebar variant="inset" />
      <SidebarInset className="rounded-xl bg-[#fefefe]">
        {/* {isRealState && <RealEstateDashboardHeader />} */}
        <SiteHeader />
        <div className="flex flex-1 flex-col ">
          <EncryptDecryptFAB />
          <ChatBotNissa />
          <div className="@container/main flex flex-1 flex-col gap-2  ">
            <div className="flex flex-col gap-4 py-4 md:gap-6 p-4 bg-zinc-50   mr-4 ">
              <AppBreadcrumb className="mt-2 -mb-1  md:-mb-2" />
              {children}
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
