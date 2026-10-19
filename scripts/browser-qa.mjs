#!/usr/bin/env node

import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const chromeBinary = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const baseUrl = process.env.CSMA_QA_BASE_URL || "http://127.0.0.1:8765";
const qaRoot = process.env.CSMA_QA_OUTPUT || "/private/tmp/csma-site-qa-20260904";
const profileRoot = path.join(qaRoot, `cdp-profile-${process.pid}`);

const rootPages = [
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
  "competition.html",
  "planner.html",
  "management.html",
  "integrity.html",
  "policies.html",
  "resources.html",
  "news.html",
  "students.html",
  "workflows.html",
  "tools.html",
  "essays.html",
  "international.html",
  "learning.html",
];
const pages = [
  ...rootPages,
  ...rootPages.map(page => `en/${page}`),
  ...["small-research-tasks", "guidance-to-action"].flatMap(slug => [`essays/${slug}.html`, `en/essays/${slug}.html`]),
];
for (const directory of ["news", "en/news"]) {
  const builtDirectory = path.join(process.cwd(), "_site", directory);
  if (fs.existsSync(builtDirectory)) pages.push(...fs.readdirSync(builtDirectory).filter(name => name.endsWith(".html")).map(name => `${directory}/${name}`));
}
if (process.env.CSMA_QA_PAGES) {
  const selected = new Set(process.env.CSMA_QA_PAGES.split(","));
  for (let index = pages.length - 1; index >= 0; index--) if (!selected.has(pages[index])) pages.splice(index, 1);
  if (!pages.length) throw new Error("CSMA_QA_PAGES did not select a known page");
}

const viewports = [
  { label: "1440", width: 1440, height: 1200 },
  { label: "1280", width: 1280, height: 1000 },
  { label: "1024", width: 1024, height: 1000 },
  { label: "768", width: 768, height: 1000 },
  { label: "390", width: 390, height: 844 },
  { label: "320", width: 320, height: 800 },
];

const screenshotKeys = new Set([
  "essays.html@1440", "essays.html@390", "essays.html@320",
  "essays/small-research-tasks.html@1440", "essays/small-research-tasks.html@390", "essays/small-research-tasks.html@320",
  "en/index.html@1440", "en/index.html@1280", "en/index.html@390", "en/index.html@320",
  "en/essays.html@1440", "en/essays.html@390", "en/essays.html@320",
  "en/essays/small-research-tasks.html@1440", "en/essays/small-research-tasks.html@390", "en/essays/small-research-tasks.html@320",
  "workflows.html@1440", "workflows.html@390", "workflows.html@320", "tools.html@1440", "tools.html@390", "tools.html@320",
  "index.html@1440", "index.html@1280", "index.html@1024", "index.html@768", "index.html@390",
  "bachelor.html@390", "undergraduate-research.html@390", "master.html@390", "doctor.html@390",
  "milestones.html@768", "projects.html@390", "outcomes.html@390", "templates.html@390",
  "archive.html@390", "faq.html@390", "about.html@390",
  "master.html@1440", "templates.html@1440", "planner.html@1440", "policies.html@390",
  "index.html@320", "planner.html@390", "competition.html@390",
]);

const failures = [];
const checks = [];
let chromeStderr = "";

function delay(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function waitForFile(filePath, timeoutMilliseconds = 30000) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMilliseconds) {
    if (fs.existsSync(filePath)) return;
    await delay(100);
  }
  throw new Error(`Timed out waiting for ${filePath}`);
}

function createCdpClient(webSocketUrl) {
  return new Promise((resolve, reject) => {
    const socket = new WebSocket(webSocketUrl);
    const pending = new Map();
    const listeners = new Map();
    let nextId = 1;

    socket.addEventListener("error", () => reject(new Error("CDP WebSocket failed")), { once: true });
    socket.addEventListener("open", () => {
      socket.addEventListener("message", (event) => {
        const message = JSON.parse(event.data);
        if (message.id) {
          const handler = pending.get(message.id);
          if (!handler) return;
          pending.delete(message.id);
          if (message.error) handler.reject(new Error(`${handler.method}: ${message.error.message}`));
          else handler.resolve(message.result);
          return;
        }

        for (const listener of listeners.get(message.method) || []) listener(message.params);
      });

      resolve({
        send(method, params = {}) {
          return new Promise((commandResolve, commandReject) => {
            const id = nextId++;
            pending.set(id, { resolve: commandResolve, reject: commandReject, method });
            socket.send(JSON.stringify({ id, method, params }));
          });
        },
        once(method, timeoutMilliseconds = 10000) {
          return new Promise((eventResolve, eventReject) => {
            const methodListeners = listeners.get(method) || [];
            let timer;
            const listener = (params) => {
              clearTimeout(timer);
              const index = methodListeners.indexOf(listener);
              if (index >= 0) methodListeners.splice(index, 1);
              eventResolve(params);
            };
            methodListeners.push(listener);
            listeners.set(method, methodListeners);
            timer = setTimeout(() => {
              const index = methodListeners.indexOf(listener);
              if (index >= 0) methodListeners.splice(index, 1);
              eventReject(new Error(`Timed out waiting for CDP event ${method}`));
            }, timeoutMilliseconds);
          });
        },
        on(method, listener) {
          const methodListeners = listeners.get(method) || [];
          methodListeners.push(listener);
          listeners.set(method, methodListeners);
        },
        close() {
          socket.close();
        },
      });
    }, { once: true });
  });
}

async function evaluate(client, expression, awaitPromise = false) {
  const result = await client.send("Runtime.evaluate", {
    expression,
    awaitPromise,
    returnByValue: true,
  });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.text || "Runtime evaluation failed");
  return result.result.value;
}

async function openTarget(port) {
  const response = await fetch(`http://127.0.0.1:${port}/json/new?about%3Ablank`, { method: "PUT" });
  if (!response.ok) throw new Error(`Could not create Chrome target: ${response.status}`);
  const target = await response.json();
  const client = await createCdpClient(target.webSocketDebuggerUrl);
  await client.send("Page.enable");
  await client.send("Runtime.enable");
  await client.send("Log.enable");
  return { client, target };
}

async function navigate(client, url) {
  const loaded = client.once("Page.loadEventFired", 15000);
  const navigation = await client.send("Page.navigate", { url });
  if (navigation.errorText) throw new Error(`${url}: ${navigation.errorText}`);
  await loaded;
  await delay(120);
}

function record(ok, message) {
  checks.push({ ok, message });
  if (!ok) failures.push(message);
}

fs.mkdirSync(profileRoot, { recursive: true });
const chrome = spawn(chromeBinary, [
  "--headless=new",
  "--disable-gpu",
  "--disable-background-networking",
  "--disable-component-update",
  "--disable-default-apps",
  "--disable-extensions",
  "--disable-sync",
  "--hide-scrollbars",
  "--no-default-browser-check",
  "--no-first-run",
  "--remote-debugging-address=127.0.0.1",
  "--remote-debugging-port=0",
  `--user-data-dir=${profileRoot}`,
  "about:blank",
], { stdio: ["ignore", "ignore", "pipe"] });

chrome.stderr.on("data", (chunk) => {
  if (chromeStderr.length < 12000) chromeStderr += chunk.toString();
});

try {
  const activePortPath = path.join(profileRoot, "DevToolsActivePort");
  await waitForFile(activePortPath);
  const [portLine] = fs.readFileSync(activePortPath, "utf8").trim().split(/\r?\n/);
  const port = Number(portLine);
  if (!Number.isInteger(port)) throw new Error("Chrome did not provide a valid DevTools port");

  const { client, target } = await openTarget(port);
  let pageConsoleErrors = [];
  client.on("Runtime.exceptionThrown", (event) => pageConsoleErrors.push(event.exceptionDetails?.text || "uncaught exception"));
  client.on("Runtime.consoleAPICalled", (event) => {
    if (event.type === "error" || event.type === "assert") pageConsoleErrors.push(`console.${event.type}`);
  });
  client.on("Log.entryAdded", (event) => {
    if (event.entry?.level === "error") pageConsoleErrors.push(event.entry.text || "browser log error");
  });

  for (const viewport of viewports) {
    await client.send("Emulation.setDeviceMetricsOverride", {
      width: viewport.width,
      height: viewport.height,
      deviceScaleFactor: 1,
      mobile: viewport.width <= 560,
    });

    for (const page of pages) {
      pageConsoleErrors = [];
      await navigate(client, `${baseUrl}/${page}`);
      const metrics = await evaluate(client, `(() => {
        const root = document.documentElement;
        const h1 = document.querySelector("h1");
        const main = document.getElementById("main-content");
        const skip = document.querySelector(".skip-link");
        const toggle = document.getElementById("nav-toggle");
        const nav = document.getElementById("main-nav");
        const brokenImages = [...document.images]
          .filter((image) => !image.complete || image.naturalWidth === 0)
          .map((image) => image.currentSrc || image.src);
        return {
          title: document.title,
          h1: h1?.textContent.trim() || "",
          main: Boolean(main),
          skipTarget: skip?.getAttribute("href") || "",
          scrollWidth: root.scrollWidth,
          clientWidth: root.clientWidth,
          brokenImages,
          toggleDisplay: toggle ? getComputedStyle(toggle).display : "missing",
          navDisplay: nav ? getComputedStyle(nav).display : "missing",
          language: root.lang,
          navLinks: nav ? [...nav.querySelectorAll("a")].map(link => ({ label: link.textContent.trim(), href: link.getAttribute("href"), current: link.getAttribute("aria-current") })) : [],
          languageAlternates: [...document.querySelectorAll('link[rel="alternate"][hreflang]')].map(link => link.hreflang),
        };
      })()`);

      const label = `${page}@${viewport.label}`;
      record(Boolean(metrics.title && metrics.h1 && metrics.main), `${label}: title, h1, and main landmark`);
      record(metrics.skipTarget === "#main-content", `${label}: skip link target`);
      record(metrics.scrollWidth <= metrics.clientWidth + 1, `${label}: no page-level horizontal overflow (${metrics.scrollWidth}/${metrics.clientWidth})`);
      record(metrics.brokenImages.length === 0, `${label}: all images loaded`);
      record(pageConsoleErrors.length === 0, `${label}: no browser console errors`);
      const english = page.startsWith("en/");
      const navLabels = english ? ["Home", "News", "Undergraduate", "Master's", "Doctoral", "Resources", "Outcomes", "Stories", "Mentoring", "About"] : ["首页", "新闻", "学士", "硕士", "博士", "资源", "成果", "榜样", "导引", "关于"];
      const navTargets = ["index.html", "news.html", "bachelor.html", "master.html", "doctor.html", "resources.html", "outcomes.html", "students.html", "essays.html", "about.html"];
      record(metrics.navLinks.length === 10 && metrics.navLinks.every((link, i) => link.label === navLabels[i] && link.href.replace(/^\//, "") === `${english ? "en/" : ""}${navTargets[i]}`) && metrics.navLinks.filter(link => link.current).length === 1, `${label}: ten localized navigation links and one current section`);
      record(metrics.language === (english ? "en" : "zh-CN") && metrics.languageAlternates.includes("zh-CN") && metrics.languageAlternates.includes("en"), `${label}: document language and paired language alternates`);

      if (metrics.toggleDisplay !== "none" && metrics.toggleDisplay !== "missing") {
        const menuState = await evaluate(client, `(() => {
          const toggle = document.getElementById("nav-toggle");
          const nav = document.getElementById("main-nav");
          toggle.click();
          const opened = toggle.getAttribute("aria-expanded") === "true" && nav.classList.contains("open") && getComputedStyle(nav).display !== "none";
          document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
          const closed = toggle.getAttribute("aria-expanded") === "false" && !nav.classList.contains("open");
          return { opened, closed };
        })()`);
        record(menuState.opened && menuState.closed, `${label}: compact navigation opens and closes with Escape`);
      } else {
        record(metrics.toggleDisplay === "none" && metrics.navDisplay !== "none", `${label}: desktop navigation is visible`);
      }

      const screenshotKey = `${page}@${viewport.label}`;
      if (screenshotKeys.has(screenshotKey)) {
        const screenshot = await client.send("Page.captureScreenshot", { format: "png", fromSurface: true });
        const screenshotName = `${page.replace(/\.html$/, "").replaceAll("/", "-")}-${viewport.label}.png`;
        fs.writeFileSync(path.join(qaRoot, screenshotName), Buffer.from(screenshot.data, "base64"));
      }
    }
  }

  await client.send("Emulation.setDeviceMetricsOverride", {
    width: 390,
    height: 844,
    deviceScaleFactor: 1,
    mobile: true,
  });
  await client.send("Emulation.setScriptExecutionDisabled", { value: true });
  await navigate(client, `${baseUrl}/index.html`);
  const noScriptState = await evaluate(client, `(() => {
    const nav = document.getElementById("main-nav");
    return {
      enhanced: document.documentElement.classList.contains("js"),
      navDisplay: getComputedStyle(nav).display,
    };
  })()`);
  record(!noScriptState.enhanced && noScriptState.navDisplay !== "none", "index.html@390: navigation remains available without JavaScript");
  await client.send("Emulation.setScriptExecutionDisabled", { value: false });

  await client.send("Emulation.setEmulatedMedia", {
    media: "screen",
    features: [{ name: "prefers-reduced-motion", value: "reduce" }],
  });
  await navigate(client, `${baseUrl}/index.html`);
  const reducedMotion = await evaluate(client, `getComputedStyle(document.documentElement).scrollBehavior`);
  record(reducedMotion === "auto", "index.html: reduced-motion disables smooth scrolling");

  await client.send("Emulation.setEmulatedMedia", { media: "screen", features: [] });
  await client.send("Emulation.setDeviceMetricsOverride", {
    width: 1440,
    height: 1200,
    deviceScaleFactor: 1,
    mobile: false,
  });
  await navigate(client, `${baseUrl}/index.html`);
  await evaluate(client, `document.activeElement?.blur(); true`);
  await client.send("Input.dispatchKeyEvent", {
    type: "keyDown", key: "Tab", code: "Tab", windowsVirtualKeyCode: 9, nativeVirtualKeyCode: 9,
  });
  await client.send("Input.dispatchKeyEvent", {
    type: "keyUp", key: "Tab", code: "Tab", windowsVirtualKeyCode: 9, nativeVirtualKeyCode: 9,
  });
  const firstTab = await evaluate(client, `(() => {
    const active = document.activeElement;
    const style = getComputedStyle(active);
    return {
      skipLink: active?.classList.contains("skip-link") || false,
      visibleOutline: style.outlineStyle !== "none" && parseFloat(style.outlineWidth) >= 2,
    };
  })()`);
  record(firstTab.skipLink && firstTab.visibleOutline, "index.html: first Tab reveals a visible skip link focus indicator");
  await client.send("Input.dispatchKeyEvent", {
    type: "keyDown", key: "Enter", code: "Enter", windowsVirtualKeyCode: 13, nativeVirtualKeyCode: 13,
  });
  await client.send("Input.dispatchKeyEvent", {
    type: "keyUp", key: "Enter", code: "Enter", windowsVirtualKeyCode: 13, nativeVirtualKeyCode: 13,
  });
  await delay(80);
  const skipActivated = await evaluate(client, `location.hash === "#main-content" && document.activeElement?.id === "main-content"`);
  record(skipActivated, "index.html: activating the skip link moves focus to main content");

  client.close();
  await fetch(`http://127.0.0.1:${port}/json/close/${target.id}`);

  const summary = {
    generatedAt: new Date().toISOString(),
    baseUrl,
    pages: pages.length,
    viewports,
    assertions: checks.length,
    passed: checks.filter((check) => check.ok).length,
    failed: failures.length,
    failures,
  };
  fs.writeFileSync(path.join(qaRoot, "browser-qa.json"), `${JSON.stringify(summary, null, 2)}\n`);

  console.log(`Browser QA: ${summary.passed}/${summary.assertions} assertions passed across ${pages.length} pages and ${viewports.length} viewports.`);
  console.log(`Screenshots and machine-readable summary: ${qaRoot}`);
  if (failures.length) {
    for (const failure of failures) console.error(`- ${failure}`);
    process.exitCode = 1;
  }
} catch (error) {
  console.error(error.stack || error.message);
  if (chromeStderr) console.error("Chrome diagnostic output was captured; inspect locally if startup failed.");
  process.exitCode = 1;
} finally {
  chrome.kill("SIGTERM");
}
