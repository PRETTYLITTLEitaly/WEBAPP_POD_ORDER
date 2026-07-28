

async function run() {
  const url = "https://app.prettylittle.it/api/pdf/generate";
  const body = {
    ids: ["gid://shopify/Order/7912651391315"],
    previewMode: true
  };

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    const json = await res.json();
    console.log("Response:", JSON.stringify(json, null, 2));
  } catch (e) {
    console.error("Error:", e);
  }
}

run();
