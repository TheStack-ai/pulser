import type { Rule, Diagnostic, ParsedSkill, SkillClassification } from "../types.js";

export const gotchasRule: Rule = {
  name: "gotchas",
  tier: "recommended",
  run(skill: ParsedSkill, _classification: SkillClassification): Diagnostic[] {
    const hasGotchas = /^##\s+Gotchas/m.test(skill.content);

    if (!hasGotchas) {
      return [{
        rule: "gotchas",
        tier: "recommended",
        severity: "warning",
        message: "No Gotchas section found",
        detail: "Anthropic's #1 ROI improvement: document common failure patterns so the model doesn't repeat them. Add a '## Gotchas' section with numbered items.",
      }];
    }

    const gotchasMatch = skill.content.match(/^##\s+Gotchas\s*\n([\s\S]*?)(?=\n##\s|$)/m);
    if (gotchasMatch) {
      const gotchasContent = gotchasMatch[1].trim();
      const hasNumberedItems = /^\d+\.\s/m.test(gotchasContent);
      if (!hasNumberedItems) {
        return [{
          rule: "gotchas",
          tier: "recommended",
          severity: "warning",
          message: "Gotchas section exists but has no numbered items",
          detail: "Add at least one numbered gotcha: '1. Don't do X because Y'",
        }];
      }
    }

    return [];
  },
};
