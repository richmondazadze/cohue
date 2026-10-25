"use client";
import "@xyflow/react/dist/base.css";
import { memo, useEffect, useMemo, useRef, useState } from "react";
import {
  Background,
  BackgroundVariant,
  Controls,
  Handle,
  Position,
  ReactFlow,
  ReactFlowProvider,
  type Edge,
  type Node,
  type NodeProps,
} from "@xyflow/react";
import ELK from "elkjs/lib/elk.bundled.js";
import type { MissionSnapshot } from "@/contracts";
import { cx } from "@/components/ui/cx";
import { useReducedMotionPreference } from "@/client/media";
import { initialsOf } from "./model";
import { nodeStatusCopy } from "./network-list";

type Graph = MissionSnapshot["graph"];
type GNode = Graph["nodes"][number];
type NodeData = { label: string; status: GNode["status"]; kind: GNode["kind"] };

const SIZE: Record<GNode["kind"], { w: number; h: number }> = {
  mission: { w: 200, h: 72 },
  requirement: { w: 160, h: 48 },
  participant: { w: 190, h: 56 },
  opportunity: { w: 200, h: 48 },
};

const elk = new ELK();

/** Deterministic layered layout (no force simulation). Returns positions keyed by stable node id. */
async function layout(graph: Graph, ids: Set<string>) {
  const res = await elk.layout({
    id: "root",
    layoutOptions: {
      "elk.algorithm": "layered",
      "elk.direction": "RIGHT",
      "elk.layered.spacing.nodeNodeBetweenLayers": "80",
      "elk.spacing.nodeNode": "28",
      "elk.layered.considerModelOrder.strategy": "NODES_AND_EDGES",
    },
    children: graph.nodes
      .filter((n) => ids.has(n.id))
      .sort((a, b) => a.id.localeCompare(b.id))
      .map((n) => ({ id: n.id, width: SIZE[n.kind].w, height: SIZE[n.kind].h })),
    edges: graph.edges
      .filter((e) => ids.has(e.source) && ids.has(e.target))
      .map((e) => ({ id: e.id, sources: [e.source], targets: [e.target] })),
  });
  return new Map((res.children ?? []).map((c) => [c.id, { x: c.x ?? 0, y: c.y ?? 0 }]));
}

const statusRing: Record<string, string> = {
  ACCEPTED: "border-approved text-approved bg-approved-bg",
  ACTIVATED: "border-activated text-activated bg-activated-bg",
  PENDING: "border-pending border-dashed text-pending bg-pending-bg",
  DECLINED: "border-declined text-declined bg-declined-bg",
  EXCLUDED: "border-line-control text-muted bg-subtle",
  SUGGESTED: "border-line-control border-dashed text-ink bg-surface",
  UNCOVERED: "border-pending border-dashed text-pending bg-surface",
  PUBLIC_UNVERIFIED: "border-evidence border-dotted text-evidence bg-evidence-bg",
};

const handles = (
  <>
    <Handle type="target" position={Position.Left} className="!size-1 !border-0 !bg-transparent" />
    <Handle type="source" position={Position.Right} className="!size-1 !border-0 !bg-transparent" />
  </>
);

const MissionNode = memo(function MissionNode({ data, selected }: NodeProps<Node<NodeData>>) {
  const activated = data.status === "ACTIVATED";
  return (
    <div
      className={cx(
        "flex h-[72px] w-[200px] flex-col justify-center rounded-panel border-2 border-action bg-selected px-4",
        activated && "outline-2 outline-offset-2 outline-activated border-activated",
        selected && "ring-2 ring-action ring-offset-2",
      )}
    >
      {handles}
      <span className="eyebrow !text-[10px]">{activated ? "Activated mission" : "The mission"}</span>
      <span className="truncate font-medium">{data.label}</span>
    </div>
  );
});

const RequirementNode = memo(function RequirementNode({ data, selected }: NodeProps<Node<NodeData>>) {
  return (
    <div
      className={cx(
        "flex h-12 w-40 items-center rounded-field border px-3 text-sm",
        data.status === "UNCOVERED" ? statusRing.UNCOVERED : "border-line-control bg-surface",
        selected && "ring-2 ring-action ring-offset-2",
      )}
    >
      {handles}
      <span className="truncate">{data.label}</span>
    </div>
  );
});

const ParticipantNode = memo(function ParticipantNode({ data, selected }: NodeProps<Node<NodeData>>) {
  const s = nodeStatusCopy[data.status];
  return (
    <div className="flex h-14 w-[190px] items-center gap-2">
      {handles}
      <span
        className={cx(
          "grid size-11 shrink-0 place-items-center rounded-full border-2 text-sm font-semibold",
          statusRing[data.status] ?? statusRing.SUGGESTED,
          selected && "ring-2 ring-action ring-offset-2",
        )}
      >
        {initialsOf(data.label)}
      </span>
      <span className="min-w-0">
        <span className="block truncate text-sm font-medium">{data.label}</span>
        <span className={cx("block text-xs", s.tone === "approved" ? "text-approved" : s.tone === "pending" ? "text-pending" : s.tone === "declined" ? "text-declined" : "text-muted")}>
          {s.icon ?? (s.tone === "approved" ? "✓" : s.tone === "pending" ? "◷" : s.tone === "declined" ? "−" : "")} {s.label}
        </span>
      </span>
    </div>
  );
});

const OpportunityNode = memo(function OpportunityNode({ data }: NodeProps<Node<NodeData>>) {
  return (
    <div className="flex h-12 w-[200px] items-center gap-2 text-sm text-evidence">
      {handles}
      <span className="size-7 shrink-0 border border-dotted border-evidence bg-evidence-bg" aria-hidden="true" />
      <span className="min-w-0 truncate">{data.label} · Unverified</span>
    </div>
  );
});

const nodeTypes = { mission: MissionNode, requirement: RequirementNode, participant: ParticipantNode, opportunity: OpportunityNode };

const edgeStyle = (status: string): React.CSSProperties => {
  switch (status) {
    case "ACCEPTED":
    case "ACTIVATED":
      return { stroke: "#216747", strokeWidth: 2 };
    case "PENDING":
      return { stroke: "#785317", strokeWidth: 2, strokeDasharray: "6 5" };
    case "DECLINED":
      return { stroke: "#A13F36", strokeWidth: 2, strokeDasharray: "2 8" };
    case "EXCLUDED":
      return { stroke: "#7B847C", strokeWidth: 1, strokeDasharray: "1 6" };
    case "PUBLIC_UNVERIFIED":
      return { stroke: "#466A84", strokeWidth: 1.5, strokeDasharray: "1 4" };
    default:
      return { stroke: "#7B847C", strokeWidth: 1.5, strokeDasharray: "5 5" };
  }
};

/** Phone focus view: mission, requirements and up to five people/resources (display budget, not a matching limit). */
function visibleIds(graph: Graph, compact: boolean): Set<string> {
  if (!compact || graph.nodes.length <= 8) return new Set(graph.nodes.map((n) => n.id));
  const rank = (n: GNode) =>
    n.kind === "mission" ? 0 : n.kind === "requirement" ? 1 : n.status === "ACCEPTED" || n.status === "PENDING" ? 2 : 3;
  return new Set([...graph.nodes].sort((a, b) => rank(a) - rank(b) || a.id.localeCompare(b.id)).slice(0, 8).map((n) => n.id));
}

function Canvas({ graph, compact }: { graph: Graph; compact: boolean }) {
  const reduced = useReducedMotionPreference();
  const [showAll, setShowAll] = useState(false);
  const ids = useMemo(() => visibleIds(graph, compact && !showAll), [graph, compact, showAll]);
  const idKey = useMemo(() => [...ids].sort().join(","), [ids]);
  const [positions, setPositions] = useState<Map<string, { x: number; y: number }>>(new Map());
  const generation = useRef(0);

  // Layout reruns only when the visible node/edge set changes; stale results are dropped by generation.
  const edgeKey = graph.edges.map((e) => `${e.source}>${e.target}`).sort().join(",");
  useEffect(() => {
    const gen = ++generation.current;
    void layout(graph, ids).then((p) => {
      if (gen === generation.current) setPositions(p);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idKey, edgeKey]);

  const nodes: Node<NodeData>[] = useMemo(
    () =>
      graph.nodes
        .filter((n) => ids.has(n.id) && positions.has(n.id))
        .map((n) => ({
          id: n.id,
          type: n.kind,
          position: positions.get(n.id) as { x: number; y: number },
          data: { label: n.label, status: n.status, kind: n.kind },
          ariaLabel: `${n.kind} ${n.label}: ${nodeStatusCopy[n.status].label}`,
          draggable: false,
          className: reduced ? undefined : "cohue-node-enter",
        })),
    [graph.nodes, ids, positions, reduced],
  );
  const edges: Edge[] = useMemo(
    () =>
      graph.edges
        .filter((e) => ids.has(e.source) && ids.has(e.target))
        .map((e) => ({ id: e.id, source: e.source, target: e.target, style: edgeStyle(e.status), focusable: false })),
    [graph.edges, ids],
  );
  const hidden = graph.nodes.length - ids.size;

  return (
    <div className={cx("cohue-graph graph-canvas relative h-[420px] overflow-hidden rounded-field border border-line-panel md:h-[480px]", reduced && "cohue-reduced")}>
      {positions.size ? (
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ padding: 0.2 }}
          minZoom={0.4}
          maxZoom={1.6}
          nodesDraggable={false}
          nodesConnectable={false}
          panOnScroll={false}
          zoomOnScroll={false}
          preventScrolling={false}
          proOptions={{ hideAttribution: true }}
          ariaLabelConfig={{ "node.a11yDescription.default": "Mission network node. Use the list view for full details." }}
        >
          <Background variant={BackgroundVariant.Dots} color="#DEDFD8" gap={24} size={1.2} />
          <Controls showInteractive={false} position="bottom-right" className="!shadow-float [&_button]:!size-11 [&_button]:!border-line-panel [&_button]:!bg-surface" />
        </ReactFlow>
      ) : (
        <p className="p-4 text-sm text-muted">Arranging the network…</p>
      )}
      {hidden > 0 || showAll ? (
        <button
          type="button"
          onClick={() => setShowAll((v) => !v)}
          className="absolute top-3 left-3 z-10 min-h-11 rounded-button border border-line-control bg-surface px-3 text-sm"
        >
          {showAll ? "Focus view" : `Show all (${hidden} more)`}
        </button>
      ) : null}
    </div>
  );
}

export default function GraphCanvas({ graph, compact }: { graph: Graph; compact: boolean }) {
  return (
    <ReactFlowProvider>
      <Canvas graph={graph} compact={compact} />
    </ReactFlowProvider>
  );
}
