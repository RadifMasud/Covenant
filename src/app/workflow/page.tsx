"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { getSessionEmail, clearSession } from "@/lib/session";
import { trackEvent, getSessionEvents } from "@/lib/trackEvent";
import { Sidecar } from "@/components/Sidecar";
import { type EinsteinState, EINSTEIN_INITIAL_STATE } from "@/lib/types/einstein";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

type DocType = "Form 1065" | "Schedule K-1" | "Ledger" | "";
type ScanQuality = "Good" | "Poor";
type Decision = "approved" | "flagged" | "rejected" | null;

interface WorkflowState {
  docType: DocType;
  scanQuality: ScanQuality;
  totalDebt: string;
  totalEquity: string;
  decision: Decision;
}

const STEP_NAMES = ["Ingest", "Validate", "Analyze", "Decide"];

export default function WorkflowPage() {
  const router = useRouter();
  const [sessionEmail, setSessionEmail] = useState("");
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const stepStartTime = useRef<number>(Date.now());
  const [einsteinState, setEinsteinState] = useState<EinsteinState>(EINSTEIN_INITIAL_STATE);

  const [state, setState] = useState<WorkflowState>({
    docType: "",
    scanQuality: "Good",
    totalDebt: "",
    totalEquity: "",
    decision: null,
  });

  useEffect(() => {
    const email = getSessionEmail();
    if (!email) {
      router.replace("/");
      return;
    }
    setSessionEmail(email);
    trackEvent("workflow", "session_resumed", { email });
  }, [router]);

  const debtToEquityRatio: number | null = (() => {
    const debt = parseFloat(state.totalDebt);
    const equity = parseFloat(state.totalEquity);
    if (isNaN(debt) || isNaN(equity) || equity === 0) return null;
    return debt / equity;
  })();

  function navigateToStep(next: 1 | 2 | 3 | 4, fromStep: number) {
    const dwellMs = Date.now() - stepStartTime.current;
    trackEvent(STEP_NAMES[fromStep - 1], "step_exit", {
      dwell_ms: dwellMs,
      next_step: next,
      backtracked: next < fromStep,
      ...(next < fromStep ? { backtracked_from_step: fromStep } : {}),
    });
    stepStartTime.current = Date.now();
    setStep(next);
    trackEvent(STEP_NAMES[next - 1], "step_enter", { from_step: fromStep });
  }

  function handleNext() {
    if (step < 4) navigateToStep((step + 1) as 1 | 2 | 3 | 4, step);
  }

  function handleBack() {
    if (step > 1) navigateToStep((step - 1) as 1 | 2 | 3 | 4, step);
  }

  function handleDecision(decision: "approved" | "flagged" | "rejected") {
    setState((s) => ({ ...s, decision }));
    trackEvent("Decide", "decision_made", {
      decision,
      docType: state.docType,
      scanQuality: state.scanQuality,
      debtToEquityRatio,
    });
  }

  function handleReset() {
    clearSession();
    setEinsteinState(EINSTEIN_INITIAL_STATE);
    trackEvent("workflow", "session_ended", { sessionEmail });
    router.replace("/");
  }

  async function handleAnalyzeNow() {
    setEinsteinState({ status: "loading", text: null, safetyScores: null, error: null });

    const events = getSessionEvents();
    const payload = {
      eventdata: JSON.stringify({
        events,
        workflowState: {
          docType: state.docType,
          scanQuality: state.scanQuality,
          debtToEquityRatio,
        },
      }),
    };

    try {
      const res = await fetch("/api/sfdc/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Request failed");
      }

      const data = await res.json();
      setEinsteinState({
        status: "success",
        text: data.text,
        safetyScores: data.safetyScores,
        error: null,
      });
      trackEvent("sidecar", "einstein_analyze_success", { step });
    } catch (err) {
      const message = err instanceof Error ? err.message : "AI analysis unavailable";
      setEinsteinState({ status: "error", text: null, safetyScores: null, error: message });
      trackEvent("sidecar", "einstein_analyze_error", { step, message });
    }
  }

  const canAdvanceStep1 = state.docType !== "";
  const canAdvanceStep2 =
    state.totalDebt !== "" && state.totalEquity !== "" && debtToEquityRatio !== null;

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="font-bold text-lg">Covenant Monitor</span>
          <Badge variant="outline" className="text-xs">
            {sessionEmail}
          </Badge>
        </div>
        <Button variant="ghost" size="sm" onClick={handleReset}>
          End Session
        </Button>
      </header>

      <div className="max-w-5xl mx-auto px-6 py-8 flex gap-8">
        <div className="flex-1 space-y-6">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              {STEP_NAMES.map((name, i) => (
                <span
                  key={name}
                  className={
                    step === i + 1
                      ? "font-semibold text-foreground"
                      : step > i + 1
                      ? "text-muted-foreground line-through"
                      : ""
                  }
                >
                  {i + 1}. {name}
                </span>
              ))}
            </div>
            <Progress value={(step / 4) * 100} className="h-2" />
          </div>

          {step === 1 && (
            <Card>
              <CardHeader>
                <CardTitle>Step 1 — Ingest</CardTitle>
                <CardDescription>
                  Select the document type and assess scan quality.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Document Type</label>
                  <Select
                    value={state.docType}
                    onValueChange={(v) => {
                      setState((s) => ({ ...s, docType: v as DocType }));
                      trackEvent("Ingest", "doc_type_selected", { docType: v });
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select document type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Form 1065">Form 1065</SelectItem>
                      <SelectItem value="Schedule K-1">Schedule K-1</SelectItem>
                      <SelectItem value="Ledger">Ledger</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Scan Quality</label>
                  <div className="flex gap-2">
                    {(["Good", "Poor"] as ScanQuality[]).map((q) => (
                      <button
                        key={q}
                        type="button"
                        onClick={() => {
                          setState((s) => ({ ...s, scanQuality: q }));
                          trackEvent("Ingest", "scan_quality_changed", {
                            scanQuality: q,
                          });
                        }}
                        className={`flex-1 py-2 px-4 rounded-md border text-sm font-medium transition-colors ${
                          state.scanQuality === q
                            ? q === "Good"
                              ? "bg-green-600 border-green-600 text-white"
                              : "bg-red-600 border-red-600 text-white"
                            : "bg-white border-border hover:bg-muted"
                        }`}
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button onClick={handleNext} disabled={!canAdvanceStep1}>
                    Next: Validate
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {step === 2 && (
            <Card>
              <CardHeader>
                <CardTitle>Step 2 — Validate</CardTitle>
                <CardDescription>
                  Enter the financial figures from the document.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Total Debt ($)</label>
                    <Input
                      type="number"
                      placeholder="e.g. 5000000"
                      value={state.totalDebt}
                      onChange={(e) => {
                        setState((s) => ({ ...s, totalDebt: e.target.value }));
                        trackEvent("Validate", "total_debt_changed", {
                          value: e.target.value,
                        });
                      }}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">
                      Total Equity ($)
                    </label>
                    <Input
                      type="number"
                      placeholder="e.g. 2000000"
                      value={state.totalEquity}
                      onChange={(e) => {
                        setState((s) => ({
                          ...s,
                          totalEquity: e.target.value,
                        }));
                        trackEvent("Validate", "total_equity_changed", {
                          value: e.target.value,
                        });
                      }}
                    />
                  </div>
                </div>

                {debtToEquityRatio !== null && (
                  <div className="rounded-md bg-muted p-3 text-sm">
                    Calculated D/E Ratio preview:{" "}
                    <strong>{debtToEquityRatio.toFixed(2)}</strong>
                  </div>
                )}

                <div className="flex justify-between">
                  <Button variant="outline" onClick={handleBack}>
                    Back
                  </Button>
                  <Button onClick={handleNext} disabled={!canAdvanceStep2}>
                    Next: Analyze
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {step === 3 && (
            <Card>
              <CardHeader>
                <CardTitle>Step 3 — Analyze</CardTitle>
                <CardDescription>
                  Review the computed covenant metrics.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-3 gap-4">
                  <div className="rounded-lg border p-4 text-center space-y-1">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">
                      Total Debt
                    </p>
                    <p className="text-xl font-bold">
                      ${Number(state.totalDebt).toLocaleString()}
                    </p>
                  </div>
                  <div className="rounded-lg border p-4 text-center space-y-1">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">
                      Total Equity
                    </p>
                    <p className="text-xl font-bold">
                      ${Number(state.totalEquity).toLocaleString()}
                    </p>
                  </div>
                  <div
                    className={`rounded-lg border p-4 text-center space-y-1 ${
                      debtToEquityRatio !== null && debtToEquityRatio > 2.5
                        ? "border-red-400 bg-red-50"
                        : "border-green-400 bg-green-50"
                    }`}
                  >
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">
                      D/E Ratio
                    </p>
                    <p className="text-xl font-bold">
                      {debtToEquityRatio?.toFixed(2) ?? "—"}
                    </p>
                    {debtToEquityRatio !== null && (
                      <p
                        className={`text-xs font-medium ${
                          debtToEquityRatio > 2.5
                            ? "text-red-600"
                            : "text-green-600"
                        }`}
                      >
                        {debtToEquityRatio > 2.5 ? "Above threshold" : "Within threshold"}
                      </p>
                    )}
                  </div>
                </div>

                <div className="rounded-md border p-4 text-sm space-y-1">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Document Type</span>
                    <span className="font-medium">{state.docType}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Scan Quality</span>
                    <Badge
                      variant={
                        state.scanQuality === "Poor" ? "destructive" : "secondary"
                      }
                    >
                      {state.scanQuality}
                    </Badge>
                  </div>
                </div>

                <div className="flex justify-between">
                  <Button variant="outline" onClick={handleBack}>
                    Back
                  </Button>
                  <Button onClick={handleNext}>Next: Decide</Button>
                </div>
              </CardContent>
            </Card>
          )}

          {step === 4 && (
            <Card>
              <CardHeader>
                <CardTitle>Step 4 — Decide</CardTitle>
                <CardDescription>
                  Make the final compliance determination.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {state.decision === null ? (
                  <>
                    <div className="rounded-md bg-muted p-4 text-sm space-y-1">
                      <div className="flex justify-between">
                        <span>Document</span>
                        <strong>{state.docType}</strong>
                      </div>
                      <div className="flex justify-between">
                        <span>D/E Ratio</span>
                        <strong>{debtToEquityRatio?.toFixed(2)}</strong>
                      </div>
                      <div className="flex justify-between">
                        <span>Scan Quality</span>
                        <strong>{state.scanQuality}</strong>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      <Button
                        className="bg-green-600 hover:bg-green-700 text-white"
                        onClick={() => handleDecision("approved")}
                      >
                        Approve Compliance
                      </Button>
                      <Button
                        variant="outline"
                        className="border-orange-400 text-orange-700 hover:bg-orange-50"
                        onClick={() => handleDecision("flagged")}
                      >
                        Flag for Review
                      </Button>
                      <Button
                        variant="destructive"
                        onClick={() => handleDecision("rejected")}
                      >
                        Reject
                      </Button>
                    </div>

                    <div className="flex justify-start">
                      <Button variant="outline" onClick={handleBack}>
                        Back
                      </Button>
                    </div>
                  </>
                ) : (
                  <div className="text-center space-y-4 py-4">
                    <div
                      className={`inline-flex items-center justify-center w-16 h-16 rounded-full text-2xl ${
                        state.decision === "approved"
                          ? "bg-green-100 text-green-700"
                          : state.decision === "flagged"
                          ? "bg-orange-100 text-orange-700"
                          : "bg-red-100 text-red-700"
                      }`}
                    >
                      {state.decision === "approved"
                        ? "✓"
                        : state.decision === "flagged"
                        ? "⚑"
                        : "✗"}
                    </div>
                    <div>
                      <p className="text-lg font-semibold capitalize">
                        {state.decision === "approved"
                          ? "Compliance Approved"
                          : state.decision === "flagged"
                          ? "Flagged for Review"
                          : "Rejected"}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Decision recorded for {state.docType}
                      </p>
                    </div>
                    <Button variant="outline" onClick={handleReset}>
                      Start New Session
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        <Sidecar
          step={step}
          scanQuality={state.scanQuality}
          debtToEquityRatio={debtToEquityRatio}
          sessionEmail={sessionEmail}
          einsteinState={einsteinState}
          onAnalyzeNow={handleAnalyzeNow}
        />
      </div>
    </div>
  );
}
