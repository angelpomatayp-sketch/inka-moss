const apiBase = "";
async function api(path) {
  const res = await fetch(apiBase + path);
  const text = await res.text();
  let data = text;
  try { data = JSON.parse(text); } catch (_) {}
  if (!res.ok) throw new Error(data.error || text || "Error");
  return data;
}

async function loadCatalog() {
  const list = document.getElementById("list");
  list.innerHTML = "";
  const q = document.getElementById("filter-q").value.trim();
  const type = document.getElementById("filter-type").value.trim();
  const region = document.getElementById("filter-region").value.trim();
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  if (type) params.set("type", type);
  if (region) params.set("region", region);
  const url = `/api/products${params.toString() ? `?${params}` : ""}`;

  try {
    const data = await api(url);
    data.forEach((p) => {
      const div = document.createElement("div");
      div.className = "item";
      const img = p.photos && p.photos[0] ? `<img src=\"${p.photos[0]}\" alt=\"${p.name}\" />` : "";
      div.innerHTML = `
        ${img}
        <div><strong>${p.name}</strong> <span class=\"badge\">${p.type}</span></div>
        <div class=\"notice\">${p.region} · S/ ${p.priceSoles} · ${p.quantityKg} kg</div>
        <div class=\"notice\">Trazabilidad: ${p.traceability?.community || "-"}</div>
      `;
      list.appendChild(div);
    });
  } catch (e) {
    list.innerHTML = `<div class=\"notice\">${e.message}</div>`;
  }
}

document.getElementById("load-btn").addEventListener("click", loadCatalog);
document.addEventListener("DOMContentLoaded", loadCatalog);
