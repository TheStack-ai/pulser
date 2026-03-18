import type { Rule, Diagnostic, ParsedSkill, SkillClassification } from "../types.js";

export const frontmatterRule: Rule = {
  name: "frontmatter",
  tier: "core",
  run(skill: ParsedSkill, _classification: SkillClassification): Diagnostic[] {
    const diagnostics: Diagnostic[] = [];
    const fm = skill.frontmatter;

    if (!fm.name) {
      diagnostics.push({
        rule: "frontmatter",
        tier: "core",
        severity: "error",
        message: "Missing `name` field in frontmatter",
        detail: `Add \`name: ${skill.dirName}\` to your SKILL.md frontmatter`,
      });
    }

    if (!fm.description) {
      diagnostics.push({
        rule: "frontmatter",
        tier: "core",
        severity: "error",
        message: "Missing `description` field in frontmatter",
        detail: "Claude uses description to decide when to invoke your skill. Without it, your skill will never be auto-triggered.",
      });
    }

    return diagnostics;
  },
};
