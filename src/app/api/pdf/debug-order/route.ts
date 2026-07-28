import { NextRequest, NextResponse } from "next/server";
import { shopifyFetch } from "@/lib/shopify";
import PDFDocument from "pdfkit";
// @ts-ignore
import SVGtoPDF from "svg-to-pdfkit";
import fs from "fs";
import path from "path";
import os from "os";
import { syncFontsFromShopify } from "@/app/api/fonts/route";

export const dynamic = "force-dynamic";

function escapeXml(unsafe: string): string {
  return (unsafe || "").replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case '\'': return '&apos;';
      case '"': return '&quot;';
      default: return c;
    }
  });
}

function generateSvgFromText(text: string, font: string, color: string, fontSizePx: number = 32): string {
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const lineHeight = Math.round(fontSizePx * 1.3);
  const svgHeight = Math.max(120, lines.length * lineHeight + 40);
  const svgWidth = 500;

  const fontName = font || "Outfit";
  const hexColor = color && color.startsWith("#") ? color : "#000000";

  const textNodes = lines.map((line, idx) => {
    const yPos = 50 + idx * lineHeight;
    return `<text x="250" y="${yPos}" text-anchor="middle" font-family="'${fontName}', cursive, sans-serif" font-size="${fontSizePx}px" fill="${hexColor}" font-weight="600">${escapeXml(line)}</text>`;
  }).join("\n");

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${svgWidth} ${svgHeight}" width="${svgWidth}" height="${svgHeight}">
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Dancing+Script:wght@600&amp;family=Outfit:wght@600&amp;family=Montserrat:wght@600&amp;display=swap');
    </style>
    ${textNodes}
  </svg>`;
}

export async function GET(req: NextRequest) {
  try {
    await syncFontsFromShopify().catch(() => {});
    const { searchParams } = new URL(req.url);
    const name = searchParams.get("name") || "#15119";
    const store = (searchParams.get("store") as "b2c" | "b2b") || "b2c";

    const query = `#graphql
      query getOrderByName($query: String!) {
        orders(first: 5, query: $query) {
          nodes {
            id
            name
            tags
            customAttributes {
              key
              value
            }
            lineItems(first: 20) {
              nodes {
                id
                title
                customAttributes {
                  key
                  value
                }
                product {
                  id
                  title
                }
              }
            }
          }
        }
      }
    `;

    const res = await shopifyFetch({
      store,
      query,
      variables: { query: `name:${name}` }
    });

    const order = res.data?.orders?.nodes?.[0];
    if (!order) {
      return NextResponse.json({ success: false, error: "Order not found" });
    }

    const debugLogs: string[] = [];
    const item = order.lineItems.nodes[0];
    
    // Resolve attributes
    let customText = "";
    let fontName = "Outfit";
    let fontColor = "#000000";
    let fontSizePx = 32;

    const attrs = item?.customAttributes || [];
    attrs.forEach((a: any) => {
      const rawKey = a.key || "";
      const k = rawKey.toLowerCase().trim();
      const v = String(a.value || "").trim();

      const isSystemKey = rawKey.startsWith("_") || k.includes("font") || k.includes("align") || k.includes("scegli") || k.includes("modello") || k.includes("stick") || k.includes("colore") || k.includes("vedi");

      if (!isSystemKey && !v.startsWith("http")) {
        const isSimpleOption = ["frase", "iniziale", "ammaccato", "liscio", "nero", "bianco", "azzurro"].includes(v.toLowerCase());
        if (v && (!isSimpleOption || !customText)) {
          if (!customText || v.length > customText.length) customText = v;
        }
      }
      if (k.includes("font") && !rawKey.startsWith("_")) fontName = v;
      if (k.includes("font size") || k.includes("_font_size")) {
        const p = parseFloat(v);
        if (!isNaN(p) && p > 0) fontSizePx = Math.round(p);
      }
      if (k.includes("colore") || k.includes("color")) {
        if (v.startsWith("#")) fontColor = v;
        else if (v.toLowerCase().includes("celeste") || v.toLowerCase().includes("azzurro")) fontColor = "#38bdf8";
        else if (v.toLowerCase().includes("tiffany")) fontColor = "#0d9488";
      }
    });

    debugLogs.push(`Resolved customText: "${customText}"`);
    debugLogs.push(`Resolved fontName: "${fontName}"`);
    debugLogs.push(`Resolved fontColor: "${fontColor}"`);
    debugLogs.push(`Resolved fontSizePx: ${fontSizePx}`);

    // Generate SVG
    const svgContent = generateSvgFromText(customText, fontName, fontColor, fontSizePx);
    debugLogs.push(`Generated SVG Length: ${svgContent.length}`);

    // Try PDFKit/SVGtoPDF rendering
    const doc = new PDFDocument({ size: [300, 300], margin: 0 });
    
    // Register fonts
    const PUBLIC_FONTS_DIR = path.join(process.cwd(), "public", "fonts");
    const TMP_FONTS_DIR = path.join(os.tmpdir(), "pod_fonts");
    
    const registerAllFontsFromDir = (dir: string) => {
      if (fs.existsSync(dir)) {
        try {
          const files = fs.readdirSync(dir);
          for (const file of files) {
            if (file.toLowerCase().endsWith(".ttf") || file.toLowerCase().endsWith(".otf")) {
              const ext = path.extname(file).toLowerCase();
              const nameOnly = path.basename(file, ext);
              const fontPath = path.join(dir, file);
              try {
                doc.registerFont(nameOnly, fontPath);
                doc.registerFont(nameOnly.replace(/_/g, " "), fontPath);
                debugLogs.push(`Registered font: "${nameOnly}" from ${file}`);
              } catch (e: any) {
                debugLogs.push(`Failed to register font "${nameOnly}": ${e.message}`);
              }
            }
          }
        } catch (e: any) {
          debugLogs.push(`Error reading fonts from ${dir}: ${e.message}`);
        }
      } else {
        debugLogs.push(`Fonts dir does not exist: ${dir}`);
      }
    };

    registerAllFontsFromDir(PUBLIC_FONTS_DIR);
    registerAllFontsFromDir(TMP_FONTS_DIR);

    let renderSuccess = false;
    let renderError = "";

    try {
      SVGtoPDF(doc, svgContent, 0, 0, {
        width: 300,
        height: 300,
        preserveAspectRatio: "xMidYMid meet",
        fontCallback: function(family: any, bold: any, italic: any) {
          const firstFamily = String(family || "").split(",")[0].replace(/['"]/g, "").trim();
          debugLogs.push(`fontCallback requested: "${family}" -> firstFamily: "${firstFamily}"`);
          
          const docAny = doc as any;
          if (docAny._fonts && docAny._fonts[firstFamily]) {
            debugLogs.push(`Found exact font match: "${firstFamily}"`);
            return firstFamily;
          }
          if (docAny._fonts) {
            const match = Object.keys(docAny._fonts).find(f => f.toLowerCase() === firstFamily.toLowerCase());
            if (match) {
              debugLogs.push(`Found case-insensitive font match: "${match}"`);
              return match;
            }
          }
          const cleanLower = firstFamily.toLowerCase();
          if (cleanLower.includes('helvetica') && cleanLower.includes('bold')) return 'Helvetica-Bold';
          if (cleanLower.includes('helvetica')) return 'Helvetica';
          if (cleanLower.includes('courier')) return 'Courier';
          if (cleanLower.includes('times')) return 'Times-Roman';
          
          if (docAny._fonts && Object.keys(docAny._fonts).length > 0) {
            const fb = Object.keys(docAny._fonts)[0];
            debugLogs.push(`Fallback to first custom font: "${fb}"`);
            return fb;
          }
          debugLogs.push(`Fallback to built-in Helvetica`);
          return 'Helvetica';
        }
      });
      renderSuccess = true;
      debugLogs.push("SVGtoPDF completed successfully!");
    } catch (e: any) {
      renderError = e.message;
      debugLogs.push(`SVGtoPDF failed: ${e.message}`);
    }

    return NextResponse.json({
      success: true,
      orderName: order.name,
      renderSuccess,
      renderError,
      debugLogs,
      svgContent
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
