import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

const FONTS_DIR = path.join(process.cwd(), "public", "fonts");

function ensureFontsDir() {
  if (!fs.existsSync(FONTS_DIR)) {
    fs.mkdirSync(FONTS_DIR, { recursive: true });
  }
}

// GET /api/fonts — Ritorna l'elenco di tutti i font presenti nella cartella public/fonts
export async function GET() {
  try {
    ensureFontsDir();
    const files = fs.readdirSync(FONTS_DIR);
    
    const fonts = files
      .filter(f => f.toLowerCase().endsWith(".ttf") || f.toLowerCase().endsWith(".otf"))
      .map(filename => {
        const filePath = path.join(FONTS_DIR, filename);
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
          url: `/fonts/${filename}`,
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

// POST /api/fonts — Upload di un nuovo file font (.ttf o .otf)
export async function POST(req: NextRequest) {
  try {
    ensureFontsDir();

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

    // Sanitizza nome file (es. "My Font_Name.ttf" -> "My_Font_Name.ttf")
    const safeBaseName = path.basename(originalName, ext).replace(/[^a-zA-Z0-9_-]/g, "_");
    const filename = `${safeBaseName}${ext}`;
    const targetPath = path.join(FONTS_DIR, filename);

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    fs.writeFileSync(targetPath, buffer);

    const stats = fs.statSync(targetPath);

    return NextResponse.json({
      success: true,
      font: {
        id: filename,
        name: safeBaseName,
        filename: filename,
        url: `/fonts/${filename}`,
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
    ensureFontsDir();
    const { filename } = await req.json();

    if (!filename) {
      return NextResponse.json({ success: false, error: "Parametro filename mancante." }, { status: 400 });
    }

    const safeFilename = path.basename(filename);
    const filePath = path.join(FONTS_DIR, safeFilename);

    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    return NextResponse.json({ success: true, message: `Font ${safeFilename} eliminato con successo.` });
  } catch (error: any) {
    console.error("Errore eliminazione font:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
