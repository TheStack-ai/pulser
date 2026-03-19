# pulser

> Take your skill's pulse.

Diagnose and fix your Claude Code skills — based on Anthropic's published principles from ["Building Claude Code: How We Use Skills"](https://code.claude.com/docs/en/skills).

```
$ npx pulser

  _╭─╮_╭─╮_╭─╮_______
       pulser v0.1.0
  Diagnose your Claude Code skills

  ╭──────────────────────────────────────────────╮
  │  cross-verified-research  research (58%)  ✓  │
  │  ✓ All rules passed                          │
  ╰──────────────────────────────────────────────╯
  ╭──────────────────────────────────────────────────────╮
  │  reasoning-tracer  analysis (73%)                    │
  │  ⚠ GOTCHAS        No Gotchas section found           │
  │  ⚠ ALLOWED-TOOLS  Bash in allowed-tools              │
  ╰──────────────────────────────────────────────────────╯

  💊 Rx #1 — reasoning-tracer
  [GOTCHAS] Add Gotchas section
    Why: Anthropic's highest-ROI improvement
    Suggestion:
    ## Gotchas
    1. Do not modify files — this skill is read-only
    2. Check git status before analyzing
    3. Keep output under 3000 lines
```

## What it does

Pulser scans your `SKILL.md` files and checks them against **8 diagnostic rules** derived from Anthropic's internal skill-building principles:

| Rule | What it checks |
|------|---------------|
| `frontmatter` | Required `name` and `description` fields |
| `description` | Trigger keywords, "Use when" pattern, length |
| `file-size` | SKILL.md under 500 lines |
| `gotchas` | Gotchas section with failure patterns |
| `allowed-tools` | Tool restrictions appropriate for skill type |
| `structure` | Supporting files for large skills |
| `conflicts` | Trigger keyword overlap between skills |
| `usage-hooks` | Skill usage logging hook installed |

Each skill is **auto-classified** by type (analysis, research, generation, execution, reference) with confidence scoring, and prescriptions are tailored to the detected type.

## Install

```bash
npm install -g pulser-cli
```

## Run

```bash
pulser
```

## Usage

```bash
# Scan default path (~/.claude/skills/)
npx pulser

# Scan a specific directory
npx pulser ./my-skills/

# Scan a single skill
npx pulser --skill reasoning-tracer

# JSON output (for CI/automation)
npx pulser --format json

# Markdown report
npx pulser --format md

# Treat warnings as errors
npx pulser --strict

# Include experimental rules
npx pulser --all

# Disable animation (non-TTY)
npx pulser --no-anim
```

## Exit Codes

| Code | Meaning |
|------|---------|
| `0` | All rules passed |
| `1` | Errors found |
| `2` | Warnings found (with `--strict`) |

## The 7 Principles

Based on Anthropic's published guidance:

1. **Don't state the obvious** — Skills should teach Claude things it doesn't already know
2. **Add Gotchas sections** — Document failure patterns to prevent repeated mistakes
3. **Use the file system** — Split large skills into supporting files
4. **Don't put the agent on rails** — Give information, not rigid scripts
5. **Design the setup process** — Config files for skill initialization
6. **Description is for the model** — Write trigger conditions, not human summaries
7. **Store scripts, generate code** — Pre-built scripts + Claude assembles

## Patient Monitor TUI

When running in a TTY terminal, pulser displays a hospital-style patient monitor with real-time waveform animation:

- **Green ECG waveform** — Skills being scanned
- **Green capnography** — Rules pass/warn/fail counts
- **Cyan plethysmograph** — Health score
- **Yellow respiratory** — Prescription count
- **Flatline** — No skills found
- **Erratic** — Errors detected

Disable with `--no-anim` or pipe to a file.

## Roadmap

- [x] **v0.1** — Read-only diagnostics + prescriptions + TUI
- [ ] **v0.5** — `--fix` auto-apply with backup/undo
- [ ] **v1.0** — `--install-hooks` + community launch

## License

MIT — [whynowlab](https://github.com/whynowlab)
