import { Link, useLocation } from "wouter";
import { MessageCircle, Compass, Wallet, TrendingUp, LogOut, User } from "lucide-react";
import { useClerk } from "@clerk/react";
import { ThemeToggle } from "@/components/theme-toggle";

export function MainLayout({ children }: { children: React.ReactNode }) {
  const [location, setLocation] = useLocation();
  const { signOut } = useClerk();

  const isChatView = location.startsWith("/chat/");

  return (
    <div className="flex flex-col h-[100dvh] bg-background text-foreground overflow-hidden">
      <main className={`flex-1 overflow-y-auto ${isChatView ? "" : "pb-[84px]"}`}>
        {children}
      </main>

      {!isChatView && (
        <>
          <div className="fixed top-3 right-3 z-50 flex items-center gap-2">
            <ThemeToggle />
            <button
              onClick={async () => { await signOut(); setLocation("/"); }}
              className="h-10 w-10 rounded-full bg-white/60 dark:bg-white/10 backdrop-blur-xl border border-white/40 dark:border-white/10 shadow-lg shadow-black/5 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-white/80 dark:hover:bg-white/15 transition-all active:scale-95"
              title="Sign out"
              aria-label="Sign out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>

          {/* Glass navigation bar */}
          <nav className="fixed bottom-0 left-0 right-0 z-50 pb-safe pointer-events-none">
            <div className="px-3 pb-3 max-w-md mx-auto pointer-events-auto">
              <div className="relative rounded-2xl border border-white/40 dark:border-white/10 bg-white/60 dark:bg-white/5 backdrop-blur-2xl shadow-[0_8px_32px_-4px_rgba(90,29,230,0.15)]">
                {/* Inner highlight for glass effect */}
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-b from-white/50 dark:from-white/10 via-white/0 to-transparent pointer-events-none" />
                <div className="relative flex justify-around items-center h-[68px] px-1">
                  <NavItem href="/chats" icon={<MessageCircle className="w-5 h-5" />} label="Chats" active={location === "/chats"} />
                  <NavItem href="/groups" icon={<Compass className="w-5 h-5" />} label="Discover" active={location === "/groups" || location.startsWith("/groups/new")} />
                  <NavItem href="/wallet" icon={<Wallet className="w-5 h-5" />} label="Wallet" active={location === "/wallet"} />
                  <NavItem href="/grow" icon={<TrendingUp className="w-5 h-5" />} label="Grow" active={location === "/grow"} />
                  <NavItem href="/profile" icon={<User className="w-5 h-5" />} label="Profile" active={location === "/profile"} />
                </div>
              </div>
            </div>
          </nav>
        </>
      )}
    </div>
  );
}

function NavItem({ href, icon, label, active }: { href: string; icon: React.ReactNode; label: string; active: boolean }) {
  return (
    <Link
      href={href}
      className="flex-1 flex flex-col items-center justify-center gap-1 min-h-[56px] px-2 rounded-xl transition-all active:scale-90 relative"
    >
      <div
        className={`relative flex items-center justify-center transition-all duration-300 ${
          active
            ? "text-white"
            : "text-muted-foreground"
        }`}
      >
        {active && (
          <span className="absolute inset-0 -m-1.5 rounded-xl bg-gradient-to-br from-[#5A1DE6] to-[#3A0CA3] shadow-md shadow-[#5A1DE6]/30 scale-100 transition-transform" />
        )}
        <span className="relative">{icon}</span>
      </div>
      <span
        className={`text-[10px] font-bold tracking-wide transition-colors duration-200 ${
          active ? "text-[#5A1DE6] dark:text-[#9F75FF]" : "text-muted-foreground"
        }`}
      >
        {label}
      </span>
    </Link>
  );
}
