"use client";
import React from "react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import {
  IconAlertTriangle,
  IconBook,
  IconBuildingBank,
  IconCirclesRelation,
  IconDatabase,
  IconLayoutDashboard,
  IconListDetails,
  IconUserOff,
  IconUsers,
  IconWorld,
  IconBuilding,
  IconObjectScan,
  IconUrgent,
  IconUser,
  IconFilePlus,
} from "@tabler/icons-react";
import { NavMain } from "@/components/nav-main";
import { NavUser } from "@/components/nav-user";
import { useSession } from "next-auth/react";
import {
  TrendingUp,
  Building2,
  PieChart,
  FileInput,
  FileText,
  Search,
  ShieldHalf,
  ShieldUser,
  Wallet,
  Send,
  Download,
  Landmark,
  ReceiptText,
  PackageSearch,
  Tags,
  SquarePen,
  Repeat,
  Activity,
  CreditCard,
} from "lucide-react";
import useGetUser from "@/hooks/useGetUser";

export default function ClientSidebar({ ...props }) {
  const session = useSession();
  const { loggedInUser } = useGetUser();
  const clientType = loggedInUser?.client?.clientType;
  const isRealState = clientType === "Real Estate";
  const isFinancial = clientType === "Financial";
  const isPreciousMetal = clientType === "Precious Metal";
  const isCrypto = clientType === "Crypto";
  const isBranch = loggedInUser?.role === "branch";
  const isDooit = loggedInUser?.userType === "dooit";

  const dooitMenuItems = [
    {
      title: "Dashboard",
      icon: IconLayoutDashboard,
      url: "/dashboard/client",
    },
    {
      title: "Clients",
      icon: IconUsers,
      url: "/dashboard/client/list",
    },
    {
      title: "Customers",
      icon: IconUsers,
      url: "/dashboard/client/onboarding/customer-queue",
    },
    // Company and Trust are both KYB entity registers, so they nest under a
    // single "Business" parent rather than sitting as siblings of Customers
    // (docs/65 Step 63).
    {
      title: "Business",
      icon: IconBuilding,
      children: [
        {
          title: "Company",
          icon: IconBuildingBank,
          url: "/dashboard/client/companies",
        },
        {
          title: "Trust",
          icon: IconCirclesRelation,
          url: "/dashboard/client/trusts",
        },
      ],
    },
  ];
  const onBoardingMenuItems = [
    {
      title: "Dashboard",
      icon: IconLayoutDashboard,
      url: "/dashboard/client",
    },
    {
      title: "Business",
      icon: IconBuilding,
      children: [
        {
          title: "Company",
          icon: IconBuildingBank,
          url: "/dashboard/client/companies",
        },
        {
          title: "Trust",
          icon: IconCirclesRelation,
          url: "/dashboard/client/trusts",
        },
      ],
    },
    {
      title: "Staffs",
      icon: IconUser,
      url: "/dashboard/client/staffs",
    },
    // {
    //   title: "Case manager",
    //   icon: IconObjectScan,
    //   url: "/dashboard/client/monitoring-and-cases/case-manager",
    // },
    {
      title: "Customers",
      icon: IconUsers,
      url: "/dashboard/client/onboarding/customer-queue",
      // children: [
      //   {
      //     title: "Overview",
      //     icon: IconListDetails,
      //     url: "/dashboard/client/onboarding/customer-queue",
      //   },
      //   {
      //     title: "Pending",
      //     url: "/dashboard/client/onboarding/customer-queue/pending",
      //     icon: IconDatabase,
      //     current: true,
      //   },
      //   {
      //     title: "Rejected",
      //     url: "/dashboard/client/onboarding/customer-queue/rejected",
      //     icon: IconPentagonX,
      //     current: true,
      //   },

      //   {
      //     title: "In Review",
      //     url: "/dashboard/client/onboarding/customer-queue/in-review",
      //     icon: IconProgress,
      //     current: true,
      //   },
      // ],
    },
    ...(isBranch
      ? []
      : [
          {
            title: "Branches",
            icon: IconBuildingBank,
            url: "/dashboard/client/branch",
          },
        ]),
    {
      title: "Risk Assessment",
      icon: IconAlertTriangle,
      url: "/dashboard/client/risk-assessment",
      children: [
        {
          title: "Customer Risk Assessment",
          url: "/dashboard/client/risk-assessment",
          icon: IconUrgent,
        },
        {
          title: "Risk Registers",
          url: "/dashboard/client/risk-assessment/risk-registers",
          icon: IconListDetails,
        },
      ],
    },
  ];

  const STRMenu = {
    title: "UAR Filing",
    icon: IconFilePlus,
    children: [
      {
        title: "UAR Review",
        url: "/dashboard/client/str-filling-report/review",
        icon: IconDatabase,
        current: true,
      },
      {
        title: "UAR Approval",
        url: "/dashboard/client/str-filling-report/approval",
        icon: IconDatabase,
        current: true,
      },
      {
        title: "Draft UAR",
        url: "/dashboard/client/str-filling-report/draft",
        icon: IconDatabase,
        current: true,
      },
    ],
  };
  const reportingMenuItems = [
    ...(isFinancial || isCrypto ? [STRMenu] : []),
    {
      title: "SMR Filing ",
      icon: FileInput,
      children: [
        {
          title: "SMR",
          url: "/dashboard/client/report-compliance/smr-filing/smr",
          icon: IconDatabase,
          current: true,
        },
        {
          title: "GFS",
          url: "/dashboard/client/report-compliance/smr-filing/gfs",
          icon: IconDatabase,
          current: true,
        },
      ],
    },
    {
      title: "Compliance ",
      icon: ShieldHalf,
      children: [
        {
          title: "TTR Reports",
          url: "/dashboard/client/report-compliance/ttr",
          icon: IconDatabase,
          current: true,
        },
        {
          title: "IFTI Reports",
          url: "/dashboard/client/report-compliance/ifti",
          icon: IconDatabase,
          current: true,
        },
        {
          title: "Compliance Health",
          url: "/#",
          icon: IconDatabase,
          current: true,
        },
      ],
    },
    {
      title: "Registers",
      icon: IconListDetails,
      url: "/dashboard/client/report-compliance/registers",
    },
  ];
  const monitoringMenuItems = [
    {
      title: "Case manager",
      icon: IconObjectScan,
      url: "/dashboard/client/monitoring-and-cases/case-manager",
    },
    {
      title: "Alerts",
      url: "/dashboard/client/monitoring-and-cases/alerts",
      icon: IconAlertTriangle,
    },
    {
      title: "ECDD",
      icon: ShieldUser,
      url: "/dashboard/client/report-compliance/ecdd",
    },
  ];

  const watchlistAndScreeningMenuItems = [
    {
      title: "Internal Blacklist",
      icon: IconUserOff,
      url: "/dashboard/client/watchlist-and-screening/internal-blacklist",
    },
  ];

  const knowledgeHubMenuItems = [
    {
      title: "Policy Hub",
      icon: IconBook,
      url: "/dashboard/client/knowledge-hub/policy-hub",
    },
    // {
    //   title: "Training Hub",
    //   icon: GraduationCap,
    //   url: "/dashboard/client/knowledge-hub/training-hub",
    // },
    {
      title: "EWRA",
      icon: IconWorld,
      url: "/dashboard/client/faq",
      children: [
        {
          title: "Dashboard",
          url: "/dashboard/client/knowledge-hub/ewra/dashboard",
          icon: IconListDetails,
        },
        {
          title: "ML Risk Assessment",
          url: "/dashboard/client/knowledge-hub/ewra/ml-risk-assesment",
          icon: IconListDetails,
        },
        {
          title: "TF Risk Assessment",
          url: "/dashboard/client/knowledge-hub/ewra/tf-risk-assesment",
          icon: IconListDetails,
        },
        {
          title: "ABC Risk Assessment",
          url: "/dashboard/client/knowledge-hub/ewra/abc-risk-assesment",
          icon: IconListDetails,
        },
      ],
    },
    {
      title: "Regulatory Links",
      icon: IconCirclesRelation,
      url: "/dashboard/client/knowledge-hub/regulatory-links",
    },
  ];
  const pepScreenigItems = [
    {
      title: "AML Screening",
      icon: IconListDetails,
      url: "/dashboard/client/pep-and-adverse-media/aml-screening",
    },
  ];

  // ── Billing ────────────────────────────────────────────────────────────────
  // Product catalogue reads are open to clients (it names the rows on their
  // usage table and invoices); writes are dooit-only and hidden in the view.
  const billingMenuItems = [
    {
      title: "Service Usage",
      icon: Activity,
      url: "/dashboard/client/billing/usage",
    },
    {
      title: "Products",
      icon: PackageSearch,
      url: "/dashboard/client/billing/products",
    },
    {
      title: "Pricing Plans",
      icon: Tags,
      url: "/dashboard/client/billing/plans",
    },
    {
      // Same page either way: a client sees their own subscription, dooit sees
      // every account's. The label just sets the right expectation.
      title: isDooit ? "Subscriptions" : "My Subscription",
      icon: Repeat,
      url: "/dashboard/client/billing/subscription",
    },
    {
      title: "Invoices",
      icon: ReceiptText,
      url: "/dashboard/client/billing/invoices",
    },
    {
      title: "Payments",
      icon: CreditCard,
      url: "/dashboard/client/billing/payments",
    },
    // Authoring surface — dooit only. The API rejects a client write with 403
    // regardless; hiding it just avoids offering an action that cannot succeed.
    ...(isDooit
      ? [
          {
            title: "Plan Builder",
            icon: SquarePen,
            url: "/dashboard/client/billing/plans/builder",
          },
        ]
      : []),
  ];

  const configurationMenuItems = [
    {
      title: "User & Role",
      icon: IconListDetails,
      url: "/dashboard/client/user-and-role-management",
      children: [
        {
          title: "Users",
          url: "/dashboard/client/user-and-role-management/users",
          icon: IconListDetails,
        },
        {
          title: "Roles",
          url: "/dashboard/client/user-and-role-management/roles",
          icon: IconListDetails,
        },
      ],
    },
    {
      title: "Risk Rule Engine",
      icon: IconListDetails,
      children: [
        {
          title: "Rule Configuration",
          url: "/dashboard/client/risk-rule-engine/rule-configuration",
          icon: IconDatabase,
        },
        {
          title: "Rule Back Test",
          url: "/dashboard/client/risk-rule-engine/back-test",
          icon: IconDatabase,
        },
        {
          title: "CRA Scoring Configuration",
          url: "/dashboard/client/risk-rule-engine/cra-scoring-config",
          icon: IconDatabase,
        },
        {
          title: "Transaction Rule Editor",
          url: "/dashboard/client/risk-rule-engine/transaction-rule-editor",
          icon: IconDatabase,
        },
      ],
    },
    {
      title: "Workflow Studio",
      icon: IconListDetails,
      children: [
        {
          title: "Workflows",
          url: "/dashboard/client/workflow-studio",
          icon: IconDatabase,
        },
      ],
    },

    {
      title: "System Settings",
      icon: IconListDetails,
      children: [
        {
          title: "Devices & Activity",
          url: "/dashboard/client/system-settings/devices",
          icon: IconDatabase,
        },
      ],
    },
  ];
  const TrainingModule = [
    {
      title: "Manager",
      // url: "/dashboard/client/risk-rule-engine/training-module",
      icon: IconDatabase,
      children: [
        {
          title: "Dashboard",
          url: "/dashboard/client/knowledge-hub/training-hub/dashboard",
          icon: IconLayoutDashboard,
        },
        {
          title: "Assignments",
          url: "/dashboard/client/knowledge-hub/training-hub/assignments",
          icon: IconLayoutDashboard,
        },
      ],
    },
    {
      title: "Admin",
      // url: "/dashboard/client/risk-rule-engine/training-module/admin",
      icon: IconDatabase,
      children: [
        {
          title: "Dashboard",
          url: "/dashboard/client/knowledge-hub/training-hub/admin/dashboard",
          icon: IconLayoutDashboard,
        },
        {
          title: "Modules",
          url: "/dashboard/client/knowledge-hub/training-hub/admin/modules",
          icon: IconLayoutDashboard,
        },
        // {
        //   title: "Assignments",
        //   url: "/dashboard/client/knowledge-hub/training-hub/admin/assignments/manage",
        //   icon: IconLayoutDashboard,
        // },
        // {
        //   title: "Module Access",
        //   url: "/dashboard/client/knowledge-hub/training-hub/admin/access",
        //   icon: IconLayoutDashboard,
        // },
        {
          title: "Reports",
          url: "/dashboard/client/knowledge-hub/training-hub/admin/reports",
          icon: IconLayoutDashboard,
        },
      ],
    },
    {
      title: "Learner",
      icon: IconDatabase,
      url: "/dashboard/client/knowledge-hub/training-hub/learner",
      children: [
        {
          title: "Dashboard",
          url: "/dashboard/client/knowledge-hub/training-hub/learner/dashboard",
          icon: IconLayoutDashboard,
        },
        // {
        //   title: "Quiz",
        //   url: "/dashboard/client/knowledge-hub/training-hub/learner/quiz",
        //   icon: IconLayoutDashboard,
        // },
      ],
    },
    {
      title: "Reports",
      url: "/dashboard/client/knowledge-hub/training-hub/reports",
      icon: IconLayoutDashboard,
    },
  ];

  const realStateMenu = [
    {
      title: "Client Portal",
      items: [
        { title: "Property Search", url: "/dashboard/client/properties", icon: Search },
        { title: "My Documents", url: "/dashboard/client/documents", icon: FileText },
        { title: "Track Status", url: "/dashboard/client/track-status", icon: Building2 },
      ],
    },
    // {
    //   title: "Conveyancer Portal",
    //   items: [
    //     { title: "Matter Management", url: "/dashboard/client/conveyancer/matters", icon: Scale },
    //     { title: "Title Searches", url: "/dashboard/client/conveyancer/title-search", icon: Search },
    //     { title: "Settlements", url: "/dashboard/client/conveyancer/settlements", icon: CreditCard },
    //     // { title: "Trust Account", url: "/conveyancer/trust", icon: CreditCard },
    //   ],
    // },
    {
      title: "Agent Portal",
      items: [
        { title: "Listings", url: "/dashboard/client/agent/listing", icon: Building2 },
        // { title: "Clients", url: "/dashboard/client/agent/client", icon: Users },
        { title: "Contracts", url: "/dashboard/client/agent/contracts", icon: FileText },
      ],
    },
    // {
    //   title: "Compliance",
    //   items: [
    //     { name: "AML Dashboard", href: "/compliance/aml", icon: ShieldCheck },
    //     { name: "Case Management", href: "/compliance/cases", icon: FileText },
    //     { name: "Reports", href: "/compliance/reports", icon: BarChart3 },
    //   ],
    // },
  ];

  const preciousMetalMenu = [
    {
      title: "Overview",
      items: [
        { title: "Trade", url: "/dashboard/client/trade", icon: TrendingUp },
        { title: "Portfolio", url: "/dashboard/client/portfolio", icon: PieChart },

        // { title: "Analytics", url: "/analytics", icon: BarChart3 },
      ],
    },
  ];
  const dueDiligenceMenu = [
    // {
    //   title: "Compliance Officer & GB",
    //   icon: IconListDetails,
    //   url: "/dashboard/client/due-diligence/compliance-officer-and-governing-body",
    // },
    {
      title: "Personnel (PDD)",
      icon: IconUser,
      url: "/dashboard/client/due-diligence/personnel",
    },
    // {
    //   title: "Compliance ",
    //   icon: IconListDetails,
    //   url: "/dashboard/client/due-diligence/compliance-officer",
    // },
  ];
  const cryptoMenu = [
    {
      title: "Overview",
      items: [
        { title: "Wallet", url: "/dashboard/client/wallet", icon: Wallet },
        { title: "Send Crypto", url: "/dashboard/client/send-crypto", icon: Send },
        { title: "Travel Rule", url: "/dashboard/client/travel-rule", icon: IconListDetails },
        { title: "Receive Crypto", url: "/dashboard/client/receive-crypto", icon: Download },
        { title: "Market", url: "/dashboard/client/market", icon: TrendingUp },
      ],
    },
  ];
  const testingAndGovernanceMenu = [
    {
      title: "Governing Body",
      url: "/dashboard/client/testing-and-governance/governing-body",
      icon: Landmark,
    },
    {
      title: "Effectiveness Testing",
      url: "/dashboard/client/testing-and-governance/effectiveness-testing",
      icon: ReceiptText,
    },
  ];
  const grcModule = [
    {
      title: "GRC",
      icon: IconListDetails,
      // url: "/dashboard/client/grc-module",
      children: [
        {
          title: "AML/CTF Dashboard",
          url: "/dashboard/client/grc/aml-ctf-dashboard",
          icon: IconDatabase,
        },
        {
          title: "Effectiveness form",
          url: "/dashboard/client/grc/forms-hub",
          icon: IconDatabase,
        },
      ],
    },
  ];

  return (
    <Sidebar collapsible="offcanvas" {...props} className={"border-0 overflow-x-hidden"}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild className="data-[slot=sidebar-menu-button]:!p-1.5">
              <div className="py-2  relative">
                <div className="w-20 ">
                  <img src="/logo.png" alt="Logo" className=" w-full h-8 object-contain " />
                </div>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent className="overflow-x-hidden client-sidebar-content">
        {!isDooit && <NavMain items={onBoardingMenuItems} />}
        {isDooit && <NavMain items={dooitMenuItems} label="Dooit" />}
        <NavMain items={monitoringMenuItems} label="Monitoring & Cases" />

        {isRealState && (
          <>
            {realStateMenu.map((item) => (
              <NavMain key={item.title} items={item.items} label={item.title} />
            ))}
          </>
        )}
        {isPreciousMetal && (
          <>
            {preciousMetalMenu.map((item) => (
              <NavMain key={item.title} items={item.items} label={item.title} />
            ))}
          </>
        )}
        {isCrypto && (
          <>
            {cryptoMenu.map((item) => (
              <NavMain key={item.title} items={item.items} label={item.title} />
            ))}
          </>
        )}
        <NavMain items={dueDiligenceMenu} label="Due Diligence" />
        <NavMain items={reportingMenuItems} label="Reporting & Registers" />
        <NavMain items={pepScreenigItems} label="PEP Screening" />
        <NavMain items={billingMenuItems} label="Billing" />
        <NavMain items={TrainingModule} label="Training" />
        <NavMain items={configurationMenuItems} label="Configuration" />
        <NavMain items={grcModule} label="Testing & Governance" />
        <NavMain items={knowledgeHubMenuItems} label="Knowledge Hub" />
        <NavMain items={watchlistAndScreeningMenuItems} label="Watchlist & Screening" />
      </SidebarContent>
      <SidebarFooter>
        <NavUser
          user={{
            name:
              loggedInUser?.client?.name ||
              loggedInUser?.name ||
              session.data?.user?.name,
            email:
              loggedInUser?.client?.email ||
              loggedInUser?.email ||
              session.data?.user?.email,
            avatar:
              loggedInUser?.client?.settings?.logo ||
              loggedInUser?.photoUrl ||
              session.data?.user?.image,
          }}
        />
      </SidebarFooter>
    </Sidebar>
  );
}
