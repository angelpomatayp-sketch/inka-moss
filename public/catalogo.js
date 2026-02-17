const apiBase = "";
async function api(path) {
  const res = await fetch(apiBase + path);
  const text = await res.text();
  let data = text;
  try { data = JSON.parse(text); } catch (_) {}
  if (!res.ok) throw new Error(data.error || text || "Error");
  return data;
}

document.getElementById("load-btn").addEventListener("click", async () => {
  const list = document.getElementById("list");
  list.innerHTML = "";
  try {
    const data = await api("/api/products");
    data.forEach((p) => {
      const div = document.createElement("div");
      div.className = "item";
      div.innerHTML = `
        <div><strong>${p.name}</strong> <span class="badge">${p.type}</span></div>
        <div class="notice">${p.region} · S/ ${p.priceSoles} · ${p.quantityKg} kg</div>
        <div class="notice">Trazabilidad: ${p.traceability?.community || "-"}</div>
      `;
      list.appendChild(div);
    });
  } catch (e) {
    list.innerHTML = `<div class="notice">${e.message}</div>`;
  }
});
