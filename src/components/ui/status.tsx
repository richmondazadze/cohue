import type { ReactNode } from "react";
import type { Invitation, MissionState } from "@/contracts";
import { cx } from "./cx";

export type Tone =
  | "neutral"
  | "action"
  | "approved"
  | "pending"
  | "declined"
  | "evidence"
  | "activated";

const toneClass: Record<Tone, string> = {
  neutral: "text-muted border-line-control bg-surface",
  action: "text-action border-action bg-selected",
  approved: "text-approved border-approved bg-approved-bg",
  pending: "text-pending border-pending bg-pending-bg",
  declined: "text-declined border-declined bg-declined-bg",
  evidence: "text-evidence border-evidence bg-evidence-bg",
  activated: "text-activated border-activated bg-activated-bg",
};
const toneIcon: Record<Tone, string> = {
  neutral: "○",
  action: "●",
  approved: "✓",
  pending: "◷",
  declined: "−",
  evidence: "■",
  activated: "◎",
};

/** Status always carries an icon and a text label; color is never the only signal. */
export function StatusBadge({
  tone,
  children,
  icon,
  className,
}: {
  tone: Tone;
  children: ReactNode;
  icon?: string;
  className?: string;
}) {
  return (
    <span
      className={cx(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs leading-[18px] font-medium whitespace-normal",
        toneClass[tone],
        className,
      )}
    >
      <span aria-hidden="true">{icon ?? toneIcon[tone]}</span>
      {children}
    </span>
  );
}

export const missionStateCopy: Record<
  MissionState,
  { label: string; tone: Tone; explain: string }
> = {
  DRAFT: {
    label: "Draft",
    tone: "neutral",
    explain: "Reviewed brief saved. Discovery has not started.",
  },
  PLANNING: {
    label: "Planning",
    tone: "pending",
    explain: "The planner is working from your confirmed requirements.",
  },
  DISCOVERING: {
    label: "Discovering",
    tone: "pending",
    explain: "Searching opted-in people who match the hard constraints.",
  },
  PROPOSED: {
    label: "Proposal ready",
    tone: "action",
    explain: "Review the proposed groups. Nobody has been invited yet.",
  },
  AWAITING_APPROVAL: {
    label: "Awaiting approval",
    tone: "pending",
    explain: "Invitations are ready. Each person decides for themselves.",
  },
  REPLANNING: {
    label: "Replanning",
    tone: "pending",
    explain: "A response changed the group. Looking for a valid repair.",
  },
  REPROPOSED: {
    label: "Repaired proposal",
    tone: "action",
    explain: "A repaired group is ready for your review. Changed terms need fresh consent.",
  },
  ACTIVATED: {
    label: "Activated",
    tone: "activated",
    explain: "Every required person approved. The Mission Room is open.",
  },
  PAUSED_FOR_HUMAN: {
    label: "Needs your input",
    tone: "pending",
    explain: "Work is paused until you review the reason below.",
  },
  FAILED: {
    label: "Failed",
    tone: "declined",
    explain: "A step failed. Nothing was confirmed on anyone's behalf.",
  },
  CANCELLED: {
    label: "Cancelled",
    tone: "neutral",
    explain: "This mission was cancelled. Commitments were released.",
  },
  EXPIRED: {
    label: "Expired",
    tone: "neutral",
    explain: "This mission expired before activation.",
  },
};

export function MissionStateBadge({ state }: { state: MissionState }) {
  const c = missionStateCopy[state];
  return <StatusBadge tone={c.tone}>{c.label}</StatusBadge>;
}

export const invitationStatusCopy: Record<
  Invitation["status"],
  { label: string; tone: Tone }
> = {
  PENDING: { label: "Pending response", tone: "pending" },
  ACCEPTED: { label: "Approved", tone: "approved" },
  DECLINED: { label: "Declined", tone: "declined" },
  COUNTERPROPOSED: { label: "Suggested a change", tone: "pending" },
  EXPIRED: { label: "Expired", tone: "neutral" },
  REVOKED: { label: "Withdrawn", tone: "neutral" },
};

export function InvitationStatusBadge({
  status,
}: {
  status: Invitation["status"];
}) {
  const c = invitationStatusCopy[status];
  return (
    <StatusBadge
      tone={c.tone}
      icon={status === "COUNTERPROPOSED" ? "↔" : undefined}
    >
      {c.label}
    </StatusBadge>
  );
}
