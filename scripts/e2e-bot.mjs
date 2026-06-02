// ============================================================
// NEXO E2E Bot - Varredura completa de todos os módulos
// ============================================================
// Rodar:
//   npx playwright install chromium
//   node scripts/e2e-bot.mjs
//
// Gera relatório em: test-results/report.html
// Screenshots em: test-results/screenshots/
// ============================================================

import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const BASE_URL = process.env.BASE_URL || "https://pllvwcszoyjhfvnzshzw.lovableproject.com";
const EMAIL = "demo@nexo.app";
const PASSWORD = "NexoDemo2025!";
const OUT_DIR = resolve("test-results");
const SCREENSHOT_DIR = resolve(OUT_DIR, "screenshots");

// All modules to test
const MODULES = [
  { name: "Dashboard", path: "/", checks: ["Painel NEXO", "Olá"] },
  { name: "Comercial", path: "/comercial", checks: ["Pipeline", "Lead"] },
  { name: "Contratos", path: "/contratos", checks: ["Contratos", "Cliente"] },
  { name: "Clientes", path: "/clientes", checks: ["Clientes"] },
  { name: "Técnico", path: "/tecnico", checks: ["Técnico"] },
  { name: "Produção", path: "/producao", checks: ["Produção"] },
  { name: "Logística", path: "/logistica", checks: ["Logística", "Entrega"] },
  { name: "Montagem", path: "/montagem", checks: ["Montagem"] },
  { name: "Almoxarifado", path: "/almoxarifado", checks: ["Almoxarifado", "Estoque"] },
  { name: "Frota", path: "/frota", checks: ["Frota", "Veículo"] },
  { name: "Pós-venda", path: "/pos-venda", checks: ["Pós-venda", "Chamado"] },
  { name: "Mapa Operações", path: "/mapa-operacoes", checks: ["Mapa", "Operações"] },
  { name: "Radar Equipe", path: "/radar-equipe", checks: ["Radar", "Equipe"] },
  { name: "Mensagens", path: "/mensagens", checks: ["Mensagens"] },
  { name: "DRE", path: "/dre", checks: ["DRE"] },
  { name: "Financeiro", path: "/financeiro", checks: ["Financeiro"] },
  { name: "Comissões", path: "/comissoes", checks: ["Comissões"] },
  { name: "Compras", path: "/compras", checks: ["Compras"] },
  { name: "RH", path: "/rh", checks: ["RH", "Recurso"] },
  { name: "Equipe", path: "/equipe", checks: ["Equipe"] },
  { name: "Analytics", path: "/analytics", checks: ["Analytics"] },
  { name: "Indicadores", path: "/indicadores", checks: ["Indicadores"] },
  { name: "WhatsApp", path: "/automacao-whatsapp", checks: ["WhatsApp", "Automação"] },
  { name: "Push", path: "/push-notificacoes", checks: ["Notificações", "Push"] },
  { name: "Automações", path: "/automacoes", checks: [] },
  { name: "Comunicação", path: "/central-comunicacao", checks: [] },
  { name: "Feedback", path: "/feedback", checks: ["Feedback"] },
  { name: "Ajuda", path: "/ajuda", checks: ["Ajuda"] },
  { name: "Notificações", path: "/notificacoes", checks: [] },
  { name: "Integrações", path: "/integracoes", checks: ["Integrações"] },
  { name: "Estimativa PDF", path: "/estimativa-orcamento", checks: [] },
  { name: "Modo Campo", path: "/modo-campo", checks: [] },
  { name: "Portal Funcionário", path: "/portal-funcionario", checks: ["Ponto", "Solicitações"] },
  { name: "Lojas", path: "/lojas", checks: ["Loja"] },
  { name: "Config Pagamento", path: "/configuracoes/pagamento", checks: [] },
  { name: "Config Fornecedores", path: "/configuracoes/fornecedores", checks: [] },
];

// Actions to test (forms, buttons)
const ACTIONS = [
  {
    name: "Criar Lead",
    path: "/comercial",
    steps: async (page) => {
      const addBtn = page.locator('button:has-text("Novo"), button:has-text("+")').first();
      if (await addBtn.isVisible()) {
        await addBtn.click();
        await page.waitForTimeout(1000);
        return { success: true, detail: "Dialog de novo lead abriu" };
      }
      return { success: false, detail: "Botão Novo não encontrado" };
    },
  },
  {
    name: "Abrir Novo Contrato",
    path: "/contratos",
    steps: async (page) => {
      const btn = page.locator('button:has-text("Novo contrato"), a:has-text("Novo contrato")').first();
      if (await btn.isVisible()) {
        await btn.click();
        await page.waitForTimeout(2000);
        const url = page.url();
        return { success: url.includes("/contratos/novo"), detail: `Navegou para: ${url}` };
      }
      return { success: false, detail: "Botão Novo contrato não encontrado" };
    },
  },
  {
    name: "Registrar Feedback",
    path: "/feedback",
    steps: async (page) => {
      const btn = page.locator('button:has-text("Novo Feedback"), button:has-text("Novo")').first();
      if (await btn.isVisible()) {
        await btn.click();
        await page.waitForTimeout(1000);
        return { success: true, detail: "Dialog de feedback abriu" };
      }
      return { success: false, detail: "Botão Novo Feedback não encontrado" };
    },
  },
  {
    name: "Portal Ponto",
    path: "/portal-funcionario",
    steps: async (page) => {
      const pontoTab = page.locator('button:has-text("Ponto"), [role="tab"]:has-text("Ponto")').first();
      if (await pontoTab.isVisible()) {
        await pontoTab.click();
        await page.waitForTimeout(1000);
        const pontoBtn = page.locator('button:has-text("Entrada"), button:has-text("Saída")').first();
        return { success: await pontoBtn.isVisible(), detail: "Tab Ponto funcional" };
      }
      return { success: false, detail: "Tab Ponto não encontrada" };
    },
  },
];

// ============================================================
// Main
// ============================================================
async function main() {
  console.log("🤖 NEXO E2E Bot - Varredura Completa");
  console.log("=".repeat(50));
  console.log(`📍 URL: ${BASE_URL}`);
  console.log(`📧 Login: ${EMAIL}`);
  console.log(`📁 Resultados: ${OUT_DIR}\n`);

  await mkdir(SCREENSHOT_DIR, { recursive: true });

  const results = [];
  const startTime = Date.now();

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();

  // Capturar erros de console
  const consoleErrors = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") {
      consoleErrors.push({ url: page.url(), text: msg.text() });
    }
  });

  // ========== LOGIN ==========
  console.log("🔐 Fazendo login...");
  try {
    await page.goto(`${BASE_URL}/login`, { waitUntil: "networkidle", timeout: 30000 });
    await page.waitForTimeout(2000);

    const emailInput = page.locator('input[type="email"]').first();
    const passInput = page.locator('input[type="password"]').first();

    if (await emailInput.isVisible()) {
      await emailInput.fill(EMAIL);
      await passInput.fill(PASSWORD);
      const submitBtn = page.locator('button[type="submit"]').first();
      await submitBtn.click();
      await page.waitForTimeout(4000);

      // Fechar wizard de onboarding se aparecer
      const skipBtn = page.locator('button:has-text("Começar"), button:has-text("Pular")').first();
      if (await skipBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        // Click through wizard
        await skipBtn.click();
        await page.waitForTimeout(500);
        const nextBtns = page.locator('button:has-text("Próximo")');
        for (let i = 0; i < 3; i++) {
          const nb = nextBtns.first();
          if (await nb.isVisible({ timeout: 1000 }).catch(() => false)) {
            await nb.click();
            await page.waitForTimeout(500);
          }
        }
        const enterBtn = page.locator('button:has-text("Entrar")').first();
        if (await enterBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
          await enterBtn.click();
        }
        await page.waitForTimeout(1000);
      }

      console.log("✅ Login OK\n");
    } else {
      console.log("⚠️  Campos de login não encontrados\n");
    }
  } catch (err) {
    console.log(`❌ Erro no login: ${err.message}\n`);
    results.push({ name: "Login", status: "error", detail: err.message });
  }

  // ========== MÓDULOS ==========
  console.log("📋 Testando módulos...\n");

  for (const mod of MODULES) {
    try {
      await page.goto(`${BASE_URL}${mod.path}`, { waitUntil: "networkidle", timeout: 20000 });
      await page.waitForTimeout(2000);

      // Check for errors
      const bodyText = await page.textContent("body");
      const hasError = bodyText.includes("Something went wrong") ||
        bodyText.includes("Error") && bodyText.includes("boundary") ||
        bodyText.includes("Cannot read") ||
        bodyText.includes("undefined is not") ||
        bodyText.includes("Database error");

      // Check for expected content
      let contentFound = mod.checks.length === 0; // if no checks, pass
      for (const check of mod.checks) {
        if (bodyText.includes(check)) {
          contentFound = true;
          break;
        }
      }

      // Check if page is blank
      const isBlank = (bodyText || "").trim().length < 50;

      const status = hasError ? "error" : isBlank ? "blank" : !contentFound ? "warning" : "pass";
      const detail = hasError ? "Erro na página" : isBlank ? "Página em branco" : !contentFound ? `Conteúdo esperado não encontrado: ${mod.checks.join(", ")}` : "OK";

      results.push({ name: mod.name, path: mod.path, status, detail });

      // Screenshot
      await page.screenshot({ path: resolve(SCREENSHOT_DIR, `${mod.name.replace(/\s/g, "_").toLowerCase()}.png`) });

      const icon = status === "pass" ? "✅" : status === "warning" ? "⚠️ " : status === "blank" ? "⬜" : "❌";
      console.log(`${icon} ${mod.name} (${mod.path}) — ${detail}`);
    } catch (err) {
      results.push({ name: mod.name, path: mod.path, status: "error", detail: err.message });
      console.log(`❌ ${mod.name} (${mod.path}) — ${err.message}`);
    }
  }

  // ========== AÇÕES ==========
  console.log("\n🎯 Testando ações...\n");

  for (const action of ACTIONS) {
    try {
      await page.goto(`${BASE_URL}${action.path}`, { waitUntil: "networkidle", timeout: 20000 });
      await page.waitForTimeout(2000);

      const result = await action.steps(page);
      results.push({ name: `[Ação] ${action.name}`, path: action.path, status: result.success ? "pass" : "warning", detail: result.detail });

      const icon = result.success ? "✅" : "⚠️ ";
      console.log(`${icon} ${action.name} — ${result.detail}`);
    } catch (err) {
      results.push({ name: `[Ação] ${action.name}`, path: action.path, status: "error", detail: err.message });
      console.log(`❌ ${action.name} — ${err.message}`);
    }
  }

  await browser.close();

  // ========== RELATÓRIO ==========
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  const passed = results.filter((r) => r.status === "pass").length;
  const warnings = results.filter((r) => r.status === "warning").length;
  const errors = results.filter((r) => r.status === "error" || r.status === "blank").length;

  console.log("\n" + "=".repeat(50));
  console.log(`📊 RESULTADO FINAL (${elapsed}s)`);
  console.log(`   ✅ Passou: ${passed}`);
  console.log(`   ⚠️  Aviso: ${warnings}`);
  console.log(`   ❌ Erro: ${errors}`);
  console.log(`   📸 Screenshots: ${SCREENSHOT_DIR}`);
  console.log(`   🌐 Erros de console: ${consoleErrors.length}`);
  console.log("=".repeat(50));

  // Generate HTML report
  const html = generateReport(results, consoleErrors, elapsed);
  await writeFile(resolve(OUT_DIR, "report.html"), html);
  console.log(`\n📄 Relatório HTML: ${resolve(OUT_DIR, "report.html")}`);
}

function generateReport(results, consoleErrors, elapsed) {
  const passed = results.filter((r) => r.status === "pass").length;
  const warnings = results.filter((r) => r.status === "warning").length;
  const errors = results.filter((r) => r.status === "error" || r.status === "blank").length;

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>NEXO E2E Bot - Relatório</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #0a0e1a; color: #e2e8f0; padding: 40px; }
    .header { text-align: center; margin-bottom: 40px; }
    .header h1 { font-size: 28px; color: #fff; margin-bottom: 8px; }
    .header p { color: #6B7A90; font-size: 14px; }
    .stats { display: flex; gap: 16px; justify-content: center; margin: 24px 0; }
    .stat { background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; padding: 16px 24px; text-align: center; }
    .stat .value { font-size: 24px; font-weight: 700; }
    .stat .label { font-size: 12px; color: #6B7A90; margin-top: 4px; }
    .pass .value { color: #12B76A; }
    .warn .value { color: #F79009; }
    .error .value { color: #F04438; }
    table { width: 100%; border-collapse: collapse; margin-top: 24px; background: rgba(255,255,255,0.02); border-radius: 12px; overflow: hidden; }
    th { background: rgba(255,255,255,0.05); text-align: left; padding: 12px 16px; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: #6B7A90; }
    td { padding: 12px 16px; border-top: 1px solid rgba(255,255,255,0.05); font-size: 13px; }
    .badge { display: inline-block; padding: 2px 8px; border-radius: 999px; font-size: 11px; font-weight: 600; }
    .badge-pass { background: rgba(18,183,106,0.15); color: #12B76A; }
    .badge-warning { background: rgba(247,144,9,0.15); color: #F79009; }
    .badge-error { background: rgba(240,68,56,0.15); color: #F04438; }
    .badge-blank { background: rgba(255,255,255,0.1); color: #6B7A90; }
    .section { margin-top: 32px; }
    .section h2 { font-size: 16px; margin-bottom: 12px; color: #fff; }
    .console-error { background: rgba(240,68,56,0.05); border: 1px solid rgba(240,68,56,0.2); border-radius: 8px; padding: 8px 12px; margin-bottom: 8px; font-size: 12px; font-family: monospace; }
  </style>
</head>
<body>
  <div class="header">
    <h1>🤖 NEXO E2E Bot — Relatório de Varredura</h1>
    <p>Executado em ${elapsed}s • ${new Date().toLocaleString("pt-BR")}</p>
  </div>

  <div class="stats">
    <div class="stat pass"><div class="value">${passed}</div><div class="label">Passou</div></div>
    <div class="stat warn"><div class="value">${warnings}</div><div class="label">Avisos</div></div>
    <div class="stat error"><div class="value">${errors}</div><div class="label">Erros</div></div>
    <div class="stat"><div class="value" style="color:#1E6FBF">${results.length}</div><div class="label">Total</div></div>
  </div>

  <table>
    <thead><tr><th>Módulo</th><th>Rota</th><th>Status</th><th>Detalhe</th></tr></thead>
    <tbody>
      ${results.map((r) => `
        <tr>
          <td>${r.name}</td>
          <td style="color:#6B7A90">${r.path || ""}</td>
          <td><span class="badge badge-${r.status}">${r.status === "pass" ? "✅ OK" : r.status === "warning" ? "⚠️ Aviso" : r.status === "blank" ? "⬜ Branco" : "❌ Erro"}</span></td>
          <td style="color:#6B7A90">${r.detail}</td>
        </tr>
      `).join("")}
    </tbody>
  </table>

  ${consoleErrors.length > 0 ? `
  <div class="section">
    <h2>🌐 Erros de Console (${consoleErrors.length})</h2>
    ${consoleErrors.slice(0, 20).map((e) => `
      <div class="console-error"><strong>${e.url}</strong><br>${e.text}</div>
    `).join("")}
  </div>` : ""}
</body>
</html>`;
}

main().catch((err) => {
  console.error("❌ Erro fatal:", err);
  process.exit(1);
});
