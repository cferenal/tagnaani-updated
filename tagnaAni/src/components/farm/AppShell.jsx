import { useSiteLanguage } from "@/lib/siteLanguage";
import { Link, useRouterState } from "@tanstack/react-router";
import { Home as HomeIcon, ClipboardList, BarChart3, Users, UserRound } from "lucide-react";
import { cn } from "@/lib/utils";

const TABS = [
  { to: "/dashboard", label: "Home", Icon: HomeIcon },
  { to: "/records", label: "Records", Icon: ClipboardList },
  { to: "/statistics", label: "Stats", Icon: BarChart3 },
  { to: "/contacts", label: "Contacts", Icon: Users },
  { to: "/profile", label: "Profile", Icon: UserRound },
];

export default function AppShell({ children, hideNav = false }) {
  const { t } = useSiteLanguage();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isFullBleedHeader = pathname.startsWith("/contacts");

  return (
    <div className="relative flex h-full w-full flex-col bg-[#D49961] text-[#7F3E00]">
      <div
        className={cn(
          "no-scrollbar min-h-0 flex-1 overflow-y-auto",
          isFullBleedHeader ? "pt-0" : "pt-5",
          hideNav ? "pb-8" : "pb-28",
        )}
      >
        <div className="mx-auto w-full max-w-6xl">{children}</div>
      </div>

      {!hideNav && (
        <nav className="pointer-events-none absolute bottom-4 left-0 right-0 z-40 mx-auto w-full max-w-xl px-4">
          <div className="pointer-events-auto flex items-center justify-between rounded-[1.6rem] border border-[#643100]/30 bg-[#F6E6D4]/95 px-1.5 py-1.5 shadow-[0_12px_28px_-14px_rgba(100,49,0,0.65)] backdrop-blur-xl">
            {TABS.map(({ to, label, Icon }) => {
              const active = to === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(to);
              return (
                <Link
                  key={to}
                  to={to}
                  className={cn(
                    "flex flex-1 flex-col items-center gap-1 rounded-[1.2rem] py-1.5 text-[8.5px] uppercase tracking-[0.04em] transition-all duration-300",
                    active
                      ? "bg-[#EACAAE] font-bold text-[#643100] ring-1 ring-[#643100]/40"
                      : "font-medium text-[#7F3E00] hover:text-[#643100]",
                  )}
                >
                  <Icon className="h-[17px] w-[17px]" strokeWidth={active ? 2.1 : 1.7} />
                  {t(label)}
                </Link>
              );
            })}
          </div>
        </nav>
      )}
    </div>
  );
}