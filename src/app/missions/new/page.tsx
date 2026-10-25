import type { Metadata } from "next";
import { PageFrame } from "@/components/shell/app-shell";
import { Composer } from "@/features/missions/composer";

export const metadata: Metadata = { title: "Start a mission" };

export default function NewMissionPage() {
  return (
    <PageFrame width="form">
      <header className="participant-page-heading"><p className="eyebrow">Create a mission</p>
      <h1 className="participant-title">Every possibility<br/>starts with <em>an idea.</em></h1>
      <p className="participant-intro">
        Confirm requirements, time and participation before discovery begins. Nothing is sent to anyone from this page.
      </p>
      </header>
      <Composer />
    </PageFrame>
  );
}
