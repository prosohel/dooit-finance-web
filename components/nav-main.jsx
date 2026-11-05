'use client';
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  useSidebar,
} from '@/components/ui/sidebar';
import { ChevronRightIcon } from 'lucide-react';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from './ui/collapsible';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Fragment, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

// Every class below is gated on the collapsed rail, so the expanded sidebar
// keeps its own styling untouched.
const railButtonClass = cn(
  'group-data-[collapsible=icon]:mx-auto group-data-[collapsible=icon]:size-9! group-data-[collapsible=icon]:p-2.5! group-data-[collapsible=icon]:rounded-lg',
  'group-data-[collapsible=icon]:transition-[width,height,padding,background-color,color,box-shadow,scale] group-data-[collapsible=icon]:duration-300 group-data-[collapsible=icon]:ease-[cubic-bezier(0.32,0.72,0,1)]',
  'group-data-[collapsible=icon]:hover:bg-primary/10 group-data-[collapsible=icon]:hover:text-primary group-data-[collapsible=icon]:data-[state=open]:bg-primary/10 group-data-[collapsible=icon]:data-[state=open]:text-primary group-data-[collapsible=icon]:data-[state=open]:hover:bg-primary/10 group-data-[collapsible=icon]:data-[state=open]:hover:text-primary group-data-[collapsible=icon]:active:scale-95',
  'group-data-[collapsible=icon]:data-[active=true]:[&>svg]:fill-primary/15',
  'group-data-[collapsible=icon]:[&>svg]:transition-[scale] group-data-[collapsible=icon]:[&>svg]:duration-300 group-data-[collapsible=icon]:[&>svg]:ease-[cubic-bezier(0.32,0.72,0,1)] group-data-[collapsible=icon]:hover:[&>svg]:scale-110 group-data-[collapsible=icon]:data-[state=open]:[&>svg]:scale-110',
  'motion-reduce:transition-none motion-reduce:[&>svg]:transition-none'
);

// sr-only rather than hidden, so icon-only buttons keep their accessible name.
const railLabelClass = 'group-data-[collapsible=icon]:sr-only';

const railTooltip = (title, props) => ({
  children: title,
  sideOffset: 10,
  className:
    'z-[100] whitespace-nowrap rounded-lg px-2.5 py-1.5 font-medium shadow-lg shadow-black/10 duration-200 ease-out',
  ...props,
});

// On the rail a parent's submenu has nowhere to expand, so its children open in
// a flyout instead.
function RailNavParent({ item, pathname }) {
  const [open, setOpen] = useState(false);
  // Returning focus to the trigger would reopen its tooltip, which only makes
  // sense for keyboard users dismissing the menu.
  const restoreFocus = useRef(false);

  return (
    <SidebarMenuItem>
      <DropdownMenu modal={false} open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger asChild>
          <SidebarMenuButton
            tooltip={railTooltip(item.title, { hidden: open })}
            isActive={item.children.some((child) => child.url === pathname)}
            className={railButtonClass}
          >
            {item.icon && <item.icon />}
            <span className={railLabelClass}>{item.title}</span>
          </SidebarMenuButton>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          side="right"
          align="start"
          sideOffset={10}
          className="z-[100] min-w-52 rounded-lg shadow-lg shadow-black/10 duration-200 ease-out"
          onEscapeKeyDown={() => {
            restoreFocus.current = true;
          }}
          onCloseAutoFocus={(event) => {
            if (!restoreFocus.current) event.preventDefault();
            restoreFocus.current = false;
          }}
        >
          <DropdownMenuLabel className="text-sidebar-foreground/50 px-2 py-1 text-[0.65rem] font-semibold tracking-widest uppercase">
            {item.title}
          </DropdownMenuLabel>
          {item.children.map((child, index) => {
            const isActive = child.url === pathname;
            return (
              <DropdownMenuItem
                key={child.title + index}
                asChild
                className={cn(
                  'text-[0.8rem] transition-colors duration-150 [&_svg]:text-current',
                  isActive && 'bg-primary/10 text-primary focus:text-primary'
                )}
              >
                <Link href={child.url}>
                  {child.icon && <child.icon />}
                  <span>{child.title}</span>
                </Link>
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>
    </SidebarMenuItem>
  );
}

// Owns the open state so an expanded section is still open after the sidebar
// has been collapsed and expanded again.
function NavParent({ item, pathname }) {
  const { state, isMobile } = useSidebar();
  const [open, setOpen] = useState(false);

  if (state === 'collapsed' && !isMobile) {
    return <RailNavParent item={item} pathname={pathname} />;
  }

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger asChild>
        <SidebarMenuButton
          tooltip={item.title}
          isActive={item.current}
          className={'justify-between  '}
        >
          <div className="flex items-center gap-2 [&>svg]:size-4 [&>svg]:shrink-0">
            {item.icon && <item.icon />}
            <span className="whitespace-nowrap">{item.title}</span>
          </div>
          <span>
            <ChevronRightIcon className="size-4" />
          </span>
        </SidebarMenuButton>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <SidebarMenuSub>
          {item.children.map((child, index) => (
            <SidebarMenuSubItem key={child.title + index}>
              <Link href={child.url}>
                <SidebarMenuSubButton
                  asChild
                  isActive={child.url === pathname}
                >
                  <span className="flex items-center gap-2 [&>svg]:size-4 [&>svg]:shrink-0">
                    {' '}
                    {child.icon && <child.icon />}
                    <span>{child.title}</span>
                  </span>
                </SidebarMenuSubButton>
              </Link>
            </SidebarMenuSubItem>
          ))}
        </SidebarMenuSub>
      </CollapsibleContent>
    </Collapsible>
  );
}

export function NavMain({ items, label }) {
  const pathname = usePathname();
  const router = useRouter();

  const handleMenuClick = (url) => {
    router.push(url);
  };
  return (
    <>
      {/* <SidebarGroup>
        // */}
      {label && (
        <SidebarGroupLabel
          className={cn(
            'text-xs overflow-hidden whitespace-nowrap transition-[margin,height,opacity,color,background-color] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] motion-reduce:transition-none',
            // On the rail the group label becomes a hairline divider.
            'group-data-[collapsible=icon]:mx-auto group-data-[collapsible=icon]:my-2 group-data-[collapsible=icon]:h-px group-data-[collapsible=icon]:w-5 group-data-[collapsible=icon]:bg-sidebar-border group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:text-transparent group-data-[collapsible=icon]:opacity-100'
          )}
        >
          {label}
        </SidebarGroupLabel>
      )}
      <SidebarGroupContent className="flex flex-col gap-2 ">
        <SidebarMenu className="group-data-[collapsible=icon]:gap-1">
          {items.map((item, itmIndex) => {
            return (
              <Fragment key={item.title + itmIndex}>
                {item.children ? (
                  <NavParent item={item} pathname={pathname} />
                ) : (
                  <>
                    <SidebarMenuItem
                      // key={item.title + itmIndex}
                      className="flex items-center justify-between"
                    >
                      <SidebarMenuButton
                        tooltip={railTooltip(item.title)}
                        isActive={item.url === pathname}
                        onClick={() => handleMenuClick(item.url)}
                        className={railButtonClass}
                      >
                        {item.icon && <item.icon />}
                        <span className={railLabelClass}>{item.title}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  </>
                )}
              </Fragment>
            );
          })}
        </SidebarMenu>
      </SidebarGroupContent>
      {/* </SidebarGroup> */}
    </>
  );
}
