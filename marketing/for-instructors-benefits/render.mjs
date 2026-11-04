import { spawn } from "node:child_process";
import { mkdir, writeFile, rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));
const chrome = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const port = 9334;
const profile = "/tmp/ccw-benefit-chrome";
const outDir = path.resolve(root, "../../public/images/for-instructors");

const scenes = ["dashboard", "bookings", "visibility"];

function cdp(ws) {
  let id = 0;
  const pending = new Map();
  ws.addEventListener("message", (ev) => {
    const msg = JSON.parse(ev.data);
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id);
      pending.delete(msg.id);
      if (msg.error) reject(new Error(msg.error.message || "cdp error"));
      else resolve(msg.result);
    }
  });
  return (method, params = {}, sessionId) =>
    new Promise((resolve, reject) => {
      const msgId = ++id;
      pending.set(msgId, { resolve, reject });
      const payload = { id: msgId, method, params };
      if (sessionId) payload.sessionId = sessionId;
      ws.send(JSON.stringify(payload));
    });
}

async function waitFor(url) {
  for (let i = 0; i < 50; i++) {
    try {
      const res = await fetch(url);
      if (res.ok) return await res.json();
    } catch {
      /* chrome still starting */
    }
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new Error("Chrome did not open a debugging port");
}

await rm(profile, { recursive: true, force: true });
await mkdir(outDir, { recursive: true });

const child = spawn(
  chrome,
  [
    "--headless=new",
    "--disable-gpu",
    "--hide-scrollbars",
    "--no-first-run",
    "--no-default-browser-check",
    "--allow-file-access-from-files",
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${profile}`,
    "about:blank",
  ],
  { stdio: "ignore" }
);

try {
  const version = await waitFor(`http://127.0.0.1:${port}/json/version`);
  const browser = new WebSocket(version.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    browser.addEventListener("open", resolve);
    browser.addEventListener("error", reject);
  });
  const send = cdp(browser);
  const { targetId } = await send("Target.createTarget", { url: "about:blank" });
  const { sessionId } = await send("Target.attachToTarget", { targetId, flatten: true });

  await send("Page.enable", {}, sessionId);
  await send(
    "Emulation.setDeviceMetricsOverride",
    { width: 1000, height: 740, deviceScaleFactor: 2, mobile: false },
    sessionId
  );
  await send(
    "Emulation.setDefaultBackgroundColorOverride",
    { color: { r: 0, g: 0, b: 0, a: 0 } },
    sessionId
  );

  for (const scene of scenes) {
    const file = `file://${path.join(root, `${scene}.html`)}`;
    await send("Page.navigate", { url: file }, sessionId);
    await send("Runtime.evaluate", { expression: "document.fonts.ready", awaitPromise: true }, sessionId);
    await new Promise((r) => setTimeout(r, 150));
    const { data } = await send(
      "Page.captureScreenshot",
      { format: "png", omitBackground: true },
      sessionId
    );
    const fileName =
      scene === "visibility"
        ? "visibility-listings-v4.png"
        : scene === "dashboard"
          ? "dashboard-v2.png"
          : `${scene}.png`;
    const dest = path.join(outDir, fileName);
    await writeFile(dest, Buffer.from(data, "base64"));
    console.log("wrote", dest);
  }

  browser.close();
} finally {
  child.kill();
}
