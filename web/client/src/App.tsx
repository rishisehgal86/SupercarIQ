import React, { Suspense } from "react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import { Route, Switch, useLocation } from "wouter";
import { useEffect } from "react";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import ReportPage from "./pages/ReportPage";

// Lazy-load utility pages
const LandingV2 = React.lazy(() => import("./pages/LandingV2"));
const ResearchHub = React.lazy(() => import("./pages/ResearchHub"));
const Compare = React.lazy(() => import("./pages/Compare"));
const Watchlist = React.lazy(() => import("./pages/Watchlist"));
const MarketOverview = React.lazy(() => import("./pages/MarketOverview"));
const AdminLeads = React.lazy(() => import("./pages/AdminLeads"));
const SoldArchive = React.lazy(() => import("./pages/SoldArchive"));
const FinancePage = React.lazy(() => import("./pages/FinancePage"));
const Login = React.lazy(() => import("./pages/Login"));
const NotFound = React.lazy(() => import("./pages/NotFound"));

// Minimal loading fallback — dark bg matches the site theme
function PageLoader() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

// Scroll to top on every route change
function ScrollToTop() {
  const [location] = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [location]);
  return null;
}

function Router() {
  return (
    <Suspense fallback={<PageLoader />}>
      <ScrollToTop />
      <Switch>
        {/* Homepage */}
        <Route path="/" component={LandingV2} />

        {/* ── Ferrari 812 family ── */}
        <Route path="/812-superfast">{() => <ReportPage modelKey="812-superfast" />}</Route>
        <Route path="/812-gts">{() => <ReportPage modelKey="812-gts" />}</Route>

        {/* ── Ferrari mid-engine ── */}
        <Route path="/f8-tributo">{() => <ReportPage modelKey="f8-tributo" />}</Route>
        <Route path="/488-gtb">{() => <ReportPage modelKey="488-gtb" />}</Route>
        <Route path="/488-pista">{() => <ReportPage modelKey="488-pista" />}</Route>
        <Route path="/458-italia">{() => <ReportPage modelKey="458-italia" />}</Route>
        <Route path="/sf90-stradale">{() => <ReportPage modelKey="sf90-stradale" />}</Route>

        {/* ── Ferrari GT ── */}
        <Route path="/california-t">{() => <ReportPage modelKey="california-t" />}</Route>
        <Route path="/portofino">{() => <ReportPage modelKey="portofino" />}</Route>
        <Route path="/roma">{() => <ReportPage modelKey="roma" />}</Route>

        {/* ── Lamborghini ── */}
        <Route path="/huracan-sto">{() => <ReportPage modelKey="huracan-sto" />}</Route>

        {/* ── Utility pages ── */}
        <Route path="/research" component={ResearchHub} />
        <Route path="/compare" component={Compare} />
        <Route path="/watchlist" component={Watchlist} />
        <Route path="/market" component={MarketOverview} />
        <Route path="/sold-archive" component={SoldArchive} />
        <Route path="/finance" component={FinancePage} />
        <Route path="/login" component={Login} />

        {/* ── Admin ── */}
        <Route path="/admin">{() => { window.location.replace("/admin/leads"); return null; }}</Route>
        <Route path="/admin/leads" component={AdminLeads} />

        {/* ── 404 ── */}
        <Route path="/404" component={NotFound} />
        <Route component={NotFound} />
      </Switch>
    </Suspense>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
