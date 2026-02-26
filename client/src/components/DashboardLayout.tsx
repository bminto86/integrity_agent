import { useAuth } from "@/_core/hooks/useAuth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { NotificationBell } from "@/components/NotificationCenter";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { getLoginUrl } from "@/const";
import { useIsMobile } from "@/hooks/useMobile";
import { MiaAvatar } from "@/components/Mia";
import { MiaFloatingChat } from "@/components/MiaFloatingChat";
import {
  LayoutDashboard, LogOut, PanelLeft, Building2, CheckSquare,
  FileText, Users, Mail, Calculator, BarChart3, Award, FileEdit,
  MessageSquare, Bell, Settings2, Bot,
} from "lucide-react";
import { CSSProperties, useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { DashboardLayoutSkeleton } from './DashboardLayoutSkeleton';
import { Button } from "./ui/button";
import { Separator } from "./ui/separator";
import { Badge } from "./ui/badge";
import { trpc } from "@/lib/trpc";

const menuSections = [
  {
    label: "Overview",
    items: [
      { icon: LayoutDashboard, label: "Main", path: "/" },
      { icon: Bell, label: "Alerts", path: "/alerts" },
    ],
  },
  {
    label: "Vendor Management",
    items: [
      { icon: Building2, label: "Vendors", path: "/vendors" },
      { icon: Award, label: "Scorecards", path: "/scorecards" },
      { icon: BarChart3, label: "Quality Analytics", path: "/quality" },
    ],
  },
  {
    label: "Operations",
    items: [
      { icon: CheckSquare, label: "Tasks", path: "/tasks" },
      { icon: Calculator, label: "Workforce Planner", path: "/workforce" },
      { icon: FileText, label: "Reports", path: "/reports" },
    ],
  },
  {
    label: "Communication",
    items: [
      { icon: Users, label: "1:1 Assistant", path: "/meetings" },
      { icon: MessageSquare, label: "Meeting Summarizer", path: "/summarizer" },
      { icon: Mail, label: "Comm Drafter", path: "/communications" },
    ],
  },
  {
    label: "Knowledge",
    items: [
      { icon: FileEdit, label: "Documents", path: "/documents" },
    ],
  },
  {
    label: "Agents",
    items: [
      { icon: Bot, label: "Agent Library", path: "/agents" },
    ],
  },
  {
    label: "System",
    items: [
      { icon: Settings2, label: "Data Connections", path: "/connections" },
      { icon: Settings2, label: "Agent Settings", path: "/settings" },
    ],
  },
];

const allMenuItems = menuSections.flatMap(s => s.items);

const SIDEBAR_WIDTH_KEY = "sidebar-width";
const DEFAULT_WIDTH = 260;
const MIN_WIDTH = 200;
const MAX_WIDTH = 480;

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const saved = localStorage.getItem(SIDEBAR_WIDTH_KEY);
    return saved ? parseInt(saved, 10) : DEFAULT_WIDTH;
  });
  const { loading, user } = useAuth();

  useEffect(() => {
    localStorage.setItem(SIDEBAR_WIDTH_KEY, sidebarWidth.toString());
  }, [sidebarWidth]);

  if (loading) {
    return <DashboardLayoutSkeleton />
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="flex flex-col items-center gap-8 p-8 max-w-md w-full">
          <div className="flex flex-col items-center gap-4">
            <MiaAvatar mood="neutral" size="xl" />
            <h1 className="text-2xl font-semibold tracking-tight text-center text-foreground">
              Meet Mia
            </h1>
            <p className="text-xs font-medium text-primary uppercase tracking-wider">My Integrity Assistant</p>
            <p className="text-sm text-muted-foreground text-center max-w-sm">
              Your AI-powered operations partner for vendor management, team coordination, and operational intelligence.
            </p>
          </div>
          <Button
            onClick={() => { window.location.href = getLoginUrl(); }}
            size="lg"
            className="w-full shadow-lg hover:shadow-xl transition-all"
          >
            Sign in to get started
          </Button>
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider
      style={{ "--sidebar-width": `${sidebarWidth}px` } as CSSProperties}
    >
      <DashboardLayoutContent setSidebarWidth={setSidebarWidth}>
        {children}
      </DashboardLayoutContent>
      <MiaFloatingChat />
    </SidebarProvider>
  );
}

type DashboardLayoutContentProps = {
  children: React.ReactNode;
  setSidebarWidth: (width: number) => void;
};

function DashboardLayoutContent({ children, setSidebarWidth }: DashboardLayoutContentProps) {
  const { user, logout } = useAuth();
  const [location, setLocation] = useLocation();
  const { state, toggleSidebar } = useSidebar();
  const isCollapsed = state === "collapsed";
  const [isResizing, setIsResizing] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const activeMenuItem = allMenuItems.find(item => item.path === location);
  const isMobile = useIsMobile();

  const alertsQuery = trpc.alerts.list.useQuery({ onlyUnread: true }, { refetchInterval: 30000 });
  const unreadAlerts = alertsQuery.data?.length ?? 0;

  useEffect(() => {
    if (isCollapsed) setIsResizing(false);
  }, [isCollapsed]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      const sidebarLeft = sidebarRef.current?.getBoundingClientRect().left ?? 0;
      const newWidth = e.clientX - sidebarLeft;
      if (newWidth >= MIN_WIDTH && newWidth <= MAX_WIDTH) setSidebarWidth(newWidth);
    };
    const handleMouseUp = () => setIsResizing(false);
    if (isResizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    }
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isResizing, setSidebarWidth]);

  return (
    <>
      <div className="relative" ref={sidebarRef}>
        <Sidebar collapsible="icon" className="border-r-0" disableTransition={isResizing}>
          <SidebarHeader className="h-16 justify-center">
            <div className="flex items-center gap-3 px-2 transition-all w-full">
              <button
                onClick={toggleSidebar}
                className="h-8 w-8 flex items-center justify-center hover:bg-accent rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring shrink-0"
                aria-label="Toggle navigation"
              >
                <PanelLeft className="h-4 w-4 text-muted-foreground" />
              </button>
              {!isCollapsed && (
                <div className="flex items-center gap-2.5 min-w-0 cursor-pointer" onClick={() => setLocation("/")}>
                  <MiaAvatar mood="neutral" size="sm" showGlow={false} />
                  <div className="min-w-0">
                    <span className="font-semibold tracking-tight text-sm block leading-tight">Mia</span>
                    <span className="text-[9px] text-muted-foreground uppercase tracking-wider">Integrity Ops</span>
                  </div>
                </div>
              )}
            </div>
          </SidebarHeader>

          <SidebarContent className="gap-0 px-2">
            {menuSections.map((section, sIdx) => (
              <div key={section.label}>
                {sIdx > 0 && <Separator className="my-2" />}
                {!isCollapsed && (
                  <p className="px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {section.label}
                  </p>
                )}
                <SidebarMenu>
                  {section.items.map(item => {
                    const isActive = location === item.path;
                    return (
                      <SidebarMenuItem key={item.path}>
                        <SidebarMenuButton
                          isActive={isActive}
                          onClick={() => setLocation(item.path)}
                          tooltip={item.label}
                          className="h-9 transition-all font-normal text-[13px]"
                        >
                          <item.icon className={`h-4 w-4 ${isActive ? "text-primary" : ""}`} />
                          <span className="flex-1">{item.label}</span>
                          {item.path === "/alerts" && unreadAlerts > 0 && !isCollapsed && (
                            <Badge variant="destructive" className="h-5 min-w-5 text-[10px] px-1.5">
                              {unreadAlerts}
                            </Badge>
                          )}
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </div>
            ))}
          </SidebarContent>

          <SidebarFooter className="p-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-3 rounded-lg px-1 py-1 hover:bg-accent/50 transition-colors w-full text-left group-data-[collapsible=icon]:justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  <Avatar className="h-8 w-8 border shrink-0">
                    <AvatarFallback className="text-xs font-medium bg-primary/10 text-primary">
                      {user?.name?.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0 group-data-[collapsible=icon]:hidden">
                    <p className="text-sm font-medium truncate leading-none">{user?.name || "-"}</p>
                    <p className="text-[11px] text-muted-foreground truncate mt-1">{user?.email || "-"}</p>
                  </div>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={logout} className="cursor-pointer text-destructive focus:text-destructive">
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Sign out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarFooter>
        </Sidebar>
        <div
          className={`absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-primary/20 transition-colors ${isCollapsed ? "hidden" : ""}`}
          onMouseDown={() => { if (!isCollapsed) setIsResizing(true); }}
          style={{ zIndex: 50 }}
        />
      </div>

      <SidebarInset>
        <div className="flex border-b h-14 items-center justify-between bg-background/95 px-2 md:px-4 backdrop-blur supports-[backdrop-filter]:backdrop-blur sticky top-0 z-40">
          <div className="flex items-center gap-2">
            {isMobile && <SidebarTrigger className="h-9 w-9 rounded-lg bg-background" />}
            <span className="tracking-tight text-foreground text-sm font-medium">
              {activeMenuItem?.label ?? "Menu"}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <NotificationBell />
          </div>
        </div>
        <main className="flex-1 p-4 md:p-6">{children}</main>
      </SidebarInset>
    </>
  );
}
