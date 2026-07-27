import { NextRequest, NextResponse } from "next/server";
import { shopifyFetch } from "@/lib/shopify";
import { generatePodPdf } from "@/lib/pod.server";

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
      
      const isZeptoOrder = order.tags?.includes("product-personalizer");
      const editedImageMeta = order.edited_image?.value;
      const orderWidth = order.order_width?.value;
      const orderHeight = order.order_height?.value;
      
      if (isZeptoOrder && order.status?.value !== "approved") {
        throw new Error(`L'ordine ${order.name} non è ancora stato approvato (Product Personalizer).`);
      }

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

        const allMediaAttrs = item.customAttributes?.filter((a: any) => 
          ["Immagine", "Grafica", "Grafica Personalizzata", "_pplr_original", "_pplr_pdf", "_pplr_preview", "Preview URL", "_design_Vedi ora"].includes(a.key)
        ) || [];
        
        const bestMedia = allMediaAttrs.find((a: any) => 
          !a.key.toLowerCase().includes("preview") && 
          !a.key.toLowerCase().includes("design") && 
          !a.key.toLowerCase().includes("vedi")
        ) || allMediaAttrs[0];

        const zeptoAttrUrl = bestMedia?.value;

        if ((!widthVal || !heightVal) && (isZeptoOrder || zeptoAttrUrl)) {
          widthVal = orderWidth || "80";
          heightVal = orderHeight || "100";
        }
        
        if (orderWidth && orderHeight) {
          widthVal = orderWidth;
          heightVal = orderHeight;
        }

        if (widthVal && heightVal) {
          const svgMeta = metafields.find((m: any) => m.key === "svg");
          const svgTextUrl = metafields.find((m: any) => m.key === "pod_svg_url" || m.key === "pod_url")?.value;
          let svgUrl = editedImageMeta || (isZeptoOrder && zeptoAttrUrl 
            ? zeptoAttrUrl 
            : (svgTextUrl || svgMeta?.reference?.url || svgMeta?.reference?.image?.url || zeptoAttrUrl));

          if (svgUrl) {
            if (svgUrl.startsWith("//")) svgUrl = "https:" + svgUrl;
            
            let cacheItem = svgCache.get(svgUrl);

            if (!cacheItem) {
              try {
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
                  svgCache.set(svgUrl, cacheItem);
                }
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

              for (let i = 0; i < item.quantity; i++) {
                itemsToPack.push({
                  id: `${item.id}-${i}`,
                  orderName: order.name || `#${order.id.split('/').pop()}`,
                  widthMm: parseFloat(widthVal),
                  heightMm: parseFloat(heightVal),
                  svgContent: cleanSvgContent,
                  imageContent: cacheItem.isImage ? cacheItem.content : null,
                  previewUrl: previewUrl,
                  svgUrl: svgUrl,
                  isImage: cacheItem.isImage
                });
              }
            }
          }
        }
      }
    }

    if (itemsToPack.length === 0) {
      return NextResponse.json({ success: false, error: "Nessun prodotto valido trovato (mancano file o misure)." }, { status: 400 });
    }

    if (previewMode) {
      return NextResponse.json({ success: true, items: itemsToPack });
    }

    // Se l'utente ha modificato manualmente la disposizione tramite il Layout Editor
    if (Array.isArray(customItems) && customItems.length > 0) {
      for (const item of itemsToPack) {
        const custom = customItems.find((c: any) => c.id === item.id);
        if (custom) {
          item.customX = custom.x;
          item.customY = custom.y;
          item.rotated = !!custom.rotated;
        }
      }
    }

    const pdfWidth = typeof binWidthMm === "number" && binWidthMm > 0 ? binWidthMm : 300;
    const pdfBuffer = await generatePodPdf(itemsToPack, pdfWidth, margins);
    const pdfBase64 = Buffer.from(pdfBuffer).toString("base64");

    return NextResponse.json({ success: true, base64: pdfBase64 });
  } catch (error: any) {
    console.error("PDF Generate Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
