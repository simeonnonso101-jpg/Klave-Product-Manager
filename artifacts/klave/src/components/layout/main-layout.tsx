import { Link, useLocation } from "wouter";
import { MessageCircle, Compass, Wallet, TrendingUp, LogOut } from "lucide-react";
import { useClerk, useUser } from "@clerk/react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export function MainLayout({ children }: { children: React.ReactNode }) {
  const [location, setLocation] = useLocation();
  const { signOut } = useClerk();
  const { user: clerkUser } = useUser();

  const isChatView = location.startsWith("/chat/");
  const initial = (clerkUser?.firstName?.[0] || clerkUser?.username?.[0] || clerkUser?.primaryEmailAddress?.emailAddress?.[0] || "K").toUpperCase();

  return (
    <div className="flex flex-col h-[100dvh] bg-background text-foreground overflow-hidden">
      <main className={`flex-1 overflow-y-auto ${isChatView ? "" : "pb-[84px]"}`}>
        {children}
      </main>

      {!isChatView && (
        <>
          <Link
            href="/profile"
            className="fixed top-3 left-3 z-50 h-10 w-10 rounded-full bg-white/60 backdrop-blur-xl border border-white/40 shadow-lg shadow-black/5 flex items-center justify-center overflow-hidden hover:bg-white/80 transition-all active:scale-95"
            title="Profile"
            aria-label="Profile"
          >
            <Avatar className="h-full w-full">
              <AvatarImage src={clerkUser?.imageUrl || undefined} />
              <AvatarFallback className="bg-gradient-to-br from-[#5A1DE6] to-[#3A0CA3] text-white text-xs font-bold">{initial}</AvatarFallback>
            </Avatar>
          </Link>
          <button
            onClick={async () => { await signOut(); setLocation("/"); }}
            className="fixed top-3 right-3 z-50 h-10 w-10 rounded-full bg-white/60 backdrop-blur-xl border border-white/40 shadow-lg shadow-black/5 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-white/80 transition-all active:scale-95"
            title="Sign out"
            aria-label="Sign out"
          >
            <LogOut className="w-4 h-4" />
          </button>

          {/* Glass navigation bar */}
          <nav className="fixed bottom-0 left-0 right-0 z-50 pb-safe pointer-events-none">
            <div className="px-3 pb-3 max-w-md mx-auto pointer-events-auto">
              <div className="relative rounded-2xl border border-white/40 bg-white/60 backdrop-blur-2xl shadow-[0_8px_32px_-4px_rgba(90,29,230,0.15)]">
                {/* Inner highlight for glass effect */}
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-b from-white/50 via-white/0 to-transparent pointer-events-none" />
                <div className="relative flex justify-around items-center h-[68px] px-2">
                  <NavItem href="/chats" icon={<MessageCircle className="w-[22px] h-[22px]" />} label="Chats" active={location === "/chats"} />
                  <NavItem href="/groups" icon={<Compass className="w-[22px] h-[22px]" />} label="Discover" active={location === "/groups" || location.startsWith("/groups/new")} />
                  <NavItem href="/wallet" icon={<Wallet className="w-[22px] h-[22px]" />} label="Wallet" active={location === "/wallet"} />
                  <NavItem href="/grow" icon={<TrendingUp className="w-[22px] h-[22px]" />} label="Grow" active={location === "/grow"} />
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
          <span className="absolute inset-0 -m-2 rounded-xl bg-gradient-to-br from-[#5A1DE6] to-[#3A0CA3] shadow-md shadow-[#5A1DE6]/30 scale-100 transition-transform" />
        )}
        <span className="relative">{icon}</span>
      </div>
      <span
        className={`text-[10px] font-bold tracking-wide transition-colors duration-200 ${
          active ? "text-[#5A1DE6]" : "text-muted-foreground"
        }`}
      >
        {label}
      </span>
    </Link>
  );
}
