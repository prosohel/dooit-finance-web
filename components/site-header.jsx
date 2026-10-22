'use client';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  IconCash,
  IconHelpCircle,
  IconAlertTriangle,
  IconUsers,
  IconCards,
  IconUserCircle,
  IconCreditCard,
  IconNotification,
  IconLogout,
  IconChartLine,
} from '@tabler/icons-react';
import { useRouter } from 'next/navigation';
import { CircleDashed, CreditCard } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { signOut } from 'next-auth/react';
import { useLoggedInUser } from '@/app/store/useLoggedInUser';
export function SiteHeader() {
  const { loggedInUser } = useLoggedInUser();
  const pathname = usePathname();
  const router = useRouter();
  const userType = loggedInUser?.userType;
  const isDooit = userType === 'dooit';

  // Top-right avatar reflects the client's brand: logo from client.settings.logo,
  // falling back to the account photo, then name initials.
  const client = loggedInUser?.client;
  const brandName = client?.name || loggedInUser?.name || 'Account';
  const brandEmail = client?.email || loggedInUser?.email || '';
  const brandLogo = client?.settings?.logo || loggedInUser?.photoUrl || '';
  const brandInitials =
    brandName
      .split(' ')
      .filter(Boolean)
      .map((w) => w[0])
      .join('')
      .slice(0, 2)
      .toUpperCase() || 'CN';

  const routes = [
    {
      name: 'Customers',
      href: '/dashboard/client/onboarding/customer-queue',
      icon: <IconUsers size={14} />,
    },

    {
      name: 'Transactions',
      href: '/dashboard/client/transactions',
      icon: <CreditCard size={14} />,
    },
    {
      name: 'Alerts',
      href: '/dashboard/client/monitoring-and-cases/case-list',
      icon: <IconAlertTriangle size={14} />,
    },
  ];
  const logout = async () => {
    signOut({
      // redirect: true,
      callbackUrl: '/auth/login',
    });
  };
  return (
    <header className="flex h-(--header-height) shrink-0 items-center gap-2  transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height)  py-8 sticky top-0 z-10 bg-[#fefefe]">
      <div className="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
        <SidebarTrigger className="-ml-1" />
        <Separator
          orientation="vertical"
          className="mx-2 data-[orientation=vertical]:h-4"
        />

        <div className=" w-full flex justify-center">
          <ul className="flex items-center gap-2 ">
            {routes.map((route) => (
              <li key={route.name}>
                <Link
                  href={route.href}
                  className={cn(
                    ' px-4 py-2  text-heading  font-semibold flex items-center gap-2 [&>svg]:size-4 [&>svg]:shrink-0 relative rounded-md text-[0.8rem]',
                    {
                      'bg-white shadow-sm  font-bold rounded-md':
                        pathname === route.href,
                    }
                  )}
                >
                  <span className="">{route.icon}</span>
                  <span>{route.name}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div className="ml-auto flex items-center gap-2">
          {isDooit ? null : (
            <Link href="/dashboard/client/track-progress" className="relative">
              <span className="absolute -top-1.5 -right-1.5 z-10 flex h-4 w-4 items-center justify-center">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex h-4 w-4 items-center justify-center rounded-full bg-amber-500 text-[9px] font-black text-white leading-none">
                  5
                </span>
              </span>
              <span
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-full text-white text-[0.75rem] font-bold transition-all duration-200 hover:scale-105 hover:brightness-110 cursor-pointer select-none"
                style={{
                  background:
                    'linear-gradient(135deg, #7c3aed 0%, #2563eb 50%, #0891b2 100%)',
                  boxShadow:
                    '0 0 16px rgba(124,58,237,0.55), 0 2px 8px rgba(37,99,235,0.3)',
                  animation: 'progressGlow 2.5s ease-in-out infinite',
                }}
              >
                <CircleDashed size={14} />
              </span>
            </Link>
          )}
          <style>{`
            @keyframes progressGlow {
              0%, 100% { box-shadow: 0 0 16px rgba(124,58,237,0.55), 0 2px 8px rgba(37,99,235,0.3); }
              50% { box-shadow: 0 0 26px rgba(124,58,237,0.85), 0 2px 14px rgba(8,145,178,0.5); }
            }
          `}</style>
          <Button variant="secondary" size="sm">
            Help <IconHelpCircle />
          </Button>
          {/* <Select defaultValue="sandbox">
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Select environment" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="production">Production</SelectItem>
              <SelectItem value="sandbox">Sandbox</SelectItem>
            </SelectContent>
          </Select> */}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                // onClick={() => router.push('/dashboard/client/profile')}
                variant="ghost"
                asChild
                size="sm"
                className="hidden sm:flex cursor-pointer"
              >
                <span>
                  <Avatar>
                    <AvatarImage src={brandLogo} alt={brandName} />
                    <AvatarFallback>{brandInitials}</AvatarFallback>
                  </Avatar>
                </span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
              side={'bottom'}
              align="end"
              sideOffset={4}
            >
              <DropdownMenuLabel className="p-0 font-normal">
                <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                  <Avatar className="h-8 w-8 rounded-lg">
                    <AvatarImage src={brandLogo} alt={brandName} />
                    <AvatarFallback className="rounded-lg">
                      {brandInitials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-medium">{brandName}</span>
                    {brandEmail && (
                      <span className="text-muted-foreground truncate text-xs">
                        {brandEmail}
                      </span>
                    )}
                  </div>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <DropdownMenuItem
                  onClick={() => router.push('/dashboard/client/profile')}
                >
                  <IconUserCircle />
                  Account
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <IconCreditCard />
                  Billing
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <IconNotification />
                  Notifications
                </DropdownMenuItem>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={logout}>
                <IconLogout />
                Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
