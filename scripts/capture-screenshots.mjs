// Script para capturar screenshots de cada módulo do NEXO
// Rodar: npx playwright install chromium && node scripts/capture-screenshots.mjs

import { chromium } from "playwright";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = path.resolve(__dirname, "../public/screenshots");

// URL do app (Lovable deploy ou local)
const BASE_URL = process.env.BASE_URL || "https://pllvwcszoyjhfvnzshzw.lovableproject.com";

// Credenciais demo
const EMAIL = "demo@nexo.app";
const PASSWORD = "NexoDemo2025!";

// Módulos para capturar
const PAGES = [
  { name: "dashboard", path: "/", waitFor: 3000 },
  { name: "comercial", path: "/comercial", waitFor: 3000 },
  { name: "contratos", path: "/contratos", waitFor: 3000 },
  { name: "tecnico", path: "/tecnico", waitFor: 3000 },
  { name: "producao", path: "/producao", waitFor: 3000 },
  { name: "logistica", path: "/logistica", waitFor: 3000 },
  { name: "montagem", path: "/montagem", waitFor: 3000 },
  { name: "pos-venda", path: "/pos-venda", waitFor: 3000 },
  { name: "comissoes", path: "/comissoes", waitFor: 3000 },
  { name: "compras", path: "/compras", waitFor: 3000 },
  { name: "rh", path: "/rh", waitFor: 3000 },
  { name: "equipe", path: "/equipe", waitFor: 3000 },
  { name: "analytics", path: "/analytics", waitFor: 3000 },
  { name: "financeiro", path: "/financeiro", waitFor: 3000 },
  { name: "portal-funcionario", path: "/portal-funcionario", waitFor: 3000 },
];

async function main() {
  console.log("🚀 Iniciando captura de screenshots...");
  console.log(`📍 URL: ${BASE_URL}`);
  console.log(`📁 Output: ${OUTPUT_DIR}\n`);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2, // Retina quality
  });
  const page = await context.newPage();

  // Login
  console.log("🔐 Fazendo login...");
  await page.goto(`${BASE_URL}/login`, { waitUntil: "networkidle" });
  await page.waitForTimeout(2000);

  // Preencher email e senha
  const emailInput = page.locator('input[type="email"], input[name="email"], input[placeholder*="email" i]');
  const passwordInput = page.locator('input[type="password"]');

  if (await emailInput.count() > 0) {
    await emailInput.fill(EMAIL);
    await passwordInput.fill(PASSWORD);

    // Clicar no botão de login
    const loginBtn = page.locator('button[type="submit"], button:has-text("Entrar"), button:has-text("Login")');
    await loginBtn.first().click();

    // Esperar redirecionamento
    await page.waitForTimeout(4000);
    console.log("✅ Login realizado!\n");
  } else {
    console.log("⚠️  Campos de login não encontrados. Tentando continuar...\n");
  }

  // Capturar cada página
  for (const { name, path: pagePath, waitFor } of PAGES) {
    try {
      console.log(`📸 Capturando: ${name}...`);
      await page.goto(`${BASE_URL}${pagePath}`, { waitUntil: "networkidle" });
      await page.waitForTimeout(waitFor);

      // Esconder a sidebar para screenshot mais limpo (opcional)
      // await page.evaluate(() => {
      //   const sidebar = document.querySelector('[data-sidebar]');
      //   if (sidebar) sidebar.style.display = 'none';
      // });

      await page.screenshot({
        path: path.resolve(OUTPUT_DIR, `${name}.png`),
        fullPage: false, // Só a viewport (1440x900)
      });

      console.log(`   ✅ ${name}.png salvo`);
    } catch (err) {
      console.log(`   ❌ Erro em ${name}: ${err.message}`);
    }
  }

  // Screenshot mobile do portal do funcionário
  console.log("\n📱 Capturando versão mobile do portal...");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${BASE_URL}/portal-funcionario`, { waitUntil: "networkidle" });
  await page.waitForTimeout(3000);
  await page.screenshot({
    path: path.resolve(OUTPUT_DIR, "portal-funcionario-mobile.png"),
    fullPage: false,
  });
  console.log("   ✅ portal-funcionario-mobile.png salvo");

  await browser.close();
  console.log("\n🎉 Pronto! Screenshots salvos em public/screenshots/");
}

main().catch((err) => {
  console.error("Erro fatal:", err);
  process.exit(1);
});
