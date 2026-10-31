"use client";
import React, { useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ArrowLeft, House } from "lucide-react";
import {
  Breadcrumb,
  BreadcrumbEllipsis,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { buildCrumbs } from "@/lib/breadcrumbs";
import { useBreadcrumbStore } from "@/app/store/useBreadcrumbStore";
import { cn } from "@/lib/utils";

// Trails longer than this fold their middle crumbs into a "…" menu, keeping
// Dashboard, the section the user came from, and the current page in view.
const MAX_VISIBLE = 4;

const CrumbLabel = ({ crumb }) => (
  <span className="block max-w-[22ch] truncate" title={crumb.label}>
    {crumb.label}
  </span>
);

const Crumb = ({ crumb, isCurrent }) => {
  if (isCurrent) {
    return (
      <BreadcrumbPage className="font-medium text-heading">
        <CrumbLabel crumb={crumb} />
      </BreadcrumbPage>
    );
  }
  if (!crumb.href) {
    return (
      <span className="text-muted-foreground">
        <CrumbLabel crumb={crumb} />
      </span>
    );
  }
  return (
    <BreadcrumbLink asChild className="hover:text-primary">
      <Link href={crumb.href} className="inline-flex items-center gap-1.5">
        {crumb.home ? <House className="size-3.5 shrink-0" aria-hidden="true" /> : null}
        <CrumbLabel crumb={crumb} />
      </Link>
    </BreadcrumbLink>
  );
};

/**
 * Site-wide trail for /dashboard/client pages: Dashboard › Section › … › Page,
 * derived from the URL. Detail pages can replace "Details" with a real name
 * through `useBreadcrumbLabel`.
 */
export default function AppBreadcrumb({ className }) {
  const pathname = usePathname();
  const router = useRouter();
  const labels = useBreadcrumbStore((s) => s.labels);

  // Counts client-side navigations since this layout mounted. When there is
  // one, Back returns to wherever the user actually came from (an alert, a
  // filtered list); on a fresh load or deep link it goes to the parent page.
  const navCount = useRef(-1);
  useEffect(() => {
    navCount.current += 1;
  }, [pathname]);

  const crumbs = useMemo(() => buildCrumbs(pathname, labels), [pathname, labels]);
  if (crumbs.length < 2) return null;

  // Nearest ancestor that is a real page, other than Dashboard itself: a
  // top-level page reached from the sidebar has nothing to go "back" to.
  const parent = [...crumbs.slice(1, -1)].reverse().find((c) => c.href);

  const handleBack = () => {
    if (navCount.current > 0) router.back();
    else router.push(parent.href);
  };

  const collapse = crumbs.length > MAX_VISIBLE;
  const head = crumbs.slice(0, 1);
  const hidden = collapse ? crumbs.slice(1, crumbs.length - (MAX_VISIBLE - 2)) : [];
  const tail = collapse ? crumbs.slice(crumbs.length - (MAX_VISIBLE - 2)) : crumbs.slice(1);

  return (
    <div className={cn("flex min-h-8 items-center gap-3", className)}>
      {parent ? (
        <>
          <Button
            variant="outline"
            size="sm"
            onClick={handleBack}
            className="h-8 gap-1.5 px-2.5 text-[0.8rem]"
            title="Go back"
          >
            <ArrowLeft className="size-3.5" />
            Back
          </Button>
          <span className="h-5 w-px bg-border" aria-hidden="true" />
        </>
      ) : null}

      <Breadcrumb>
        <BreadcrumbList className="gap-1 text-[0.8rem] sm:gap-1.5">
          {head.map((crumb) => (
            <BreadcrumbItem key={crumb.path}>
              <Crumb crumb={crumb} />
            </BreadcrumbItem>
          ))}

          {collapse ? (
            <>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <DropdownMenu>
                  <DropdownMenuTrigger
                    className="flex items-center rounded-md hover:bg-muted"
                    aria-label="Show hidden breadcrumb pages"
                  >
                    <BreadcrumbEllipsis className="size-6" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start">
                    {hidden.map((crumb) =>
                      crumb.href ? (
                        <DropdownMenuItem key={crumb.path} asChild>
                          <Link href={crumb.href}>{crumb.label}</Link>
                        </DropdownMenuItem>
                      ) : (
                        <DropdownMenuItem key={crumb.path} disabled>
                          {crumb.label}
                        </DropdownMenuItem>
                      ),
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </BreadcrumbItem>
            </>
          ) : null}

          {tail.map((crumb, i) => (
            <React.Fragment key={crumb.path}>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <Crumb crumb={crumb} isCurrent={i === tail.length - 1} />
              </BreadcrumbItem>
            </React.Fragment>
          ))}
        </BreadcrumbList>
      </Breadcrumb>
    </div>
  );
}
