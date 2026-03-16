// Edge Function: klaviyo-unsubscribe
// Handles Klaviyo unsubscribe webhook and syncs to HubSpot (mocked)
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createRun, executeStep, completeRun, checkIdempotency } from "../_shared/edgeflow.ts";
import { mockGetSubscriptions, mockUnsubscribe, Scenario } from "../_shared/mocks.ts";

const PORT = parseInt(Deno.env.get("PORT") || "8000");

Deno.serve({ port: PORT }, async (req: Request) => {
  // 1. Auth check
  const authHeader = req.headers.get("Authorization") ?? "";
  const webhookSecret = Deno.env.get("WEBHOOK_SECRET") || "dc3cb30dfe1614cc61933efcd8ede51314d65f4c58e6e1b3";

  if (!webhookSecret || authHeader !== `Bearer ${webhookSecret}`) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  // 2. Parse body
  let body: { email?: string; scenario?: Scenario; timestamp?: string };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { email, scenario = "happy", timestamp = new Date().toISOString() } = body;

  if (!email) {
    return new Response(JSON.stringify({ error: "Missing required field: email" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  // 3. Supabase client (service role for writes)
  const supabaseKey =
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ||
    Deno.env.get("SUPABASE_ANON_KEY") ||
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh4YW96dWJ2emdxYXZyZ3lkb2htIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM2OTcwMjMsImV4cCI6MjA4OTI3MzAyM30.YQiOxzuhI-g0QadmghqBYhSVnozm9Ipc67ostGhwuT8";
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") || "https://xxaozubvzgqavrgydohm.supabase.co",
    supabaseKey
  );

  // 4. Idempotency check using email + timestamp
  const idempotencyKey = `klaviyo-unsubscribe:${email}:${timestamp}`;
  const { isNew } = await checkIdempotency(supabase, idempotencyKey);

  if (!isNew) {
    return new Response(
      JSON.stringify({ skipped: true, reason: "duplicate_webhook", idempotency_key: idempotencyKey }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  }

  // 5. Create workflow run
  const runId = await createRun(supabase, "klaviyo-unsubscribe", "webhook", { email, scenario, timestamp });

  let finalStatus: "completed" | "failed" = "completed";
  let finalError: string | undefined;

  try {
    // Step: extract_email
    const extractedEmail = await executeStep(
      supabase,
      runId,
      "extract_email",
      async () => {
        const trimmed = email.trim().toLowerCase();
        if (!trimmed.includes("@")) throw new Error("Invalid email format");
        return { email: trimmed };
      },
      { raw_email: email }
    );

    if (!extractedEmail) throw new Error("extract_email step failed");

    // Step: fetch_subscriptions
    const subscriptionsResult = await executeStep(
      supabase,
      runId,
      "fetch_subscriptions",
      async () => {
        const subs = await mockGetSubscriptions(extractedEmail.email, scenario);
        return { subscriptions: subs, count: subs.length };
      },
      { email: extractedEmail.email, scenario }
    );

    if (!subscriptionsResult) throw new Error("fetch_subscriptions step failed");

    // Step: unsubscribe_[id] for each subscription
    let anyFailed = false;
    for (const sub of subscriptionsResult.subscriptions) {
      const result = await executeStep(
        supabase,
        runId,
        `unsubscribe_${sub.id}`,
        async () => {
          const res = await mockUnsubscribe(extractedEmail.email, sub.id, scenario);
          return res;
        },
        { email: extractedEmail.email, subscription_id: sub.id, subscription_name: sub.name, scenario }
      );

      if (!result) {
        anyFailed = true;
      }
    }

    if (anyFailed) {
      finalStatus = "failed";
      finalError = "One or more unsubscribe steps failed — see step_states and dead_letter_queue";
    }
  } catch (err) {
    finalStatus = "failed";
    finalError = err instanceof Error ? err.message : String(err);
  }

  // Complete run
  await completeRun(supabase, runId, finalStatus, finalError);

  return new Response(
    JSON.stringify({
      run_id: runId,
      status: finalStatus,
      email,
      scenario,
      error: finalError ?? null,
    }),
    {
      status: finalStatus === "completed" ? 200 : 207,
      headers: { "Content-Type": "application/json" },
    }
  );
});
