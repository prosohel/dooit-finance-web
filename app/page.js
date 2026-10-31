'use client'
import { useSession } from "next-auth/react";
import Link from "next/link";
import Home from "@/views/Home";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
export default function HomePage() {
  const session = useSession();
  const router = useRouter();
  useEffect(() => {
    if (session?.data) {
      if (session.data?.user?.userType === "dooit") {
        router.replace("/dashboard/admin");
      } else if (session.data?.user?.userType === "client" || 'branch') {
        router.replace("/dashboard/client");
      } else {
        router.replace("/dashboard/client");
      }
    } else {
      router.push("/auth/login");
    }
  }, [session?.data?.user?.userType]);
  return (
    <Home />
  );
}
