import { NextResponse } from "next/server"

import { createAdminClient } from "@/utils/supabase/admin"
import { processQueuedExecution } from "@/lib/data/inbound-runs"
import { fireDueSchedules } from "@/lib/data/schedule-runs"

function assertCronAuthorized(request: Request) {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) {
    return null
  }

  const provided =
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ??
    request.headers.get("x-cron-secret") ??
    ""

  if (provided !== cronSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  return null
}

/**
 * MVP worker tick: fire due schedule triggers, then process queued executions.
 * Call every minute from cron. Protect with CRON_SECRET when set.
 */
export async function POST(request: Request) {
  const unauthorized = assertCronAuthorized(request)
  if (unauthorized) {
    return unauthorized
  }

  try {
    const scheduleResults = await fireDueSchedules()

    const supabase = createAdminClient()
    const { data: queued } = await supabase
      .from("workflow_executions")
      .select("id")
      .eq("status", "queued")
      .order("started_at", { ascending: true })
      .limit(10)

    const queueResults = []
    for (const row of queued ?? []) {
      const result = await processQueuedExecution(row.id)
      queueResults.push({ id: row.id, result })
    }

    return NextResponse.json({
      ok: true,
      schedules: {
        checked: scheduleResults.length,
        fired: scheduleResults.filter((result) => result.status === "fired")
          .length,
        results: scheduleResults,
      },
      queue: {
        processed: queueResults.length,
        results: queueResults,
      },
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
