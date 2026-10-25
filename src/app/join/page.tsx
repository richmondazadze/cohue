import type { Metadata } from "next";
import { Onboarding } from "@/features/participants/onboarding";

export const metadata: Metadata = { title: "Join" };

export default function JoinPage() {
  return (
    <main id="main" className="participant-main">
      <header className="participant-page-heading">
        <p className="eyebrow">Join the network</p>
        <h1 className="participant-title">
          Good things start with <em>you.</em>
        </h1>
        <p className="participant-intro">
          Your profile is used only to propose you for missions you can then
          accept or decline. Type your profile or record a draft, then review it
          before saving.
        </p>
      </header>
      <Onboarding />
    </main>
  );
}
