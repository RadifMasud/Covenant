"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { trackEvent } from "@/lib/trackEvent";

interface SidecarProps {
  step: number;
  scanQuality: "Good" | "Poor";
  debtToEquityRatio: number | null;
  sessionEmail: string;
}

export function Sidecar({
  step,
  scanQuality,
  debtToEquityRatio,
  sessionEmail,
}: SidecarProps) {
  const [manualReviewAcked, setManualReviewAcked] = useState(false);
  const [highRiskEscalated, setHighRiskEscalated] = useState(false);

  const isHighRisk = step === 3 && debtToEquityRatio !== null && debtToEquityRatio > 2.5;
  const isPoorQuality = scanQuality === "Poor";

  const hasNudge = isHighRisk || isPoorQuality;

  return (
    <aside className="w-72 shrink-0 space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Sidecar Context
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Session</span>
            <span className="font-mono text-xs truncate max-w-[140px]">{sessionEmail || "—"}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Step</span>
            <Badge variant="outline">{step} / 4</Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Scan Quality</span>
            <Badge variant={isPoorQuality ? "destructive" : "secondary"}>
              {scanQuality}
            </Badge>
          </div>
          {debtToEquityRatio !== null && (
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">D/E Ratio</span>
              <Badge
                variant={debtToEquityRatio > 2.5 ? "destructive" : "secondary"}
              >
                {debtToEquityRatio.toFixed(2)}
              </Badge>
            </div>
          )}
        </CardContent>
      </Card>

      {hasNudge && (
        <div className="space-y-3">
          {isPoorQuality && (
            <Card className={manualReviewAcked ? "border-orange-400 bg-orange-100" : "border-orange-300 bg-orange-50"}>
              <CardContent className="pt-4 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-orange-800">
                    Manual Review Required
                  </p>
                  {manualReviewAcked && (
                    <span className="text-xs font-medium text-orange-700 bg-orange-200 px-2 py-0.5 rounded-full">
                      ✓ Acknowledged
                    </span>
                  )}
                </div>
                <p className="text-xs text-orange-700">
                  Poor scan quality detected on this document. A manual review
                  is recommended before proceeding.
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  className={`w-full ${
                    manualReviewAcked
                      ? "border-orange-500 bg-orange-200 text-orange-900 hover:bg-orange-50"
                      : "border-orange-400 text-orange-800 hover:bg-orange-100"
                  }`}
                  onClick={() => {
                    const next = !manualReviewAcked;
                    setManualReviewAcked(next);
                    trackEvent("sidecar", "nudge_manual_review_clicked", {
                      step,
                      scanQuality,
                      acknowledged: next,
                    });
                  }}
                >
                  {manualReviewAcked ? "✓ Acknowledged — Click to undo" : "Acknowledge Warning"}
                </Button>
              </CardContent>
            </Card>
          )}

          {isHighRisk && (
            <Card className={highRiskEscalated ? "border-red-400 bg-red-100" : "border-red-300 bg-red-50"}>
              <CardContent className="pt-4 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-red-800">
                    High Risk — D/E &gt; 2.5
                  </p>
                  {highRiskEscalated && (
                    <span className="text-xs font-medium text-red-700 bg-red-200 px-2 py-0.5 rounded-full">
                      ✓ Escalated
                    </span>
                  )}
                </div>
                <p className="text-xs text-red-700">
                  The debt-to-equity ratio of{" "}
                  <strong>{debtToEquityRatio?.toFixed(2)}</strong> exceeds the
                  covenant threshold. Flag this case for escalation.
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  className={`w-full ${
                    highRiskEscalated
                      ? "border-red-500 bg-red-200 text-red-900 hover:bg-red-50"
                      : "border-red-400 text-red-800 hover:bg-red-100"
                  }`}
                  onClick={() => {
                    const next = !highRiskEscalated;
                    setHighRiskEscalated(next);
                    trackEvent("sidecar", "nudge_high_risk_clicked", {
                      step,
                      ratio: debtToEquityRatio,
                      escalated: next,
                    });
                  }}
                >
                  {highRiskEscalated ? "✓ Escalated — Click to undo" : "Escalate for Review"}
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {!hasNudge && (
        <Card className="border-dashed">
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground text-center">
              No alerts at this step.
            </p>
          </CardContent>
        </Card>
      )}
    </aside>
  );
}
