import { shopifyFetch } from "../src/lib/shopify.js";
import PDFDocument from "pdfkit";
import SVGtoPDF from "svg-to-pdfkit";
import fs from "fs";
import path from "path";
import os from "os";

// Mock the syncFontsFromShopify function locally
async function syncFontsFromShopify(fontsDir) {
  try {
    const query = `#graphql
      query getShopFonts {
        shop {
          metafields(first: 100, namespace: "pod_custom_font") {
            nodes {
              id
              key
              value
            }
          }
        }
      }
    `;
    const res = await shopifyFetch({ store: "b2c", query });
    const nodes = res.data?.shop?.metafields?.nodes || [];
    
    for (const node of nodes) {
      const filename = node.key;
      const targetPath = path.join(fontsDir, filename);
      console.log(`Syncing font ${filename} from Shopify...`);
      let base64Data = node.value;
      try {
        const parsed = JSON.parse(node.value);
        if (parsed && parsed.b64) {
          base64Data = parsed.b64;
        }
      } catch (e) {
        // Fallback
      }
      const buffer = Buffer.from(base64Data, "base64");
      fs.writeFileSync(targetPath, buffer);
      console.log(`Saved ${filename} (${buffer.length} bytes) to ${targetPath}`);
    }
  } catch (e) {
    console.error("Sync error:", e);
  }
}

function generateSvgFromText(text, font, color, fontSizePx = 32) {
  const lines = text.split("\n");
  const lineHeight = Math.round(fontSizePx * 1.3);
  
  const fontName = font || "Outfit";
  const hexColor = color.startsWith("#") ? color : "#000000";

  let textElements = "";
  lines.forEach((line, idx) => {
    const yPos = 40 + idx * lineHeight;
    textElements += `\n    <text x="250" y="${yPos}" text-anchor="middle" font-family="'${fontName}', cursive, sans-serif" font-size="${fontSizePx}px" fill="${hexColor}" font-weight="600">${line}</text>`;
  });

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 500" width="500" height="500">
    <rect width="500" height="500" fill="none" />
    ${textElements}
  </svg>`;
}

async function run() {
  try {
    const scratchDir = path.join(process.cwd(), "scratch");
    const testFontsDir = path.join(scratchDir, "test_fonts");
    if (!fs.existsSync(testFontsDir)) {
      fs.mkdirSync(testFontsDir, { recursive: true });
    }

    // 1. Sync fonts
    await syncFontsFromShopify(testFontsDir);

    // 2. Setup PDF document
    const doc = new PDFDocument({ size: "A4" });
    const pdfPath = path.join(scratchDir, "test_output.pdf");
    const writeStream = fs.createWriteStream(pdfPath);
    doc.pipe(writeStream);

    // 3. Register fonts
    const files = fs.readdirSync(testFontsDir);
    for (const file of files) {
      if (file.toLowerCase().endsWith(".ttf") || file.toLowerCase().endsWith(".otf")) {
        const ext = path.extname(file).toLowerCase();
        const fontName = path.basename(file, ext);
        const fontPath = path.join(testFontsDir, file);
        doc.registerFont(fontName, fontPath);
        const spaceName = fontName.replace(/_/g, " ");
        doc.registerFont(spaceName, fontPath);
        console.log(`Registered font: "${fontName}" and "${spaceName}"`);
      }
    }

    // 4. Generate SVG content
    const text = "Allontanatore di \nsfighe e casi umani \ndai 29 only gioie e \ngood vibeS";
    const fontName = "Wildy";
    const fontColor = "#38bdf8";
    const fontSizePx = 15;
    const svgContent = generateSvgFromText(text, fontName, fontColor, fontSizePx);
    console.log("Generated SVG Content:\n", svgContent);

    // 5. Draw SVG on PDF
    SVGtoPDF(doc, svgContent, 50, 50, {
      width: 400,
      height: 400,
      fontCallback: function(family, bold, italic) {
        const firstFamily = (family || "").split(",")[0].replace(/['"]/g, "").trim();
        console.log(`Registered fonts in doc._registeredFonts:`, Object.keys(doc._registeredFonts || {}));
        console.log(`SVG requested font family: "${family}" -> parsed: "${firstFamily}"`);
        
        if (doc._registeredFonts && doc._registeredFonts[firstFamily]) {
          console.log(`Exact match found: "${firstFamily}"`);
          return firstFamily;
        }
        
        if (doc._registeredFonts) {
          const requestedNorm = firstFamily.toLowerCase().replace(/[^a-z0-9]/g, "");
          
          let match = Object.keys(doc._registeredFonts).find(f => {
            const regNorm = f.toLowerCase().replace(/[^a-z0-9]/g, "");
            return regNorm === requestedNorm;
          });
          if (match) {
            console.log(`Fuzzy match (exact normalized) found: "${match}"`);
            return match;
          }

          match = Object.keys(doc._registeredFonts).find(f => {
            const regNorm = f.toLowerCase().replace(/[^a-z0-9]/g, "");
            return regNorm.includes(requestedNorm) || requestedNorm.includes(regNorm);
          });
          if (match) {
            console.log(`Fuzzy match (substring normalized) found: "${match}"`);
            return match;
          }
        }

        console.log("No custom font match found, falling back to Helvetica");
        return 'Helvetica';
      }
    });

    doc.end();
    console.log("PDF generated successfully at:", pdfPath);

  } catch (e) {
    console.error("Execution failed:", e);
  }
}

run();
