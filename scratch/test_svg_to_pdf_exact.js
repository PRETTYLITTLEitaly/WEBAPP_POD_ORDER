const PDFDocument = require("pdfkit");
const SVGtoPDF = require("svg-to-pdfkit");

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 124" width="500" height="124">
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Dancing+Script:wght@600&amp;family=Outfit:wght@600&amp;family=Montserrat:wght@600&amp;display=swap');
    </style>
    <text x="50%" y="50" text-anchor="middle" font-family="'Get show', cursive, sans-serif" font-size="24px" fill="#38bdf8" font-weight="600">Giulia &amp; Riccardo</text>
<text x="50%" y="92" text-anchor="middle" font-family="'Get show', cursive, sans-serif" font-size="24px" fill="#38bdf8" font-weight="600">26.09.2026</text>
  </svg>`;

const doc = new PDFDocument({ size: [300, 300], margin: 0 });

try {
  SVGtoPDF(doc, svg, 0, 0, {
    width: 300,
    height: 300,
    preserveAspectRatio: "xMidYMid meet"
  });
  console.log("SVGtoPDF success!");
} catch (e) {
  console.error("SVGtoPDF failed:", e);
}
