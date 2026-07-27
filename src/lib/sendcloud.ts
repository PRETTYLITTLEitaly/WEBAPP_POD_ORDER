export async function sendcloudFetch(endpoint: string, options: RequestInit = {}) {
  const publicKey = process.env.SENDCLOUD_PUBLIC_KEY;
  const secretKey = process.env.SENDCLOUD_SECRET_KEY;

  if (!publicKey || !secretKey) {
    throw new Error("Credenziali Sendcloud mancanti: configura SENDCLOUD_PUBLIC_KEY e SENDCLOUD_SECRET_KEY.");
  }

  const authString = Buffer.from(`${publicKey}:${secretKey}`).toString("base64");

  
  const baseUrl = "https://panel.sendcloud.sc/api/v2";
  const url = `${baseUrl}${endpoint}`;

  let dispatcher;
  if (process.env.https_proxy) {
    try {
      const { ProxyAgent } = eval('require')('undici');
      dispatcher = new ProxyAgent(process.env.https_proxy);
    } catch (e) {}
  }

  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Basic ${authString}`,
      ...(options.headers || {}),
    },
    cache: options.cache || "no-store",
    ...(dispatcher ? { dispatcher } : {})
  } as any);

  if (!res.ok) {
    let errorData = null;
    try {
      errorData = await res.json();
    } catch (e) {}
    
    throw new Error(
      `Sendcloud API error: ${res.status} ${res.statusText} ${
        errorData ? JSON.stringify(errorData) : ""
      }`
    );
  }

  return res.json();
}

export async function getSendcloudIssues() {
  if (!process.env.SENDCLOUD_PUBLIC_KEY || !process.env.SENDCLOUD_SECRET_KEY) {
    return { count: 0, parcels: [], error: "Credenziali Sendcloud mancanti" };
  }

  try {
    const data = await sendcloudFetch("/parcels?limit=200");
    const allParcels = data.parcels || [];

    const issueKeywords = ["exception", "error", "failed", "cancelled", "returned"];
    const issueStatusIds = [13, 1000, 1001, 1002, 62000, 62001];

    const problemParcels = allParcels.filter((parcel: any) => {
      const statusMsg = (parcel.status?.message || "").toLowerCase();
      const statusId = parcel.status?.id;

      const hasIssueText = issueKeywords.some((kw) => statusMsg.includes(kw));
      const hasIssueId = issueStatusIds.includes(statusId);

      return hasIssueText || hasIssueId;
    });

    const mappedParcels = problemParcels.map((p: any) => ({
      id: p.id,
      trackingNumber: p.tracking_number,
      orderNumber: p.order_number,
      status: p.status?.id,
      statusMessage: p.status?.message,
      carrier: typeof p.carrier === "string" ? p.carrier : p.carrier?.name || p.carrier?.code || "Sconosciuto",
      trackingUrl: p.tracking_url,
    }));

    return { count: mappedParcels.length, parcels: mappedParcels };
  } catch (error: any) {
    console.error("Errore recupero spedizioni Sendcloud:", error);
    return { count: 0, parcels: [], error: error.message || "Errore sconosciuto" };
  }
}
