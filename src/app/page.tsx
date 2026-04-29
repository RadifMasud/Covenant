"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { setSessionEmail, getSessionEmail } from "@/lib/session";
import { trackEvent } from "@/lib/trackEvent";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function EmailGatePage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

  useEffect(() => {
    if (getSessionEmail()) {
      router.replace("/workflow");
    }
  }, [router]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !email.includes("@")) {
      setError("Please enter a valid email address.");
      return;
    }
    setSessionEmail(email);
    trackEvent("email_gate", "session_start", { email });
    router.push("/workflow");
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="w-full max-w-md space-y-6 px-4">
        <div className="text-center space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">Covenant Monitor</h1>
          <p className="text-muted-foreground text-sm">
            Financial covenant compliance workflow
          </p>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Start a Session</CardTitle>
            <CardDescription>
              Enter your email to begin the compliance review workflow.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1">
                <Input
                  type="email"
                  placeholder="you@company.com"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setError("");
                    trackEvent("email_gate", "email_field_change", {
                      length: e.target.value.length,
                    });
                  }}
                  autoFocus
                />
                {error && (
                  <p className="text-sm text-destructive">{error}</p>
                )}
              </div>
              <Button type="submit" className="w-full">
                Start Session
              </Button>
            </form>
          </CardContent>
        </Card>
        <p className="text-center text-xs text-muted-foreground">
          Session data is stored locally in your browser.
        </p>
      </div>
    </main>
  );
}
