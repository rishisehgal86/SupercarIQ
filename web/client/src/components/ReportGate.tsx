import React, { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

interface ReportGateProps {
  modelKey: string;
  modelLabel: string;
  heroImageUrl?: string;
  children: React.ReactNode;
}

const STORAGE_KEY = "ferrari_unlocked_reports";

function getUnlockedReports(): string[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
}

function setUnlocked(modelKey: string) {
  const current = getUnlockedReports();
  if (!current.includes(modelKey)) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...current, modelKey]));
  }
}

export default function ReportGate({ modelKey, modelLabel, heroImageUrl, children }: ReportGateProps) {
  const [unlocked, setUnlockedState] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    // Check localStorage on mount
    if (getUnlockedReports().includes(modelKey)) {
      setUnlockedState(true);
    }
  }, [modelKey]);

  const submitMutation = trpc.leads.submit.useMutation({
    onSuccess: () => {
      setUnlocked(modelKey);
      setUnlockedState(true);
      toast.success("Access granted!", { description: `You now have full access to the ${modelLabel} report.` });
    },
    onError: (err) => {
      toast.error("Something went wrong", { description: err.message });
    },
  });

  if (unlocked) {
    return <>{children}</>;
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return;
    setSubmitted(true);
    submitMutation.mutate({ name: name.trim(), email: email.trim(), phone: phone.trim() || undefined, modelKey, modelLabel });
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Hero background */}
      <div className="relative min-h-[55vh] flex items-end overflow-hidden">
        {heroImageUrl ? (
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${heroImageUrl})` }}
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-zinc-900 to-zinc-800" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/75 to-background/30" />
        <div className="absolute inset-0 bg-gradient-to-r from-background/70 to-transparent" />
        <div className="relative container pb-10 pt-28">
          <div className="max-w-2xl">
            <div className="text-xs font-mono tracking-widest text-primary uppercase mb-3">
              Full UK Market Analysis
            </div>
            <h1 className="font-serif text-4xl sm:text-5xl md:text-6xl font-black leading-tight mb-4">
              Ferrari<br />
              <span className="text-primary italic">{modelLabel.replace("Ferrari ", "")}</span>
            </h1>
            <p className="text-base md:text-lg text-foreground/70 max-w-lg font-light">
              A rigorous, data-driven analysis of every {modelLabel} for sale in the UK — scored, ranked, and ready for your decision.
            </p>
          </div>
        </div>
      </div>

      {/* Gate form */}
      <div className="container py-12 md:py-16">
        <div className="max-w-xl mx-auto">
          {/* Lock icon */}
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center shrink-0">
              <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <div>
              <div className="font-semibold text-foreground">This report is gated</div>
              <div className="text-sm text-muted-foreground">Enter your details below to unlock full access — free, no spam.</div>
            </div>
          </div>

          <div className="bg-card border border-border p-6 md:p-8">
            <h2 className="font-serif text-xl font-bold mb-1">Unlock the {modelLabel} Report</h2>
            <p className="text-sm text-muted-foreground mb-6">
              Get instant access to all {modelLabel} listings ranked by our investment scoring model — IIV, price variance, spec analysis, and buyer's guide.
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium tracking-wide uppercase text-muted-foreground mb-1.5">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <Input
                  type="text"
                  placeholder="e.g. James Wilson"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  required
                  className="bg-background"
                />
              </div>
              <div>
                <label className="block text-xs font-medium tracking-wide uppercase text-muted-foreground mb-1.5">
                  Email Address <span className="text-red-500">*</span>
                </label>
                <Input
                  type="email"
                  placeholder="e.g. james@example.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  className="bg-background"
                />
              </div>
              <div>
                <label className="block text-xs font-medium tracking-wide uppercase text-muted-foreground mb-1.5">
                  Phone Number <span className="text-muted-foreground/60 font-normal normal-case">(optional)</span>
                </label>
                <Input
                  type="tel"
                  placeholder="e.g. +44 7700 900000"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  className="bg-background"
                />
              </div>

              <Button
                type="submit"
                className="w-full mt-2"
                disabled={submitMutation.isPending || !name.trim() || !email.trim()}
              >
                {submitMutation.isPending ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Unlocking…
                  </span>
                ) : "Unlock Full Report →"}
              </Button>

              <p className="text-xs text-muted-foreground text-center pt-1">
                Your details are kept private and never shared. One-time access — no subscription required.
              </p>
            </form>
          </div>

          {/* What you get */}
          <div className="mt-8 grid grid-cols-2 gap-3">
            {[
              { icon: "📊", label: "Full rankings", desc: "Every car scored & ranked" },
              { icon: "💰", label: "IIV analysis", desc: "Fair value vs asking price" },
              { icon: "🔍", label: "Spec breakdown", desc: "Options, history, condition" },
              { icon: "📋", label: "Buyer's guide", desc: "What to check & negotiate" },
            ].map(item => (
              <div key={item.label} className="bg-card border border-border p-4">
                <div className="text-xl mb-1">{item.icon}</div>
                <div className="text-sm font-semibold">{item.label}</div>
                <div className="text-xs text-muted-foreground">{item.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
