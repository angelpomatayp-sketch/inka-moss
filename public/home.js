const apiBase = "";
async function api(path) {
  const res = await fetch(apiBase + path);
  const text = await res.text();
  let data = text;
  try { data = JSON.parse(text); } catch (_) {}
  if (!res.ok) throw new Error(data.error || text || "Error");
  return data;
}

document.addEventListener("DOMContentLoaded", async () => {
  const list = document.getElementById("home-products");
  if (!list) return;
  list.innerHTML = "";
  try {
    const data = await api("/api/products");
    if (data.length === 0) {
      list.innerHTML = "<div class=\"notice\">Aún no hay productos publicados.</div>";
      return;
    }
    data.forEach((p) => {
      const div = document.createElement("div");
      div.className = "item";
      const img = p.photos && p.photos[0] ? `<img src=\"${p.photos[0]}\" alt=\"${p.name}\" />` : "";
      div.innerHTML = `
        ${img}
        <div><strong>${p.name}</strong> <span class=\"badge\">${p.type}</span></div>
        <div class=\"notice\">${p.region} · S/ ${p.priceSoles} · ${p.quantityKg} kg</div>
      `;
      list.appendChild(div);
    });
  } catch (e) {
    list.innerHTML = `<div class=\"notice\">${e.message}</div>`;
  }
});
