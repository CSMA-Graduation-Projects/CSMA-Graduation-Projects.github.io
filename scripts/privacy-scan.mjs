#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const repositoryRoot = process.cwd();
const mode = process.argv.includes("--build")
  ? "build"
  : process.argv.includes("--history")
    ? "history"
    : "source";

const textExtensions = new Set([
  ".css", ".csv", ".html", ".js", ".json", ".md", ".mjs", ".sh",
  ".svg", ".txt", ".xml", ".yaml", ".yml",
]);

const patterns = [
  { type: "private-key header", regex: /-----BEGIN (?:RSA |EC |DSA |OPENSSH )?PRIVATE KEY-----/g },
  { type: "GitHub token format", regex: /\bgh[pousr]_[A-Za-z0-9]{20,}\b/g },
  { type: "AWS access-key format", regex: /\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/g },
  { type: "Google API-key format", regex: /\bAIza[0-9A-Za-z_-]{35}\b/g },
  { type: "credential assignment", regex: /\b(?:password|passwd|token|api[_-]?key|client[_-]?secret)\b\s*[:=]\s*["'][^"'\s]{8,}["']/gi },
  { type: "credential embedded in URL", regex: /https?:\/\/[^/\s:@]+:[^/\s@]+@/gi },
  { type: "email address", regex: /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi },
  { type: "mainland China mobile-number format", regex: /(?<!\d)1[3-9]\d{9}(?!\d)/g },
  { type: "mainland China identity-number format", regex: /(?<!\d)\d{17}[\dXx](?!\d)/g },
  { type: "label combining year, study level, and name-like identifier", regex: /\b20\d{2}-(?:ug|ms|phd)-[a-z]{5,}\b/gi },
  { type: "identity-oriented repository naming placeholder", regex: /YYYY-ug\/ms\/phd-studentname/gi },
  { type: "student-number field with numeric value", regex: /(?:学号|student[_ -]?id)\s*[:=：]\s*\d{6,}/gi },
  { type: "grade or ranking field with numeric value", regex: /(?:成绩|排名|grade|ranking)\s*[:=：]\s*\d+(?:\.\d+)?/gi },
];

const findings = new Map();

function scanText(scope, filePath, text) {
  for (const pattern of patterns) {
    pattern.regex.lastIndex = 0;
    let count = 0;
    while (pattern.regex.exec(text)) count += 1;
    if (count) findings.set(`${scope}\u0000${filePath}\u0000${pattern.type}`, { scope, filePath, type: pattern.type, count });
  }
}

function isTextFile(filePath) {
  return textExtensions.has(path.extname(filePath).toLowerCase());
}

function walk(directory, baseDirectory, files = []) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (entry.isSymbolicLink()) continue;
    const absolute = path.join(directory, entry.name);
    const relative = path.relative(baseDirectory, absolute);
    if (entry.isDirectory()) {
      if ([".git", "node_modules", "vendor", ".jekyll-cache", ".sass-cache"].includes(entry.name)) continue;
      if (mode === "source" && ["_site", "dist"].includes(entry.name)) continue;
      walk(absolute, baseDirectory, files);
    } else if (isTextFile(relative)) {
      files.push(relative);
    }
  }
  return files;
}

if (mode === "history") {
  const commits = execFileSync("git", ["rev-list", "--all"], { cwd: repositoryRoot, encoding: "utf8" })
    .trim().split(/\r?\n/).filter(Boolean);
  for (const commit of commits) {
    const files = execFileSync("git", ["ls-tree", "-r", "--name-only", commit], { cwd: repositoryRoot, encoding: "utf8" })
      .trim().split(/\r?\n/).filter((file) => isTextFile(file));
    for (const file of files) {
      try {
        const text = execFileSync("git", ["show", `${commit}:${file}`], {
          cwd: repositoryRoot,
          encoding: "utf8",
          maxBuffer: 10 * 1024 * 1024,
        });
        scanText(`commit ${commit.slice(0, 12)}`, file, text);
      } catch {
        // Ignore non-text or unavailable historical blobs; the path list is still bounded by text extensions.
      }
    }
  }
} else {
  const scanRoot = mode === "build" ? path.join(repositoryRoot, "_site") : repositoryRoot;
  if (!fs.existsSync(scanRoot)) {
    console.error(`${mode} scan root does not exist: ${scanRoot}`);
    process.exit(2);
  }
  for (const file of walk(scanRoot, scanRoot)) {
    if (mode === "source" && file === "scripts/privacy-scan.mjs") continue;
    scanText(mode, file, fs.readFileSync(path.join(scanRoot, file), "utf8"));
  }
}

if (findings.size === 0) {
  console.log(`Privacy scan (${mode}): no configured value-pattern findings.`);
  process.exit(0);
}

console.error(`Privacy scan (${mode}): ${findings.size} file/type finding(s). Values are intentionally suppressed.`);
for (const finding of [...findings.values()].sort((left, right) =>
  `${left.scope}/${left.filePath}/${left.type}`.localeCompare(`${right.scope}/${right.filePath}/${right.type}`))) {
  console.error(`- ${finding.scope}: ${finding.filePath} — ${finding.type} (${finding.count})`);
}
process.exit(1);
