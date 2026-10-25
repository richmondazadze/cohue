"use client";
import dynamic from "next/dynamic";
import { useState } from "react";
import type { MissionSnapshot } from "@/contracts";
import { Skeleton } from "@/components/ui/surface";
import { cx } from "@/components/ui/cx";
import { useMediaQuery } from "@/client/media";
import { NetworkList } from "./network-list";

const GraphCanvas = dynamic(() => import("./graph"), {
  ssr: false,
  loading: () => <Skeleton className="h-[420px] w-full" label="Loading network map" />,
});

/** Network section: the list is always available; the spatial graph is an optional enhancement. */
export function NetworkView({ snapshot }: { snapshot: MissionSnapshot }) {
  const phone = useMediaQuery("(max-width: 389px)");
  const compact = useMediaQuery("(max-width: 767px)");
  const [mode, setMode] = useState<"graph" | "list" | null>(null);
  const view = mode ?? (phone ? "list" : "graph");
  return (
    <div className="flex flex-col gap-3">
      <div role="group" aria-label="Network display" className="flex gap-2">
        {(["graph", "list"] as const).map((m) => (
          <button
            key={m}
            type="button"
            aria-pressed={view === m}
            onClick={() => setMode(m)}
            className={cx(
              "min-h-11 rounded-button border px-3 text-sm font-medium",
              view === m ? "border-action bg-selected text-action" : "border-line-control hover:bg-hover",
            )}
          >
            {m === "graph" ? "Map" : "List"}
          </button>
        ))}
      </div>
      {view === "graph" ? <GraphCanvas graph={snapshot.graph} compact={compact} /> : <NetworkList graph={snapshot.graph} />}
      <p className="type-meta text-muted">
        Dashed: suggested or pending · solid green: approved · dotted blue: public resource, unverified. The list shows the same information.
      </p>
    </div>
  );
}
