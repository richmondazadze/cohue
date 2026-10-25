import type { Metadata } from "next";
import { Landing } from "@/features/landing/landing";

export const metadata: Metadata = {
  title: { absolute: "COHUE — Find your people. Make it happen." },
  description: "Turn an idea into a team that can actually make it happen. COHUE brings together skills, shared time, explicit decisions, and a clear place to start.",
};

export default function HomePage() {
  return <Landing />;
}
