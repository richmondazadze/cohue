import { z } from "zod";
import { SkillIdSchema } from "./domain";
export const TaxonomySchema = z.strictObject({
  version: z.literal("taxonomy-1"),
  skills: z
    .array(
      z.strictObject({
        id: SkillIdSchema,
        category: z.string(),
        aliases: z.strictObject({
          en: z.array(z.string()),
          es: z.array(z.string()),
          fr: z.array(z.string()),
        }),
      }),
    )
    .min(1),
});
export const INITIAL_TAXONOMY = TaxonomySchema.parse({
  version: "taxonomy-1",
  skills: [
    {
      id: "design",
      category: "product",
      aliases: {
        en: ["designer", "user experience", "ux"],
        es: ["diseño", "diseñador"],
        fr: ["design", "concepteur"],
      },
    },
    {
      id: "hardware",
      category: "engineering",
      aliases: {
        en: ["hardware engineer", "electronics"],
        es: ["ingeniería de hardware", "electrónica"],
        fr: ["ingénieur matériel", "électronique"],
      },
    },
    {
      id: "software",
      category: "engineering",
      aliases: {
        en: ["developer", "programming"],
        es: ["programación", "desarrollador"],
        fr: ["développement", "programmation"],
      },
    },
    {
      id: "accessibility",
      category: "product",
      aliases: {
        en: ["accessible design", "a11y"],
        es: ["accesibilidad"],
        fr: ["accessibilité"],
      },
    },
    {
      id: "research",
      category: "research",
      aliases: {
        en: ["user research", "interviews"],
        es: ["investigación"],
        fr: ["recherche"],
      },
    },
    {
      id: "coordination",
      category: "operations",
      aliases: {
        en: ["project coordination", "organizing"],
        es: ["coordinación"],
        fr: ["coordination"],
      },
    },
  ],
});
