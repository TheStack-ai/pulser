import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync, copyFileSync, renameSync } from "fs";
import { join, dirname } from "path";

const PULSER_DIR = join(process.env.HOME || "", ".pulser");
const BACKUPS_DIR = join(PULSER_DIR, "backups");

export interface BackupManifest {
  timestamp: string;
  files: { original: string; backup: string; skillName: string }[];
}

function ensureDir(dir: string): void {
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

export function createBackup(files: { path: string; skillName: string }[]): BackupManifest {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupDir = join(BACKUPS_DIR, timestamp);
  ensureDir(backupDir);

  const manifest: BackupManifest = {
    timestamp,
    files: [],
  };

  for (const file of files) {
    const skillBackupDir = join(backupDir, file.skillName);
    ensureDir(skillBackupDir);
    const backupPath = join(skillBackupDir, "SKILL.md.bak");
    copyFileSync(file.path, backupPath);
    manifest.files.push({
      original: file.path,
      backup: backupPath,
      skillName: file.skillName,
    });
  }

  writeFileSync(
    join(backupDir, "manifest.json"),
    JSON.stringify(manifest, null, 2)
  );

  return manifest;
}

export function atomicWrite(filePath: string, content: string): void {
  const tmpPath = filePath + ".tmp";
  writeFileSync(tmpPath, content, "utf-8");
  renameSync(tmpPath, filePath);
}

export function listBackups(): BackupManifest[] {
  ensureDir(BACKUPS_DIR);
  return readdirSync(BACKUPS_DIR)
    .sort()
    .reverse()
    .map((dir) => {
      const manifestPath = join(BACKUPS_DIR, dir, "manifest.json");
      if (!existsSync(manifestPath)) return null;
      try {
        return JSON.parse(readFileSync(manifestPath, "utf-8")) as BackupManifest;
      } catch {
        return null;
      }
    })
    .filter((m): m is BackupManifest => m !== null);
}

export function restoreBackup(timestamp?: string): { restored: number; timestamp: string } | null {
  const backups = listBackups();
  if (backups.length === 0) return null;

  const target = timestamp
    ? backups.find((b) => b.timestamp === timestamp)
    : backups[0]; // most recent

  if (!target) return null;

  let restored = 0;
  for (const file of target.files) {
    if (existsSync(file.backup)) {
      copyFileSync(file.backup, file.original);
      restored++;
    }
  }

  return { restored, timestamp: target.timestamp };
}
