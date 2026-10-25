import type { Metadata } from "next";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/surface";
import { ParticipantHome } from "@/features/participants/home";

export const metadata: Metadata = { title: "My invitations" };

export default function MePage() {
  return (
    <main id="main" className="participant-main">
      <header className="participant-page-heading">
        <p className="eyebrow">Your corner of COHUE</p>
        <h1 className="participant-title">
          Your next <em>possibility.</em>
        </h1>
        <p className="participant-intro">
          A place for your invitations, your profile, and what comes next. Every
          commitment is yours to make.
        </p>
      </header>
      <Suspense
        fallback={
          <Skeleton
            className="h-64 w-full rounded-panel"
            label="Loading profile"
          />
        }
      >
        <ParticipantHome />
      </Suspense>
    </main>
  );
}
