import { useEffect, useRef } from "react";
import { ClerkProvider, SignIn, SignUp, Show, useClerk } from "@clerk/react";
import { Switch, Route, useLocation, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import LandingPage from "@/pages/landing";
import ChatsPage from "@/pages/chats";
import ChatViewPage from "@/pages/chat-view";
import GroupsPage from "@/pages/groups";
import WalletPage from "@/pages/wallet";
import GrowPage from "@/pages/grow";
import CreateGroupPage from "@/pages/create-group";
import GroupDetailPage from "@/pages/group-detail";

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

const queryClient = new QueryClient();

const clerkAppearance = {
  options: {
    logoPlacement: "inside" as const,
    logoLinkUrl: basePath || "/",
    logoImageUrl: `${window.location.origin}${basePath}/logo.svg`,
  },
  variables: {
    colorPrimary: "hsl(160, 35%, 45%)",
    colorBackground: "hsl(40, 30%, 99%)",
    colorInputBackground: "hsl(40, 30%, 99%)",
    colorText: "hsl(160, 15%, 15%)",
    colorTextSecondary: "hsl(160, 10%, 45%)",
    colorInputText: "hsl(160, 15%, 15%)",
    colorNeutral: "hsl(160, 15%, 15%)",
    borderRadius: "0.75rem",
    fontFamily: "Inter, system-ui, sans-serif",
    fontFamilyButtons: "Inter, system-ui, sans-serif",
    fontSize: "15px",
  },
  elements: {
    rootBox: "w-full",
    cardBox: "border border-[hsl(40,15%,90%)] shadow-xl rounded-2xl w-full overflow-hidden bg-[hsl(40,30%,99%)]",
    card: "!shadow-none !border-0 !bg-transparent !rounded-none px-2",
    footer: "!shadow-none !border-0 !bg-[hsl(40,20%,96%)] !rounded-none border-t border-[hsl(40,15%,90%)]",
    headerTitle: "text-2xl font-bold",
    headerSubtitle: "text-sm",
    socialButtonsBlockButton: "border border-[hsl(40,15%,88%)] hover:bg-[hsl(40,20%,95%)] rounded-xl transition-colors",
    socialButtonsBlockButtonText: "font-medium",
    formFieldLabel: "font-medium",
    formFieldInput: "border border-[hsl(40,15%,88%)] rounded-xl focus:ring-2 focus:ring-[hsl(160,35%,45%)] focus:border-transparent",
    formButtonPrimary: "bg-[hsl(160,35%,45%)] hover:bg-[hsl(160,40%,40%)] rounded-xl shadow-sm normal-case font-semibold transition-colors",
    footerAction: "py-3",
    footerActionText: "",
    footerActionLink: "font-semibold hover:underline",
    dividerLine: "bg-[hsl(40,15%,90%)]",
    dividerText: "",
    identityPreviewEditButton: "",
    formFieldSuccessText: "",
    alertText: "",
    alert: "rounded-xl",
    otpCodeFieldInput: "border border-[hsl(40,15%,88%)] rounded-xl",
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
    <div className="flex min-h-[100dvh] items-center justify-center bg-gradient-to-br from-[hsl(40,30%,97%)] via-[hsl(160,20%,95%)] to-[hsl(40,30%,97%)] px-4 py-12">
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
    <div className="flex min-h-[100dvh] items-center justify-center bg-gradient-to-br from-[hsl(40,30%,97%)] via-[hsl(160,20%,95%)] to-[hsl(40,30%,97%)] px-4 py-12">
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
            <Route component={NotFound} />
          </Switch>
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </ClerkProvider>
  );
}

function App() {
  return (
    <WouterRouter base={basePath}>
      <ClerkProviderWithRoutes />
    </WouterRouter>
  );
}

export default App;
