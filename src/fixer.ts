import { readFileSync } from "fs";
import { realpathSync } from "fs";
import { sep } from "path";
import matter from "gray-matter";
import type { Prescription, ParsedSkill } from "./types.js";
import { createBackup, atomicWrite } from "./backup.js";
import chalk from "chalk";

interface FixResult {
  skillName: string;
  rule: string;
  applied: boolean;
  diff: string;
}

function validatePath(filePath: string, expectedRoot: string): boolean {
  try {
    const real = realpathSync(filePath);
    return real === expectedRoot || real.startsWith(expectedRoot + sep);
  } catch {
    return false;
  }
}

export function previewFixes(
  prescriptions: Prescription[],
  skills: ParsedSkill[]
): { fixable: Prescription[]; manual: Prescription[] } {
  const fixable = prescriptions.filter((rx) => rx.autoFixable);
  const manual = prescriptions.filter((rx) => !rx.autoFixable);
  return { fixable, manual };
}

export function applyFixes(
  prescriptions: Prescription[],
  skills: ParsedSkill[],
  rootPath: string
): FixResult[] {
  const fixable = prescriptions.filter((rx) => rx.autoFixable && rx.skillName !== "SYSTEM");
  if (fixable.length === 0) return [];

  // Group by skill
  const bySkill = new Map<string, Prescription[]>();
  for (const rx of fixable) {
    const existing = bySkill.get(rx.skillName) || [];
    existing.push(rx);
    bySkill.set(rx.skillName, existing);
  }

  // Create backup for all affected skills
  const affectedSkills = [...bySkill.keys()]
    .map((name) => skills.find((s) => s.dirName === name))
    .filter((s): s is ParsedSkill => s !== null);

  const backupFiles = affectedSkills.map((s) => ({
    path: s.filePath,
    skillName: s.dirName,
  }));

  const manifest = createBackup(backupFiles);
  console.log(chalk.dim(`  Backup created: ${manifest.timestamp}`));

  const results: FixResult[] = [];

  for (const [skillName, rxList] of bySkill) {
    const skill = skills.find((s) => s.dirName === skillName);
    if (!skill) continue;

    // Path security check
    if (!validatePath(skill.filePath, realpathSync(rootPath))) {
      results.push({
        skillName,
        rule: "security",
        applied: false,
        diff: "Path validation failed — skipped",
      });
      continue;
    }

    try {
      let raw = readFileSync(skill.filePath, "utf-8");
      const { data, content } = matter(raw);

      let modified = false;
      const diffs: string[] = [];

      for (const rx of rxList) {
        switch (rx.rule) {
          case "gotchas": {
            if (!/^##\s+Gotchas/m.test(content)) {
              raw = raw.trimEnd() + "\n\n" + rx.suggestion + "\n";
              diffs.push(`+ ${rx.suggestion.split("\n")[0]}`);
              modified = true;
            }
            break;
          }

          case "allowed-tools": {
            if (!data["allowed-tools"]) {
              // Add allowed-tools to frontmatter
              const fmEnd = raw.indexOf("---", 4);
              if (fmEnd > 0) {
                raw = raw.slice(0, fmEnd) + `${rx.suggestion}\n` + raw.slice(fmEnd);
                diffs.push(`+ ${rx.suggestion}`);
                modified = true;
              }
            } else if (rx.title.includes("Remove Bash")) {
              raw = raw.replace(
                /^(allowed-tools:.*),?\s*Bash\s*,?\s*/m,
                (match) => {
                  const cleaned = match
                    .replace(/,?\s*Bash\s*,?/g, ", ")
                    .replace(/,\s*,/g, ",")
                    .replace(/,\s*$/, "")
                    .replace(/:\s*,\s*/, ": ");
                  return cleaned;
                }
              );
              diffs.push(`- allowed-tools: ...Bash...`);
              diffs.push(`+ ${rx.suggestion}`);
              modified = true;
            }
            break;
          }

          case "frontmatter": {
            if (rx.title.includes("name") && !data.name) {
              const fmEnd = raw.indexOf("---", 4);
              if (fmEnd > 0) {
                raw = raw.slice(0, fmEnd) + `${rx.suggestion}\n` + raw.slice(fmEnd);
                diffs.push(`+ ${rx.suggestion}`);
                modified = true;
              }
            }
            break;
          }
        }

        results.push({
          skillName,
          rule: rx.rule,
          applied: modified,
          diff: diffs.join("\n") || "no change",
        });
      }

      if (modified) {
        // Validate the modified content parses correctly
        try {
          matter(raw);
        } catch {
          console.log(chalk.red(`  Error: modified ${skillName}/SKILL.md has invalid YAML — skipped`));
          continue;
        }
        atomicWrite(skill.filePath, raw);
      }
    } catch (e) {
      results.push({
        skillName,
        rule: "error",
        applied: false,
        diff: String(e),
      });
    }
  }

  return results;
}
