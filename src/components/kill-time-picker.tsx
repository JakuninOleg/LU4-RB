"use client";

import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";

const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0"));
const MINUTES = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, "0"));

function getPartsInTimeZone(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);

  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? "00";
  return {
    year: Number(get("year")),
    month: Number(get("month")),
    day: Number(get("day")),
    hour: get("hour") === "24" ? "00" : get("hour"),
    minute: get("minute"),
  };
}

function wallTimeToIso(
  year: number,
  month: number,
  day: number,
  hour: string,
  minute: string,
  timeZone: string,
) {
  if (timeZone === "Europe/Moscow") {
    const isoLocal = `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}T${hour}:${minute}:00+03:00`;
    return new Date(isoLocal).toISOString();
  }

  return new Date(
    `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}T${hour}:${minute}:00`,
  ).toISOString();
}

/** Build ISO from HH:MM today in TZ; if result is >2 min in the future, use yesterday. */
export function timeToKilledAtIso(hour: string, minute: string, timeZone: string, now = new Date()) {
  const today = getPartsInTimeZone(now, timeZone);
  let iso = wallTimeToIso(today.year, today.month, today.day, hour, minute, timeZone);
  const parsed = new Date(iso);
  if (parsed.getTime() - now.getTime() > 2 * 60 * 1000) {
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const y = getPartsInTimeZone(yesterday, timeZone);
    iso = wallTimeToIso(y.year, y.month, y.day, hour, minute, timeZone);
  }
  return iso;
}

export function isoToHourMinute(iso: string | null, timeZone: string, now = new Date()) {
  const parts = getPartsInTimeZone(iso ? new Date(iso) : now, timeZone);
  return { hour: parts.hour, minute: parts.minute };
}

type KillTimePickerProps = {
  hour: string;
  minute: string;
  timeZone: string;
  onChange: (hour: string, minute: string) => void;
};

export function KillTimePicker({ hour, minute, timeZone, onChange }: KillTimePickerProps) {
  function applyOffsetMinutes(offsetMinutes: number) {
    const target = new Date(Date.now() - offsetMinutes * 60 * 1000);
    const parts = getPartsInTimeZone(target, timeZone);
    onChange(parts.hour, parts.minute);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="secondary" onClick={() => applyOffsetMinutes(0)}>
          Только что
        </Button>
        <Button type="button" variant="secondary" onClick={() => applyOffsetMinutes(5)}>
          5 мин назад
        </Button>
        <Button type="button" variant="secondary" onClick={() => applyOffsetMinutes(15)}>
          15 мин назад
        </Button>
      </div>

      <FieldGroup className="grid grid-cols-2 gap-3">
        <Field>
          <FieldLabel htmlFor="kill-hour">Час</FieldLabel>
          <select
            id="kill-hour"
            className="border-input bg-background h-12 w-full rounded-md border px-3 text-lg"
            value={hour}
            onChange={(event) => onChange(event.target.value, minute)}
          >
            {HOURS.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </Field>
        <Field>
          <FieldLabel htmlFor="kill-minute">Минута</FieldLabel>
          <select
            id="kill-minute"
            className="border-input bg-background h-12 w-full rounded-md border px-3 text-lg"
            value={minute}
            onChange={(event) => onChange(hour, event.target.value)}
          >
            {MINUTES.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </Field>
      </FieldGroup>

      <p className="text-muted-foreground text-base">
        Время убийства: <span className="text-foreground font-medium">{hour}:{minute}</span> ({timeZone})
      </p>
    </div>
  );
}
