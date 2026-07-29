import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import os from "os";
import { shopifyFetch } from "@/lib/shopify";

export const dynamic = "force-dynamic";

const PUBLIC_FONTS_DIR = path.join(process.cwd(), "public", "fonts");
const TMP_FONTS_DIR = path.join(os.tmpdir(), "pod_fonts");

export function getWritableFontsDir(): string {
  try {
    if (!fs.existsSync(PUBLIC_FONTS_DIR)) {
      fs.mkdirSync(PUBLIC_FONTS_DIR, { recursive: true });
    }
    // Test write permission
    const testFile = path.join(PUBLIC_FONTS_DIR, ".write_test");
    fs.writeFileSync(testFile, "test");
    fs.unlinkSync(testFile);
    return PUBLIC_FONTS_DIR;
  } catch (e) {
    // Read-only environment (e.g. Vercel Serverless) -> Fallback to /tmp
    if (!fs.existsSync(TMP_FONTS_DIR)) {
      fs.mkdirSync(TMP_FONTS_DIR, { recursive: true });
    }
    return TMP_FONTS_DIR;
  }
}

export async function syncFontsFromShopify() {
  const fontsDir = getWritableFontsDir();
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
      const filename = node.key; // e.g. "Get_Show.otf"
      const targetPath = path.join(fontsDir, filename);
      if (!fs.existsSync(targetPath)) {
        console.log(`Restoring font ${filename} from Shopify Shop Metafield...`);
        let base64Data = node.value;
        try {
          const parsed = JSON.parse(node.value);
          if (parsed && parsed.b64) {
            base64Data = parsed.b64;
          }
        } catch (e) {
          // Fallback to raw base64 if not JSON
        }
        const buffer = Buffer.from(base64Data, "base64");
        fs.writeFileSync(targetPath, buffer);
      }
    }
  } catch (e: any) {
    console.error("Failed to sync fonts from Shopify:", e.message);
  }
}

// GET /api/fonts — Ritorna l'elenco dei font oppure serve direttamente il file font richiesto
export async function GET(req: NextRequest) {
  try {
    // Sync fonts from Shopify first to populate local directory (/tmp)
    await syncFontsFromShopify();

    const { searchParams } = new URL(req.url);
    const requestedFile = searchParams.get("file");

    const fontsDir = getWritableFontsDir();

    // Se è richiesto il download o il rendering diretto di un file font
    if (requestedFile) {
      const cleanFileName = path.basename(requestedFile);
      let targetPath = path.join(PUBLIC_FONTS_DIR, cleanFileName);
      if (!fs.existsSync(targetPath)) {
        targetPath = path.join(TMP_FONTS_DIR, cleanFileName);
      }

      if (!fs.existsSync(targetPath)) {
        return NextResponse.json({ success: false, error: "File font non trovato." }, { status: 404 });
      }

      const ext = path.extname(cleanFileName).toLowerCase();
      const mime = ext === ".otf" ? "font/otf" : "font/ttf";
      const fileBuffer = fs.readFileSync(targetPath);

      return new Response(fileBuffer, {
        headers: {
          "Content-Type": mime,
          "Cache-Control": "public, max-age=31536000, immutable"
        }
      });
    }

    // Altrimenti ritorna l'elenco completo di tutti i font (da public e da /tmp)
    const fontFilesMap = new Map<string, { filePath: string; filename: string }>();

    if (fs.existsSync(PUBLIC_FONTS_DIR)) {
      try {
        fs.readdirSync(PUBLIC_FONTS_DIR).forEach(f => {
          if (f.toLowerCase().endsWith(".ttf") || f.toLowerCase().endsWith(".otf")) {
            fontFilesMap.set(f, { filePath: path.join(PUBLIC_FONTS_DIR, f), filename: f });
          }
        });
      } catch (e) {}
    }

    if (fs.existsSync(TMP_FONTS_DIR)) {
      try {
        fs.readdirSync(TMP_FONTS_DIR).forEach(f => {
          if (f.toLowerCase().endsWith(".ttf") || f.toLowerCase().endsWith(".otf")) {
            fontFilesMap.set(f, { filePath: path.join(TMP_FONTS_DIR, f), filename: f });
          }
        });
      } catch (e) {}
    }

    const fonts = Array.from(fontFilesMap.values()).map(({ filePath, filename }) => {
      const stats = fs.statSync(filePath);
      const ext = path.extname(filename).toLowerCase();
      const fontName = path.basename(filename, ext);

      const fileBuffer = fs.readFileSync(filePath);
      const b64 = fileBuffer.toString("base64");
      const mime = ext === ".otf" ? "font/otf" : "font/ttf";

      return {
        id: filename,
        name: fontName,
        filename: filename,
        url: `/api/fonts?file=${encodeURIComponent(filename)}`,
        dataUri: `data:${mime};base64,${b64}`,
        format: ext.replace(".", "").toUpperCase(),
        sizeBytes: stats.size,
        updatedAt: stats.mtime
      };
    });

    return NextResponse.json({ success: true, fonts });
  } catch (error: any) {
    console.error("Errore lettura font:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST /api/fonts — Upload di un nuovo file font (.ttf o .otf) con supporto /tmp per Vercel
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ success: false, error: "Nessun file caricato." }, { status: 400 });
    }

    const originalName = file.name;
    const ext = path.extname(originalName).toLowerCase();

    if (ext !== ".ttf" && ext !== ".otf") {
      return NextResponse.json({ 
        success: false, 
        error: "Formato non supportato. Puoi caricare solo file .ttf o .otf" 
      }, { status: 400 });
    }

    const safeBaseName = path.basename(originalName, ext).replace(/[^a-zA-Z0-9_-]/g, "_");
    const filename = `${safeBaseName}${ext}`;

    const targetDir = getWritableFontsDir();
    const targetPath = path.join(targetDir, filename);

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    fs.writeFileSync(targetPath, buffer);

    const stats = fs.statSync(targetPath);
    const mime = ext === ".otf" ? "font/otf" : "font/ttf";
    const b64 = buffer.toString("base64");

    // Save persistently to Shopify Shop Metafield
    const shopRes = await shopifyFetch({
      store: "b2c",
      query: `#graphql
        query getShopId {
          shop {
            id
          }
        }
      `
    });
    const shopId = shopRes.data?.shop?.id;
    if (!shopId) {
      throw new Error("Impossibile recuperare l'ID del negozio da Shopify.");
    }

    const metafieldMutation = `#graphql
      mutation setShopMetafield($metafields: [MetafieldsSetInput!]!) {
        metafieldsSet(metafields: $metafields) {
          userErrors { field message }
        }
      }
    `;
    const mutationRes = await shopifyFetch({
      store: "b2c",
      query: metafieldMutation,
      variables: {
        metafields: [{
          ownerId: shopId,
          namespace: "pod_custom_font",
          key: filename,
          type: "json",
          value: JSON.stringify({ b64: b64 })
        }]
      }
    });

    const userErrors = mutationRes.data?.metafieldsSet?.userErrors || [];
    if (userErrors.length > 0) {
      throw new Error(`Errore Shopify: ${userErrors[0].message}`);
    }

    return NextResponse.json({
      success: true,
      font: {
        id: filename,
        name: safeBaseName,
        filename: filename,
        url: `/api/fonts?file=${encodeURIComponent(filename)}`,
        dataUri: `data:${mime};base64,${b64}`,
        format: ext.replace(".", "").toUpperCase(),
        sizeBytes: stats.size,
        updatedAt: stats.mtime
      }
    });
  } catch (error: any) {
    console.error("Errore upload font:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// DELETE /api/fonts — Elimina un font salvato
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const filename = searchParams.get("filename");

    if (!filename) {
      return NextResponse.json({ success: false, error: "Nome file mancante." }, { status: 400 });
    }

    const cleanFileName = path.basename(filename);
    let deleted = false;

    const publicPath = path.join(PUBLIC_FONTS_DIR, cleanFileName);
    if (fs.existsSync(publicPath)) {
      try {
        fs.unlinkSync(publicPath);
        deleted = true;
      } catch (e) {}
    }

    const tmpPath = path.join(TMP_FONTS_DIR, cleanFileName);
    if (fs.existsSync(tmpPath)) {
      try {
        fs.unlinkSync(tmpPath);
        deleted = true;
      } catch (e) {}
    }

    if (!deleted) {
      return NextResponse.json({ success: false, error: "File font non trovato o non eliminabile." }, { status: 404 });
    }

    // Delete persistently from Shopify Shop Metafield
    try {
      const shopRes = await shopifyFetch({
        store: "b2c",
        query: `#graphql
          query getShopFonts {
            shop {
              metafields(first: 100, namespace: "pod_custom_font") {
                nodes {
                  id
                  key
                }
              }
            }
          }
        `
      });
      const nodes = shopRes.data?.shop?.metafields?.nodes || [];
      const targetMetafield = nodes.find((n: any) => n.key === cleanFileName);
      if (targetMetafield) {
        const deleteMutation = `#graphql
          mutation deleteShopMetafield($metafieldIds: [ID!]!) {
            metafieldsDelete(metafieldIds: $metafieldIds) {
              userErrors { field message }
            }
          }
        `;
        await shopifyFetch({
          store: "b2c",
          query: deleteMutation,
          variables: { metafieldIds: [targetMetafield.id] }
        });
      }
    } catch (shopifyErr: any) {
      console.error("Failed to delete font from Shopify Shop Metafield:", shopifyErr.message);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Errore eliminazione font:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
