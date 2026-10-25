"use client";
import type { MissionSnapshot } from "@/contracts";
import { StatusBadge, type Tone } from "@/components/ui/status";
import { Avatar } from "./proposals";

type Graph = MissionSnapshot["graph"];
type NodeStatus = Graph["nodes"][number]["status"];

export const nodeStatusCopy: Record<NodeStatus, { label: string; tone: Tone; icon?: string }> = {
  SUGGESTED: { label: "Suggested", tone: "neutral", icon: "┄" },
  PENDING: { label: "Pending response", tone: "pending" },
  ACCEPTED: { label: "Approved", tone: "approved" },
  DECLINED: { label: "Declined", tone: "declined" },
  EXCLUDED: { label: "Excluded", tone: "neutral", icon: "⊘" },
  ACTIVATED: { label: "Activated", tone: "activated" },
  PUBLIC_UNVERIFIED: { label: "Public resource · Unverified", tone: "evidence" },
  UNCOVERED: { label: "Not covered", tone: "pending", icon: "○" },
};

const KIND_LABEL = {
  mission: "Mission",
  requirement: "Requirements",
  participant: "People",
  opportunity: "Public resources",
} as const;

/** Fully equivalent text alternative to the graph: every node, its status and its relations. */
export function NetworkList({ graph }: { graph: Graph }) {
  if (!graph.nodes.length)
    return (
      <p className="text-sm text-muted">
        Nothing to map yet. People and requirements appear when the server projects them.
      </p>
    );
  const label = new Map(graph.nodes.map((n) => [n.id, n.label]));
  const groups = (["mission", "requirement", "participant", "opportunity"] as const)
    .map((kind) => ({ kind, nodes: graph.nodes.filter((n) => n.kind === kind) }))
    .filter((g) => g.nodes.length);
  return (
    <div className="flex flex-col gap-5">
      {groups.map((g) => (
        <section key={g.kind} aria-labelledby={`nl-${g.kind}`}>
          <h3 id={`nl-${g.kind}`} className="eyebrow mb-2">
            {KIND_LABEL[g.kind]} · {g.nodes.length}
          </h3>
          <ul className="m-0 list-none divide-y divide-line-subtle rounded-field border border-line-panel bg-surface p-0">
            {g.nodes.map((n) => {
              const s = nodeStatusCopy[n.status];
              const rel = graph.edges.filter((e) => e.source === n.id || e.target === n.id);
              return (
                <li key={n.id} className="flex flex-col gap-1 px-4 py-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="flex items-center gap-3">{n.kind === "participant" ? <Avatar name={n.label} avatarId={n.avatarId} /> : null}<span><span className="block font-medium">{n.label}</span>{n.username ? <span className="block type-meta text-muted">@{n.username}</span> : null}</span></span>
                    <StatusBadge tone={s.tone} icon={s.icon}>
                      {s.label}
                    </StatusBadge>
                  </div>
                  {rel.length && n.kind !== "mission" ? (
                    <p className="type-meta text-muted">
                      {rel
                        .map((e) => {
                          const other = e.source === n.id ? e.target : e.source;
                          return `${e.kind.toLowerCase()} → ${label.get(other) ?? "item"} (${nodeStatusCopy[e.status as NodeStatus]?.label.toLowerCase() ?? e.status})`;
                        })
                        .join(" · ")}
                    </p>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
