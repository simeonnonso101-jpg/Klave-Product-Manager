import { useEffect, useRef, lazy, Suspense } from "react";
import { ClerkProvider, SignIn, SignUp, Show, useClerk } from "@clerk/react";
import { Switch, Route, useLocation, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";

// Landing is the first thing signed-out users see — keep eager so it paints instantly.
import LandingPage from "@/pages/landing";

// Every other route is code-split: it ships only when the user navigates there.
const NotFound = lazy(() => import("@/pages/not-found"));
const ChatsPage = lazy(() => import("@/pages/chats"));
const ChatViewPage = lazy(() => import("@/pages/chat-view"));
const GroupsPage = lazy(() => import("@/pages/groups"));
const WalletPage = lazy(() => import("@/pages/wallet"));
const GrowPage = lazy(() => import("@/pages/grow"));
const CreateGroupPage = lazy(() => import("@/pages/create-group"));
const GroupDetailPage = lazy(() => import("@/pages/group-detail"));
const ProfilePage = lazy(() => import("@/pages/profile"));

function PageSkeleton() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <div className="h-10 w-10 rounded-full border-2 border-[#5A1DE6]/20 border-t-[#5A1DE6] animate-spin" />
    </div>
  );
}

const clerkPubKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;
const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

if (!clerkPubKey) {
  throw new Error("Missing VITE_CLERK_PUBLISHABLE_KEY in .env file");
}

function stripBase(path: string): string {
  return basePath && path.startsWith(basePath)
    ? path.slice(basePath.length) || "/"
    : path;
}

// Defaults tuned for snappier UX:
// - staleTime keeps data fresh for 30s without refetching on every mount/focus
// - gcTime keeps unmounted query data in memory for 5 min so back-nav is instant
// - disable refetchOnWindowFocus globally; opt back in per-query if needed
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const clerkAppearance = {
  options: {
    logoPlacement: "inside" as const,
    logoLinkUrl: basePath || "/",
    logoImageUrl: `${window.location.origin}${basePath}/logo.svg`,
  },
  variables: {
    colorPrimary: "#5A1DE6",
    colorBackground: "#FFFFFF",
    colorInputBackground: "#FFFFFF",
    colorText: "hsl(255, 25%, 14%)",
    colorTextSecondary: "hsl(255, 8%, 42%)",
    colorInputText: "hsl(255, 25%, 14%)",
    colorNeutral: "hsl(255, 25%, 14%)",
    borderRadius: "0.75rem",
    fontFamily: "Inter, system-ui, sans-serif",
    fontFamilyButtons: "Inter, system-ui, sans-serif",
    fontSize: "15px",
  },
  elements: {
    rootBox: "w-full",
    cardBox: "border border-[hsl(255,15%,90%)] shadow-xl rounded-2xl w-full overflow-hidden bg-white",
    card: "!shadow-none !border-0 !bg-transparent !rounded-none px-2",
    footer: "!shadow-none !border-0 !bg-[hsl(258,30%,97%)] !rounded-none border-t border-[hsl(255,15%,90%)]",
    headerTitle: "text-2xl font-bold",
    headerSubtitle: "text-sm",
    socialButtonsBlockButton: "border border-[hsl(255,15%,90%)] hover:bg-[hsl(258,30%,97%)] rounded-xl transition-colors",
    socialButtonsBlockButtonText: "font-medium",
    formFieldLabel: "font-medium",
    formFieldInput: "border border-[hsl(255,15%,90%)] rounded-xl focus:ring-2 focus:ring-[#5A1DE6] focus:border-transparent",
    formButtonPrimary: "bg-gradient-to-r from-[#5A1DE6] to-[#3A0CA3] hover:opacity-90 rounded-xl shadow-sm normal-case font-semibold transition-opacity",
    footerAction: "py-3",
    footerActionText: "",
    footerActionLink: "font-semibold hover:underline text-[#5A1DE6]",
    dividerLine: "bg-[hsl(255,15%,90%)]",
    dividerText: "",
    identityPreviewEditButton: "",
    formFieldSuccessText: "",
    alertText: "",
    alert: "rounded-xl",
    otpCodeFieldInput: "border border-[hsl(255,15%,90%)] rounded-xl",
    formFieldRow: "",
    main: "gap-4",
    logoBox: "justify-center mb-2",
    logoImage: "h-12 w-auto",
  },
};

function SignInPage() {
  // To update login providers, app branding, or OAuth settings use the Auth
  // pane in the workspace toolbar. More information can be found in the Replit docs.
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-gradient-to-br from-[#F5F5F5] via-[hsl(258,40%,96%)] to-[#F5F5F5] px-4 py-12">
      <div className="w-full max-w-md">
        <SignIn routing="path" path={`${basePath}/sign-in`} signUpUrl={`${basePath}/sign-up`} forceRedirectUrl={basePath || "/"} />
      </div>
    </div>
  );
}

function SignUpPage() {
  // To update login providers, app branding, or OAuth settings use the Auth
  // pane in the workspace toolbar. More information can be found in the Replit docs.
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-gradient-to-br from-[#F5F5F5] via-[hsl(258,40%,96%)] to-[#F5F5F5] px-4 py-12">
      <div className="w-full max-w-md">
        <SignUp routing="path" path={`${basePath}/sign-up`} signInUrl={`${basePath}/sign-in`} forceRedirectUrl={basePath || "/"} />
      </div>
    </div>
  );
}

function ClerkQueryClientCacheInvalidator() {
  const { addListener } = useClerk();
  const queryClientLocal = useQueryClient();
  const prevUserIdRef = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    const unsubscribe = addListener(({ user }) => {
      const userId = user?.id ?? null;
      if (prevUserIdRef.current !== undefined && prevUserIdRef.current !== userId) {
        queryClientLocal.clear();
      }
      prevUserIdRef.current = userId;
    });
    return unsubscribe;
  }, [addListener, queryClientLocal]);

  return null;
}

function HomeRedirect() {
  return (
    <>
      <Show when="signed-in">
        <Redirect to="/chats" />
      </Show>
      <Show when="signed-out">
        <LandingPage />
      </Show>
    </>
  );
}

function Protected({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Show when="signed-in">{children}</Show>
      <Show when="signed-out">
        <Redirect to="/" />
      </Show>
    </>
  );
}

function ClerkProviderWithRoutes() {
  const [, setLocation] = useLocation();

  return (
    <ClerkProvider
      publishableKey={clerkPubKey}
      proxyUrl={clerkProxyUrl}
      appearance={clerkAppearance}
      localization={{
        signIn: {
          start: {
            title: "Welcome back to Klave",
            subtitle: "Sign in to your courses and chats",
          },
        },
        signUp: {
          start: {
            title: "Create your Klave account",
            subtitle: "Start teaching, selling, and chatting with your students",
          },
        },
      }}
      routerPush={(to) => setLocation(stripBase(to))}
      routerReplace={(to) => setLocation(stripBase(to), { replace: true })}
    >
      <QueryClientProvider client={queryClient}>
        <ClerkQueryClientCacheInvalidator />
        <TooltipProvider>
          <Suspense fallback={<PageSkeleton />}>
            <Switch>
              <Route path="/" component={HomeRedirect} />
              <Route path="/sign-in/*?" component={SignInPage} />
              <Route path="/sign-up/*?" component={SignUpPage} />
              <Route path="/chats" component={() => <Protected><ChatsPage /></Protected>} />
              <Route path="/chat/:id" component={() => <Protected><ChatViewPage /></Protected>} />
              <Route path="/groups" component={() => <Protected><GroupsPage /></Protected>} />
              <Route path="/groups/new" component={() => <Protected><CreateGroupPage /></Protected>} />
              <Route path="/groups/:id" component={() => <Protected><GroupDetailPage /></Protected>} />
              <Route path="/wallet" component={() => <Protected><WalletPage /></Protected>} />
              <Route path="/grow" component={() => <Protected><GrowPage /></Protected>} />
              <Route path="/profile" component={() => <Protected><ProfilePage /></Protected>} />
              <Route component={NotFound} />
            </Switch>
          </Suspense>
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </ClerkProvider>
  );
}

function App() {
  return (
    <ThemeProvider>
      <WouterRouter base={basePath}>
        <ClerkProviderWithRoutes />
      </WouterRouter>
    </ThemeProvider>
  );
}

export default App;
