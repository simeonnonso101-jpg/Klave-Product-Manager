import { Link, useLocation } from "wouter";
import { MessageCircle, Compass, Wallet, TrendingUp, LogOut, User as UserIcon } from "lucide-react";
import { useClerk, useUser } from "@clerk/react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export function MainLayout({ children }: { children: React.ReactNode }) {
  const [location, setLocation] = useLocation();
  const { signOut } = useClerk();
  const { user: clerkUser } = useUser();

  const isChatView = location.startsWith("/chat/");
  const initial = (clerkUser?.firstName?.[0] || clerkUser?.username?.[0] || clerkUser?.primaryEmailAddress?.emailAddress?.[0] || "K").toUpperCase();
  
  return (
    <div className="flex flex-col h-[100dvh] bg-background text-foreground overflow-hidden">
      <main className={`flex-1 overflow-y-auto ${isChatView ? "" : "pb-[72px]"}`}>
        {children}
      </main>
      
      {!isChatView && (
        <>
          <Link
            href="/profile"
            className="fixed top-3 left-3 z-50 h-9 w-9 rounded-full bg-white/90 backdrop-blur border border-border shadow-sm flex items-center justify-center overflow-hidden hover:opacity-90 transition-opacity"
            title="Profile"
            aria-label="Profile"
          >
            <Avatar className="h-full w-full">
              <AvatarImage src={clerkUser?.imageUrl || undefined} />
              <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">{initial}</AvatarFallback>
            </Avatar>
          </Link>
          <button
            onClick={async () => { await signOut(); setLocation("/"); }}
            className="fixed top-3 right-3 z-50 h-9 w-9 rounded-full bg-white/90 backdrop-blur border border-border shadow-sm flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
            title="Sign out"
            aria-label="Sign out"
          >
            <LogOut className="w-4 h-4" />
          </button>
          <nav className="fixed bottom-0 w-full bg-white/90 backdrop-blur-xl border-t border-border z-50 pb-safe shadow-[0_-4px_20px_-10px_rgba(0,0,0,0.1)]">
            <div className="flex justify-around items-center h-[72px] px-2 max-w-md mx-auto relative">
              {/* Note: The unread dot logic can be added here if needed */}
              <NavItem href="/chats" icon={<MessageCircle className="w-6 h-6" />} label="Chats" active={location === "/chats"} />
              <NavItem href="/groups" icon={<Compass className="w-6 h-6" />} label="Discover" active={location === "/groups" || location.startsWith("/groups/new")} />
              <NavItem href="/wallet" icon={<Wallet className="w-6 h-6" />} label="Wallet" active={location === "/wallet"} />
              <NavItem href="/grow" icon={<TrendingUp className="w-6 h-6" />} label="Grow" active={location === "/grow"} />
            </div>
          </nav>
        </>
      )}
    </div>
  );
}

function NavItem({ href, icon, label, active, hasNotification }: { href: string; icon: React.ReactNode; label: string; active: boolean; hasNotification?: boolean }) {
  return (
    <Link href={href} className="flex-1 flex flex-col items-center justify-center gap-1.5 min-h-[56px] px-2 rounded-2xl transition-all active:scale-95 relative">
      <div className={`transition-colors duration-200 relative ${active ? "text-primary" : "text-muted-foreground"}`}>
        {icon}
        {hasNotification && (
          <span className="absolute top-0.5 right-0.5 w-2 h-2 bg-green-500 border border-white rounded-full"></span>
        )}
      </div>
      <span className={`text-[11px] font-bold tracking-wide transition-colors duration-200 ${active ? "text-primary" : "text-muted-foreground"}`}>
        {label}
      </span>
    </Link>
  );
}
