import { CommitmentTermsSchema, type CommitmentTerms } from "./domain";

/** UTF-8 JSON input to SHA-256. No revision/profile/translation metadata participates. */
export function canonicalTermsJson(input: CommitmentTerms): string {
  const terms = CommitmentTermsSchema.parse(input);
  const canonicalize = (value: unknown): unknown => {
    if (typeof value === "string") return value.normalize("NFC");
    if (Array.isArray(value)) return value.map(canonicalize);
    if (value !== null && typeof value === "object")
      return Object.fromEntries(
        Object.entries(value)
          .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
          .map(([key, item]) => [key, canonicalize(item)]),
      );
    return value;
  };
  return JSON.stringify(
    canonicalize({
      ...terms,
      disclosedGroup: [...terms.disclosedGroup].sort((a, b) =>
        a.participantId < b.participantId
          ? -1
          : a.participantId > b.participantId
            ? 1
            : 0,
      ),
    }),
  );
}
