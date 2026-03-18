import { readFileSync, readdirSync, existsSync, statSync } from "fs";
import { join, resolve } from "path";
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

  const dirs = singleSkill
    ? [singleSkill]
    : readdirSync(resolved).filter((d) => {
        const fullPath = join(resolved, d);
        return statSync(fullPath).isDirectory() && existsSync(join(fullPath, "SKILL.md"));
      });

  return dirs
    .map((dirName) => {
      const dirPath = join(resolved, dirName);
      const filePath = join(dirPath, "SKILL.md");

      if (!existsSync(filePath)) return null;

      const raw = readFileSync(filePath, "utf-8");
      const { data, content } = matter(raw);
      const lineCount = raw.split("\n").length;

      const supportingFiles = readdirSync(dirPath)
        .filter((f) => f !== "SKILL.md")
        .flatMap((f) => {
          const fp = join(dirPath, f);
          if (statSync(fp).isDirectory()) {
            try {
              return readdirSync(fp).map((sf) => join(f, sf));
            } catch {
              return [f];
            }
          }
          return [f];
        });

      return {
        dirName,
        filePath,
        dirPath,
        frontmatter: data as SkillFrontmatter,
        content,
        lineCount,
        supportingFiles,
      } satisfies ParsedSkill;
    })
    .filter((s): s is ParsedSkill => s !== null);
}
