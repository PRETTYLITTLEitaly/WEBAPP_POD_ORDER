import PDFDocument from "pdfkit";
import SVGtoPDF from "svg-to-pdfkit";
import fs from "fs";
import path from "path";

const MM_TO_PT = 2.83465;
const PADDING_MM = 3; 
const LABEL_GAP_MM = 5; // Spazio di 5mm esatti dal bordo della grafica per taglio sicuro
const LABEL_HEIGHT_MM = 10; // 5mm di spazio + altezza testo

// Bin Packing Algorithm con supporto posizionamento manuale e margini di padding interno
export async function generatePodPdf(items, binWidthMm = 300, margins = { top: 5, bottom: 5, sides: 3 }) {
  return new Promise((resolve, reject) => {
    try {
      const binWidthPt = binWidthMm * MM_TO_PT;
      const paddingPt = PADDING_MM * MM_TO_PT;
      const labelHeightPt = LABEL_HEIGHT_MM * MM_TO_PT;
      const labelGapPt = LABEL_GAP_MM * MM_TO_PT;

      const marginTopPt = (margins?.top ?? 5) * MM_TO_PT;
      const marginBottomPt = (margins?.bottom ?? 5) * MM_TO_PT;
      const marginSidesPt = (margins?.sides ?? 3) * MM_TO_PT;

      const boxes = [];
      let totalHeightPt = marginTopPt;

      // Se gli elementi hanno già coordinate manuali valide (custom placement)
      const hasCustomPositions = items.every(item => typeof item.customX === "number" && typeof item.customY === "number");

      if (hasCustomPositions) {
        for (const item of items) {
          const w = (item.rotated ? item.heightMm : item.widthMm) * MM_TO_PT;
          const h = (item.rotated ? item.widthMm : item.heightMm) * MM_TO_PT;
          const x = item.customX * MM_TO_PT;
          const y = item.customY * MM_TO_PT;

          boxes.push({
            ...item,
            x,
            y,
            w,
            h,
            rotated: !!item.rotated
          });
          totalHeightPt = Math.max(totalHeightPt, y + h + labelHeightPt + marginBottomPt);
        }
      } else {
        // Algoritmo di Incastro Automatico (Shelf Next Fit) rispettando il padding interno
        const sortedItems = [...items].sort((a, b) => b.heightMm - a.heightMm);
        let currentX = marginSidesPt;
        let currentY = marginTopPt;
        let shelfHeightPt = 0;

        const maxUsableWidth = binWidthPt - marginSidesPt;

        for (const item of sortedItems) {
          let w = item.widthMm * MM_TO_PT;
          let h = item.heightMm * MM_TO_PT;
          let rotated = false;

          // Smart Rotation
          if (w > (maxUsableWidth - marginSidesPt) || (h < w && w > (binWidthPt / 2))) {
            const temp = w;
            w = h;
            h = temp;
            rotated = true;
          }

          const totalItemH = h + labelHeightPt;
          const totalItemW = w;

          if (currentX + totalItemW + paddingPt > maxUsableWidth) {
            currentX = marginSidesPt;
            currentY += shelfHeightPt + paddingPt;
            shelfHeightPt = 0;
          }

          boxes.push({
            ...item,
            x: currentX,
            y: currentY,
            w: w,
            h: h,
            totalH: totalItemH,
            rotated: rotated
          });

          currentX += totalItemW + paddingPt;
          shelfHeightPt = Math.max(shelfHeightPt, totalItemH);
        }
        totalHeightPt = currentY + shelfHeightPt + marginBottomPt;
      }

      const doc = new PDFDocument({ size: [binWidthPt, Math.max(totalHeightPt, 100)], margin: 0 });
      const chunks = [];

      doc.on("data", (chunk) => chunks.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", (err) => reject(err));

      const fontDir = path.join(process.cwd(), "public", "fonts");
      let availableFonts = [];
      if (fs.existsSync(fontDir)) {
        availableFonts = fs.readdirSync(fontDir).filter(f => f.endsWith(".ttf") || f.endsWith(".otf"));
      }
      
      for (const box of boxes) {
        if (box.svgContent) {
          try {
            doc.save();
            doc.translate(box.x, box.y);
            
            if (box.rotated) {
              doc.rotate(90, { origin: [box.w / 2, box.w / 2] });
            }

            SVGtoPDF(doc, box.svgContent, 0, 0, {
              width: box.w,
              height: box.h,
              preserveAspectRatio: "xMidYMid meet"
            });
            
            doc.restore();
          } catch (svgErr) {
            console.error("SVG RENDER ERROR:", svgErr);
            doc.rect(box.x, box.y, box.w, box.h).stroke();
          }
        } else if (box.imageContent) {
          try {
            doc.save();
            const imgBuffer = Buffer.from(box.imageContent, "base64");
            
            doc.image(imgBuffer, box.x, box.y, {
              width: box.w,
              height: box.h,
              fit: [box.w, box.h],
              align: "center",
              valign: "center"
            });

            doc.restore();
          } catch (imgErr) {
            console.error("IMAGE RENDER ERROR:", imgErr);
            doc.rect(box.x, box.y, box.w, box.h).stroke();
          }
        } else {
          doc.rect(box.x, box.y, box.w, box.h).stroke();
        }

        // Label sotto il pezzo (Numero Ordine posizionato SEMPRE a 5mm esatti dal bordo inferiore della grafica)
        if (box.orderName) {
          doc.save();
          doc.fillColor("black")
             .font("Helvetica-Bold")
             .fontSize(9)
             .text(`${box.orderName}${box.rotated ? ' (R)' : ''}`, box.x, box.y + box.h + labelGapPt, {
               width: box.w,
               align: "center"
             });
          doc.restore();
        }
      }

      doc.end();
    } catch (e) {
      reject(e);
    }
  });
}
