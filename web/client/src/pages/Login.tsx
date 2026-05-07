import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";

type Mode = "login" | "register";

export default function Login() {
  const [, navigate] = useLocation();
  const [mode, setMode] = useState<Mode>("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const meQuery = trpc.auth.me.useQuery(undefined, { retry: false, refetchOnWindowFocus: false });
  const utils = trpc.useUtils();

  const returnTo = (() => {
    if (typeof window === "undefined") return "/";
    const params = new URLSearchParams(window.location.search);
    return params.get("returnTo") ?? "/";
  })();

  useEffect(() => {
    if (meQuery.data) navigate(returnTo);
  }, [meQuery.data, navigate, returnTo]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const endpoint = mode === "login" ? "/api/auth/login" : "/api/auth/register";
      const body = mode === "login" ? { email, password } : { name, email, password };
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
        setError(data.error ?? (mode === "login" ? "Login failed." : "Registration failed."));
        return;
      }
      await utils.auth.me.invalidate();
      window.location.href = returnTo;
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (meQuery.isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-2">
            <div className="w-1 h-6 bg-primary" />
            <span className="font-serif font-bold text-lg tracking-wide text-foreground">SupercarIQ</span>
          </div>
          <p className="text-xs text-muted-foreground tracking-widest uppercase">
            {mode === "login" ? "Sign in to your account" : "Create your account"}
          </p>
        </div>
        <Card className="border-border bg-card shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-base font-semibold">{mode === "login" ? "Welcome back" : "Get started"}</CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              {mode === "login" ? "Access in-depth supercar investment analysis." : "Create a free account to unlock all reports."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === "register" && (
                <div className="space-y-1.5">
                  <Label htmlFor="name" className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Your name</Label>
                  <Input id="name" type="text" autoComplete="name" value={name} onChange={e => setName(e.target.value)} placeholder="John Smith" disabled={loading} className="bg-background border-border" />
                </div>
              )}
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Email address</Label>
                <Input id="email" type="email" autoComplete="email" autoFocus={mode === "login"} value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" required disabled={loading} className="bg-background border-border" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Password</Label>
                <Input id="password" type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required minLength={8} disabled={loading} className="bg-background border-border" />
                {mode === "register" && <p className="text-[10px] text-muted-foreground">Minimum 8 characters</p>}
              </div>
              {error && <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">{error}</div>}
                {loading ? <span className="flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" />{mode === "login" ? "Signing in…" : "Creating account…"}</span> : (mode === "login" ? "Sign In" : "Create Account")}
              </Button>
            </form>
            <div className="mt-4 text-center">
              <button type="button" onClick={() => { setMode(mode === "login" ? "register" : "login"); setError(null); }} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                {mode === "login" ? "Don’t have an account? Register free" : "Already have an account? Sign in"}
              </button>
            </div>
          </CardContent>
        </Card>
        <p className="text-center text-[10px] text-muted-foreground mt-6">SupercarIQ · UK Supercar Investment Analysis</p>
      </div>
    </div>
  );
}
