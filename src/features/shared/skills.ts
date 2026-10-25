import type { z } from "zod";
import type { TaxonomySchema } from "@/contracts";

export type Taxonomy = z.output<typeof TaxonomySchema>;
export type TaxonomySkill = Taxonomy["skills"][number];
export type UiLanguage = "en" | "es" | "fr";

export const LANGUAGES: { value: UiLanguage; label: string }[] = [
  { value: "en", label: "English" },
  { value: "es", label: "Español" },
  { value: "fr", label: "Français" },
];

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export function skillLabel(id: string): string {
  return cap(id.replace(/-/g, " "));
}

export function skillHint(skill: TaxonomySkill, lang: string): string {
  const key = (["en", "es", "fr"].includes(lang) ? lang : "en") as UiLanguage;
  return skill.aliases[key].slice(0, 3).join(", ");
}

export function languageName(tag: string): string {
  const known = LANGUAGES.find((l) => l.value === tag);
  if (known) return known.label;
  try {
    return new Intl.DisplayNames([tag], { type: "language" }).of(tag) ?? tag;
  } catch {
    return tag;
  }
}
