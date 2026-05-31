/**
 * Captura screenshots reais do NEXO para a landing /apresentacao.
 *
 * Uso:
 *   npx playwright install chromium   (uma vez)
 *   node scripts/capture-screenshots.mjs [BASE_URL]
 *
 * BASE_URL padrão: https://nexo11.lovable.app
 *
 * Saída:
 *   public/screenshots/{slug}.png      (1440x900 retina 2x)
 *   public/screenshots/{slug}.webp     (otimizado)
 *   public/screenshots/portal-funcionario.* (390x844)
 */
import { chromium } from "playwright";
import sharp from "sharp";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const BASE = process.argv[2] || "https://nexo11.lovable.app";
const USER = process.env.NEXO_USER || "demo@nexo.app";
const PASS = process.env.NEXO_PASS || "NexoDemo2025!";
const OUT = resolve("public/screenshots");

const DESKTOP = [
  { slug: "comercial", path: "/comercial" },
  { slug: "contratos", path: "/contratos" },
  { slug: "tecnico", path: "/tecnico" },
  { slug: "producao", path: "/producao" },
  { slug: "logistica", path: "/logistica" },
  { slug: "montagem", path: "/montagem" },
  { slug: "pos-venda", path: "/pos-venda" },
  { slug: "comissoes", path: "/comissoes" },
  { slug: "compras", path: "/compras" },
  { slug: "rh", path: "/rh" },
  { slug: "equipe", path: "/equipe" },
  { slug: "analytics", path: "/analytics" },
];

const MOBILE = [{ slug: "portal-funcionario", path: "/portal-funcionario" }];

async function login(page) {
  await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
  await page.fill('input[type="email"]', USER);
  await page.fill('input[type="password"]', PASS);
  await Promise.all([
    page.waitForLoadState("networkidle"),
    page.click('button[type="submit"]'),
  ]);
  await page.waitForTimeout(1500);
}

async function capture(page, { slug, path }) {
  console.log(`→ ${slug}`);
  await page.goto(`${BASE}${path}`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1500);
  const png = await page.screenshot({ type: "png" });
  await writeFile(`${OUT}/${slug}.png`, png);
  await sharp(png).webp({ quality: 85 }).toFile(`${OUT}/${slug}.webp`);
}

async function main() {
  await mkdir(OUT, { recursive: true });
  const executablePath = process.env.CHROMIUM_PATH || process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH;
  const browser = await chromium.launch({
    ...(executablePath ? { executablePath } : {}),
    args: executablePath ? ["--no-sandbox"] : [],
  });

  // Desktop
  const ctxD = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
  });
  const pageD = await ctxD.newPage();
  await login(pageD);
  for (const m of DESKTOP) {
    try { await capture(pageD, m); } catch (e) { console.error(`!! ${m.slug}`, e.message); }
  }
  await ctxD.close();

  // Mobile
  const ctxM = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true,
  });
  const pageM = await ctxM.newPage();
  await login(pageM);
  for (const m of MOBILE) {
    try { await capture(pageM, m); } catch (e) { console.error(`!! ${m.slug}`, e.message); }
  }
  await ctxM.close();

  await browser.close();
  console.log("✓ done");
}

main().catch((e) => { console.error(e); process.exit(1); });
