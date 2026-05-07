import React, { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

/**
 * DealerGate — In-report gating for general dealer listings.
 *
 * Usage:
 *   <DealerGate modelKey="812-superfast" modelLabel="Ferrari 812 Superfast" freeCount={9}>
 *     {(isUnlocked) => (
 *       <>
 *         {cars.map(car => (
 *           <CarCard key={car.id} car={car} gated={!isUnlocked && car.dealerType !== 'ferrari-approved'} />
 *         ))}
 *       </>
 *     )}
 *   </DealerGate>
 *
 * The gate shows a blurred preview of gated content with an email capture form.
 * Once unlocked (via email submission or existing localStorage entry), all content is shown.
 */

const STORAGE_KEY = "ferrari_unlocked_reports";

export function getUnlockedReports(): string[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
}

export function setUnlockedReport(modelKey: string) {
  const current = getUnlockedReports();
  if (!current.includes(modelKey)) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...current, modelKey]));
  }
}

export function isReportUnlocked(modelKey: string): boolean {
  return getUnlockedReports().includes(modelKey);
}

interface DealerGateProps {
  modelKey: string;
  modelLabel: string;
  /** Number of cars shown freely before the gate (Ferrari Approved count, or top 3 if none) */
  freeCount: number;
  /** Total gated cars count (for messaging) */
  gatedCount: number;
  /** Optional callback when the user unlocks the gate */
  onUnlock?: () => void;
  children: (isUnlocked: boolean) => React.ReactNode;
}

export default function DealerGate({ modelKey, modelLabel, freeCount, gatedCount, onUnlock, children }: DealerGateProps) {
  const [unlocked, setUnlockedState] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  useEffect(() => {
    if (isReportUnlocked(modelKey)) {
      setUnlockedState(true);
    }
  }, [modelKey]);

  const submitMutation = trpc.leads.submit.useMutation({
    onSuccess: () => {
      setUnlockedReport(modelKey);
      setUnlockedState(true);
      onUnlock?.();
      toast.success("Access granted!", {
        description: `You now have full access to all ${modelLabel} listings.`,
      });
    },
    onError: (err) => {
      toast.error("Something went wrong", { description: err.message });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return;
    submitMutation.mutate({
      name: name.trim(),
      email: email.trim(),
      phone: phone.trim() || undefined,
      modelKey,
      modelLabel,
    });
  };

  // If unlocked, render children with full access
  if (unlocked) {
    return <>{children(true)}</>;
  }

  return (
    <div className="relative">
      {/* Free content */}
      {children(false)}

      {/* Gate overlay — shown below the free content */}
      {gatedCount > 0 && (
        <div className="mt-6 border border-border bg-card overflow-hidden">
          {/* Blurred preview strip */}
          <div className="relative h-24 overflow-hidden select-none pointer-events-none">
            <div className="absolute inset-0 flex flex-col gap-2 p-3 opacity-30 blur-[3px]">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 h-6">
                  <div className="w-6 h-4 bg-muted-foreground/40 rounded" />
                  <div className="flex-1 h-3 bg-muted-foreground/30 rounded" />
                  <div className="w-20 h-3 bg-muted-foreground/20 rounded" />
                  <div className="w-16 h-3 bg-primary/30 rounded" />
                </div>
              ))}
            </div>
            <div className="absolute inset-0 bg-gradient-to-b from-transparent to-card" />
          </div>

          {/* Gate form */}
          <div className="px-6 pb-8 pt-4">
            <div className="flex items-start gap-4 mb-6">
              <div className="w-10 h-10 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center shrink-0 mt-0.5">
                <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <div>
                <div className="font-semibold text-foreground text-sm">
                  {gatedCount} more {gatedCount === 1 ? "listing" : "listings"} available
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  {freeCount > 0
                    ? `You're seeing the ${freeCount} Ferrari Approved ${freeCount === 1 ? "listing" : "listings"} above for free. Unlock all ${freeCount + gatedCount} listings — free, no spam.`
                    : `Unlock all ${gatedCount} listings — free, no spam.`}
                </div>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium tracking-wide uppercase text-muted-foreground mb-1.5">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <Input
                  type="text"
                  placeholder="James Wilson"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  required
                  className="bg-background h-9 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium tracking-wide uppercase text-muted-foreground mb-1.5">
                  Email <span className="text-red-500">*</span>
                </label>
                <Input
                  type="email"
                  placeholder="james@example.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  className="bg-background h-9 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium tracking-wide uppercase text-muted-foreground mb-1.5">
                  Phone <span className="text-muted-foreground/60 font-normal normal-case">(optional)</span>
                </label>
                <Input
                  type="tel"
                  placeholder="+44 7700 900000"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  className="bg-background h-9 text-sm"
                />
              </div>
              <div className="sm:col-span-3">
                <Button
                  type="submit"
                  className="w-full sm:w-auto px-8"
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
                  ) : `Unlock All ${freeCount + gatedCount} Listings →`}
                </Button>
                <span className="ml-4 text-xs text-muted-foreground">
                  Free access · No subscription · Never shared
                </span>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
