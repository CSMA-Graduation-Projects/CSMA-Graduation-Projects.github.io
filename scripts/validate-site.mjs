#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const expectedPages = [
  "index.html",
  "news.html",
  "bachelor.html",
  "undergraduate-research.html",
  "master.html",
  "doctor.html",
  "milestones.html",
  "projects.html",
  "outcomes.html",
  "resources.html",
  "students.html",
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
  "outcomes.html": ["types", "publication-check", "consent"],
  "about.html": ["roles", "publication-boundary", "principles", "contact"],
};

const navigation = [
  ["index.html", "首页"], ["news.html", "新闻"], ["bachelor.html", "学士"],
  ["master.html", "硕士"], ["doctor.html", "博士"], ["resources.html", "资源"],
  ["outcomes.html", "成果"], ["students.html", "榜样"], ["about.html", "关于"],
];

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

function checkNavigation(page, source) {
  const nav = source.match(/<nav class="main-nav"[^>]*>([\s\S]*?)<\/nav>/)?.[1] || "";
  const links = [...nav.matchAll(/<a\b([^>]*)>([^<]+)<\/a>/g)];
  const parent = {
    "undergraduate-research.html": "bachelor.html", "templates.html": "resources.html",
    "archive.html": "resources.html", "milestones.html": "resources.html",
    "projects.html": "outcomes.html", "faq.html": "about.html",
  }[page] || (page.startsWith("news/") || page === "_layouts/news.html" ? "news.html" : page);
  if (links.length !== navigation.length) fail(`${page}: expected nine main navigation links`);
  navigation.forEach(([target, label], i) => {
    const link = links[i];
    if (!link) return;
    const href = link[1].match(/href="([^"]+)"/)?.[1];
    if (href?.replace(/^\//, "") !== target || link[2] !== label) fail(`${page}: navigation item ${i + 1} must be ${label}`);
    const current = link[1].match(/aria-current="([^"]+)"/)?.[1];
    const expectedCurrent = target === parent ? (parent === page ? "page" : "true") : undefined;
    if (current !== expectedCurrent) fail(`${page}: incorrect active navigation item ${label}`);
  });
  if (!source.includes('<span class="brand-text">人才培养管理体系</span>')) fail(`${page}: incorrect brand text`);
}

function checkLinks(base, page, source) {
  for (const match of source.matchAll(/\b(?:href|src)=["']([^"']+)["']/gi)) {
    const value = match[1];
    if (/^(?:https?:|mailto:|tel:|data:)/i.test(value)) continue;
    if (/\{[{%]/.test(value)) {
      // Source layouts contain Liquid URLs; generated URLs are checked below.
      if (base !== root) fail(`${page}: unresolved generated URL`);
      continue;
    }
    const url = new URL(value, `https://local.invalid/${page}`);
    if (url.origin !== "https://local.invalid") { fail(`${page}: unsupported local URL scheme`); continue; }
    const relative = decodeURIComponent(url.pathname).replace(/^\//, "") || "index.html";
    const targetPath = relative.endsWith("/") ? relative + "index.html" : relative;
    const absoluteTarget = path.join(base, targetPath);
    if (!fs.existsSync(absoluteTarget)) { fail(`${page}: missing target ${value}`); continue; }
    if (url.hash && targetPath.endsWith(".html")) {
      const targetSource = fs.readFileSync(absoluteTarget, "utf8");
      const fragment = decodeURIComponent(url.hash.slice(1));
      if (!new RegExp(`\\bid=["']${escapeRegExp(fragment)}["']`).test(targetSource)) fail(`${page}: missing target fragment ${value}`);
    }
  }
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
  checkNavigation(page, source);

  for (const table of source.matchAll(/<table\b[\s\S]*?<\/table>/gi)) {
    if (!/<caption\b/i.test(table[0])) fail(`${page}: table missing caption`);
    for (const th of table[0].matchAll(/<th\b([^>]*)>/gi)) {
      if (!/\bscope=["'](?:col|row)["']/i.test(th[1])) fail(`${page}: th missing scope`);
    }
  }

  checkLinks(root, page, source);
}

checkNavigation("_layouts/news.html", read("_layouts/news.html"));
for (const [filename, fields] of [
  ["achievements", ["id", "title", "category", "date", "contributors", "summary"]],
  ["students", ["id", "name", "degree", "cohort", "summary"]],
]) {
  try {
    const data = JSON.parse(read(`_data/${filename}.json`));
    if (!Array.isArray(data)) throw new Error("must be an array");
    const seen = new Set();
    for (const [i, item] of data.entries()) {
      const location = `_data/${filename}.json item ${i + 1}`;
      for (const field of fields) if (typeof item[field] !== "string" || !item[field].trim()) fail(`${location}: missing text field ${field}`);
      if (!/^[a-z][a-z0-9-]*$/.test(item.id) || seen.has(item.id)) fail(`${location}: invalid or duplicate id`);
      seen.add(item.id);
      if (filename === "achievements" && (!/^\d{4}-\d{2}-\d{2}$/.test(item.date) || !Number.isFinite(Date.parse(item.date)))) fail(`${location}: invalid date`);
      if (!Array.isArray(item.links) || item.links.length === 0) fail(`${location}: at least one representative work/source link is required`);
      for (const link of item.links || []) {
        if (typeof link.label !== "string" || !link.label.trim() || typeof link.url !== "string" || !/^(https:\/\/|\/(?!\/))/.test(link.url)) fail(`${location}: links need a label and an HTTPS or root-relative URL`);
        else if (link.url.startsWith("/") && !fs.existsSync(path.join(root, link.url.split(/[?#]/)[0].slice(1)))) fail(`${location}: local linked file is missing`);
      }
      if (filename === "students" && (!Array.isArray(item.highlights) || !item.highlights.length || item.highlights.some(text => typeof text !== "string" || !text.trim()))) fail(`${location}: growth highlights are required`);
      if (item.photo && (typeof item.photo !== "string" || !/^\/assets\//.test(item.photo) || !fs.existsSync(path.join(root, item.photo.slice(1))))) fail(`${location}: photo must point to an existing local asset`);
    }
  } catch (error) { fail(`_data/${filename}.json: ${error.message}`); }
}

const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Shanghai", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
const expectedPosts = [];
for (const filename of fs.readdirSync(path.join(root, "_posts"))) {
  if (!filename.endsWith(".md")) continue;
  const file = `_posts/${filename}`;
  const source = read(file);
  const match = filename.match(/^(\d{4}-\d{2}-\d{2})-([a-z0-9-]+)\.md$/);
  const frontmatter = source.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/)?.[1];
  if (!match || !frontmatter) { fail(`${file}: expected a dated Markdown filename and front matter`); continue; }
  for (const field of ["title", "date", "kind", "audience", "summary"]) {
    if (!new RegExp(`^${field}:\\s*[^\\s]+`, "m").test(frontmatter)) fail(`${file}: missing ${field}`);
  }
  if (!new RegExp(`^date: ["']?${match[1]}["']?\\s*$`, "m").test(frontmatter)) fail(`${file}: date must match the filename as YYYY-MM-DD`);
  if (/<h1\b|^# /m.test(source.slice(source.indexOf(frontmatter) + frontmatter.length))) fail(`${file}: body headings must start at H2`);
  if (match[1] <= today && !/^published:\s*false\s*$/m.test(frontmatter)) expectedPosts.push(`news/${match[1]}-${match[2]}.html`);
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
if (!/exclude:[\s\S]*-\s+docs\/content-templates\b/.test(config)) fail("_config.yml: content templates are not excluded");
if (!fs.existsSync(path.join(root, "robots.txt"))) fail("robots.txt is missing");
if (!fs.existsSync(path.join(root, "sitemap.xml"))) fail("sitemap.xml is missing");
if (!/<script\s+type=["']application\/ld\+json["']>/i.test(read("index.html"))) fail("index.html: WebSite structured data is missing");

const builtWork = path.join(root, "_site", "work");
if (fs.existsSync(builtWork)) fail("_site/work exists: internal audit material entered build output");
else notes.push("_site/work is absent");

const builtRoot = path.join(root, "_site");
if (process.argv.includes("--build") && !fs.existsSync(builtRoot)) fail("_site is missing: build with Jekyll before --build validation");
if (fs.existsSync(builtRoot)) {
  for (const page of [...expectedPages, ...expectedPosts]) {
    if (!fs.existsSync(path.join(builtRoot, page))) fail(`_site/${page}: built page is missing`);
  }
  if (fs.existsSync(path.join(builtRoot, "scripts"))) fail("_site/scripts exists: validation tooling entered build output");
  if (fs.existsSync(path.join(builtRoot, "docs/content-templates"))) fail("_site/docs/content-templates exists: unpublished templates entered build output");

  function htmlFiles(directory) {
    if (!fs.existsSync(directory)) return [];
    return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
      const filename = path.join(directory, entry.name);
      return entry.isDirectory() ? htmlFiles(filename) : entry.name.endsWith(".html") ? [path.relative(builtRoot, filename)] : [];
    });
  }
  const builtPages = [...expectedPages, ...htmlFiles(path.join(builtRoot, "news"))];

  // Detect identity-linked repository labels without printing any matched value.
  const identityLinkedLabel = /\b20\d{2}-(?:ug|ms|phd)-[a-z]{5,}\b/i;
  for (const page of builtPages) {
    if (!fs.existsSync(path.join(builtRoot, page))) continue;
    const builtPage = fs.readFileSync(path.join(builtRoot, page), "utf8");
    const builtIds = [...builtPage.matchAll(/\bid=["']([^"']+)["']/g)].map((match) => match[1]);
    const duplicateBuiltIds = [...new Set(builtIds.filter((id, index) => builtIds.indexOf(id) !== index))];
    if (duplicateBuiltIds.length) fail(`_site/${page}: duplicate id(s): ${duplicateBuiltIds.join(", ")}`);
    if (!/^<!doctype html>/i.test(builtPage)) fail(`_site/${page}: missing HTML5 doctype`);
    if (identityLinkedLabel.test(builtPage)) fail(`_site/${page}: identity-linked repository label remains in build output`);
    if (/YYYY-ug\/ms\/phd-studentname/i.test(builtPage)) fail(`_site/${page}: identity-oriented legacy naming pattern remains in build output`);
    if (/Preserved baseline copy:/i.test(builtPage)) fail(`_site/${page}: source-only baseline preservation block remains in build output`);
    if (/\{%[\s\S]*?%\}|\{\{[\s\S]*?\}\}/.test(builtPage)) fail(`_site/${page}: unprocessed Liquid remains`);
    if ((builtPage.match(/<h1\b/gi) || []).length !== 1) fail(`_site/${page}: expected exactly one h1`);
    checkNavigation(page, builtPage);
    checkLinks(builtRoot, page, builtPage);
  }
  const builtSitemap = fs.readFileSync(path.join(builtRoot, "sitemap.xml"), "utf8");
  for (const post of expectedPosts) if (!builtSitemap.includes(`/${post}</loc>`)) fail(`sitemap.xml: news post missing: ${post}`);
  for (const filename of ["index.html", "news.html"]) {
    const source = fs.readFileSync(path.join(builtRoot, filename), "utf8");
    const expectedCount = filename === "index.html" ? Math.min(expectedPosts.length, 3) : expectedPosts.length;
    if ((source.match(/class="news-row"/g) || []).length !== expectedCount) fail(`${filename}: incorrect published news count`);
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
