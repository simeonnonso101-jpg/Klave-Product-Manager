import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";

import ChatsPage from "@/pages/chats";
import ChatViewPage from "@/pages/chat-view";
import GroupsPage from "@/pages/groups";
import WalletPage from "@/pages/wallet";
import GrowPage from "@/pages/grow";
import CreateGroupPage from "@/pages/create-group";
import GroupDetailPage from "@/pages/group-detail";

const queryClient = new QueryClient();

function Router() {
  return (
    <Switch>
      <Route path="/" component={ChatsPage} />
      <Route path="/chat/:id" component={ChatViewPage} />
      <Route path="/groups" component={GroupsPage} />
      <Route path="/groups/new" component={CreateGroupPage} />
      <Route path="/groups/:id" component={GroupDetailPage} />
      <Route path="/wallet" component={WalletPage} />
      <Route path="/grow" component={GrowPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;