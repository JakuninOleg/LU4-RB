"use client";

import { useEffect, useState } from "react";
import { ChevronDownIcon } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "lu4-rb-collapsed-groups";

function readCollapsed(): Record<string, boolean> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Record<string, boolean>;
  } catch {
    return {};
  }
}

function writeCollapsed(map: Record<string, boolean>) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
}

export function BossGroupSection({
  groupId,
  title,
  count,
  children,
  defaultOpen = true,
}: {
  groupId: string;
  title: string;
  count: number;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const collapsed = readCollapsed();
    if (groupId in collapsed) {
      setOpen(!collapsed[groupId]);
    }
    setReady(true);
  }, [groupId]);

  function onOpenChange(next: boolean) {
    setOpen(next);
    const collapsed = readCollapsed();
    collapsed[groupId] = !next;
    writeCollapsed(collapsed);
  }

  return (
    <Collapsible open={open} onOpenChange={onOpenChange} className="flex flex-col gap-0">
      <CollapsibleTrigger
        className={cn(
          "bg-card group flex w-full items-center justify-between gap-3 rounded-xl border px-4 py-3 text-left transition-colors",
          "hover:bg-muted/60 focus-visible:ring-ring outline-none focus-visible:ring-2",
          open && "rounded-b-none border-b-transparent",
        )}
      >
        <div className="flex min-w-0 items-baseline gap-3">
          <h2 className="font-heading text-2xl font-semibold tracking-wide">{title}</h2>
          <span className="text-muted-foreground text-sm tabular-nums">{count} РБ</span>
        </div>
        <ChevronDownIcon
          className={cn(
            "text-muted-foreground size-5 shrink-0 transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]",
            open && "rotate-180",
          )}
        />
      </CollapsibleTrigger>

      <CollapsibleContent
        keepMounted
        className={cn(
          "grid transition-[grid-template-rows,opacity] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]",
          open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
          !ready && "transition-none",
        )}
      >
        <div className="overflow-hidden">
          <div
            className={cn(
              "bg-card rounded-b-xl border border-t-0 transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]",
              open ? "translate-y-0" : "-translate-y-1",
            )}
          >
            {children}
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
