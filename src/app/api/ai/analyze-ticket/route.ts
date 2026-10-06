import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function normalizeSubject(sub: string): string {
  if (!sub) return "";
  let clean = sub;
  // Rimuovi prefissi di risposta e inoltro ricorsivamente
  while (/^(re|fwd|r|fw|fwd:|re:|r:|fw:)\s*/i.test(clean)) {
    clean = clean.replace(/^(re|fwd|r|fw|fwd:|re:|r:|fw:)\s*/i, "").trim();
  }
  return clean.toLowerCase();
}

function extractOrderNumber(text: string, subject: string = ""): string {
  const combined = `${subject} \n ${text}`;

  // 1. Cerca prima con keyword esplicite "ordine", "ordine #", "ordine n", "ord", "ordine numero"
  const explicitMatch = combined.match(/\b(?:ordine|ordine\s*n°?|ordine\s*numero|oridne\s*numero|ord|order|#)\s*:?\s*#?(\d{3,6})\b/i);
  if (explicitMatch) {
    return explicitMatch[1];
  }

  // 2. Se non trova keyword esplicite, cerca numeri da 3 a 6 cifre isolati, escludendo numeri di telefono o P.IVA
  const matches = combined.matchAll(/\b(\d{3,6})\b/g);
  for (const m of matches) {
    const num = m[1];
    const index = m.index || 0;
    const contextBefore = combined.slice(Math.max(0, index - 15), index);
    const contextAfter = combined.slice(index + num.length, index + num.length + 15);

    // Salta se è parte di un numero di telefono (es. +39, 334, tel, cellulare) o fa parte di un numero lungo (>6 cifre)
    if (/(\+39|tel|cell|telefono|\+)/i.test(contextBefore)) continue;
    if (/\d/.test(contextBefore.slice(-1)) || /\d/.test(contextAfter.slice(0, 1))) continue;

    return num;
  }

  return "";
}

function analyzeHeuristic(threadMessages: any[], mainSubject: string) {
  const fullText = threadMessages
    .map((m) => `${m.fromEmail}: ${m.bodyText || ""}`)
    .join("\n\n");

  const orderNumber = extractOrderNumber(fullText, mainSubject);
  const lowerText = (fullText + " " + mainSubject).toLowerCase();

  // Determinazione Causale
  let causale = "ALTRO";
  if (lowerText.includes("smarr") || lowerText.includes("perso") || lowerText.includes("non trovato")) {
    causale = "ORDINE SMARRITO";
  } else if (lowerText.includes("ritard") || lowerText.includes("non arriv") || lowerText.includes("in ritardo") || lowerText.includes("bloccato")) {
    causale = "RITARDO";
  } else if (lowerText.includes("errore") || lowerText.includes("sbagliat") || lowerText.includes("manca") || lowerText.includes("incompleto")) {
    causale = "ERRORE SPEDIZIONE";
  } else if (lowerText.includes("difetto") || lowerText.includes("rovinat") || lowerText.includes("rotto") || lowerText.includes("macchia")) {
    causale = "PRODOTTO DIFETTOSO";
  }

  // Determinazione Urgenza
  let urgenza = "MEDIO";
  if (
    lowerText.includes("urgente") ||
    lowerText.includes("subito") ||
    lowerText.includes("sollecito") ||
    causale === "ORDINE SMARRITO"
  ) {
    urgenza = "ALTO";
  } else if (lowerText.includes("informazione") || lowerText.includes("curiosità") || lowerText.includes("grazie")) {
    urgenza = "BASSO";
  }

  // Pulizia Oggetto
  const cleanSubject = mainSubject.replace(/^(re|fwd|r|fw|fwd:|re:|r:|fw:)\s*/gi, "").trim();

  // Costruzione Titolo Conciso
  const title = orderNumber
    ? `${causale} - Ordine #${orderNumber} (${cleanSubject})`
    : `${causale} - ${cleanSubject || "Segnalazione Cliente"}`;

  // Estraggo il primo messaggio del cliente pulendolo da firme ed intestazioni
  const customerMsgs = threadMessages.filter((m) => m.direction === "INBOUND");
  let lastBody = (customerMsgs[customerMsgs.length - 1]?.bodyText || fullText).trim();
  
  // Rimuovi firma tipica (es. "Luca Vitale | CEO +39...")
  lastBody = lastBody.split(/\n\s*--|\n\s*Luca Vitale|\n\s*\+39|\n\s*Sent from/i)[0].trim();

  const descriptionSummary = lastBody || `Segnalazione cliente in merito all'oggetto: ${cleanSubject}`;

  return {
    title: title.slice(0, 80),
    description: descriptionSummary,
    orderNumber,
    urgenza,
    causale,
  };
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { emailId, conversationId, apiKey: userApiKey } = body;

    let systemKey = "";
    try {
      const dbSetting = await prisma.systemSetting.findUnique({
        where: { key: "anthropic_api_key" },
      });
      if (dbSetting?.value) {
        systemKey = dbSetting.value;
      }
    } catch (e) {
      console.error("Errore lettura system setting anthropic_api_key:", e);
    }

    const apiKey = userApiKey || systemKey || process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_API_KEY;

    let threadMessages: any[] = [];
    let contextTitle = "";
    let formattedThread = "";

    if (emailId) {
      const targetEmail = await prisma.emailMessage.findUnique({
        where: { id: emailId },
      });

      if (!targetEmail) {
        return NextResponse.json({ error: "Email non trovata." }, { status: 404 });
      }

      contextTitle = targetEmail.subject;
      const targetNormSub = normalizeSubject(targetEmail.subject);

      // Recupera tutte le email dell'account per raggruppare quelle dello stesso thread
      const allAccountEmails = await prisma.emailMessage.findMany({
        where: { emailAccountId: targetEmail.emailAccountId },
        orderBy: { sentAt: "asc" },
      });

      threadMessages = allAccountEmails.filter((msg) => {
        if (msg.id === targetEmail.id) return true;
        const msgNormSub = normalizeSubject(msg.subject);
        return msgNormSub === targetNormSub || (targetEmail.threadId && msg.threadId === targetEmail.threadId && msgNormSub.includes(targetNormSub));
      });

      if (threadMessages.length === 0) {
        threadMessages = [targetEmail];
      }

      formattedThread = threadMessages
        .map(
          (m, idx) =>
            `[MESSAGGIO ${idx + 1}] (${new Date(m.sentAt).toLocaleString("it-IT")})\nDa: ${m.fromEmail}\nA: ${m.toEmail}\nOggetto: ${m.subject}\nContenuto:\n${m.bodyText || "(Nessun testo)"}`
        )
        .join("\n\n-----------------------------------\n\n");
    } else if (conversationId) {
      const conv = await prisma.whatsAppConversation.findUnique({
        where: { id: conversationId },
        include: {
          messages: {
            orderBy: { timestamp: "asc" },
          },
        },
      });

      if (!conv) {
        return NextResponse.json({ error: "Conversazione WhatsApp non trovata." }, { status: 404 });
      }

      contextTitle = `Chat WhatsApp con ${conv.customerName || conv.customerPhone}`;
      threadMessages = conv.messages;
      formattedThread = conv.messages
        .map(
          (m, idx) =>
            `[${new Date(m.timestamp).toLocaleString("it-IT")}] ${m.direction === "INBOUND" ? conv.customerName || conv.customerPhone : "Operatore"}: ${m.body}`
        )
        .join("\n");
    } else {
      return NextResponse.json({ error: "Fornire emailId o conversationId." }, { status: 400 });
    }

    // Se l'API key di Claude non è presente, utilizziamo l'engine euristico avanzato
    if (!apiKey) {
      const heuristicResult = analyzeHeuristic(threadMessages, contextTitle);
      return NextResponse.json({
        success: true,
        source: "HEURISTIC_ENGINE",
        threadCount: threadMessages.length,
        analysis: {
          ...heuristicResult,
          fullThreadText: formattedThread,
        },
      });
    }

    // Chiamata diretta all'API di Claude (Anthropic)
    const prompt = `Sei l'assistente AI dedicato all'assistenza clienti e alla gestione ticket di PRETTYLITTLE.it.
Analizza con estrema precisione il seguente thread di messaggi tra il cliente e l'assistenza:

OGGETTO PRINCIPALE: ${contextTitle}

STORICO MESSAGGI:
${formattedThread}

ISTRUZIONI FONDAMENTALI:
1. NUMERO ORDINE ("orderNumber"): Trova il numero d'ordine Shopify nei messaggi o nell'oggetto (es. "ordine numero 2342", "ordine #15171", "oridne numero 2342", "ord 2342"). IGNORA TASSATIVAMENTE numeri di telefono (es. +39..., 334...), Partite IVA o numeri nelle firme email! Se non trovi un numero d'ordine valido, restituisci "".
2. SINTESI DEL PROBLEMA ("description"): Scrivi una sintesi pulita, precisa e concisa del problema (2-3 frasi max). NON ricopiare lo storico dei messaggi, NON inserire firme email, numeri di telefono o disclaimer.
3. TITOLO TICKET ("title"): Crea un titolo breve e descrittivo del problema (max 70 caratteri).
4. CAUSALE ("causale"): Scegli la più adeguata tra 'ORDINE SMARRITO', 'RITARDO', 'ERRORE SPEDIZIONE', 'PRODOTTO DIFETTOSO', 'ALTRO'.
5. URGENZA ("urgenza"): Scegli tra 'ALTO', 'MEDIO', 'BASSO'.

Rispondi ESCLUSIVAMENTE con un oggetto JSON valido senza formattazione markdown extra:
{
  "title": "Titolo breve e chiaro",
  "description": "Sintesi concisa in 2-3 frasi del problema riscontrato dal cliente",
  "orderNumber": "Numero ordine (es. 2342) oppure \"\"",
  "urgenza": "ALTO" | "MEDIO" | "BASSO",
  "causale": "ORDINE SMARRITO" | "RITARDO" | "ERRORE SPEDIZIONE" | "PRODOTTO DIFETTOSO" | "ALTRO"
}`;

    const anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-3-5-sonnet-20241022",
        max_tokens: 1000,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!anthropicRes.ok) {
      const errText = await anthropicRes.text();
      console.error("Errore API Claude Anthropic:", errText);
      const fallbackResult = analyzeHeuristic(threadMessages, contextTitle);
      return NextResponse.json({
        success: true,
        source: "HEURISTIC_FALLBACK",
        errorInfo: "API Key Claude non valida o limite superato, usata analisi automatica.",
        threadCount: threadMessages.length,
        analysis: {
          ...fallbackResult,
          fullThreadText: formattedThread,
        },
      });
    }

    const aiData = await anthropicRes.json();
    const contentText = aiData.content?.[0]?.text || "";

    let parsedAnalysis: any = {};
    try {
      const jsonMatch = contentText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsedAnalysis = JSON.parse(jsonMatch[0]);
      } else {
        parsedAnalysis = JSON.parse(contentText);
      }
    } catch (e) {
      console.error("Errore parsing JSON da Claude:", e);
      parsedAnalysis = analyzeHeuristic(threadMessages, contextTitle);
    }

    return NextResponse.json({
      success: true,
      source: "CLAUDE_AI",
      threadCount: threadMessages.length,
      analysis: {
        title: parsedAnalysis.title || contextTitle,
        description: parsedAnalysis.description || "",
        orderNumber: parsedAnalysis.orderNumber || extractOrderNumber(formattedThread, contextTitle),
        urgenza: parsedAnalysis.urgenza || "MEDIO",
        causale: parsedAnalysis.causale || "ALTRO",
        fullThreadText: formattedThread,
      },
    });
  } catch (error: any) {
    console.error("POST /api/ai/analyze-ticket Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
