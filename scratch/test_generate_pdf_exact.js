import { generatePodPdf } from "../src/lib/pod.server.js";
import fs from "fs";

async function run() {
  const items = [
    {
      id: "test-order-item",
      orderName: "#15119",
      itemTitle: "Dillo con un profumatore",
      widthMm: 80,
      heightMm: 100,
      svgContent: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 120" width="500" height="120">
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Dancing+Script:wght@600&amp;family=Outfit:wght@600&amp;family=Montserrat:wght@600&amp;display=swap');
    </style>
    <text x="250" y="50" text-anchor="middle" font-family="'Get show', cursive, sans-serif" font-size="25px" fill="#38bdf8" font-weight="600">Giulia &amp; Riccardo</text>
<text x="250" y="83" text-anchor="middle" font-family="'Get show', cursive, sans-serif" font-size="25px" fill="#38bdf8" font-weight="600">26.09.2026</text>
  </svg>`,
      imageContent: null,
      previewUrl: "",
      isImage: false
    }
  ];

  try {
    const pdfBuffer = await generatePodPdf({
      items,
      binWidthMm: 300,
      margins: { top: 5, bottom: 5, sides: 3 }
    });
    fs.writeFileSync("scratch/output_order_15119.pdf", pdfBuffer);
    console.log("PDF saved successfully to scratch/output_order_15119.pdf");
  } catch (e) {
    console.error("PDF generation failed:", e);
  }
}

run();
