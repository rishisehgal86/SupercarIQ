import React, { Suspense } from "react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import { Route, Switch, useLocation } from "wouter";
import { useEffect } from "react";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";

// Lazy-load all pages so a broken import in one page doesn't crash the whole app
const Landing = React.lazy(() => import("./pages/Landing"));
const Home = React.lazy(() => import("./pages/Home"));
const ResearchHub = React.lazy(() => import("./pages/ResearchHub"));
const CarDetail = React.lazy(() => import("./pages/CarDetail"));
const Compare = React.lazy(() => import("./pages/Compare"));
const F8TributoReport = React.lazy(() => import("./pages/F8TributoReport"));
const F8CarDetail = React.lazy(() => import("./pages/F8CarDetail"));
const Watchlist = React.lazy(() => import("./pages/Watchlist"));
const LandingV2 = React.lazy(() => import("./pages/LandingV2"));
const NotFound = React.lazy(() => import("./pages/NotFound"));
const Ferrari458Report = React.lazy(() => import("./pages/Ferrari458Report"));
const Ferrari488Report = React.lazy(() => import("./pages/Ferrari488Report"));
const FerrariCaliforniaTReport = React.lazy(() => import("./pages/FerrariCaliforniaTReport"));
const FerrariPortofinoReport = React.lazy(() => import("./pages/FerrariPortofinoReport"));
const FerrariRomaReport = React.lazy(() => import("./pages/FerrariRomaReport"));
const Ferrari458CarDetail = React.lazy(() => import("./pages/Ferrari458CarDetail"));
const Ferrari488CarDetail = React.lazy(() => import("./pages/Ferrari488CarDetail"));
const FerrariCaliforniaTCarDetail = React.lazy(() => import("./pages/FerrariCaliforniaTCarDetail"));
const FerrariPortofinoCarDetail = React.lazy(() => import("./pages/FerrariPortofinoCarDetail"));
const FerrariRomaCarDetail = React.lazy(() => import("./pages/FerrariRomaCarDetail"));
const Ferrari812GTSReport = React.lazy(() => import("./pages/Ferrari812GTSReport"));
const Ferrari812GTSCarDetail = React.lazy(() => import("./pages/Ferrari812GTSCarDetail"));
const MarketOverview = React.lazy(() => import("./pages/MarketOverview"));
const AdminLeads = React.lazy(() => import("./pages/AdminLeads"));
const SoldArchive = React.lazy(() => import("./pages/SoldArchive"));
const FinancePage = React.lazy(() => import("./pages/FinancePage"));
const Login = React.lazy(() => import("./pages/Login"));
const DesignPreview = React.lazy(() => import("./pages/DesignPreview"));
// New launch models — LLM-assisted, gated
const Ferrari488PistaReport = React.lazy(() => import("./pages/Ferrari488PistaReport"));
const FerrariSF90Report = React.lazy(() => import("./pages/FerrariSF90Report"));
const LamborghiniHuracanSTOReport = React.lazy(() => import("./pages/LamborghiniHuracanSTOReport"));

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
        <Route path="/" component={LandingV2} />
        <Route path="/landing-v1" component={Landing} />
        <Route path="/812-superfast" component={Home} />
        <Route path="/car/:id" component={CarDetail} />
        <Route path="/research" component={ResearchHub} />
        <Route path="/compare" component={Compare} />
        <Route path="/f8-tributo" component={F8TributoReport} />
        <Route path="/f8/:id" component={F8CarDetail} />
        <Route path="/watchlist" component={Watchlist} />
        <Route path="/home-v2" component={LandingV2} />
        <Route path="/458-italia" component={Ferrari458Report} />
        <Route path="/488-gtb" component={Ferrari488Report} />
        <Route path="/california-t" component={FerrariCaliforniaTReport} />
        <Route path="/portofino" component={FerrariPortofinoReport} />
        <Route path="/roma" component={FerrariRomaReport} />
        <Route path="/458/:id" component={Ferrari458CarDetail} />
        <Route path="/488/:id" component={Ferrari488CarDetail} />
        <Route path="/california-t/:id" component={FerrariCaliforniaTCarDetail} />
        <Route path="/portofino/:id" component={FerrariPortofinoCarDetail} />
        <Route path="/roma/:id" component={FerrariRomaCarDetail} />
        <Route path="/812-gts" component={Ferrari812GTSReport} />
        <Route path="/812-gts/:id" component={Ferrari812GTSCarDetail} />
        <Route path="/market" component={MarketOverview} />
        <Route path="/sold-archive" component={SoldArchive} />
        <Route path="/finance" component={FinancePage} />
        <Route path="/admin">{() => { window.location.replace("/admin/leads"); return null; }}</Route>
        <Route path="/admin/leads" component={AdminLeads} />
        <Route path="/login" component={Login} />
        {/* Design preview */}
        <Route path="/design-preview" component={DesignPreview} />
        {/* New launch models */}
        <Route path="/488-pista" component={Ferrari488PistaReport} />
        <Route path="/sf90-stradale" component={FerrariSF90Report} />
        <Route path="/huracan-sto" component={LamborghiniHuracanSTOReport} />
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
