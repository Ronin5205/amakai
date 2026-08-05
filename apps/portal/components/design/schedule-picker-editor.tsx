"use client"

import * as React from "react"
import { CalendarBlankIcon } from "@phosphor-icons/react"

import {
  createDefaultTriggerSchedule,
  formatLocalDateKey,
  formatScheduleSummary,
  formatTimeLabel,
  parseLocalDateKey,
  parseTriggerSchedule,
  type ScheduleRepeat,
  type TriggerSchedule,
} from "@/lib/domain/trigger-schedule"
import { Button } from "@amakai/shared/components/ui/button"
import { Calendar } from "@amakai/shared/components/ui/calendar"
import {
  Field,
  FieldDescription,
  FieldLabel,
} from "@amakai/shared/components/ui/field"
import { Input } from "@amakai/shared/components/ui/input"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@amakai/shared/components/ui/popover"
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@amakai/shared/components/ui/toggle-group"
import { cn } from "@amakai/shared/lib/utils"

const DAY_OPTIONS = [
  { value: "0", label: "S", title: "Sunday" },
  { value: "1", label: "M", title: "Monday" },
  { value: "2", label: "T", title: "Tuesday" },
  { value: "3", label: "W", title: "Wednesday" },
  { value: "4", label: "T", title: "Thursday" },
  { value: "5", label: "F", title: "Friday" },
  { value: "6", label: "S", title: "Saturday" },
] as const

function pad2(value: number) {
  return String(value).padStart(2, "0")
}

function toTimeInputValue(hour: number, minute: number) {
  return `${pad2(hour)}:${pad2(minute)}`
}

function parseTimeInputValue(value: string): { hour: number; minute: number } | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value)
  if (!match) {
    return null
  }
  const hour = Number(match[1])
  const minute = Number(match[2])
  if (
    !Number.isInteger(hour) ||
    !Number.isInteger(minute) ||
    hour < 0 ||
    hour > 23 ||
    minute < 0 ||
    minute > 59
  ) {
    return null
  }
  return { hour, minute }
}

export function SchedulePickerEditor({
  id,
  value,
  onChange,
}: {
  id: string
  value: unknown
  onChange: (next: TriggerSchedule) => void
}) {
  const schedule = React.useMemo(() => {
    return parseTriggerSchedule(value) ?? createDefaultTriggerSchedule()
  }, [value])

  const [calendarOpen, setCalendarOpen] = React.useState(false)

  const selectedDate = schedule.date ? parseLocalDateKey(schedule.date) : undefined

  const commit = (patch: Partial<TriggerSchedule>) => {
    const next: TriggerSchedule = {
      ...schedule,
      ...patch,
      version: 1,
      timezoneOffsetMinutes: new Date().getTimezoneOffset(),
    }
    onChange(next)
  }

  const setRepeat = (repeat: ScheduleRepeat) => {
    if (repeat === "once") {
      commit({
        repeat,
        date: schedule.date ?? formatLocalDateKey(new Date()),
      })
      return
    }

    if (repeat === "weekly") {
      commit({
        repeat,
        daysOfWeek:
          schedule.daysOfWeek && schedule.daysOfWeek.length > 0
            ? schedule.daysOfWeek
            : [1, 2, 3, 4, 5],
      })
      return
    }

    commit({ repeat })
  }

  return (
    <div className="flex flex-col gap-4">
      <Field>
        <FieldLabel htmlFor={`${id}-repeat`}>Repeat</FieldLabel>
        <ToggleGroup
          id={`${id}-repeat`}
          variant="outline"
          spacing={0}
          value={[schedule.repeat]}
          onValueChange={(next) => {
            const value = next[0] as ScheduleRepeat | undefined
            if (value) setRepeat(value)
          }}
          className="flex w-full flex-wrap"
        >
          <ToggleGroupItem value="once" className="flex-1">
            Once
          </ToggleGroupItem>
          <ToggleGroupItem value="daily" className="flex-1">
            Daily
          </ToggleGroupItem>
          <ToggleGroupItem value="weekdays" className="flex-1">
            Weekdays
          </ToggleGroupItem>
          <ToggleGroupItem value="weekly" className="flex-1">
            Weekly
          </ToggleGroupItem>
        </ToggleGroup>
      </Field>

      {schedule.repeat === "once" ? (
        <Field>
          <FieldLabel>Date</FieldLabel>
          <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
            <PopoverTrigger
              render={
                <Button
                  type="button"
                  variant="outline"
                  className="w-full justify-start font-normal"
                />
              }
            >
              <CalendarBlankIcon data-icon="inline-start" />
              {selectedDate
                ? selectedDate.toLocaleDateString(undefined, {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })
                : "Pick a date"}
            </PopoverTrigger>
            <PopoverContent align="start" className="w-auto p-2">
              <Calendar
                mode="single"
                selected={selectedDate ?? undefined}
                disabled={{ before: new Date(new Date().setHours(0, 0, 0, 0)) }}
                onSelect={(date) => {
                  if (!date) return
                  commit({ date: formatLocalDateKey(date) })
                  setCalendarOpen(false)
                }}
              />
            </PopoverContent>
          </Popover>
        </Field>
      ) : null}

      {schedule.repeat === "weekly" ? (
        <Field>
          <FieldLabel>Days</FieldLabel>
          <ToggleGroup
            multiple
            variant="outline"
            spacing={0}
            value={(schedule.daysOfWeek ?? []).map(String)}
            onValueChange={(next) => {
              const days = next
                .map((entry) => Number(entry))
                .filter((day) => Number.isInteger(day) && day >= 0 && day <= 6)
                .sort((left, right) => left - right)
              if (days.length === 0) {
                return
              }
              commit({ daysOfWeek: days })
            }}
            className="flex w-full"
          >
            {DAY_OPTIONS.map((day) => (
              <ToggleGroupItem
                key={day.value}
                value={day.value}
                title={day.title}
                aria-label={day.title}
                className={cn("flex-1 px-0")}
              >
                {day.label}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </Field>
      ) : null}

      <Field>
        <FieldLabel htmlFor={`${id}-time`}>Time</FieldLabel>
        <Input
          id={`${id}-time`}
          type="time"
          value={toTimeInputValue(schedule.hour, schedule.minute)}
          onChange={(event) => {
            const parsed = parseTimeInputValue(event.target.value)
            if (!parsed) return
            commit({ hour: parsed.hour, minute: parsed.minute })
          }}
        />
        <FieldDescription>
          Fires at {formatTimeLabel(schedule.hour, schedule.minute)} in your
          local timezone.
        </FieldDescription>
      </Field>

      <p className="text-xs text-muted-foreground">
        {formatScheduleSummary(schedule)}
      </p>
    </div>
  )
}
