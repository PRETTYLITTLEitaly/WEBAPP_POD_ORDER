import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { shopifyFetch } from "@/lib/shopify";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export interface TicketMessage {
  id: string;
  ticketId: string;
  authorName: string;
  authorRole: string;
  content: string;
  attachments?: string[];
  createdAt: string;
}

export interface Ticket {
  id: string;
  title: string;
  description: string;
  operatorName: string;
  priority: "bassa" | "media" | "alta" | "urgente";
  status: "aperto" | "in_lavorazione" | "risolto";
  resolutionNote?: string;
  resolvedBy?: string;
  resolvedAt?: string;
  createdAt: string;
  updatedAt: string;
  attachments: string[];
  messages: TicketMessage[];
}

// Helper per recuperare i dettagli completi dell'ordine da Shopify (B2C o B2B)
async function fetchShopifyOrderDetails(orderNum: string) {
  const cleanNum = orderNum.replace("#", "").trim();
  const queryStr = `name:#${cleanNum} OR name:${cleanNum}`;

  const gqlQuery = `#graphql
    query getOrderForTicket($queryStr: String!) {
      orders(first: 1, query: $queryStr) {
        nodes {
          id
          name
          createdAt
          displayFulfillmentStatus
          displayFinancialStatus
          totalPriceSet {
            shopMoney {
              amount
              currencyCode
            }
          }
          shippingAddress {
            name
            address1
            address2
            city
            province
            zip
            country
            phone
          }
          customer {
            firstName
            lastName
            email
            phone
          }
          lineItems(first: 25) {
            nodes {
              id
              title
              quantity
              variantTitle
              sku
              image {
                url
              }
            }
          }
          fulfillments {
            status
            trackingInfo {
              number
              url
              company
            }
          }
        }
      }
    }
  `;

  let foundOrder: any = null;
  let storeType: "b2c" | "b2b" = "b2c";

  try {
    const resB2C = await shopifyFetch({ store: "b2c", query: gqlQuery, variables: { queryStr } });
    const nodesB2C = resB2C.data?.orders?.nodes || [];
    if (nodesB2C.length > 0) {
      foundOrder = nodesB2C[0];
      storeType = "b2c";
    }
  } catch (e) {
    console.error("Errore ricerca ordine B2C:", e);
  }

  if (!foundOrder) {
    try {
      const resB2B = await shopifyFetch({ store: "b2b", query: gqlQuery, variables: { queryStr } });
      const nodesB2B = resB2B.data?.orders?.nodes || [];
      if (nodesB2B.length > 0) {
        foundOrder = nodesB2B[0];
        storeType = "b2b";
      }
    } catch (e) {
      console.error("Errore ricerca ordine B2B:", e);
    }
  }

  if (!foundOrder) return null;

  return {
    id: foundOrder.id,
    name: foundOrder.name,
    store: storeType,
    createdAt: foundOrder.createdAt,
    fulfillmentStatus: foundOrder.displayFulfillmentStatus,
    financialStatus: foundOrder.displayFinancialStatus,
    totalPrice: `${foundOrder.totalPriceSet?.shopMoney?.amount || "0"} ${foundOrder.totalPriceSet?.shopMoney?.currencyCode || "EUR"}`,
    customer: foundOrder.customer,
    shippingAddress: foundOrder.shippingAddress,
    products: foundOrder.lineItems?.nodes || [],
    fulfillments: foundOrder.fulfillments || [],
  };
}

// GET /api/tickets
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const orderNumber = searchParams.get("orderNumber");
    const statusFilter = searchParams.get("status"); // "all", "open", "resolved"

    let whereClause: any = {};
    if (orderNumber) {
      whereClause.orderNumber = { contains: orderNumber.replace("#", "").trim(), mode: "insensitive" };
    }
    if (statusFilter === "open") {
      whereClause.isResolved = false;
    } else if (statusFilter === "resolved") {
      whereClause.isResolved = true;
    }

    const tickets = await prisma.ticket.findMany({
      where: whereClause,
      include: {
        notes: {
          orderBy: { createdAt: "desc" },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ success: true, tickets });
  } catch (error: any) {
    console.error("Errore GET /api/tickets:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST /api/tickets
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { actionType } = body;

    // 1. CREAZIONE NUOVO TICKET
    if (actionType === "create") {
      const {
        orderNumber,
        causale,
        urgenza,
        title,
        description,
        source,
        customerPhone,
        customerEmail,
        whatsappMessageId,
        emailMessageId,
      } = body;

      if (!orderNumber || !causale || !urgenza || !title) {
        return NextResponse.json(
          { success: false, error: "Compila i campi obbligatori: Numero Ordine, Causale, Urgenza e Titolo." },
          { status: 400 }
        );
      }

      const cleanOrderNum = orderNumber.replace("#", "").trim();

      const newTicket = await prisma.ticket.create({
        data: {
          orderNumber: cleanOrderNum,
          causale: causale, // "ORDINE SMARRITO", "RITARDO", "ERRORE SPEDIZIONE", "ALTRO"
          urgenza: urgenza, // "ALTO", "MEDIO", "BASSO"
          title: title,
          description: description || "",
          source: source || "MANUAL",
          customerPhone: customerPhone || null,
          customerEmail: customerEmail || null,
          whatsappMessageId: whatsappMessageId || null,
          emailMessageId: emailMessageId || null,
          isResolved: false,
        },
        include: {
          notes: true,
        },
      });

      return NextResponse.json({ success: true, ticket: newTicket });
    }

    // 2. CAMBIO STATO RISOLTO (CHECKPOINT)
    if (actionType === "toggle_resolve") {
      const { ticketId, isResolved } = body;
      if (!ticketId) {
        return NextResponse.json({ success: false, error: "ticketId mancante." }, { status: 400 });
      }

      const updatedTicket = await prisma.ticket.update({
        where: { id: ticketId },
        data: { isResolved: Boolean(isResolved) },
        include: { notes: { orderBy: { createdAt: "desc" } } },
      });

      return NextResponse.json({ success: true, ticket: updatedTicket });
    }

    // 3. AGGIUNTA NOTA INTERNA AL TICKET
    if (actionType === "add_note") {
      const { ticketId, note, author } = body;
      if (!ticketId || !note?.trim()) {
        return NextResponse.json({ success: false, error: "Testo della nota obbligatorio." }, { status: 400 });
      }

      const newNote = await prisma.ticketNote.create({
        data: {
          ticketId,
          note: note.trim(),
          author: author || "Operatore",
        },
      });

      const updatedTicket = await prisma.ticket.findUnique({
        where: { id: ticketId },
        include: { notes: { orderBy: { createdAt: "desc" } } },
      });

      return NextResponse.json({ success: true, note: newNote, ticket: updatedTicket });
    }

    // 4. RECUPERO DETTAGLI ORDINE SHOPIFY
    if (actionType === "fetch_order") {
      const { orderNumber } = body;
      if (!orderNumber) {
        return NextResponse.json({ success: false, error: "Numero ordine mancante." }, { status: 400 });
      }

      const orderDetails = await fetchShopifyOrderDetails(orderNumber);
      return NextResponse.json({ success: true, order: orderDetails });
    }

    // 5. ELIMINAZIONE TICKET
    if (actionType === "delete") {
      const { ticketId } = body;
      if (!ticketId) {
        return NextResponse.json({ success: false, error: "ticketId mancante." }, { status: 400 });
      }

      await prisma.ticket.delete({
        where: { id: ticketId },
      });

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ success: false, error: "Azione sconosciuta." }, { status: 400 });
  } catch (error: any) {
    console.error("Errore POST /api/tickets:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
