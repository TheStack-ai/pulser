import { readFileSync, readdirSync, existsSync, lstatSync } from "fs";
import { join, resolve, sep } from "path";
import matter from "gray-matter";
import type { ParsedSkill, SkillFrontmatter } from "./types.js";

function expandHome(p: string): string {
  if (p.startsWith("~")) {
    return join(process.env.HOME || "", p.slice(1));
  }
  return p;
}

export function scanSkills(skillsDir: string, singleSkill?: string): ParsedSkill[] {
  const resolved = resolve(expandHome(skillsDir));

  if (!existsSync(resolved)) {
    return [];
  }

  let dirs: string[];

  if (singleSkill) {
    // Path traversal prevention: validate skill name stays within root
    const candidate = resolve(resolved, singleSkill);
    if (candidate !== resolved && !candidate.startsWith(resolved + sep)) {
      console.error(`  Error: skill path "${singleSkill}" escapes scan root. Skipping.`);
      return [];
    }
    dirs = [singleSkill];
  } else {
    dirs = readdirSync(resolved, { withFileTypes: true })
      .filter((d) => {
        if (!d.isDirectory()) return false; // Skip symlinks and files
        return existsSync(join(resolved, d.name, "SKILL.md"));
      })
      .map((d) => d.name);
  }

  return dirs
    .map((dirName) => {
      const dirPath = join(resolved, dirName);
      const filePath = join(dirPath, "SKILL.md");

      if (!existsSync(filePath)) return null;

      try {
        const raw = readFileSync(filePath, "utf-8");
        let data: Record<string, unknown> = {};
        let content = raw;

        try {
          const parsed = matter(raw);
          data = parsed.data;
          content = parsed.content;
        } catch {
          // Malformed YAML — continue with empty frontmatter
          console.error(`  Warning: failed to parse frontmatter in ${dirName}/SKILL.md — skipping frontmatter`);
        }

        const lineCount = raw.split("\n").length;

        const supportingFiles = readdirSync(dirPath, { withFileTypes: true })
          .filter((f) => f.name !== "SKILL.md" && f.isDirectory())
          .flatMap((f) => {
            try {
              return readdirSync(join(dirPath, f.name)).map((sf) => join(f.name, sf));
            } catch {
              return [];
            }
          })
          .concat(
            readdirSync(dirPath, { withFileTypes: true })
              .filter((f) => f.name !== "SKILL.md" && f.isFile())
              .map((f) => f.name)
          );

        return {
          dirName,
          filePath,
          dirPath,
          frontmatter: data as SkillFrontmatter,
          content,
          lineCount,
          supportingFiles,
        } satisfies ParsedSkill;
      } catch {
        // File read error — skip this skill entirely
        return null;
      }
    })
    .filter((s): s is ParsedSkill => s !== null);
}
