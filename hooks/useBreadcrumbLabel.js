"use client";
import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useBreadcrumbStore } from "@/app/store/useBreadcrumbStore";

/**
 * Names the current page's crumb, e.g. `useBreadcrumbLabel(report && \`ECDD #${report.uid}\`)`.
 * A falsy label is ignored, so pass it straight through while data loads, and
 * pass null from components that also render inside another page (tabs).
 */
export default function useBreadcrumbLabel(label) {
  const pathname = usePathname();
  const setLabel = useBreadcrumbStore((s) => s.setLabel);

  useEffect(() => {
    if (label && pathname) setLabel(pathname, String(label));
  }, [label, pathname, setLabel]);
}
