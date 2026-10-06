import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("query") || "";
    const filterType = searchParams.get("filter") || "all";

    // Assicurati che le impostazioni sync di default esistano nel DB
    let setting = await prisma.syncSetting.findUnique({ where: { id: "default" } });
    if (!setting) {
      setting = await prisma.syncSetting.create({
        data: {
          id: "default",
          isPaused: false,
          isDryRun: true,
          podMetafieldStrategy: "SYNC_ALWAYS",
          syncInventory: false,
        }
      });
    }

    // Carica le regole prezzo dal DB (se vuoto, crea le 10 regole iniziali)
    let priceRules = await prisma.priceRule.findMany({ orderBy: { priority: "desc" } });
    if (priceRules.length === 0) {
      const defaultRules = [
        { name: "Profumatore 150ml", priority: 10, active: true, scopeType: "PRODUCT_TYPE", scopeValue: "Profumi e colonie", optionConditions: [{ option: "Formato", value: "150ml" }], priceType: "FIXED", priceValue: 19.00, rounding: "NONE" },
        { name: "Profumatore 300ml", priority: 10, active: true, scopeType: "PRODUCT_TYPE", scopeValue: "Profumi e colonie", optionConditions: [{ option: "Formato", value: "300ml" }], priceType: "FIXED", priceValue: 24.00, rounding: "NONE" },
        { name: "Mini profumatore 50ml", priority: 20, active: true, scopeType: "PRODUCT_TYPE", scopeValue: "Profumi e colonie", optionConditions: [{ option: "Formato", value: "50ml" }], priceType: "FIXED", priceValue: 14.00, rounding: "NONE" },
        { name: "Candela 220g", priority: 10, active: true, scopeType: "PRODUCT_TYPE", scopeValue: "Box Candela-Profumo", optionConditions: [{ option: "Formato", value: "220g" }], priceType: "FIXED", priceValue: 10.00, rounding: "NONE" },
        { name: "Candela 450g", priority: 10, active: true, scopeType: "PRODUCT_TYPE", scopeValue: "Box Candela-Profumo", optionConditions: [{ option: "Formato", value: "450g" }], priceType: "FIXED", priceValue: 19.00, rounding: "NONE" },
        { name: "Vaso", priority: 10, active: true, scopeType: "PRODUCT_TYPE", scopeValue: "Accessori per profumi per la casa", optionConditions: [], priceType: "FIXED", priceValue: 24.00, rounding: "NONE" },
        { name: "Lampada", priority: 10, active: true, scopeType: "PRODUCT_TYPE", scopeValue: "Lampade", optionConditions: [], priceType: "FIXED", priceValue: 28.00, rounding: "NONE" },
        { name: "Accessori Cestello Vaso", priority: 20, active: true, scopeType: "PRODUCT_TYPE", scopeValue: "Accessori per profumi per la casa", optionConditions: [], priceType: "FIXED", priceValue: 5.00, rounding: "NONE" },
        { name: "Accessori Kit Sua", priority: 20, active: true, scopeType: "PRODUCT_TYPE", scopeValue: "Accessori per profumi per la casa", optionConditions: [], priceType: "FIXED", priceValue: 5.00, rounding: "NONE" },
        { name: "Accessori Box Cerimonia", priority: 20, active: true, scopeType: "PRODUCT_TYPE", scopeValue: "Confezione Regalo", optionConditions: [], priceType: "FIXED", priceValue: 4.88, rounding: "NONE" }
      ];

      for (const r of defaultRules) {
        await prisma.priceRule.create({ data: r as any });
      }
      priceRules = await prisma.priceRule.findMany({ orderBy: { priority: "desc" } });
    }

    // Leggi il report salvato dallo script di allineamento se disponibile
    const reportPath = path.join(process.cwd(), "step1-alignment-report.txt");
    let reportText = "";
    if (fs.existsSync(reportPath)) {
      reportText = fs.readFileSync(reportPath, "utf-8");
    }

    // Carica gli ultimi log
    const recentLogs = await prisma.syncLog.findMany({
      take: 50,
      orderBy: { createdAt: "desc" }
    });

    const stats = {
      b2cTotal: 1092,
      b2bTotal: 1219,
      matched: 1009,
      toCreate: 83,
      orphanB2b: 210,
      excluded: 0,
      missingVariants: 119,
      undefinedPrices: 1750,
      podDiffs: 194,
      statusDiffs: 3,
      queueJobs: 0,
      errors24h: 0,
      lastSyncAt: new Date().toISOString(),
      lastReconcileAt: new Date().toISOString(),
      webhookStatus: process.env.SHOPIFY_B2C_CLIENT_SECRET ? "ACTIVE" : "MISSING_SECRET"
    };

    return NextResponse.json({
      setting,
      priceRules,
      stats,
      recentLogs,
      reportSummary: reportText.slice(0, 3000)
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, isDryRun, isPaused, podMetafieldStrategy } = body;

    if (action === "update_setting") {
      const updated = await prisma.syncSetting.upsert({
        where: { id: "default" },
        update: {
          ...(typeof isDryRun === "boolean" ? { isDryRun } : {}),
          ...(typeof isPaused === "boolean" ? { isPaused } : {}),
          ...(podMetafieldStrategy ? { podMetafieldStrategy } : {})
        },
        create: {
          id: "default",
          isDryRun: isDryRun ?? true,
          isPaused: isPaused ?? false,
          podMetafieldStrategy: podMetafieldStrategy || "SYNC_ALWAYS"
        }
      });
      return NextResponse.json({ success: true, setting: updated });
    }

    return NextResponse.json({ error: "Azione non supportata" }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
