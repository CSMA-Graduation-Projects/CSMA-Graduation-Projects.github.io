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
  "competition.html",
  "planner.html",
  "management.html",
  "integrity.html",
  "policies.html",
  "workflows.html",
  "tools.html",
  "essays.html",
  "international.html",
  "learning.html",
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
  ["outcomes.html", "成果"], ["students.html", "榜样"], ["essays.html", "导引"], ["about.html", "关于"],
];
const englishNavigationLabels = ["Home", "News", "Undergraduate", "Master's", "Doctoral", "Resources", "Outcomes", "Stories", "Mentoring", "About"];
const allExpectedPages = [...expectedPages, ...expectedPages.map(page => `en/${page}`)];

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
  const english = page.startsWith("en/") || /_layouts\/(?:essay|news)-en\.html$/.test(page);
  const relativePage = english ? page.replace(/^en\//, "").replace(/-en\.html$/, ".html") : page;
  const nav = source.match(/<nav class="main-nav"[^>]*>([\s\S]*?)<\/nav>/)?.[1] || "";
  const links = [...nav.matchAll(/<a\b([^>]*)>([^<]+)<\/a>/g)];
  const parent = {
    "undergraduate-research.html": "bachelor.html", "templates.html": "resources.html",
    "archive.html": "resources.html", "milestones.html": "resources.html",
    "projects.html": "outcomes.html", "faq.html": "about.html",
    "competition.html": "bachelor.html", "planner.html": "resources.html",
    "management.html": "resources.html", "integrity.html": "resources.html", "policies.html": "resources.html",
    "workflows.html": "resources.html", "tools.html": "resources.html", "international.html": "resources.html", "learning.html": "resources.html",
  }[relativePage] || (relativePage.startsWith("news/") || relativePage === "_layouts/news.html" ? "news.html"
    : relativePage.startsWith("essays/") || relativePage === "_layouts/essay.html" ? "essays.html" : relativePage);
  if (links.length !== navigation.length) fail(`${page}: expected ${navigation.length} main navigation links`);
  navigation.forEach(([target, chineseLabel], i) => {
    const label = english ? englishNavigationLabels[i] : chineseLabel;
    const link = links[i];
    if (!link) return;
    const href = link[1].match(/href="([^"]+)"/)?.[1];
    if (href?.replace(/^\//, "") !== (english ? `en/${target}` : target) || link[2].replace(/&#39;|&apos;/g, "'") !== label) fail(`${page}: navigation item ${i + 1} must be ${label}`);
    const current = link[1].match(/aria-current="([^"]+)"/)?.[1];
    const expectedCurrent = target === parent ? (parent === relativePage ? "page" : "true") : undefined;
    if (current !== expectedCurrent) fail(`${page}: incorrect active navigation item ${label}`);
  });
  if (english ? !/<span class="brand-text">[^<]+<\/span>/.test(source) : !source.includes('<span class="brand-text">人才培养管理体系</span>')) fail(`${page}: incorrect brand text`);
}

function checkLanguageAlternates(page, source, built = false) {
  const expectedLanguage = page.startsWith("en/") ? "en" : "zh-CN";
  if (!new RegExp(`<html\\s+[^>]*lang=["']${expectedLanguage}["']`, "i").test(source)) fail(`${page}: missing lang=${expectedLanguage}`);
  const alternates = [...source.matchAll(/<link\b[^>]*rel=["']alternate["'][^>]*>/gi)].map(match => match[0]);
  for (const language of ["zh-CN", "en"]) {
    const link = alternates.find(tag => new RegExp(`\\bhreflang=["']${language}["']`).test(tag));
    if (!link || !/\bhref=["'][^"']+["']/.test(link)) { fail(`${page}: missing ${language} alternate URL`); continue; }
    if (!built) continue;
    const href = link.match(/\bhref=["']([^"']+)["']/)[1];
    const expectedPath = `/${language === "en" ? "en/" : ""}${page.replace(/^en\//, "")}`;
    const actualPath = new URL(href, "https://local.invalid").pathname.replace(/\/$/, "/index.html");
    if (actualPath !== expectedPath) fail(`${page}: ${language} alternate points to the wrong corresponding page`);
  }
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

for (const page of allExpectedPages) {
  if (!fs.existsSync(path.join(root, page))) {
    fail(`${page}: expected page is missing`);
  }
}

const pages = [
  ...fs.readdirSync(root).filter((name) => name.endsWith(".html")),
  ...(fs.existsSync(path.join(root, "en")) ? fs.readdirSync(path.join(root, "en")).filter(name => name.endsWith(".html")).map(name => `en/${name}`) : []),
].sort();

for (const page of pages) {
  const source = read(page);
  const renderedMarkup = source.replace(/^---\s*\r?\n---\s*\r?\n/, "");
  const ids = [...source.matchAll(/\bid=["']([^"']+)["']/g)].map((match) => match[1]);
  const duplicates = [...new Set(ids.filter((id, index) => ids.indexOf(id) !== index))];

  if (duplicates.length) fail(`${page}: duplicate id(s): ${duplicates.join(", ")}`);
  if (!/^<!doctype html>/i.test(renderedMarkup)) fail(`${page}: missing HTML5 doctype`);
  checkLanguageAlternates(page, source);
  if ((source.match(/<h1\b/gi) || []).length !== 1) fail(`${page}: must contain exactly one h1`);
  if (!/<title>[^<]+<\/title>/i.test(source)) fail(`${page}: missing title`);
  if (!/<meta\s+name=["']description["'][^>]*content=["'][^"']+["']/i.test(source)) fail(`${page}: missing description`);
  if (!/<meta\s+name=["']viewport["']/i.test(source)) fail(`${page}: missing viewport`);
  if (!/<link\s+rel=["']canonical["']/i.test(source)) fail(`${page}: missing canonical`);
  if (!/<meta\s+property=["']og:title["']/i.test(source)) fail(`${page}: missing og:title`);
  if (!/<link\s+rel=["']icon["']/i.test(source)) fail(`${page}: missing favicon`);
  if (!/<a\s+class=["']skip-link["'][^>]*href=["']#main-content["']/i.test(source)) fail(`${page}: missing skip link`);
  if (!/<main\s+id=["']main-content["']/i.test(source)) fail(`${page}: missing main-content target`);
  if (!/<nav\s+class=["']breadcrumb["'][^>]*aria-label=/i.test(source) && !["index.html", "en/index.html"].includes(page)) fail(`${page}: missing semantic breadcrumb`);
  checkNavigation(page, source);

  for (const table of source.matchAll(/<table\b[\s\S]*?<\/table>/gi)) {
    if (!/<caption\b/i.test(table[0])) fail(`${page}: table missing caption`);
    for (const th of table[0].matchAll(/<th\b([^>]*)>/gi)) {
      if (!/\bscope=["'](?:col|row)["']/i.test(th[1])) fail(`${page}: th missing scope`);
    }
  }

  checkLinks(root, page, source);
}

for (const layout of ["_layouts/news.html", "_layouts/essay.html", "_layouts/news-en.html", "_layouts/essay-en.html"]) {
  if (fs.existsSync(path.join(root, layout))) checkNavigation(layout, read(layout));
  else fail(`${layout}: expected article layout is missing`);
}
if (!/<h1\b[^>]*>关于我们<\/h1>/.test(read("about.html"))) fail("about.html: page heading must be 关于我们");
if (fs.existsSync(path.join(root, "essays.html")) && !/<h1\b[^>]*>学习与研究导引<\/h1>/.test(read("essays.html"))) fail("essays.html: page heading must be 学习与研究导引");
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
      if (item.en !== undefined) {
        const fields = filename === "students" ? ["name", "degree", "cohort", "summary"] : ["title", "category", "contributors", "summary"];
        if (!item.en || typeof item.en !== "object" || fields.some(field => typeof item.en[field] !== "string" || !item.en[field].trim())) fail(`${location}: supplied English metadata must be complete`);
        if (!Array.isArray(item.en?.link_labels) || item.en.link_labels.length !== item.links?.length || item.en.link_labels.some(label => typeof label !== "string" || !label.trim())) fail(`${location}: English link labels must match all source links`);
        if (filename === "students" && (!Array.isArray(item.en?.highlights) || item.en.highlights.length !== item.highlights?.length || item.en.highlights.some(value => typeof value !== "string" || !value.trim()))) fail(`${location}: English highlights must match the source record`);
      }
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

// Published collection documents must have intentional, complete metadata.
// Missing publication flags never make an entry eligible for the public lists.
const essays = [];
for (const [collection, prefix, layout] of [["_essays", "", "essay"], ["_essays_en", "en/", "essay-en"]]) {
const essaysDirectory = path.join(root, collection);
if (!fs.existsSync(essaysDirectory)) fail(`${collection}: article collection is missing`);
else for (const filename of fs.readdirSync(essaysDirectory)) {
  if (!filename.endsWith(".md")) continue;
  const file = `${collection}/${filename}`;
  const source = read(file);
  const match = filename.match(/^([a-z][a-z0-9-]*)\.md$/);
  const block = source.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/);
  if (!match || !block) { fail(`${file}: expected a lowercase Markdown slug and front matter`); continue; }
  const frontmatter = block[1];
  const field = (name) => frontmatter.match(new RegExp(`^${name}:\\s*([^\\r\\n]+)$`, "m"))?.[1].trim().replace(/^(["'])(.*)\1$/, "$2") || "";
  for (const name of ["title", "date", "author", "topic", "summary"]) {
    if (!field(name)) fail(`${file}: missing text field ${name}`);
  }
  const date = field("date");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(Date.parse(date)) || new Date(date).toISOString().slice(0, 10) !== date) fail(`${file}: date must be a real YYYY-MM-DD date`);
  if (!/^published:\s*(?:true|false)\s*$/m.test(frontmatter)) fail(`${file}: published must be an explicit boolean`);
  if (/^permalink:/m.test(frontmatter)) fail(`${file}: use the collection permalink instead of an individual URL override`);
  if (/^layout:/m.test(frontmatter) && field("layout") !== layout) fail(`${file}: article layout must be ${layout}`);
  const body = source.slice(block[0].length);
  if (/<h1\b|^# /m.test(body)) fail(`${file}: body headings must start at H2`);
  if (!body.trim()) fail(`${file}: article body is empty`);
  essays.push({ url: `${prefix}essays/${match[1]}.html`, prefix, date, title: field("title"), author: field("author"), topic: field("topic"), published: /^published:\s*true\s*$/m.test(frontmatter) });
}
}
const expectedEssays = essays.filter(essay => essay.published && essay.date <= today).sort((a, b) => b.date.localeCompare(a.date));
const excludedEssays = essays.filter(essay => !essay.published || essay.date > today);
for (const essay of expectedEssays) {
  const peer = essay.prefix ? essay.url.replace(/^en\//, "") : `en/${essay.url}`;
  if (!expectedEssays.some(item => item.url === peer)) fail(`${essay.url}: published article is missing its language counterpart`);
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
  for (const page of [...allExpectedPages, ...expectedPosts, ...expectedPosts.map(page => `en/${page}`), ...expectedEssays.map(essay => essay.url)]) {
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
  const builtPages = [...allExpectedPages, ...["news", "essays", "en/news", "en/essays"].flatMap(directory => htmlFiles(path.join(builtRoot, directory)))];

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
    checkLanguageAlternates(page, builtPage, true);
    checkNavigation(page, builtPage);
    checkLinks(builtRoot, page, builtPage);
  }
  const builtSitemap = fs.readFileSync(path.join(builtRoot, "sitemap.xml"), "utf8");
  for (const post of [...expectedPosts, ...expectedPosts.map(page => `en/${page}`)]) if (!builtSitemap.includes(`/${post}</loc>`)) fail(`sitemap.xml: news post missing: ${post}`);
  for (const page of allExpectedPages) {
    const loc = page === "index.html" ? "/" : page === "en/index.html" ? "/en/" : `/${page}`;
    if (!builtSitemap.includes(`${loc}</loc>`) && !builtSitemap.includes(`/${page}</loc>`)) fail(`sitemap.xml: page is missing: ${page}`);
  }
  for (const essay of expectedEssays) {
    if (!builtSitemap.includes(`/${essay.url}</loc>`)) fail(`sitemap.xml: essay missing: ${essay.url}`);
    const articlePath = path.join(builtRoot, essay.url);
    if (!fs.existsSync(articlePath)) continue;
    const source = fs.readFileSync(articlePath, "utf8");
    if (!new RegExp(`<time\\b[^>]*datetime=["']${essay.date}(?:T[^"']*)?["'][^>]*>\\s*${essay.date}\\s*</time>`).test(source)) fail(`${essay.url}: publication date must be visible and machine-readable`);
    for (const value of [essay.author, essay.topic]) if (!source.includes(value)) fail(`${essay.url}: missing visible author/topic metadata`);
    if (!new RegExp(`<a\\b[^>]*href=["']/${essay.prefix}essays\\.html["'][^>]*>[^<]*(?:返回|[Bb]ack|[Aa]ll essays)`).test(source)) fail(`${essay.url}: article needs a return link to its language's essay collection`);
  }
  for (const essay of excludedEssays) if (builtSitemap.includes(`/${essay.url}</loc>`)) fail(`sitemap.xml: unpublished or future essay listed: ${essay.url}`);
  for (const filename of ["index.html", "essays.html", "en/index.html", "en/essays.html"]) {
    const filePath = path.join(builtRoot, filename);
    if (!fs.existsSync(filePath)) continue;
    const source = fs.readFileSync(filePath, "utf8");
    const cards = [...source.matchAll(/<article\b[^>]*class=["'][^"']*\bessay-card\b[^"']*["'][^>]*>([\s\S]*?)<\/article>/g)];
    const prefix = filename.startsWith("en/") ? "en/" : "";
    const localEssays = expectedEssays.filter(essay => essay.prefix === prefix);
    const home = filename.endsWith("index.html");
    const expectedCount = home ? Math.min(localEssays.length, 2) : localEssays.length;
    if (cards.length !== expectedCount) fail(`${filename}: incorrect published essay count (${cards.length}/${expectedCount})`);
    const listed = cards.map(card => [...card[1].matchAll(/<a\b[^>]*href=["']\/?((?:en\/)?essays\/[^"'#?]+\.html)["']/g)].map(link => link[1]));
    if (listed.some(urls => urls.length === 0 || new Set(urls).size !== 1)) fail(`${filename}: each essay card must link to exactly one real article`);
    const urls = listed.map(links => links[0]).filter(Boolean);
    if (new Set(urls).size !== urls.length) fail(`${filename}: duplicate essay cards`);
    const visibleEssays = urls.map(url => localEssays.find(essay => essay.url === url));
    if (visibleEssays.some(essay => !essay)) fail(`${filename}: listed an unpublished, future, or unknown essay`);
    if (!home && localEssays.some(essay => !urls.includes(essay.url))) fail(`${filename}: a published essay is missing from the collection`);
    if (visibleEssays.every(Boolean) && visibleEssays.some((essay, i) => i > 0 && essay.date > visibleEssays[i - 1].date)) fail(`${filename}: essays must be sorted newest first`);
    if (home && visibleEssays.every(Boolean) && visibleEssays.some(essay => essay.date < (localEssays[expectedCount - 1]?.date || ""))) fail(`${filename}: home cards must show the latest essays`);
    cards.forEach((card, i) => {
      const essay = visibleEssays[i];
      if (essay && !card[1].includes(essay.date)) fail(`${filename}: essay card is missing its publication date`);
    });
    for (const essay of excludedEssays) if (source.includes(`/${essay.url}`)) fail(`${filename}: unpublished or future essay linked outside the cards`);
  }
  for (const filename of ["index.html", "news.html", "en/index.html", "en/news.html"]) {
    const filePath = path.join(builtRoot, filename);
    if (!fs.existsSync(filePath)) continue;
    const source = fs.readFileSync(filePath, "utf8");
    const expectedCount = filename.endsWith("index.html") ? Math.min(expectedPosts.length, 3) : expectedPosts.length;
    if ((source.match(/class="news-row"/g) || []).length !== expectedCount) fail(`${filename}: incorrect published news count`);
  }
  notes.push("built pages pass local link/fragment checks and exclude identity-linked labels and validation tooling");
  notes.push(`${expectedEssays.length} published essays pass collection, article metadata, navigation, and sitemap checks`);
}

if (failures.length) {
  console.error(`Site validation failed with ${failures.length} issue(s):`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`Validated ${pages.length} HTML pages.`);
console.log("All expected pages, local files, fragments, legacy IDs, tables, and baseline metadata passed.");
for (const note of notes) console.log(note);
