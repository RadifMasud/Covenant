"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  LineChart,
  Line,
  ResponsiveContainer,
} from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import sessions from "@/data/mock-sessions.json";

interface Session {
  id: string;
  email: string;
  docType: string;
  scanQuality: "Good" | "Poor";
  decision: "Approved" | "Flagged" | "Rejected";
  analyzeDwellTime: number;
  totalTimeToDecision: number;
  timestamp: string;
  backtracked: boolean;
}

function computeQualityStats(data: Session[]) {
  return (["Good", "Poor"] as const).map((quality) => {
    const subset = data.filter((s) => s.scanQuality === quality);
    const total = subset.length;
    const approved = subset.filter((s) => s.decision === "Approved").length;
    const flagged = subset.filter((s) => s.decision === "Flagged").length;
    const rejected = subset.filter((s) => s.decision === "Rejected").length;
    return {
      quality,
      "Approval Rate": Math.round((approved / total) * 100),
      "Flag Rate": Math.round((flagged / total) * 100),
      "Reject Rate": Math.round((rejected / total) * 100),
      total,
    };
  });
}

function computeDocTypeTimeStats(data: Session[]) {
  const docTypes = ["Form 1065", "Schedule K-1", "Ledger"];
  return docTypes.map((docType) => {
    const goodSessions = data.filter(
      (s) => s.docType === docType && s.scanQuality === "Good"
    );
    const poorSessions = data.filter(
      (s) => s.docType === docType && s.scanQuality === "Poor"
    );
    const avgGood =
      goodSessions.length > 0
        ? Math.round(
            goodSessions.reduce((sum, s) => sum + s.totalTimeToDecision, 0) /
              goodSessions.length
          )
        : 0;
    const avgPoor =
      poorSessions.length > 0
        ? Math.round(
            poorSessions.reduce((sum, s) => sum + s.totalTimeToDecision, 0) /
              poorSessions.length
          )
        : 0;
    return {
      docType,
      "Good Quality (s)": avgGood,
      "Poor Quality (s)": avgPoor,
    };
  });
}

export default function AdminPage() {
  const typedSessions = sessions as Session[];
  const qualityStats = computeQualityStats(typedSessions);
  const docTypeTimeStats = computeDocTypeTimeStats(typedSessions);

  const totalSessions = typedSessions.length;
  const totalFlagged = typedSessions.filter((s) => s.decision === "Flagged").length;
  const totalApproved = typedSessions.filter((s) => s.decision === "Approved").length;
  const backtrackRate = Math.round(
    (typedSessions.filter((s) => s.backtracked).length / totalSessions) * 100
  );
  const poorCount = typedSessions.filter((s) => s.scanQuality === "Poor").length;

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="font-bold text-lg">Covenant Monitor</span>
          <Badge variant="outline">Admin Dashboard</Badge>
        </div>
        <a href="/workflow" className="text-sm text-muted-foreground hover:underline">
          Go to Workflow
        </a>
      </header>

      <div className="max-w-5xl mx-auto px-6 py-8 space-y-8">
        <div>
          <h1 className="text-2xl font-bold">Operations Overview</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Aggregate analysis across {totalSessions.toLocaleString()} sessions. For the Bank COO.
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard label="Total Sessions" value={totalSessions.toLocaleString()} />
          <StatCard
            label="Approval Rate"
            value={`${Math.round((totalApproved / totalSessions) * 100)}%`}
          />
          <StatCard
            label="Flagged Rate"
            value={`${Math.round((totalFlagged / totalSessions) * 100)}%`}
          />
          <StatCard
            label="Backtrack Rate"
            value={`${backtrackRate}%`}
            note="Users who reversed a step"
          />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Document Quality vs. Approval Rate</CardTitle>
            <CardDescription>
              Poor-quality documents have a{" "}
              <strong>
                {(
                  qualityStats.find((q) => q.quality === "Poor")?.["Flag Rate"] ?? 0
                ) -
                  (qualityStats.find((q) => q.quality === "Good")?.["Flag Rate"] ?? 0)}
                pp higher flag rate
              </strong>
              . {poorCount} sessions ({Math.round((poorCount / totalSessions) * 100)}%) had poor scan quality.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={qualityStats} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="quality" />
                <YAxis unit="%" domain={[0, 100]} />
                <Tooltip formatter={(val) => `${val}%`} />
                <Legend />
                <Bar dataKey="Approval Rate" fill="#16a34a" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Flag Rate" fill="#ea580c" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Reject Rate" fill="#dc2626" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Average Time to Decision by Document Type</CardTitle>
            <CardDescription>
              Poor-quality documents consistently take longer to process across all document types,
              indicating a bottleneck that automated OCR pre-processing could address.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={docTypeTimeStats} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="docType" />
                <YAxis unit="s" label={{ value: "Seconds", angle: -90, position: "insideLeft", offset: 10 }} />
                <Tooltip formatter={(val) => `${val}s`} />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="Good Quality (s)"
                  stroke="#16a34a"
                  strokeWidth={2}
                  dot={{ r: 5 }}
                  activeDot={{ r: 7 }}
                />
                <Line
                  type="monotone"
                  dataKey="Poor Quality (s)"
                  stroke="#dc2626"
                  strokeWidth={2}
                  dot={{ r: 5 }}
                  activeDot={{ r: 7 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-amber-200 bg-amber-50">
          <CardHeader>
            <CardTitle className="text-amber-900">Recommendation: Automated OCR Pre-Processor</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-amber-800 space-y-2">
            <p>
              The data above demonstrates that <strong>Poor scan quality is the primary driver of
              Flagged outcomes</strong> — with a flag rate approximately 40% higher than Good-quality
              documents — and significantly increases time-to-decision across all document types.
            </p>
            <p>
              Deploying an automated OCR pre-processor to standardize document quality before ingestion
              would directly reduce the Flagged rate, cut analyst dwell time, and lower re-review costs.
              This is the highest-ROI initiative for the next sprint.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  note,
}: {
  label: string;
  value: string;
  note?: string;
}) {
  return (
    <Card>
      <CardContent className="pt-4 space-y-1">
        <p className="text-xs text-muted-foreground uppercase tracking-wide">{label}</p>
        <p className="text-2xl font-bold">{value}</p>
        {note && <p className="text-xs text-muted-foreground">{note}</p>}
      </CardContent>
    </Card>
  );
}
