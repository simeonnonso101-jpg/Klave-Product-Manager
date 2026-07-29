import { Link, useLocation } from "wouter";
import { MessageCircle, Compass, Wallet, TrendingUp, LogOut, User } from "lucide-react";
import { useClerk } from "@clerk/react";

export function MainLayout({ children }: { children: React.ReactNode }) {
  const [location, setLocation] = useLocation();
  const { signOut } = useClerk();

  const isChatView = location.startsWith("/chat/");

  return (
    <div className="flex flex-col h-[100dvh] bg-background text-foreground overflow-hidden">
      <main className={`flex-1 overflow-y-auto ${isChatView ? "" : "pb-[76px]"}`}>
        {children}
      </main>

      {!isChatView && (
        <>
          <div className="fixed top-3 right-3 z-50 flex items-center gap-2">
            <button
              onClick={async () => { await signOut(); setLocation("/"); }}
              className="h-9 w-9 rounded-full bg-white border border-border shadow-sm flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-all active:scale-95"
              title="Sign out"
              aria-label="Sign out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>

          {/* Navigation bar */}
          <nav className="fixed bottom-0 left-0 right-0 z-50 pb-safe">
            <div className="border-t border-border bg-white shadow-[0_-1px_0_0_hsl(220,14%,88%)]">
              <div className="flex justify-around items-center h-[64px] max-w-lg mx-auto px-2">
                <NavItem href="/chats" icon={<MessageCircle className="w-[22px] h-[22px]" />} label="Chats" active={location === "/chats"} />
                <NavItem href="/groups" icon={<Compass className="w-[22px] h-[22px]" />} label="Discover" active={location === "/groups" || location.startsWith("/groups/new")} />
                <NavItem href="/wallet" icon={<Wallet className="w-[22px] h-[22px]" />} label="Wallet" active={location === "/wallet"} />
                <NavItem href="/grow" icon={<TrendingUp className="w-[22px] h-[22px]" />} label="Grow" active={location === "/grow"} />
                <NavItem href="/profile" icon={<User className="w-[22px] h-[22px]" />} label="Profile" active={location === "/profile"} />
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
      className="flex-1 flex flex-col items-center justify-center gap-1 min-h-[56px] px-2 transition-all active:scale-90"
    >
      <div
        className={`flex items-center justify-center w-8 h-8 rounded-xl transition-all duration-200 ${
          active
            ? "bg-[#5A1DE6]/10 text-[#5A1DE6]"
            : "text-muted-foreground"
        }`}
      >
        {icon}
      </div>
      <span
        className={`text-[10px] font-semibold tracking-wide transition-colors duration-200 ${
          active ? "text-[#5A1DE6]" : "text-muted-foreground"
        }`}
      >
        {label}
      </span>
    </Link>
  );
}
