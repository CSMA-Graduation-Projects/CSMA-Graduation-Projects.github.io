#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const expectedPages = [
  "index.html",
  "bachelor.html",
  "undergraduate-research.html",
  "master.html",
  "doctor.html",
  "milestones.html",
  "projects.html",
  "outcomes.html",
  "templates.html",
  "archive.html",
  "faq.html",
  "about.html",
];
const legacyIds = {
  "index.html": [
    "top", "home", "hjp.", "philosophy", "理念", "programs", "overview",
    "timeline", "ug-timeline", "outcomes", "naming", "structure", "templates",
    "organization", "management", "faq", "nav-toggle", "main-nav", "back-to-top",
  ],
  "bachelor.html": ["top", "nav-toggle", "main-nav", "back-to-top"],
  "master.html": ["top", "nav-toggle", "main-nav", "back-to-top"],
  "doctor.html": ["top", "nav-toggle", "main-nav", "back-to-top"],
  "templates.html": [
    "top", "weekly", "survey", "proposal", "midterm", "thesis-check",
    "archive-template", "handover", "weekly-detail", "survey-detail",
    "proposal-detail", "midterm-detail", "thesis-detail", "archive-detail",
    "handover-detail", "nav-toggle", "main-nav", "back-to-top",
  ],
  "archive.html": ["top", "repository-structure", "nav-toggle", "main-nav", "back-to-top"],
};

const failures = [];
const notes = [];

function fail(message) {
  failures.push(message);
}

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

for (const page of expectedPages) {
  if (!fs.existsSync(path.join(root, page))) {
    fail(`${page}: expected page is missing`);
  }
}

const pages = fs.readdirSync(root).filter((name) => name.endsWith(".html")).sort();

for (const page of pages) {
  const source = read(page);
  const renderedMarkup = source.replace(/^---\s*\r?\n---\s*\r?\n/, "");
  const ids = [...source.matchAll(/\bid=["']([^"']+)["']/g)].map((match) => match[1]);
  const duplicates = [...new Set(ids.filter((id, index) => ids.indexOf(id) !== index))];

  if (duplicates.length) fail(`${page}: duplicate id(s): ${duplicates.join(", ")}`);
  if (!/^<!doctype html>/i.test(renderedMarkup)) fail(`${page}: missing HTML5 doctype`);
  if (!/<html\s+[^>]*lang=["']zh-CN["']/i.test(source)) fail(`${page}: missing lang=zh-CN`);
  if ((source.match(/<h1\b/gi) || []).length !== 1) fail(`${page}: must contain exactly one h1`);
  if (!/<title>[^<]+<\/title>/i.test(source)) fail(`${page}: missing title`);
  if (!/<meta\s+name=["']description["'][^>]*content=["'][^"']+["']/i.test(source)) fail(`${page}: missing description`);
  if (!/<meta\s+name=["']viewport["']/i.test(source)) fail(`${page}: missing viewport`);
  if (!/<link\s+rel=["']canonical["']/i.test(source)) fail(`${page}: missing canonical`);
  if (!/<meta\s+property=["']og:title["']/i.test(source)) fail(`${page}: missing og:title`);
  if (!/<link\s+rel=["']icon["']/i.test(source)) fail(`${page}: missing favicon`);
  if (!/<a\s+class=["']skip-link["'][^>]*href=["']#main-content["']/i.test(source)) fail(`${page}: missing skip link`);
  if (!/<main\s+id=["']main-content["']/i.test(source)) fail(`${page}: missing main-content target`);
  if (!/<nav\s+class=["']breadcrumb["'][^>]*aria-label=/i.test(source) && page !== "index.html") fail(`${page}: missing semantic breadcrumb`);

  for (const table of source.matchAll(/<table\b[\s\S]*?<\/table>/gi)) {
    if (!/<caption\b/i.test(table[0])) fail(`${page}: table missing caption`);
    for (const th of table[0].matchAll(/<th\b([^>]*)>/gi)) {
      if (!/\bscope=["'](?:col|row)["']/i.test(th[1])) fail(`${page}: th missing scope`);
    }
  }

  for (const match of source.matchAll(/\b(?:href|src)=["']([^"']+)["']/gi)) {
    const targetValue = match[1];
    if (/^(?:https?:|mailto:|tel:|data:)/i.test(targetValue)) continue;
    if (targetValue.startsWith("#")) {
      const fragment = targetValue.slice(1);
      if (fragment && !ids.includes(fragment)) fail(`${page}: missing local fragment #${fragment}`);
      continue;
    }

    const [filePart, fragment] = targetValue.split("#");
    const targetPath = path.normalize(path.join(path.dirname(page), filePart));
    const absoluteTarget = path.join(root, targetPath);
    if (!fs.existsSync(absoluteTarget)) {
      fail(`${page}: missing target ${targetValue}`);
      continue;
    }
    if (fragment && targetPath.endsWith(".html")) {
      const targetSource = read(targetPath);
      const fragmentPattern = new RegExp(`\\bid=["']${escapeRegExp(fragment)}["']`);
      if (!fragmentPattern.test(targetSource)) fail(`${page}: missing target fragment ${targetValue}`);
    }
  }
}

for (const [page, ids] of Object.entries(legacyIds)) {
  const source = read(page);
  for (const id of ids) {
    if (!new RegExp(`\\bid=["']${escapeRegExp(id)}["']`).test(source)) {
      fail(`${page}: legacy/current id missing: ${id}`);
    }
  }
}

const config = read("_config.yml");
if (!/exclude:[\s\S]*-\s+work\b/.test(config)) fail("_config.yml: work is not excluded");
if (!fs.existsSync(path.join(root, "robots.txt"))) fail("robots.txt is missing");
if (!fs.existsSync(path.join(root, "sitemap.xml"))) fail("sitemap.xml is missing");
if (!/<script\s+type=["']application\/ld\+json["']>/i.test(read("index.html"))) fail("index.html: WebSite structured data is missing");

const builtWork = path.join(root, "_site", "work");
if (fs.existsSync(builtWork)) fail("_site/work exists: internal audit material entered build output");
else notes.push("_site/work is absent");

const builtRoot = path.join(root, "_site");
if (fs.existsSync(builtRoot)) {
  for (const page of expectedPages) {
    if (!fs.existsSync(path.join(builtRoot, page))) fail(`_site/${page}: built page is missing`);
  }
  if (fs.existsSync(path.join(builtRoot, "scripts"))) fail("_site/scripts exists: validation tooling entered build output");

  // Detect identity-linked repository labels without printing any matched value.
  const identityLinkedLabel = /\b20\d{2}-(?:ug|ms|phd)-[a-z]{5,}\b/i;
  for (const page of expectedPages) {
    const builtPage = fs.readFileSync(path.join(builtRoot, page), "utf8");
    const builtIds = [...builtPage.matchAll(/\bid=["']([^"']+)["']/g)].map((match) => match[1]);
    const duplicateBuiltIds = [...new Set(builtIds.filter((id, index) => builtIds.indexOf(id) !== index))];
    if (duplicateBuiltIds.length) fail(`_site/${page}: duplicate id(s): ${duplicateBuiltIds.join(", ")}`);
    if (!/^<!doctype html>/i.test(builtPage)) fail(`_site/${page}: missing HTML5 doctype`);
    if (identityLinkedLabel.test(builtPage)) fail(`_site/${page}: identity-linked repository label remains in build output`);
    if (/YYYY-ug\/ms\/phd-studentname/i.test(builtPage)) fail(`_site/${page}: identity-oriented legacy naming pattern remains in build output`);
    if (/Preserved baseline copy:/i.test(builtPage)) fail(`_site/${page}: source-only baseline preservation block remains in build output`);
    if (/\{%\s*(?:comment|endcomment)\s*%\}/.test(builtPage)) fail(`_site/${page}: unprocessed Liquid comment remains`);

    for (const match of builtPage.matchAll(/\b(?:href|src)=["']([^"']+)["']/gi)) {
      const targetValue = match[1];
      if (/^(?:https?:|mailto:|tel:|data:)/i.test(targetValue)) continue;
      if (targetValue.startsWith("#")) {
        const fragment = targetValue.slice(1);
        if (fragment && !builtIds.includes(fragment)) fail(`_site/${page}: missing local fragment #${fragment}`);
        continue;
      }

      const [filePart, fragment] = targetValue.split("#");
      const targetPath = path.normalize(path.join(path.dirname(page), filePart));
      const absoluteTarget = path.join(builtRoot, targetPath);
      if (!fs.existsSync(absoluteTarget)) {
        fail(`_site/${page}: missing target ${targetValue}`);
        continue;
      }
      if (fragment && targetPath.endsWith(".html")) {
        const targetSource = fs.readFileSync(absoluteTarget, "utf8");
        const fragmentPattern = new RegExp(`\\bid=["']${escapeRegExp(fragment)}["']`);
        if (!fragmentPattern.test(targetSource)) fail(`_site/${page}: missing target fragment ${targetValue}`);
      }
    }
  }
  notes.push("built pages pass local link/fragment checks and exclude identity-linked labels and validation tooling");
}

if (failures.length) {
  console.error(`Site validation failed with ${failures.length} issue(s):`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`Validated ${pages.length} HTML pages.`);
console.log("All expected pages, local files, fragments, legacy IDs, tables, and baseline metadata passed.");
for (const note of notes) console.log(note);
