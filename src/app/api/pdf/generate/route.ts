import { NextRequest, NextResponse } from "next/server";
import { shopifyFetch } from "@/lib/shopify";
import { generatePodPdf } from "@/lib/pod.server";

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
    return `<text x="50%" y="${yPos}" text-anchor="middle" font-family="'${fontName}', cursive, sans-serif" font-size="${fontSizePx}px" fill="${hexColor}" font-weight="600">${escapeXml(line)}</text>`;
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

    const query = `#graphql
      query getBatchOrders($ids: [ID!]!) {
        nodes(ids: $ids) {
          ... on Order {
            id
            name
            tags
            status: metafield(namespace: "pod", key: "status") { value }
            edited_image: metafield(namespace: "pod", key: "edited_image") { value }
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
      const editedImageMeta = order.edited_image?.value;
      const orderWidth = order.order_width?.value;
      const orderHeight = order.order_height?.value;

      for (const item of order.lineItems.nodes) {
        const metafields = [
          item.product?.pod_width, item.product?.pod_height, item.product?.pod_svg,
          item.product?.custom_url, item.product?.custom_width, item.product?.custom_height,
          item.variant?.pod_width, item.variant?.pod_height, item.variant?.pod_svg,
          item.variant?.custom_url, item.variant?.custom_width, item.variant?.custom_height
        ].filter(Boolean);
        
        let widthVal = metafields.find((m: any) => m.key === "width")?.value;
        let heightVal = metafields.find((m: any) => m.key === "height")?.value;
        
        if (!widthVal || !heightVal) {
          const attrWidth = item.customAttributes?.find((a: any) => ["Width", "Larghezza", "_pplr_width"].includes(a.key))?.value;
          const attrHeight = item.customAttributes?.find((a: any) => ["Height", "Altezza", "_pplr_height"].includes(a.key))?.value;
          if (attrWidth) widthVal = attrWidth;
          if (attrHeight) heightVal = attrHeight;
        }

        // Estrazione dati di personalizzazione da customAttributes
        let customText = "";
        let fontName = "Outfit";
        let fontColor = "#000000";
        let fontSizePx = 32;

        const attrs = item.customAttributes || [];
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

        // Trova qualsiasi file grafico associato (con o senza prefisso)
        const isolatedDesignAttr = attrs.find((a: any) => 
          a.key.startsWith("_design") || a.key.includes("_pplr_original") || a.key.includes("_pplr_pdf") || (a.key.toLowerCase().includes("immagine") && String(a.value).startsWith("http"))
        );
        const mockupAttr = attrs.find((a: any) => a.key.includes("Vedi ora") || a.key.includes("preview") || String(a.value).startsWith("http"));

        const zeptoAttrUrl = isolatedDesignAttr?.value || mockupAttr?.value;

        // Imposta dimensioni standard per stampa DTF se non specificate nei metafield
        if (!widthVal) widthVal = orderWidth || "80";
        if (!heightVal) heightVal = orderHeight || "100";

        const svgMeta = metafields.find((m: any) => m.key === "svg");
        const svgTextUrl = metafields.find((m: any) => m.key === "pod_svg_url" || m.key === "pod_url")?.value;
        
        let svgUrl = editedImageMeta;

        // Se l'ordine ha testo personalizzato e non ha una grafica modificata salvata, genera l'SVG trasparente del solo testo!
        if (!svgUrl && customText) {
          svgUrl = `data:image/svg+xml;utf8,${encodeURIComponent(generateSvgFromText(customText, fontName, fontColor, fontSizePx))}`;
        }

        if (!svgUrl) {
          svgUrl = zeptoAttrUrl || svgTextUrl || svgMeta?.reference?.url || svgMeta?.reference?.image?.url;
        }

        if (svgUrl) {
          if (svgUrl.startsWith("//")) svgUrl = "https:" + svgUrl;
          
          let cacheItem = svgCache.get(svgUrl);

          if (!cacheItem) {
            try {
              if (svgUrl.startsWith("data:image/svg+xml")) {
                const svgRaw = decodeURIComponent(svgUrl.replace(/^data:image\/svg\+xml;utf8,/, ""));
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
                  const isSvg = contentType.includes("svg") || /\.svg(\?.*)?$/i.test(svgUrl);
                  
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
            if (!cacheItem.isImage) {
              cleanSvgContent = cacheItem.content
                .replace(/<\?xml[\s\S]*?\?>/i, "")
                .replace(/<!DOCTYPE[\s\S]*?>/i, "")
                .trim();
            }

            let previewUrl = "";
            if (cacheItem.isImage) {
              previewUrl = `data:${cacheItem.mimeType};base64,${cacheItem.content}`;
            } else {
              const base64Svg = Buffer.from(cacheItem.content).toString("base64");
              previewUrl = `data:image/svg+xml;base64,${base64Svg}`;
            }

            const itemQty = item.quantity || 1;

            for (let i = 0; i < itemQty; i++) {
              itemsToPack.push({
                id: `${order.id}_${item.id}_${i}`,
                orderName: order.name,
                itemTitle: item.title,
                widthMm: parseFloat(widthVal),
                heightMm: parseFloat(heightVal),
                svgContent: cleanSvgContent,
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

    return new Response(pdfBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="stampa_dtf_batch_${Date.now()}.pdf"`
      }
    });

  } catch (error: any) {
    console.error("Errore generazione PDF Batch:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
