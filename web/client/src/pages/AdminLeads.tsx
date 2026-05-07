import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

const MODEL_LABELS: Record<string, string> = {
  "812-superfast": "812 Superfast",
  "f8-tributo": "F8 Tributo",
  "458-italia": "458 Italia",
  "488-gtb": "488 GTB",
  "812-gts": "812 GTS",
  "california-t": "California T",
  "portofino": "Portofino",
  "roma": "Roma",
};

function formatDate(ts: Date | number | string) {
  return new Date(ts).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDuration(seconds: number | null | undefined) {
  if (!seconds) return "—";
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m ${s}s`;
}

function StatusBadge({ status }: { status: string }) {
  const cls =
    status === "completed"
      ? "bg-emerald-100 text-emerald-700 border-emerald-300"
      : status === "failed"
      ? "bg-red-100 text-red-700 border-red-300"
      : "bg-amber-100 text-amber-700 border-amber-300";
  return (
    <span className={`px-2 py-0.5 text-[10px] font-bold uppercase border rounded-sm ${cls}`}>
      {status}
    </span>
  );
}

// ─── Log Viewer Modal ────────────────────────────────────────────────────────
function LogViewerModal({ logFile, onClose }: { logFile: string; onClose: () => void }) {
  const { data, isLoading } = trpc.pipeline.logTail.useQuery(
    { logFile, lines: 200 },
    { refetchInterval: 5000 }
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-background border border-border rounded-lg shadow-2xl w-full max-w-4xl mx-4 flex flex-col" style={{ maxHeight: '80vh' }}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
          <div>
            <div className="text-sm font-semibold text-foreground">Pipeline Log</div>
            <div className="text-[10px] text-muted-foreground font-mono mt-0.5 truncate max-w-[500px]">{logFile.split('/').pop()}</div>
          </div>
          <div className="flex items-center gap-3">
            {data && (
              <span className="text-[10px] text-muted-foreground">
                {data.exists ? `${data.totalLines} lines total, showing last ${data.lines.length}` : 'File not found'}
              </span>
            )}
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground text-lg leading-none">&times;</button>
          </div>
        </div>
        {/* Log content */}
        <div className="overflow-auto flex-1 p-4 font-mono text-[11px] leading-relaxed bg-zinc-950 text-zinc-200 rounded-b-lg">
          {isLoading && <div className="text-zinc-400">Loading...</div>}
          {data && !data.exists && <div className="text-zinc-400">Log file not found yet — the run may still be starting.</div>}
          {data?.lines.map((line, i) => {
            const isError = /\[ERROR\]|ERROR|Traceback|Exception/.test(line);
            const isWarn = /\[WARNING\]|WARNING/.test(line);
            const isInfo = /\[INFO\]/.test(line);
            return (
              <div
                key={i}
                className={`whitespace-pre-wrap break-all ${
                  isError ? 'text-red-400' : isWarn ? 'text-amber-400' : isInfo ? 'text-zinc-300' : 'text-zinc-400'
                }`}
              >
                {line}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Pipeline Status Panel ────────────────────────────────────────────────────
function PipelineStatusPanel({ isAdmin }: { isAdmin: boolean }) {
  const { data, isLoading, refetch } = trpc.pipeline.status.useQuery(undefined, {
    enabled: isAdmin,
    refetchInterval: 30_000, // auto-refresh every 30s
  });

  const [runPhase, setRunPhase] = useState<'all' | '1' | '2' | '3'>('all');
  const [dryRun, setDryRun] = useState(false);
  const [lastTriggered, setLastTriggered] = useState<{ pid: number | null; logFile: string; startedAt: string | Date; dryRun: boolean } | null>(null);
  const [viewingLog, setViewingLog] = useState<string | null>(null);

  const triggerMutation = trpc.pipeline.triggerRun.useMutation({
    onSuccess: (result) => {
      setLastTriggered({ pid: result.pid, logFile: result.logFile, startedAt: result.startedAt, dryRun: result.dryRun });
      setTimeout(() => refetch(), 3000);
    },
  });

  const lastRun = data?.runs?.[0];
  const lastSuccess = data?.runs?.find((r) => r.status === "completed");

  return (
    <>
      {viewingLog && <LogViewerModal logFile={viewingLog} onClose={() => setViewingLog(null)} />}
    <div className="bg-card border border-border">
      {/* Panel header */}
      <div className="px-6 py-4 border-b border-border">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="text-xs text-muted-foreground tracking-widest uppercase mb-0.5">Scraping Pipeline</div>
            <h2 className="font-serif text-lg font-bold">Pipeline Status</h2>
          </div>
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isLoading}>
            {isLoading ? (
              <span className="flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Refreshing…
              </span>
            ) : "Refresh"}
          </Button>
        </div>

        {/* Trigger Run controls */}
        <div className="flex flex-wrap items-center gap-3 p-3 bg-muted/30 border border-border rounded-sm">
          <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide shrink-0">Trigger Run</div>
          <select
            value={runPhase}
            onChange={e => setRunPhase(e.target.value as 'all' | '1' | '2' | '3')}
            className="h-8 px-2 text-xs bg-background border border-input rounded-sm focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="all">All phases</option>
            <option value="1">Phase 1 — Discovery only</option>
            <option value="2">Phase 2 — Enrich only</option>
            <option value="3">Phase 3 — LLM Content + Market Stats</option>
          </select>
          <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer select-none">
            <input
              type="checkbox"
              checked={dryRun}
              onChange={e => setDryRun(e.target.checked)}
              className="w-3.5 h-3.5 accent-primary"
            />
            Dry run
          </label>
          <Button
            size="sm"
            onClick={() => triggerMutation.mutate({ phase: runPhase, dryRun })}
            disabled={triggerMutation.isPending}
            className="ml-auto"
          >
            {triggerMutation.isPending ? (
              <span className="flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Starting…
              </span>
            ) : (
              <span className="flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Run Pipeline
              </span>
            )}
          </Button>
          {triggerMutation.isError && (
            <span className="text-xs text-red-600 font-mono w-full mt-1">
              Error: {triggerMutation.error?.message}
            </span>
          )}
        </div>

        {/* Last triggered feedback */}
        {lastTriggered && (
          <div className="mt-2 px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-sm text-xs text-emerald-700">
            ✓ Pipeline started at {new Date(lastTriggered.startedAt).toLocaleTimeString("en-GB")}
            {lastTriggered.pid && <span className="ml-2 text-emerald-600">(PID {lastTriggered.pid})</span>}
            {lastTriggered.dryRun && <span className="ml-2 font-bold">[DRY RUN]</span>}
            <span className="ml-2 text-emerald-600 font-mono">{lastTriggered.logFile.split('/').pop()}</span>
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="px-6 py-8 text-sm text-muted-foreground text-center">
          Loading pipeline status…
        </div>
      ) : !data ? (
        <div className="px-6 py-8 text-sm text-muted-foreground text-center">
          No pipeline data available.
        </div>
      ) : (
        <>
          {/* Summary stat cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-border border-b border-border">
            <div className="bg-card px-5 py-4">
              <div className="text-xs text-muted-foreground tracking-widest uppercase mb-1">
                Active Listings
              </div>
              <div className="font-serif text-2xl font-bold text-primary">
                {data.activeListings}
              </div>
            </div>
            <div className="bg-card px-5 py-4">
              <div className="text-xs text-muted-foreground tracking-widest uppercase mb-1">
                Unenriched Queue
              </div>
              <div className={`font-serif text-2xl font-bold ${data.queueDepth > 0 ? "text-amber-600" : "text-emerald-600"}`}>
                {data.queueDepth}
              </div>
            </div>
            <div className="bg-card px-5 py-4">
              <div className="text-xs text-muted-foreground tracking-widest uppercase mb-1">
                Pending Sold
              </div>
              <div className="font-serif text-2xl font-bold text-foreground">
                {data.pendingSoldListings}
              </div>
            </div>
            <div className="bg-card px-5 py-4">
              <div className="text-xs text-muted-foreground tracking-widest uppercase mb-1">
                Last Successful Run
              </div>
              <div className="font-serif text-sm font-bold text-foreground leading-tight mt-1">
                {lastSuccess
                  ? formatDate(lastSuccess.completedAt ?? lastSuccess.startedAt)
                  : "Never"}
              </div>
            </div>
          </div>

          {/* Last run summary */}
          {lastRun && (
            <div className="px-6 py-4 border-b border-border bg-muted/20">
              <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground text-xs uppercase tracking-wide">Last Run</span>
                  <StatusBadge status={lastRun.status} />
                </div>
                <span className="text-muted-foreground">
                  Started: <span className="text-foreground">{formatDate(lastRun.startedAt)}</span>
                </span>
                <span className="text-muted-foreground">
                  Duration: <span className="text-foreground">{formatDuration(lastRun.durationSeconds)}</span>
                </span>
                <span className="text-muted-foreground">
                  New listings: <span className="text-foreground font-medium">{lastRun.newListingsFound}</span>
                </span>
                <span className="text-muted-foreground">
                  Enriched: <span className="text-foreground font-medium">{lastRun.listingsEnriched}</span>
                </span>
                <span className="text-muted-foreground">
                  Marked sold: <span className="text-foreground font-medium">{lastRun.listingsMarkedSold}</span>
                </span>
                {lastRun.errorMessage && (
                  <span className="text-red-600 text-xs font-mono">
                    Error: {lastRun.errorMessage.slice(0, 120)}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Run history table */}
          {data.runs.length > 0 && (
            <div className="overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[160px]">Started</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">New</TableHead>
                    <TableHead className="text-right">Enriched</TableHead>
                    <TableHead className="text-right">Sold</TableHead>
                    <TableHead className="text-right">Queue</TableHead>
                    <TableHead className="text-right">Duration</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.runs.map((run) => {
                    // Use stored log file path if available, otherwise reconstruct from timestamp
                    const logTimestamp = new Date(run.startedAt)
                      .toISOString()
                      .replace(/[:.]/g, '-')
                      .replace('Z', '');
                    const logFile = (run as any).logFilePath ||
                      (run.runType === 'manual'
                        ? `/tmp/smart_pipeline_admin_${logTimestamp}.log`
                        : `/tmp/smart_pipeline_cron_${logTimestamp}.log`);
                    return (
                    <TableRow key={run.id} className={run.status === "failed" ? "bg-red-50/30" : ""}>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {formatDate(run.startedAt)}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={run.status} />
                      </TableCell>
                      <TableCell className="text-right text-sm">
                        {run.newListingsFound > 0 ? (
                          <span className="text-emerald-600 font-medium">+{run.newListingsFound}</span>
                        ) : (
                          <span className="text-muted-foreground">0</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right text-sm">
                        {run.listingsEnriched > 0 ? (
                          <span className="font-medium">{run.listingsEnriched}</span>
                        ) : (
                          <span className="text-muted-foreground">0</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right text-sm text-muted-foreground">
                        {run.listingsMarkedSold}
                      </TableCell>
                      <TableCell className="text-right text-sm text-muted-foreground">
                        {run.queueDepth}
                      </TableCell>
                      <TableCell className="text-right text-xs text-muted-foreground whitespace-nowrap">
                        {formatDuration(run.durationSeconds)}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {run.runType}
                      </TableCell>
                      <TableCell>
                        <button
                          onClick={() => setViewingLog(logFile)}
                          className="text-[10px] text-primary hover:underline whitespace-nowrap"
                        >
                          View Log
                        </button>
                      </TableCell>
                    </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}

          {data.runs.length === 0 && (
            <div className="px-6 py-8 text-sm text-muted-foreground text-center border-t border-dashed border-border">
              No pipeline runs recorded yet. The pipeline logs runs here automatically once it starts.
            </div>
          )}
        </>
      )}
    </div>
    </>
  );
}

// ─── Model Config Panel ──────────────────────────────────────────
const VERDICT_OPTIONS = [
  { value: "strong-buy", label: "Strong Buy" },
  { value: "buy", label: "Buy" },
  { value: "consider", label: "Consider" },
  { value: "avoid", label: "Avoid" },
];

const VERDICT_COLORS: Record<string, string> = {
  "strong-buy": "bg-emerald-100 text-emerald-700 border-emerald-300",
  "buy": "bg-blue-100 text-blue-700 border-blue-300",
  "consider": "bg-amber-100 text-amber-700 border-amber-300",
  "avoid": "bg-red-100 text-red-700 border-red-300",
};

type ModelConfigRow = {
  modelKey: string;
  make: string;
  model: string;
  yearMin: number;
  yearMax: number;
  engineSpec?: string | null;
  heroImageUrl?: string | null;
  investmentVerdict?: string | null;
  isPublic?: boolean | null;
  isActive?: boolean | null;
  sortOrder?: number | null;
};

function ModelConfigCard({
  config,
  onSaved,
}: {
  config: ModelConfigRow;
  onSaved: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [heroImageUrl, setHeroImageUrl] = useState(config.heroImageUrl ?? "");
  const [investmentVerdict, setInvestmentVerdict] = useState(config.investmentVerdict ?? "consider");
  const [isPublic, setIsPublic] = useState(config.isPublic ?? false);
  const [isActive, setIsActive] = useState(config.isActive ?? true);
  const [sortOrder, setSortOrder] = useState(String(config.sortOrder ?? 0));
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  const upsert = trpc.models.upsert.useMutation({
    onSuccess: () => {
      setSaving(false);
      setEditing(false);
      setSaveError("");
      onSaved();
    },
    onError: (err) => {
      setSaving(false);
      setSaveError(err.message);
    },
  });

  const handleSave = () => {
    setSaving(true);
    setSaveError("");
    upsert.mutate({
      modelKey: config.modelKey,
      make: config.make,
      model: config.model,
      yearMin: config.yearMin,
      yearMax: config.yearMax,
      heroImageUrl: heroImageUrl || undefined,
      investmentVerdict,
      isPublic,
      isActive,
      sortOrder: parseInt(sortOrder, 10) || 0,
    });
  };

  const handleCancel = () => {
    setHeroImageUrl(config.heroImageUrl ?? "");
    setInvestmentVerdict(config.investmentVerdict ?? "consider");
    setIsPublic(config.isPublic ?? false);
    setIsActive(config.isActive ?? true);
    setSortOrder(String(config.sortOrder ?? 0));
    setEditing(false);
    setSaveError("");
  };

  const verdictCls = VERDICT_COLORS[investmentVerdict] ?? VERDICT_COLORS["consider"];

  return (
    <div className="bg-card border border-border overflow-hidden">
      {/* Hero image preview */}
      <div className="relative h-32 bg-muted overflow-hidden">
        {heroImageUrl ? (
          <img
            src={heroImageUrl}
            alt={`${config.make} ${config.model}`}
            className="w-full h-full object-cover"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground/30">
            <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
        )}
        {/* Badges overlay */}
        <div className="absolute top-2 left-2 flex gap-1.5 flex-wrap">
          {!isActive && (
            <span className="px-1.5 py-0.5 text-[9px] font-bold uppercase bg-zinc-800/80 text-zinc-200 rounded-sm">Inactive</span>
          )}
          {!isPublic && (
            <span className="px-1.5 py-0.5 text-[9px] font-bold uppercase bg-amber-700/80 text-amber-100 rounded-sm">Gated</span>
          )}
        </div>
        <div className="absolute top-2 right-2">
          <span className={`px-1.5 py-0.5 text-[9px] font-bold uppercase border rounded-sm ${verdictCls}`}>
            {investmentVerdict?.replace("-", " ") ?? "—"}
          </span>
        </div>
      </div>

      {/* Card body */}
      <div className="p-4 space-y-3">
        <div>
          <div className="font-serif font-bold text-sm text-foreground">{config.make} {config.model}</div>
          <div className="text-xs text-muted-foreground font-mono">{config.modelKey}</div>
          <div className="text-xs text-muted-foreground mt-0.5">{config.yearMin}–{config.yearMax}</div>
        </div>

        {editing ? (
          <div className="space-y-3">
            {/* Hero Image URL */}
            <div>
              <label className="block text-[10px] text-muted-foreground uppercase tracking-wide mb-1">Hero Image URL</label>
              <Input
                value={heroImageUrl}
                onChange={(e) => setHeroImageUrl(e.target.value)}
                placeholder="https://cdn.example.com/image.jpg"
                className="text-xs h-7"
              />
            </div>

            {/* Verdict */}
            <div>
              <label className="block text-[10px] text-muted-foreground uppercase tracking-wide mb-1">Investment Verdict</label>
              <select
                value={investmentVerdict}
                onChange={(e) => setInvestmentVerdict(e.target.value)}
                className="w-full h-7 px-2 text-xs bg-background border border-input rounded-sm focus:outline-none focus:ring-1 focus:ring-primary"
              >
                {VERDICT_OPTIONS.map((v) => (
                  <option key={v.value} value={v.value}>{v.label}</option>
                ))}
              </select>
            </div>

            {/* Sort Order */}
            <div>
              <label className="block text-[10px] text-muted-foreground uppercase tracking-wide mb-1">Sort Order</label>
              <Input
                type="number"
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
                className="text-xs h-7 w-20"
              />
            </div>

            {/* Toggles */}
            <div className="flex gap-4">
              <label className="flex items-center gap-2 text-xs cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={isPublic}
                  onChange={(e) => setIsPublic(e.target.checked)}
                  className="w-3.5 h-3.5 accent-primary"
                />
                <span className="text-foreground">Public (ungated)</span>
              </label>
              <label className="flex items-center gap-2 text-xs cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="w-3.5 h-3.5 accent-primary"
                />
                <span className="text-foreground">Active</span>
              </label>
            </div>

            {saveError && (
              <p className="text-xs text-red-600">{saveError}</p>
            )}

            <div className="flex gap-2">
              <Button size="sm" onClick={handleSave} disabled={saving} className="flex-1">
                {saving ? "Saving…" : "Save"}
              </Button>
              <Button size="sm" variant="outline" onClick={handleCancel} disabled={saving}>
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <Button
            size="sm"
            variant="outline"
            className="w-full text-xs"
            onClick={() => setEditing(true)}
          >
            Edit Config
          </Button>
        )}
      </div>
    </div>
  );
}

function ModelConfigPanel() {
  const { data: models, isLoading, refetch } = trpc.models.all.useQuery();

  if (isLoading) {
    return (
      <div className="py-12 text-center text-sm text-muted-foreground">Loading model configs…</div>
    );
  }

  if (!models || models.length === 0) {
    return (
      <div className="py-12 text-center border border-dashed border-border rounded">
        <p className="text-sm text-muted-foreground">No model configs found.</p>
        <p className="text-xs text-muted-foreground mt-1">Run the pipeline to seed model configs, or add them manually via SQL.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-serif text-lg font-bold">Model Configuration</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            {models.length} model{models.length !== 1 ? "s" : ""} · Edit hero images, verdicts, gating, and sort order
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {models.map((m) => (
          <ModelConfigCard
            key={m.modelKey}
            config={{
              modelKey: m.modelKey,
              make: m.make,
              model: m.model,
              yearMin: m.yearMin,
              yearMax: m.yearMax,
              engineSpec: m.engineSpec,
              heroImageUrl: m.heroImageUrl,
              investmentVerdict: m.investmentVerdict,
              isPublic: m.isPublic,
              isActive: m.isActive,
              sortOrder: m.sortOrder,
            }}
            onSaved={() => refetch()}
          />
        ))}
      </div>
    </div>
  );
}

// ─── Main Admin Page ──────────────────────────────────────────────
export default function AdminLeads() {
  const { user, loading } = useAuth();
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<"leads" | "pipeline" | "models">("leads");

  const { data: leads, isLoading } = trpc.leads.adminList.useQuery(undefined, {
    enabled: !!user && user.role === "admin",
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-muted-foreground text-sm">Loading…</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <p className="text-muted-foreground">You must be logged in to view this page.</p>
          <Button onClick={() => (window.location.href = `/login?returnTo=${encodeURIComponent(window.location.pathname)}`)}>
            Sign In
          </Button>
        </div>
      </div>
    );
  }

  if (user.role !== "admin") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Access denied. Admin only.</p>
      </div>
    );
  }

  const filtered = (leads ?? []).filter((l) => {
    const q = search.toLowerCase();
    return (
      l.name.toLowerCase().includes(q) ||
      l.email.toLowerCase().includes(q) ||
      (l.phone ?? "").toLowerCase().includes(q) ||
      l.modelKey.toLowerCase().includes(q) ||
      l.modelLabel.toLowerCase().includes(q)
    );
  });

  // Group by model for summary
  const byModel: Record<string, number> = {};
  (leads ?? []).forEach((l) => {
    byModel[l.modelKey] = (byModel[l.modelKey] ?? 0) + 1;
  });

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <div className="border-b border-border bg-card">
        <div className="container py-6 flex items-center justify-between gap-4 flex-wrap">
          <div>
            <div className="text-xs text-muted-foreground tracking-widest uppercase mb-1">Admin</div>
            <h1 className="font-serif text-2xl font-bold">SupercarIQ Admin</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {leads?.length ?? 0} total lead{leads?.length !== 1 ? "s" : ""} · Pipeline monitoring
            </p>
          </div>
          {activeTab === "leads" && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (!leads) return;
                const csv = [
                  ["Name", "Email", "Phone", "Model", "Source", "Date"].join(","),
                  ...leads.map((l) =>
                    [
                      `"${l.name}"`,
                      `"${l.email}"`,
                      `"${l.phone ?? ""}"`,
                      `"${l.modelLabel}"`,
                      `"${l.source ?? ""}"`,
                      `"${formatDate(l.createdAt as Date | number | string)}"`,
                    ].join(",")
                  ),
                ].join("\n");
                const blob = new Blob([csv], { type: "text/csv" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `supercariq-leads-${new Date().toISOString().slice(0, 10)}.csv`;
                a.click();
                URL.revokeObjectURL(url);
              }}
            >
              Export CSV
            </Button>
          )}
        </div>

        {/* Tab bar */}
        <div className="container">
          <div className="flex gap-0 border-t border-border -mb-px">
            <button
              onClick={() => setActiveTab("leads")}
              className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === "leads"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              Report Leads
              {leads && leads.length > 0 && (
                <span className="ml-2 px-1.5 py-0.5 text-[10px] bg-primary/10 text-primary rounded-full font-bold">
                  {leads.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab("pipeline")}
              className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === "pipeline"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              Pipeline Status
            </button>
            <button
              onClick={() => setActiveTab("models")}
              className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === "models"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              Model Config
            </button>
          </div>
        </div>
      </div>

      <div className="container py-8 space-y-8">
        {/* ── Leads Tab ── */}
        {activeTab === "leads" && (
          <>
            {/* Summary cards */}
            {leads && leads.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-8 gap-3">
                {Object.entries(byModel)
                  .sort((a, b) => b[1] - a[1])
                  .map(([key, count]) => (
                    <div key={key} className="bg-card border border-border p-3 text-center">
                      <div className="text-2xl font-bold font-serif text-primary">{count}</div>
                      <div className="text-xs text-muted-foreground mt-1 truncate">
                        {MODEL_LABELS[key] ?? key}
                      </div>
                    </div>
                  ))}
              </div>
            )}

            {/* Search */}
            <div className="flex items-center gap-3">
              <Input
                placeholder="Search by name, email, phone, or model…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="max-w-md"
              />
              {search && (
                <Button variant="ghost" size="sm" onClick={() => setSearch("")}>
                  Clear
                </Button>
              )}
            </div>

            {/* Table */}
            {isLoading ? (
              <div className="text-sm text-muted-foreground py-8 text-center">Loading leads…</div>
            ) : filtered.length === 0 ? (
              <div className="text-sm text-muted-foreground py-8 text-center border border-dashed border-border rounded">
                {search ? "No leads match your search." : "No leads captured yet."}
              </div>
            ) : (
              <div className="border border-border overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[180px]">Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Report</TableHead>
                      <TableHead>Source</TableHead>
                      <TableHead className="text-right">Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((lead) => (
                      <TableRow key={lead.id}>
                        <TableCell className="font-medium">{lead.name}</TableCell>
                        <TableCell>
                          <a
                            href={`mailto:${lead.email}`}
                            className="text-primary hover:underline"
                          >
                            {lead.email}
                          </a>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {lead.phone ? (
                            <a href={`tel:${lead.phone}`} className="hover:text-foreground transition-colors">
                              {lead.phone}
                            </a>
                          ) : (
                            <span className="text-muted-foreground/40">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="font-normal">
                            {MODEL_LABELS[lead.modelKey] ?? lead.modelLabel}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-xs">
                          {lead.source ?? "report-gate"}
                        </TableCell>
                        <TableCell className="text-right text-xs text-muted-foreground whitespace-nowrap">
                          {formatDate(lead.createdAt as Date | number | string)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </>
        )}

        {/* ── Pipeline Tab ── */}
        {activeTab === "pipeline" && (
          <PipelineStatusPanel isAdmin={user.role === "admin"} />
        )}

        {/* ── Model Config Tab ── */}
        {activeTab === "models" && (
          <ModelConfigPanel />
        )}
      </div>
    </div>
  );
}
