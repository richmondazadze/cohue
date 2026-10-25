"use client";
import type { AgentEvent } from "@/contracts";
import { agentMark, describeEvent, openStep } from "./model";

/** A projection of committed events, never invented model thoughts or optimistic command success. */
export function AgentBoard({ events, sequence, historical = false }: { events: AgentEvent[]; sequence: number; historical?: boolean }) {
  const visible = events.filter(event => event.sequence <= sequence);
  const step = openStep(visible);
  const recent = visible.filter(event => event.agent || event.type.startsWith("TOOL_") || event.type.startsWith("AGENT_")).slice(-4);
  return <section className="agent-board" aria-label={historical ? "Recorded agent work" : "Live agent work"}>
    <div className="agent-board-heading"><div><p className="eyebrow">{historical ? "Recorded work" : "Coordination in view"}</p><h3>{step ? "Working through the next connection." : "Every connection has a record."}</h3></div><span className="agent-board-sequence">Event {sequence}</span></div>
    <ol className="agent-work-chain">{recent.length ? recent.map(event => { const mark = agentMark(event.agent); return <li key={event.id}><span className="agent-work-dot" aria-hidden="true">{mark ?? "·"}</span><div><span className="agent-work-role">{event.agent?.toLowerCase().replaceAll("_", " ") ?? "Worker"}</span><p>{describeEvent(event, new Map())}</p><small>{event.status === "STARTED" ? "Started · awaiting a result" : event.status === "FAILED" ? "Could not finish" : "Recorded event"} · #{event.sequence}</small></div></li> }) : <li className="agent-board-empty"><p>No agent work recorded yet. Start discovery to build the network from your confirmed brief.</p></li>}</ol>
    <p className="agent-board-footnote">{historical ? "Historical events only. Replay does not run agents or change commitments." : "Updates come from the worker’s committed events. People approve their own terms."}</p>
  </section>;
}
