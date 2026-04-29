import { NextResponse } from "next/server";
import type { SafetyScores } from "@/lib/types/einstein";

export const dynamic = "force-dynamic";

interface TokenCache {
  accessToken: string;
  instanceUrl: string;
  expiresAt: number;
}

let tokenCache: TokenCache | null = null;
const TOKEN_TTL_MS = 55 * 60 * 1000; // 55-minute TTL (Salesforce default is 60 min)

async function getSfdcToken(): Promise<{ accessToken: string; instanceUrl: string }> {
  if (tokenCache && Date.now() < tokenCache.expiresAt) {
    return { accessToken: tokenCache.accessToken, instanceUrl: tokenCache.instanceUrl };
  }

  const { SFDC_INSTANCE_URL, SFDC_CLIENT_ID, SFDC_CLIENT_SECRET } = process.env;
  if (!SFDC_INSTANCE_URL || !SFDC_CLIENT_ID || !SFDC_CLIENT_SECRET) {
    throw new SfdcAuthError("Missing SFDC environment variables");
  }

  const url = new URL(`${SFDC_INSTANCE_URL}/services/oauth2/token`);
  url.searchParams.set("grant_type", "client_credentials");
  url.searchParams.set("client_id", SFDC_CLIENT_ID);
  url.searchParams.set("client_secret", SFDC_CLIENT_SECRET);

  const res = await fetch(url.toString(), { method: "POST" });
  if (!res.ok) {
    const body = await res.text();
    console.error("[sfdc:auth] Failed:", res.status, body);
    throw new SfdcAuthError("OAuth token request failed");
  }

  const data = await res.json();
  tokenCache = {
    accessToken: data.access_token,
    instanceUrl: data.instance_url,
    expiresAt: Date.now() + TOKEN_TTL_MS,
  };

  return { accessToken: tokenCache.accessToken, instanceUrl: tokenCache.instanceUrl };
}

async function callEinstein(
  accessToken: string,
  instanceUrl: string,
  eventdata: string
): Promise<{ text: string; safetyScores: SafetyScores }> {
  const endpoint = `${instanceUrl}/services/data/v60.0/einstein/prompt-templates/Covenant_Event_Summarizer/generations`;

  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      isPreview: false,
      additionalConfig: { applicationName: "PromptBuilderPreview" },
      inputParams: {
        valueMap: {
          "Input:eventdata": { value: eventdata },
        },
      },
    }),
  });

  if (res.status === 401) {
    throw new UnauthorizedError();
  }

  if (!res.ok) {
    const body = await res.text();
    console.error("[sfdc:einstein] Failed:", res.status, body);
    throw new EinsteinApiError(`Einstein API returned ${res.status}`);
  }

  const data = await res.json();
  const generation = data?.generations?.[0];
  if (!generation || typeof generation.text !== "string") {
    console.error("[sfdc:einstein] Unexpected response shape:", JSON.stringify(data));
    throw new EinsteinParseError("Unexpected response shape from Einstein");
  }

  const raw = generation.safetyScoreRepresentation ?? {};
  const safetyScores: SafetyScores = {
    safetyScore: raw.safetyScore ?? 0,
    toxicityScore: raw.toxicityScore ?? 0,
    hateScore: raw.hateScore ?? 0,
    violenceScore: raw.violenceScore ?? 0,
    physicalScore: raw.physicalScore ?? 0,
    sexualScore: raw.sexualScore ?? 0,
    profanityScore: raw.profanityScore ?? 0,
  };

  return { text: generation.text, safetyScores };
}

// --- Request handler ---

interface RequestBody {
  eventdata: string;
}

export async function POST(request: Request): Promise<Response> {
  let body: RequestBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (typeof body.eventdata !== "string" || body.eventdata.trim() === "") {
    return NextResponse.json({ error: "eventdata is required" }, { status: 400 });
  }

  try {
    const { accessToken, instanceUrl } = await getSfdcToken();

    try {
      const result = await callEinstein(accessToken, instanceUrl, body.eventdata);
      return NextResponse.json(result);
    } catch (err) {
      if (err instanceof UnauthorizedError) {
        // Clear cache and retry once
        tokenCache = null;
        const fresh = await getSfdcToken();
        const result = await callEinstein(fresh.accessToken, fresh.instanceUrl, body.eventdata);
        return NextResponse.json(result);
      }
      throw err;
    }
  } catch (err) {
    if (err instanceof SfdcAuthError) {
      console.error("[sfdc:auth]", err.message);
      return NextResponse.json({ error: "Salesforce authentication failed" }, { status: 503 });
    }
    if (err instanceof EinsteinParseError) {
      console.error("[sfdc:parse]", err.message);
      return NextResponse.json({ error: "AI response could not be parsed" }, { status: 500 });
    }
    if (err instanceof EinsteinApiError) {
      console.error("[sfdc:api]", err.message);
      return NextResponse.json({ error: "Einstein API error" }, { status: 500 });
    }
    console.error("[sfdc:unknown]", err);
    return NextResponse.json({ error: "Unexpected error" }, { status: 500 });
  }
}

// --- Error classes ---

class SfdcAuthError extends Error {
  constructor(message: string) { super(message); this.name = "SfdcAuthError"; }
}
class UnauthorizedError extends Error {
  constructor() { super("401 Unauthorized"); this.name = "UnauthorizedError"; }
}
class EinsteinApiError extends Error {
  constructor(message: string) { super(message); this.name = "EinsteinApiError"; }
}
class EinsteinParseError extends Error {
  constructor(message: string) { super(message); this.name = "EinsteinParseError"; }
}
