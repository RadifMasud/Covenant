import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

interface AbstractResponse {
  is_valid_format: { value: boolean };
  is_mx_found: { value: boolean };
  is_disposable_email: { value: boolean };
}

export async function POST(request: Request): Promise<Response> {
  let email: string;
  try {
    const body = await request.json();
    email = body.email;
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (typeof email !== "string" || email.trim() === "") {
    return NextResponse.json({ error: "email is required" }, { status: 400 });
  }

  const apiKey = process.env.ABSTRACT_API_KEY;
  if (!apiKey) {
    console.error("[email:validate] ABSTRACT_API_KEY is not set — failing open");
    return NextResponse.json({ valid: true });
  }

  const startMs = Date.now();

  try {
    const url = new URL("https://emailvalidation.abstractapi.com/v1/");
    url.searchParams.set("api_key", apiKey);
    url.searchParams.set("email", email);

    const res = await fetch(url.toString(), {
      signal: AbortSignal.timeout(5000),
    });

    const durationMs = Date.now() - startMs;

    if (!res.ok) {
      const body = await res.text().catch(() => "(unreadable)");
      console.error(
        `[email:validate] Abstract API failed — status=${res.status} duration=${durationMs}ms email=${email} body=${body}`
      );
      return NextResponse.json({ valid: true });
    }

    const data: AbstractResponse = await res.json();
    console.log(
      `[email:validate] OK — duration=${durationMs}ms email=${email} ` +
      `format=${data.is_valid_format?.value} mx=${data.is_mx_found?.value} disposable=${data.is_disposable_email?.value}`
    );

    if (data.is_valid_format?.value === false) {
      return NextResponse.json({ valid: false, reason: "Invalid email format." });
    }
    if (data.is_mx_found?.value === false) {
      return NextResponse.json({ valid: false, reason: "This domain has no mail server." });
    }
    if (data.is_disposable_email?.value === true) {
      return NextResponse.json({ valid: false, reason: "Disposable email addresses are not allowed." });
    }

    return NextResponse.json({ valid: true });
  } catch (err) {
    const durationMs = Date.now() - startMs;
    const reason = err instanceof Error ? err.message : String(err);
    const isTimeout = err instanceof Error && err.name === "TimeoutError";
    console.error(
      `[email:validate] ${isTimeout ? "Timeout" : "Error"} — duration=${durationMs}ms email=${email} reason=${reason} — failing open`
    );
    return NextResponse.json({ valid: true });
  }
}
