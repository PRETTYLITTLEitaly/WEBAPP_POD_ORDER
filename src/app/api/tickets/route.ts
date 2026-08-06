import { NextRequest, NextResponse } from "next/server";
import { shopifyFetch } from "@/lib/shopify";
import fs from "fs";
import path from "path";
import os from "os";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const LOCAL_TICKETS_FILE = path.join(os.tmpdir(), "bug_tickets.json");

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

const DEFAULT_TICKETS: Ticket[] = [
  {
    id: "TCK-1001",
    title: "Mappatura Font Saveur-Sans in Stampa DTF",
    description: "In alcuni ordini con VASO AMMACCATO, il font Save non caricava il corsivo corretto sul canvas.",
    operatorName: "Luca V.",
    priority: "alta",
    status: "risolto",
    resolutionNote: "Risolto aggiungendo la mappatura automatica cloud Save -> Saveur-sans-semi-bold ed auto-selezione nell'editor.",
    resolvedBy: "Super Admin",
    resolvedAt: new Date(Date.now() - 3600000 * 24).toISOString(),
    createdAt: new Date(Date.now() - 3600000 * 48).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 24).toISOString(),
    attachments: [],
    messages: [
      {
        id: "MSG-1",
        ticketId: "TCK-1001",
        authorName: "Luca V.",
        authorRole: "Operatore",
        content: "Potete verificare se il font Save viene preso correttamente sul server?",
        createdAt: new Date(Date.now() - 3600000 * 40).toISOString()
      },
      {
        id: "MSG-2",
        ticketId: "TCK-1001",
        authorName: "Super Admin",
        authorRole: "Admin",
        content: "Mappatura aggiornata e testata su Vercel Production. Tutto risolto!",
        createdAt: new Date(Date.now() - 3600000 * 24).toISOString()
      }
    ]
  }
];

// Read tickets from Shopify Shop Metafield or fallback to local disk
async function loadTicketsFromStorage(): Promise<Ticket[]> {
  try {
    const query = `#graphql
      query getBugTickets {
        shop {
          metafields(first: 20, namespace: "pod_settings") {
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
    const ticketNode = nodes.find((n: any) => n.key === "bug_tickets");

    if (ticketNode && ticketNode.value) {
      const parsed = JSON.parse(ticketNode.value);
      if (Array.isArray(parsed) && parsed.length > 0) {
        try { fs.writeFileSync(LOCAL_TICKETS_FILE, JSON.stringify(parsed)); } catch (e) {}
        return parsed;
      }
    }
  } catch (err: any) {
    console.error("Errore lettura bug_tickets da Shopify:", err.message);
  }

  if (fs.existsSync(LOCAL_TICKETS_FILE)) {
    try {
      const localData = fs.readFileSync(LOCAL_TICKETS_FILE, "utf-8");
      return JSON.parse(localData);
    } catch (e) {}
  }

  return DEFAULT_TICKETS;
}

// Save tickets persistently to Shopify Shop Metafield and local disk
async function saveTicketsToStorage(tickets: Ticket[]) {
  try {
    fs.writeFileSync(LOCAL_TICKETS_FILE, JSON.stringify(tickets));
  } catch (e) {}

  try {
    const shopRes = await shopifyFetch({
      store: "b2c",
      query: `#graphql query { shop { id } }`
    });
    const shopId = shopRes.data?.shop?.id;

    if (shopId) {
      const mutation = `#graphql
        mutation setBugTicketsMetafield($metafields: [MetafieldsSetInput!]!) {
          metafieldsSet(metafields: $metafields) {
            metafields { id key value }
            userErrors { field message }
          }
        }
      `;

      await shopifyFetch({
        store: "b2c",
        query: mutation,
        variables: {
          metafields: [
            {
              ownerId: shopId,
              namespace: "pod_settings",
              key: "bug_tickets",
              type: "json",
              value: JSON.stringify(tickets)
            }
          ]
        }
      });
    }
  } catch (err: any) {
    console.error("Errore salvataggio bug_tickets su Shopify:", err.message);
  }
}

// GET /api/tickets
export async function GET() {
  try {
    const tickets = await loadTicketsFromStorage();
    return NextResponse.json({ success: true, tickets });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST /api/tickets — Crea nuovo ticket, o aggiunge messaggio, o aggiorna stato
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, ticket, message, ticketId, status, resolutionNote, resolvedBy } = body;

    let tickets = await loadTicketsFromStorage();

    // 1. CREAZIONE NUOVO TICKET
    if (action === "create" && ticket) {
      const newTicket: Ticket = {
        id: `TCK-${Math.floor(1000 + Math.random() * 9000)}`,
        title: ticket.title || "Nuovo Segnalazione Bug",
        description: ticket.description || "",
        operatorName: ticket.operatorName || "Operatore",
        priority: ticket.priority || "media",
        status: "aperto",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        attachments: Array.isArray(ticket.attachments) ? ticket.attachments : [],
        messages: []
      };

      tickets = [newTicket, ...tickets];
      await saveTicketsToStorage(tickets);
      return NextResponse.json({ success: true, ticket: newTicket, tickets });
    }

    // 2. AGGIUNTA MESSAGGIO A UN TICKET ESISTENTE
    if (action === "add_message" && ticketId && message) {
      const targetIdx = tickets.findIndex(t => t.id === ticketId);
      if (targetIdx === -1) {
        return NextResponse.json({ success: false, error: "Ticket non trovato." }, { status: 404 });
      }

      const newMessage: TicketMessage = {
        id: `MSG-${Date.now()}`,
        ticketId,
        authorName: message.authorName || "Operatore",
        authorRole: message.authorRole || "Admin",
        content: message.content || "",
        attachments: message.attachments || [],
        createdAt: new Date().toISOString()
      };

      tickets[targetIdx].messages = [...(tickets[targetIdx].messages || []), newMessage];
      tickets[targetIdx].updatedAt = new Date().toISOString();
      if (tickets[targetIdx].status === "aperto" && message.authorRole?.toLowerCase().includes("admin")) {
        tickets[targetIdx].status = "in_lavorazione";
      }

      await saveTicketsToStorage(tickets);
      return NextResponse.json({ success: true, message: newMessage, ticket: tickets[targetIdx], tickets });
    }

    // 3. CAMBIO STATO O RISOLUZIONE TICKET (SOLO ADMIN/SUPER ADMIN)
    if (action === "update_status" && ticketId && status) {
      const targetIdx = tickets.findIndex(t => t.id === ticketId);
      if (targetIdx === -1) {
        return NextResponse.json({ success: false, error: "Ticket non trovato." }, { status: 404 });
      }

      tickets[targetIdx].status = status;
      tickets[targetIdx].updatedAt = new Date().toISOString();

      if (status === "risolto") {
        tickets[targetIdx].resolutionNote = resolutionNote || "Problema risolto con successo.";
        tickets[targetIdx].resolvedBy = resolvedBy || "Admin";
        tickets[targetIdx].resolvedAt = new Date().toISOString();
      }

      await saveTicketsToStorage(tickets);
      return NextResponse.json({ success: true, ticket: tickets[targetIdx], tickets });
    }

    return NextResponse.json({ success: false, error: "Azione non riconosciuta." }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// DELETE /api/tickets — Elimina ticket (Admin)
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ success: false, error: "ID ticket mancante." }, { status: 400 });
    }

    let tickets = await loadTicketsFromStorage();
    tickets = tickets.filter(t => t.id !== id);

    await saveTicketsToStorage(tickets);
    return NextResponse.json({ success: true, tickets });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
