import { NextResponse } from "next/server"

import { createAdminClient } from "@/utils/supabase/admin"
import { processQueuedExecution } from "@/lib/data/inbound-runs"

/**
 * MVP worker: process up to N queued workflow executions.
 * Call from cron or manually. Protect with CRON_SECRET when set.
 */
export async function POST(request: Request) {
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret) {
    const provided =
      request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ??
      request.headers.get("x-cron-secret") ??
      ""
    if (provided !== cronSecret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
  }

  try {
    const supabase = createAdminClient()
    const { data: queued } = await supabase
      .from("workflow_executions")
      .select("id")
      .eq("status", "queued")
      .order("started_at", { ascending: true })
      .limit(10)

    const results = []
    for (const row of queued ?? []) {
      const result = await processQueuedExecution(row.id)
      results.push({ id: row.id, result })
    }

    return NextResponse.json({
      ok: true,
      processed: results.length,
      results,
    })
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Queue processing failed",
      },
      { status: 500 }
    )
  }
}
