"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ErrorNotice } from "@/components/ui/notice";
import { QrCode } from "@/components/qr/qr-code";
import { useCommand } from "@/client/command";
import { formatTimestamp } from "@/client/time";

export function invitationUrl(token: string): string {
  // The configured public URL wins for deployed links; a localhost value (dev default) defers to the live origin.
  const configured = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");
  const base =
    configured && !/^https?:\/\/(localhost|127\.0\.0\.1)(:|$)/.test(configured)
      ? configured
      : window.location.origin;
  return `${base}/invitations/${token}`;
}

/**
 * Owner-issued share link + QR for one invitation. The bearer token lives only in this component's
 * memory: never stored, logged or placed in this page's URL. Showing a link is not a delivery claim.
 */
export function ShareLink({
  invitationId,
  personLabel,
  onOpenHere,
}: {
  invitationId: string;
  personLabel: string;
  onOpenHere?: (url: string) => void;
}) {
  const issue = useCommand("issueInvitationLink");
  const [link, setLink] = useState<{ url: string; expiresAt: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [confirmRotate, setConfirmRotate] = useState(false);

  const run = (rotate: boolean) =>
    issue.mutate(
      { params: { id: invitationId }, input: { rotate } },
      {
        onSuccess: (r) => {
          setLink({ url: invitationUrl(r.token), expiresAt: r.expiresAt });
          setCopied(false);
          setConfirmRotate(false);
        },
      },
    );

  if (!link)
    return (
      <div className="flex flex-col gap-2">
        <Button
          size="sm"
          onClick={() => run(false)}
          pending={issue.isPending}
          pendingLabel="Preparing link…"
        >
          Show invitation link &amp; QR
        </Button>
        {issue.isError ? <ErrorNotice error={issue.error} onRetry={() => run(false)} /> : null}
      </div>
    );

  return (
    <div className="flex flex-col gap-3 rounded-field border border-line-panel bg-subtle p-4 sm:flex-row sm:items-start">
      <QrCode value={link.url} size={168} label={`QR code for ${personLabel}'s invitation link`} />
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <p className="type-compact">Invitation link for {personLabel}</p>
        <p className="type-meta text-muted">
          Share it yourself, in person or by message. COHUE does not send it. Anyone holding the link can open this one invitation, so share it only with {personLabel}.
        </p>
        <input
          readOnly
          aria-label={`Invitation link for ${personLabel}`}
          value={link.url}
          onFocus={(e) => e.currentTarget.select()}
          className="w-full rounded-field border border-line-control bg-surface px-3 py-2 text-sm"
        />
        <p className="type-meta text-muted">Expires {formatTimestamp(link.expiresAt)}</p>
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="primary"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(link.url);
                setCopied(true);
              } catch {
                setCopied(false);
              }
            }}
          >
            {copied ? "✓ Copied" : "Copy link"}
          </Button>
          {onOpenHere ? (
            <Button size="sm" onClick={() => onOpenHere(link.url)}>
              Open on this device
            </Button>
          ) : null}
          <Button size="sm" variant="tertiary" onClick={() => setLink(null)}>
            Hide
          </Button>
          {confirmRotate ? (
            <Button
              size="sm"
              variant="decline"
              pending={issue.isPending}
              pendingLabel="Replacing link…"
              onClick={() => run(true)}
            >
              Confirm: disable old link
            </Button>
          ) : (
            <Button size="sm" variant="tertiary" onClick={() => setConfirmRotate(true)}>
              Replace link
            </Button>
          )}
        </div>
        {copied ? (
          <p role="status" className="type-meta text-approved">
            Link copied. Nothing has been sent.
          </p>
        ) : null}
        {issue.isError ? <ErrorNotice error={issue.error} /> : null}
      </div>
    </div>
  );
}
