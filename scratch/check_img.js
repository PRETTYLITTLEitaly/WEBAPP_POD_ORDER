

async function run() {
  const url = "https://cdn.shopify.com/s/files/1/0644/0904/3193/uploads/442cc1dcdd03c45932a9da0322ddf8ed.png";
  try {
    const res = await fetch(url);
    console.log("Status:", res.status);
    console.log("Content-Type:", res.headers.get("content-type"));
    const buffer = await res.arrayBuffer();
    console.log("Buffer Length:", buffer.byteLength);
  } catch (e) {
    console.error("Error:", e);
  }
}

run();
