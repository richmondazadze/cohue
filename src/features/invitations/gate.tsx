"use client";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { BearerTokenSchema } from "@/contracts";
import { Button, ButtonLink } from "@/components/ui/button";
import { ErrorNotice, Notice } from "@/components/ui/notice";
import { KeyValue, Panel, Skeleton } from "@/components/ui/surface";
import { useCommand } from "@/client/command";
import { callApi, isApiError } from "@/client/http";
import { keys, queryRetry } from "@/client/queries";
import { formatTimestamp } from "@/client/time";
import { languageName } from "@/features/shared/skills";

/**
 * Bearer-link landing. Preview is a non-consuming GET with minimal facts; the token is redeemed only
 * after the explicit "Open my invitation" action, then the URL is replaced so the token leaves history.
 */
export function InvitationGate({ token }: { token: string }) {
  const valid = BearerTokenSchema.safeParse(token).success;
  const router = useRouter();
  const client = useQueryClient();
  const preview = useQuery({
    // The key deliberately excludes the token; nothing token-bearing is cached beyond this page view.
    queryKey: keys.preview,
    queryFn: ({ signal }) => callApi("previewInvitation", { params: { token }, signal }),
    enabled: valid,
    gcTime: 0,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    retry: queryRetry,
  });
  const redeem = useCommand("redeemInvitation");

  if (!valid)
    return (
      <Notice tone="declined" role="alert" title="This invitation link is incomplete">
        Check that the whole link was copied, or ask the organizer to share it again.
      </Notice>
    );
  if (preview.isPending) return <Skeleton className="h-64 w-full rounded-panel" label="Checking invitation link" />;
  if (preview.isError) {
    const closed = isApiError(preview.error) && ["INVITATION_EXPIRED", "INVITATION_REVOKED", "NOT_FOUND"].includes(preview.error.code);
    return (
      <div className="flex flex-col gap-4">
        <ErrorNotice
          error={preview.error}
          title={closed ? "This invitation link no longer works" : undefined}
          onRetry={closed ? undefined : () => void preview.refetch()}
        />
        <ButtonLink href="/" variant="tertiary" size="sm">
          Go to COHUE home
        </ButtonLink>
      </div>
    );
  }
  const p = preview.data;
  return (
    <Panel data-tilt className="flex flex-col gap-5 p-5 md:p-8">
      <div>
        <p className="eyebrow">Invitation</p>
        <h1 className="type-experience mt-2">Someone would like you to join a mission.</h1>
        <p className="mt-3 max-w-[56ch] text-muted">
          Open it to read the full terms: the objective, your proposed role, responsibilities, schedule and who else is invited. Opening it does not accept anything.
        </p>
      </div>
      <dl className="m-0 rounded-field border border-line-panel px-4">
        <KeyValue label="Language">{languageName(p.language)}</KeyValue>
        <KeyValue label="Answer by">{formatTimestamp(p.expiresAt)}</KeyValue>
        <KeyValue label="Status">{p.available ? "Open for your answer" : "No longer available"}</KeyValue>
      </dl>
      <Notice tone="info" title="About this link">
        This link grants access to this one invitation only. It does not verify who you are, so keep it to yourself.
      </Notice>
      {p.available ? (
        <div className="flex flex-col gap-2">
          <Button
            variant="primary"
            className="w-full sm:w-auto sm:self-start"
            pending={redeem.isPending}
            pendingLabel="Opening invitation…"
            onClick={() =>
              redeem.mutate(
                { params: { token } },
                {
                  onSuccess: (r) => {
                    client.setQueryData(keys.session, r.session);
                    client.removeQueries({ queryKey: keys.preview });
                    // Replace (not push) so the bearer URL is not left in history.
                    router.replace(`/invitations/opened/${r.invitation.id}`);
                  },
                },
              )
            }
          >
            Open my invitation
          </Button>
          {redeem.isError ? <ErrorNotice error={redeem.error} /> : null}
        </div>
      ) : (
        <Notice tone="pending" title="This invitation can no longer be answered">
          It may have expired, been answered already, or been withdrawn. Nothing was accepted on your behalf.
        </Notice>
      )}
    </Panel>
  );
}
