import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { MessageCircle, Compass, Wallet, TrendingUp } from "lucide-react";
import { useGetCurrentUser } from "@workspace/api-client-react";

export function MainLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { data: user } = useGetCurrentUser();

  // Hide bottom nav on chat view
  const isChatView = location.startsWith("/chat/");
  
  return (
    <div className="flex flex-col h-[100dvh] bg-background text-foreground overflow-hidden">
      <main className={`flex-1 overflow-y-auto ${isChatView ? "" : "pb-16"}`}>
        {children}
      </main>
      
      {!isChatView && (
        <nav className="fixed bottom-0 w-full bg-card/80 backdrop-blur-xl border-t border-border z-50 safe-area-bottom">
          <div className="flex justify-around items-center h-16 px-2">
            <NavItem href="/" icon={<MessageCircle className="w-5 h-5" />} label="Chats" active={location === "/"} />
            <NavItem href="/groups" icon={<Compass className="w-5 h-5" />} label="Discover" active={location === "/groups" || location.startsWith("/groups/new")} />
            <NavItem href="/wallet" icon={<Wallet className="w-5 h-5" />} label="Wallet" active={location === "/wallet"} />
            <NavItem href="/grow" icon={<TrendingUp className="w-5 h-5" />} label="Grow" active={location === "/grow"} />
          </div>
        </nav>
      )}
    </div>
  );
}

function NavItem({ href, icon, label, active }: { href: string; icon: React.ReactNode; label: string; active: boolean }) {
  return (
    <Link href={href} className="flex-1 flex flex-col items-center justify-center gap-1 min-h-[44px]">
      <div className={`transition-colors duration-200 ${active ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}>
        {icon}
      </div>
      <span className={`text-[10px] font-medium transition-colors duration-200 ${active ? "text-primary" : "text-muted-foreground"}`}>
        {label}
      </span>
    </Link>
  );
}