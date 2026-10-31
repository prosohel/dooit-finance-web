"use client";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import useGetUser from "@/hooks/useGetUser";
import { IconInnerShadowTop, IconLogout } from "@tabler/icons-react";
import { Bell } from "lucide-react";
import { signOut } from "next-auth/react";
import React from "react";
import { apiLogout } from "@/app/auth/actions";

const Header = () => {
  const { loggedInUser } = useGetUser();

  const logout = async () => {
    // Record the logout in the API's device/audit trail before the session ends.
    await apiLogout().catch(() => {});
    signOut({
      // redirect: true,
      callbackUrl: "/auth/login",
    });
  };
  return (
    <div className=" border-b py-4 flex justify-between items-center">
      <div className="flex items-center justify-between container">
        <div className="">
          <a href="#" className="flex items-center gap-2">
            <IconInnerShadowTop className="!size-5" />
            <span className="text-base font-semibold">Dooit Wallet.</span>
          </a>
          {/* <img src="/logo.jpg" alt="Logo" className='h-10 w-auto' /> */}
        </div>
        {/* <div className='flex items-center gap-4'>
                    <Link href='#'>Dashboard</Link>
                    <Link href='#'>Customers</Link>
                    <Link href='#'>Reports</Link>
                    <Link href='#'>Settings</Link>
                </div> */}
        <div className="flex items-center gap-4">
          <span>
            <Bell />
          </span>
          <span>{loggedInUser?.name}</span>
          <div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <div className="size-10 rounded-full bg-white border"></div>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={logout}>
                  <IconLogout />
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Header;
