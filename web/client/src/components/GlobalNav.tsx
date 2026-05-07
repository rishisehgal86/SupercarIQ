import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { ChevronDown, ChevronRight, Menu, X, TrendingUp } from "lucide-react";

// ─── Site-wide model links ─────────────────────────────────────────────────
const PRIMARY_MODELS = [
  { href: "/812-superfast", label: "812 Superfast", live: true },
  { href: "/812-gts", label: "812 GTS", live: true },
  { href: "/f8-tributo", label: "F8 Tributo", live: true },
  { href: "/458-italia", label: "458 Italia", live: true },
];

const NEW_MODELS = [
  { href: "/488-pista", label: "488 Pista", live: true },
  { href: "/sf90-stradale", label: "SF90 Stradale", live: true },
  { href: "/huracan-sto", label: "Hurac\u00e1n STO", live: true },
];

const MORE_MODELS = [
  { href: "/488-gtb", label: "488 GTB / Spider", live: true },
  { href: "/california-t", label: "California T", live: true },
  { href: "/portofino", label: "Portofino / M", live: true },
  { href: "/roma", label: "Roma / Spider", live: true },
];

const ALL_MODELS = [...PRIMARY_MODELS, ...NEW_MODELS, ...MORE_MODELS];

// ─── Report page section anchors ──────────────────────────────────────────
export const REPORT_SECTIONS = [
  { id: "overview", label: "Overview" },
  { id: "framework", label: "Methodology" },
  { id: "rankings", label: "Market Analysis" },
  { id: "guide", label: "Buyer's Guide" },
  { id: "predictions", label: "Predictions" },
  { id: "sentiment", label: "Influencer Pulse" },
  { id: "verdict", label: "The Verdict" },
];

// ─── Props ─────────────────────────────────────────────────────────────────
interface GlobalNavProps {
  /** If provided, renders the secondary section-anchor bar for report pages */
  reportTitle?: string;
  /** Override the section list (defaults to REPORT_SECTIONS) */
  sections?: { id: string; label: string }[];
}

// ─── Tier 1: Site-wide top bar ─────────────────────────────────────────────
function TopBar({ menuOpen, setMenuOpen }: { menuOpen: boolean; setMenuOpen: (v: boolean) => void }) {
  const [location] = useLocation();
  const [moreOpen, setMoreOpen] = useState(false);

  const isActive = (href: string) => location === href || location.startsWith(href + "/");

  return (
    <div className="h-14 flex items-center justify-between px-4 md:px-6 max-w-[1400px] mx-auto w-full">
      {/* Logo */}
      <Link href="/" className="flex items-center gap-3 shrink-0 group">
        <div className="flex items-center gap-0">
          <div className="w-1 h-8 bg-primary" />
          <div className="w-1 h-5 bg-primary/40 ml-0.5" />
        </div>
        <div className="flex flex-col">
          <span className="font-serif font-black text-base leading-none tracking-tight text-foreground group-hover:text-primary transition-colors">
            SupercarIQ
          </span>
          <span className="text-[9px] font-mono tracking-widest uppercase text-muted-foreground leading-none mt-0.5">UK Investment Intelligence</span>
        </div>
      </Link>

      {/* Desktop centre nav */}
      <div className="hidden md:flex items-center gap-0.5">
        {PRIMARY_MODELS.map((m) => (
          <Link
            key={m.href}
            href={m.href}
            className={`px-3 py-1.5 text-xs font-medium tracking-wide transition-colors ${
              isActive(m.href)
                ? "text-primary border-b-2 border-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {m.label}
          </Link>
        ))}

        {/* New models dropdown */}
        <div
          className="relative"
          onMouseEnter={() => setMoreOpen(true)}
          onMouseLeave={() => setMoreOpen(false)}
        >
          <button
            className={`px-3 py-1.5 text-xs font-medium tracking-wide transition-colors flex items-center gap-1 ${
              NEW_MODELS.some((m) => isActive(m.href))
                ? "text-primary border-b-2 border-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            New
            <span className="ml-0.5 text-[8px] font-bold tracking-widest uppercase text-emerald-700 bg-emerald-50 border border-emerald-200 px-1 py-0.5">3</span>
            <ChevronDown size={11} className={`transition-transform ${moreOpen ? "rotate-180" : ""}`} />
          </button>
          {moreOpen && (
            <div className="absolute top-full left-0 mt-0 w-56 bg-background border border-border shadow-xl z-50">
              {NEW_MODELS.map((m) => (
                <Link
                  key={m.href}
                  href={m.href}
                  className={`flex items-center justify-between px-4 py-2.5 text-xs transition-colors border-b border-border/40 last:border-0 ${
                    isActive(m.href)
                      ? "text-primary bg-primary/5 font-medium"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
                  }`}
                >
                  <span>{m.label}</span>
                  <span className="text-[9px] font-bold tracking-widest uppercase text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5">Live</span>
                </Link>
              ))}
              <div className="border-t border-border/40 mt-0">
                <div className="px-4 py-1.5 text-[9px] font-bold tracking-widest uppercase text-muted-foreground">Coming Soon</div>
                {MORE_MODELS.map((m) => (
                  <Link
                    key={m.href}
                    href={m.href}
                    className="flex items-center justify-between px-4 py-2.5 text-xs transition-colors border-b border-border/40 last:border-0 text-muted-foreground hover:text-foreground hover:bg-muted/40"
                  >
                    <span>{m.label}</span>
                    <span className="text-[9px] font-bold tracking-widest uppercase text-amber-600 bg-amber-50 border border-amber-200 px-1.5 py-0.5">Soon</span>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="w-px h-4 bg-border mx-1" />

        <Link
          href="/research"
          className={`px-3 py-1.5 text-xs font-medium tracking-wide transition-colors ${
            isActive("/research")
              ? "text-primary border-b-2 border-primary"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          All Models
        </Link>
        <Link
          href="/compare"
          className={`px-3 py-1.5 text-xs font-medium tracking-wide transition-colors ${
            isActive("/compare")
              ? "text-primary border-b-2 border-primary"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Compare
        </Link>
        <Link
          href="/watchlist"
          className={`px-3 py-1.5 text-xs font-medium tracking-wide transition-colors ${
            isActive("/watchlist")
              ? "text-primary border-b-2 border-primary"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Watchlist
        </Link>
        <div className="w-px h-4 bg-border mx-1" />
        <Link
          href="/market"
          className={`px-3 py-1.5 text-xs font-medium tracking-wide transition-colors ${
            isActive("/market")
              ? "text-primary border-b-2 border-primary"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Market
        </Link>
        <Link
          href="/sold-archive"
          className={`px-3 py-1.5 text-xs font-medium tracking-wide transition-colors ${
            isActive("/sold-archive")
              ? "text-primary border-b-2 border-primary"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Sold Archive
        </Link>
        <div className="w-px h-4 bg-border mx-1" />
        <Link
          href="/finance"
          className={`px-3 py-1.5 text-xs font-semibold tracking-wide transition-colors border ${
            isActive("/finance")
              ? "border-primary bg-primary/10 text-primary"
              : "border-border text-muted-foreground hover:border-primary/50 hover:text-foreground"
          }`}
        >
          Finance Calculator
        </Link>
      </div>

      {/* Desktop CTA */}
      <div className="hidden md:flex items-center gap-2">
        <Link
          href="/research"
          className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors"
        >
          All Reports <ChevronRight size={12} />
        </Link>
      </div>

      {/* Mobile hamburger */}
      <button
        className="md:hidden p-2 text-muted-foreground hover:text-foreground transition-colors"
        onClick={() => setMenuOpen(!menuOpen)}
        aria-label="Toggle menu"
      >
        {menuOpen ? <X size={18} /> : <Menu size={18} />}
      </button>
    </div>
  );
}

// ─── Tier 2: Report section anchors ───────────────────────────────────────
function SectionBar({
  reportTitle,
  sections,
}: {
  reportTitle: string;
  sections: { id: string; label: string }[];
}) {
  const [activeSection, setActiveSection] = useState("overview");
  const [scrollPct, setScrollPct] = useState(0);

  useEffect(() => {
    const onScroll = () => {
      const docH = document.documentElement.scrollHeight - window.innerHeight;
      setScrollPct(docH > 0 ? Math.min(100, (window.scrollY / docH) * 100) : 0);
      const els = sections
        .map((s) => document.getElementById(s.id))
        .filter(Boolean) as HTMLElement[];
      let current = sections[0]?.id ?? "";
      for (const el of els) {
        if (window.scrollY >= el.offsetTop - 130) current = el.id;
      }
      setActiveSection(current);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [sections]);

  return (
    <div className="relative border-t border-border/60 bg-background/95">
      {/* Scroll progress */}
      <div
        className="absolute bottom-0 left-0 h-[2px] bg-primary transition-all duration-100"
        style={{ width: `${scrollPct}%` }}
      />
      <div className="max-w-[1400px] mx-auto px-4 md:px-6 flex items-center gap-0 h-10 overflow-x-auto scrollbar-none">
        {/* Model label */}
        <span className="text-[10px] font-bold tracking-widest uppercase text-primary/70 shrink-0 mr-3 font-mono">
          {reportTitle}
        </span>
        <div className="w-px h-3.5 bg-border shrink-0 mr-3" />
        {sections.map((s) => (
          <a
            key={s.id}
            href={`#${s.id}`}
            className={`px-2.5 py-1 text-[11px] font-medium tracking-wide whitespace-nowrap transition-colors shrink-0 ${
              activeSection === s.id
                ? "text-primary border-b-2 border-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {s.label}
          </a>
        ))}
      </div>
    </div>
  );
}

// ─── Mobile drawer ─────────────────────────────────────────────────────────
function MobileDrawer({
  open,
  onClose,
  reportTitle,
  sections,
}: {
  open: boolean;
  onClose: () => void;
  reportTitle?: string;
  sections?: { id: string; label: string }[];
}) {
  const [location] = useLocation();
  if (!open) return null;

  return (
    <div className="md:hidden border-t border-border bg-background pb-2 shadow-lg">
      {/* Model links */}
      <div className="px-4 pt-3 pb-1">
        <div className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground mb-2">Models</div>
        {ALL_MODELS.map((m) => (
          <Link
            key={m.href}
            href={m.href}
            onClick={onClose}
            className={`flex items-center justify-between py-2.5 text-sm border-b border-border/40 last:border-0 transition-colors ${
              location === m.href || location.startsWith(m.href + "/")
                ? "text-primary font-medium"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <span>{m.label}</span>
            {m.live ? (
              (location === m.href || location.startsWith(m.href + "/")) && (
                <span className="w-1.5 h-1.5 rounded-full bg-primary" />
              )
            ) : (
              <span className="text-[9px] font-bold tracking-widest uppercase text-amber-600 bg-amber-50 border border-amber-200 px-1.5 py-0.5">
                Soon
              </span>
            )}
          </Link>
        ))}
      </div>

      {/* Tools */}
      <div className="px-4 pt-3 pb-1 border-t border-border/60">
        <div className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground mb-2">Tools</div>
        {[
          { href: "/research", label: "All Models" },
          { href: "/compare", label: "Compare Cars" },
          { href: "/watchlist", label: "My Watchlist" },
          { href: "/market", label: "Market Overview" },
          { href: "/sold-archive", label: "Sold Archive" },
          { href: "/finance", label: "Finance Calculator" },
        ].map((item) => (
          <Link
            key={item.href}
            href={item.href}
            onClick={onClose}
            className="flex items-center py-2.5 text-sm text-muted-foreground hover:text-foreground border-b border-border/40 last:border-0 transition-colors"
          >
            {item.label}
          </Link>
        ))}
      </div>

      {/* Section anchors (report pages only) */}
      {reportTitle && sections && sections.length > 0 && (
        <div className="px-4 pt-3 pb-1 border-t border-border/60">
          <div className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground mb-2">
            {reportTitle} — Sections
          </div>
          {sections.map((s) => (
            <a
              key={s.id}
              href={`#${s.id}`}
              onClick={onClose}
              className="flex items-center py-2.5 text-sm text-muted-foreground hover:text-primary border-b border-border/40 last:border-0 transition-colors"
            >
              {s.label}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main export ───────────────────────────────────────────────────────────
export function GlobalNav({ reportTitle, sections = REPORT_SECTIONS }: GlobalNavProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  // Close mobile menu on route change
  const [location] = useLocation();
  useEffect(() => {
    setMenuOpen(false);
  }, [location]);

  return (
    <header className="sticky top-0 z-50 bg-background/98 backdrop-blur-sm border-b border-border" style={{ boxShadow: '0 1px 0 0 oklch(0.87 0.010 75), 0 2px 12px oklch(0.13 0.008 60 / 0.04)' }}>
      <TopBar menuOpen={menuOpen} setMenuOpen={setMenuOpen} />
      {reportTitle && <SectionBar reportTitle={reportTitle} sections={sections} />}
      <MobileDrawer
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        reportTitle={reportTitle}
        sections={reportTitle ? sections : undefined}
      />
    </header>
  );
}

export default GlobalNav;
