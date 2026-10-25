"use client";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useCommand } from "@/client/command";
import { writeDeviceMemory } from "@/client/local";
import { ensureLiveSession, keys } from "@/client/queries";
import { Button } from "@/components/ui/button";
import { ErrorNotice } from "@/components/ui/notice";

const AVATARS = ["3d_1", "3d_2", "3d_3", "3d_4", "3d_5"] as const;
const USERNAME = /^[a-z][a-z0-9_]{2,23}$/;

/**
 * Organizer quick start: a username and an avatar are enough to start a mission and be recognised by the team.
 * The identity is never searchable for matching; completing the full profile later is how someone gets matched.
 */
export function QuickIdentity({ language }: { language: string }) {
  const client = useQueryClient();
  const create = useCommand("createParticipant");
  const [username, setUsername] = useState("");
  const [avatarId, setAvatarId] = useState<(typeof AVATARS)[number]>("3d_1");
  const [touched, setTouched] = useState(false);
  const [sessionError, setSessionError] = useState<unknown>(null);
  const clean = username.trim().toLowerCase();
  const invalid = !USERNAME.test(clean);

  const submit = async () => {
    setTouched(true);
    if (invalid || create.isPending) return;
    setSessionError(null);
    let session;
    try {
      session = await ensureLiveSession(client);
    } catch (e) {
      setSessionError(e);
      return;
    }
    create.mutate(
      {
        input: {
          username: clean,
          avatarId,
          displayName: clean,
          language,
          needs: [],
          interests: [],
          availability: [],
          capabilities: [],
          visibility: { publicGraph: false, discoverable: false },
          participationOptIn: false,
        },
      },
      {
        onSuccess: (participant) => {
          client.setQueryData(keys.participant(participant.id), participant);
          writeDeviceMemory((m) => ({ ...m, participantId: participant.id }), session);
        },
      },
    );
  };

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
    >
      <p>Pick a username and an avatar so your team knows who is organizing. That is all you need to start.</p>
      <label className="flex flex-col gap-1 text-sm font-medium" htmlFor="quick-username">
        Username
        <input
          id="quick-username"
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          maxLength={24}
          value={username}
          aria-invalid={touched && invalid}
          aria-describedby="quick-username-help"
          onChange={(e) => setUsername(e.target.value)}
          className="min-h-11 rounded-field border border-line-control bg-surface px-3 font-normal"
          placeholder="ada_builds"
        />
        <span id="quick-username-help" className={touched && invalid ? "type-meta text-declined" : "type-meta text-muted"}>
          3–24 letters, numbers or underscores, starting with a letter.
        </span>
      </label>
      <fieldset className="avatar-picker">
        <legend className="text-sm font-medium">Avatar</legend>
        <div role="group" aria-label="Choose your avatar">
          {AVATARS.map((id, i) => (
            <button key={id} type="button" aria-pressed={avatarId === id} aria-label={`Avatar ${i + 1}`} onClick={() => setAvatarId(id)}>
              <Image src={`/avatars/${id}.png`} width={64} height={64} alt="" />
            </button>
          ))}
        </div>
      </fieldset>
      {create.isError ? <ErrorNotice error={create.error} title="That username couldn't be saved. Try another." /> : null}
      {sessionError ? <ErrorNotice error={sessionError} title="Could not start a session" /> : null}
      <div className="flex flex-wrap items-center gap-4">
        <Button type="submit" size="sm" variant="primary" pending={create.isPending} pendingLabel="Saving…">
          Continue as organizer
        </Button>
        <Link href="/join" className="type-meta underline">
          Want to be matched into missions too? Create a full profile
        </Link>
      </div>
      <p className="type-meta text-muted">Organizer identities aren&apos;t searchable for matching. You can add skills and times later.</p>
    </form>
  );
}
