import { NextRequest, NextResponse } from "next/server";
import { shopifyFetch } from "@/lib/shopify";
import { generatePodPdf } from "@/lib/pod.server";
import { editedImageMemoryCache } from "@/app/api/orders/save-graphic/route";
import { syncFontsFromShopify } from "@/app/api/fonts/route";
import { extractTextFontAndColorFromAttrs } from "@/lib/presetStore";

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

export async function POST(req: NextRequest) {
  try {
    const { orderIds, store, binWidthMm, margins, customItems, previewMode } = await req.json();

    if (!orderIds || !orderIds.length) {
      return NextResponse.json({ success: false, error: "Nessun ordine selezionato" }, { status: 400 });
    }

    // Restore custom fonts from Shopify to Vercel's /tmp before generating
    await syncFontsFromShopify().catch((err: any) => {
      console.error("Failed to sync fonts in generate route:", err);
    });

    const query = `#graphql
      query getBatchOrders($ids: [ID!]!) {
        nodes(ids: $ids) {
          ... on Order {
            id
            name
            tags
            status: metafield(namespace: "pod", key: "status") { value }
            edited_image: metafield(namespace: "pod", key: "edited_image") { value }
            pod_metafields: metafields(first: 30, namespace: "pod") { nodes { key value } }
            order_width: metafield(namespace: "pod", key: "width") { value }
            order_height: metafield(namespace: "pod", key: "height") { value }
            lineItems(first: 20) {
              nodes {
                id
                title
                quantity
                customAttributes { key value }
                product {
                  id
                  pod_width: metafield(namespace: "pod", key: "width") { namespace key value }
                  pod_height: metafield(namespace: "pod", key: "height") { namespace key value }
                  pod_svg: metafield(namespace: "pod", key: "svg") { 
                    namespace key value 
                    reference {
                      ... on GenericFile { url }
                      ... on MediaImage { image { url } }
                    }
                  }
                  custom_url: metafield(namespace: "custom", key: "pod_svg_url") { namespace key value }
                  pod_svg_url_pod: metafield(namespace: "pod", key: "svg_url") { namespace key value }
                  custom_width: metafield(namespace: "custom", key: "width") { namespace key value }
                  custom_height: metafield(namespace: "custom", key: "height") { namespace key value }
                }
                variant {
                  id
                  pod_width: metafield(namespace: "pod", key: "width") { namespace key value }
                  pod_height: metafield(namespace: "pod", key: "height") { namespace key value }
                  pod_svg: metafield(namespace: "pod", key: "svg") { 
                    namespace key value 
                    reference {
                      ... on GenericFile { url }
                      ... on MediaImage { image { url } }
                    }
                  }
                  custom_url: metafield(namespace: "custom", key: "pod_svg_url") { namespace key value }
                  pod_svg_url_pod: metafield(namespace: "pod", key: "svg_url") { namespace key value }
                  custom_width: metafield(namespace: "custom", key: "width") { namespace key value }
                  custom_height: metafield(namespace: "custom", key: "height") { namespace key value }
                }
              }
            }
          }
        }
      }`;

    const batchRes = await shopifyFetch({ store: store || "b2c", query, variables: { ids: orderIds } });
    const ordersDetails = batchRes.data?.nodes || [];

    const itemsToPack: any[] = [];
    const svgCache = new Map();

    for (const order of ordersDetails) {
      if (!order) continue;
      
      const isZeptoOrder = (order.tags || []).some((t: string) => t.toLowerCase().includes("personalizer"));
      const orderWidth = order.order_width?.value;
      const orderHeight = order.order_height?.value;
      const podMetaNodes = order.pod_metafields?.nodes || [];

      let globalPieceIndex = 0;

      for (const [itemIdx, item] of order.lineItems.nodes.entries()) {
        const itemQty = item.quantity || 1;

        const metafields = [
          item.product?.pod_width, item.product?.pod_height, item.product?.pod_svg,
          item.product?.custom_url, item.product?.pod_svg_url_pod, item.product?.custom_width, item.product?.custom_height,
          item.variant?.pod_width, item.variant?.pod_height, item.variant?.pod_svg,
          item.variant?.custom_url, item.variant?.pod_svg_url_pod, item.variant?.custom_width, item.variant?.custom_height
        ].filter(Boolean);
        
        let baseWidthVal = metafields.find((m: any) => m.key === "width")?.value;
        let baseHeightVal = metafields.find((m: any) => m.key === "height")?.value;
        
        if (!baseWidthVal || !baseHeightVal) {
          const attrWidth = item.customAttributes?.find((a: any) => ["Width", "Larghezza", "_pplr_width"].includes(a.key))?.value;
          const attrHeight = item.customAttributes?.find((a: any) => ["Height", "Altezza", "_pplr_height"].includes(a.key))?.value;
          if (attrWidth) baseWidthVal = attrWidth;
          if (attrHeight) baseHeightVal = attrHeight;
        }

        // Estrazione dati di personalizzazione da customAttributes
        let customText = "";
        let fontName = "Outfit";
        let fontColor = "#000000";
        let fontSizePx = 32;

        const attrs = item.customAttributes || [];
        const fontAndColor = extractTextFontAndColorFromAttrs(attrs);
        if (fontAndColor.font) fontName = fontAndColor.font;
        if (fontAndColor.color) fontColor = fontAndColor.color;

        const isPplrItem = isZeptoOrder || attrs.some((a: any) => {
          const k = (a.key || "").toLowerCase();
          return k.includes("_pplr") || k.includes("il tuo testo") || k.includes("scegli il font");
        });

        if (isPplrItem) {
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
            if (k.includes("font size") || k.includes("_font_size")) {
              const p = parseFloat(v);
              if (!isNaN(p) && p > 0) fontSizePx = Math.round(p);
            }
          });
        }

        // Trova qualsiasi file grafico di stampa associato (NON le foto del prodotto o anteprime fisiche JPG/PNG mockup!)
        const isolatedDesignAttr = attrs.find((a: any) => 
          a.key.startsWith("_design") || a.key.includes("_pplr_original") || a.key.includes("_pplr_pdf") || a.key.includes("_pplr_svg")
        );

        const svgMeta = metafields.find((m: any) => m.key === "svg");
        const svgTextUrl = metafields.find((m: any) => m.key === "pod_svg_url" || m.key === "pod_url" || m.key === "svg_url")?.value;

        const productPreassociatedSvg = 
          svgTextUrl || 
          svgMeta?.reference?.url || 
          svgMeta?.reference?.image?.url || 
          attrs.find((a: any) => typeof a.value === "string" && a.value.toLowerCase().includes(".svg"))?.value ||
          isolatedDesignAttr?.value;

        // Imposta dimensioni standard per stampa DTF se non specificate nei metafield di prodotto o variante
        if (!baseWidthVal) {
          baseWidthVal = (customText && orderWidth) ? orderWidth : "80";
        }
        if (!baseHeightVal) {
          baseHeightVal = (customText && orderHeight) ? orderHeight : "100";
        }

        // Ciclo per ciascun pezzo dell'articolo dell'ordine
        for (let q = 0; q < itemQty; q++) {
          const pieceIdx = globalPieceIndex;
          globalPieceIndex++;

          // 1. Cerca se c'è una grafica modificata salvata specificamente per QUESTO articolo/pezzo
          const specificPieceEditedImage = 
            editedImageMemoryCache.get(`${order.id}_${itemIdx}`) ||
            editedImageMemoryCache.get(`${order.id}_${pieceIdx}`) ||
            podMetaNodes.find((m: any) => m.key === `edited_image_${itemIdx}` || m.key === `edited_image_${pieceIdx}`)?.value;

          let pieceEditedImage = null;
          if (specificPieceEditedImage && typeof specificPieceEditedImage === "string") {
            const isMockupPhoto = /\.(jpg|jpeg|png)(\?.*)?$/i.test(specificPieceEditedImage) && !specificPieceEditedImage.toLowerCase().includes(".svg");
            if (!isMockupPhoto) {
              pieceEditedImage = specificPieceEditedImage;
            }
          }

          // Se NON c'è un'immagine salvata per questo pezzo specifico, valuta il fallback d'ordine SOLO se il prodotto NON è un SVG classico pre-associato
          if (!pieceEditedImage && !productPreassociatedSvg) {
            const fallbackOrderEdited = (pieceIdx === 0 || itemIdx === 0) ? (editedImageMemoryCache.get(order.id) || order.edited_image?.value) : null;
            if (fallbackOrderEdited && typeof fallbackOrderEdited === "string") {
              const isMockupPhoto = /\.(jpg|jpeg|png)(\?.*)?$/i.test(fallbackOrderEdited) && !fallbackOrderEdited.toLowerCase().includes(".svg");
              if (!isMockupPhoto) {
                pieceEditedImage = fallbackOrderEdited;
              }
            }
          }

          let svgUrl = "";

          if (pieceEditedImage) {
            svgUrl = pieceEditedImage;
          } else if (productPreassociatedSvg) {
            svgUrl = productPreassociatedSvg;
          } else if (customText && customText.length > 0) {
            svgUrl = `data:image/svg+xml;utf8,${encodeURIComponent(generateSvgFromText(customText, fontName, fontColor, fontSizePx))}`;
          }

          if (svgUrl) {
            if (svgUrl.startsWith("//")) svgUrl = "https:" + svgUrl;
            
            let cacheItem = svgCache.get(svgUrl);

            if (!cacheItem) {
              try {
                if (svgUrl.startsWith("data:image/svg+xml")) {
                  let svgRaw = svgUrl.replace(/^data:image\/svg\+xml;(utf8|base64),/, "");
                  if (svgUrl.includes("utf8,")) {
                    try { svgRaw = decodeURIComponent(svgRaw); } catch (e) {}
                  } else if (svgUrl.includes("base64,")) {
                    try { svgRaw = Buffer.from(svgRaw, "base64").toString("utf-8"); } catch (e) {}
                  }
                  cacheItem = {
                    content: svgRaw,
                    isImage: false,
                    mimeType: "image/svg+xml"
                  };
                } else if (svgUrl.startsWith("data:")) {
                  const parts = svgUrl.split(",");
                  const mime = parts[0].split(";")[0].replace("data:", "");
                  cacheItem = {
                    content: parts[1],
                    isImage: true,
                    mimeType: mime
                  };
                } else {
                  const mediaRes = await fetch(svgUrl);
                  if (mediaRes.ok) {
                    const contentType = (mediaRes.headers.get("content-type") || "").toLowerCase();
                    const isSvg = contentType.includes("svg") || svgUrl.toLowerCase().includes(".svg");
                    
                    if (isSvg) {
                      const text = await mediaRes.text();
                      cacheItem = {
                        content: text,
                        isImage: false,
                        mimeType: "image/svg+xml"
                      };
                    } else {
                      const buffer = await mediaRes.arrayBuffer();
                      const b64 = Buffer.from(buffer).toString("base64");
                      const mime = contentType.split(";")[0].trim() || "image/png";
                      cacheItem = {
                        content: b64,
                        isImage: true,
                        mimeType: mime
                      };
                    }
                  }
                }
                if (cacheItem) svgCache.set(svgUrl, cacheItem);
              } catch (e: any) {
                console.error("Fetch error:", e.message);
              }
            }

            if (cacheItem && cacheItem.content) {
              let cleanSvgContent = null;
              let itemWidthMm = parseFloat(baseWidthVal);
              let itemHeightMm = parseFloat(baseHeightVal);

              if (!cacheItem.isImage) {
                cleanSvgContent = cacheItem.content
                  .replace(/<\?xml[\s\S]*?\?>/i, "")
                  .replace(/<!DOCTYPE[\s\S]*?>/i, "")
                  .trim();

                // Calcola l'altezza reale ed esatta dell'SVG per racchiudere perfettamente la grafica ed evitare spazio bianco verticale vuoto
                let svgW = 0;
                let svgH = 0;
                const viewBoxMatch = cleanSvgContent.match(/viewBox=["']([^"']+)["']/i);
                if (viewBoxMatch) {
                  const parts = viewBoxMatch[1].trim().split(/[\s,]+/);
                  if (parts.length >= 4) {
                    svgW = parseFloat(parts[2]);
                    svgH = parseFloat(parts[3]);
                  }
                }
                if (!svgW || !svgH) {
                  const wMatch = cleanSvgContent.match(/width=["']([^"'px%]+)["']/i);
                  const hMatch = cleanSvgContent.match(/height=["']([^"'px%]+)["']/i);
                  if (wMatch && hMatch) {
                    svgW = parseFloat(wMatch[1]);
                    svgH = parseFloat(hMatch[1]);
                  }
                }
                if (svgW > 0 && svgH > 0) {
                  const aspect = svgW / svgH;
                  if (!itemWidthMm || isNaN(itemWidthMm) || itemWidthMm <= 0) itemWidthMm = 80;
                  itemHeightMm = Math.round((itemWidthMm / aspect) * 10) / 10;
                }
              }

              let previewUrl = "";
              if (cacheItem.isImage) {
                previewUrl = `data:${cacheItem.mimeType};base64,${cacheItem.content}`;
              } else {
                const base64Svg = Buffer.from(cacheItem.content).toString("base64");
                previewUrl = `data:image/svg+xml;base64,${base64Svg}`;
              }

              itemsToPack.push({
                id: `${order.id}_${item.id}_${q}`,
                orderName: order.name,
                itemTitle: item.title,
                widthMm: itemWidthMm,
                heightMm: itemHeightMm,
                svgContent: cleanSvgContent,
                imageContent: cacheItem.isImage ? cacheItem.content : null,
                previewUrl: previewUrl,
                isImage: cacheItem.isImage
              });
            }
          }
        }
      }
    }

    if (itemsToPack.length === 0) {
      return NextResponse.json({ 
        success: false, 
        error: "Nessun elemento personalizzato (SVG/Grafica) trovato per gli ordini selezionati." 
      }, { status: 400 });
    }

    // Genera il PDF finale di stampa DTF
    const pdfBuffer = await generatePodPdf({
      items: itemsToPack,
      binWidthMm: binWidthMm || 300,
      margins: margins || { top: 5, bottom: 5, sides: 3 }
    });

    if (previewMode) {
      return NextResponse.json({
        success: true,
        itemsCount: itemsToPack.length,
        items: itemsToPack
      });
    }

    const base64Pdf = (pdfBuffer as Buffer).toString("base64");

    // Tag orders and set metafield on Shopify persistently
    if (!previewMode && orderIds && orderIds.length > 0) {
      try {
        await Promise.all(
          orderIds.map(async (orderId: string) => {
            // 1. Add tag POD_STAMPATO
            const tagMutation = `#graphql
              mutation tagsAdd($id: ID!, $tags: [String!]!) {
                tagsAdd(id: $id, tags: $tags) {
                  userErrors { field message }
                }
              }
            `;
            await shopifyFetch({
              store: store || "b2c",
              query: tagMutation,
              variables: { id: orderId, tags: ["POD_STAMPATO"] }
            }).catch((err: any) => console.error(`Error tagging ${orderId}:`, err));

            // 2. Set status metafield to "printed"
            const metafieldMutation = `#graphql
              mutation setOrderMetafield($metafields: [MetafieldsSetInput!]!) {
                metafieldsSet(metafields: $metafields) {
                  userErrors { field message }
                }
              }
            `;
            await shopifyFetch({
              store: store || "b2c",
              query: metafieldMutation,
              variables: {
                metafields: [{
                  ownerId: orderId,
                  namespace: "pod",
                  key: "status",
                  type: "single_line_text_field",
                  value: "printed"
                }]
              }
            }).catch((err: any) => console.error(`Error setting metafield for ${orderId}:`, err));
          })
        );
      } catch (err: any) {
        console.error("Error setting printed tag/metafield on Shopify:", err.message);
      }
    }

    return NextResponse.json({
      success: true,
      base64: base64Pdf,
      filename: `stampa_dtf_batch_${Date.now()}.pdf`
    });

  } catch (error: any) {
    console.error("Errore generazione PDF Batch:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
