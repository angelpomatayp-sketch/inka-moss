const apiBase = "";
const authState = {
  token: localStorage.getItem("token"),
  role: localStorage.getItem("role"),
  email: localStorage.getItem("email")
};

function updateNav() {
  const loginLink = document.getElementById("login-link");
  const registerLink = document.getElementById("register-link");
  const navUser = document.getElementById("nav-user");
  const logoutBtn = document.getElementById("nav-logout");
  const logged = !!authState.token;
  if (loginLink) loginLink.style.display = logged ? "none" : "";
  if (registerLink) registerLink.style.display = logged ? "none" : "";
  if (navUser) navUser.textContent = logged ? `${authState.email || "Usuario"} · ${authState.role || ""}` : "";
  if (logoutBtn) logoutBtn.style.display = logged ? "inline-flex" : "none";
}

function logout() {
  localStorage.removeItem("token");
  localStorage.removeItem("role");
  localStorage.removeItem("userId");
  localStorage.removeItem("email");
  window.location.reload();
}
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
  const sortBy = document.getElementById("sort-by").value;
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  if (type) params.set("type", type);
  if (region) params.set("region", region);
  const url = `/api/products${params.toString() ? `?${params}` : ""}`;

  try {
    let data = await api(url);
    if (sortBy === "price-asc") data = data.sort((a, b) => a.priceSoles - b.priceSoles);
    if (sortBy === "price-desc") data = data.sort((a, b) => b.priceSoles - a.priceSoles);
    const count = document.getElementById("result-count");
    if (count) count.textContent = `${data.length} productos`;
    data.forEach((p) => {
      const div = document.createElement("div");
      div.className = "item";
      const img = p.photos && p.photos[0] ? `<img src=\"${p.photos[0]}\" alt=\"${p.name}\" />` : "";
      div.innerHTML = `
        ${img}
        <div><strong>${p.name}</strong> <span class=\"badge\">${p.type}</span></div>
        <div class=\"meta notice\">${p.region} · ${p.quantityKg} kg</div>
        <div class=\"price\">S/ ${p.priceSoles}</div>
        <div class=\"notice\">Trazabilidad: ${p.traceability?.community || "-"}</div>
        <button class=\"cta\">Ver detalle</button>
      `;
      list.appendChild(div);
    });
  } catch (e) {
    list.innerHTML = `<div class=\"notice\">${e.message}</div>`;
  }
}

document.getElementById("load-btn").addEventListener("click", loadCatalog);
document.getElementById("sort-by").addEventListener("change", loadCatalog);
document.addEventListener("DOMContentLoaded", () => {
  updateNav();
  const logoutBtn = document.getElementById("nav-logout");
  if (logoutBtn) logoutBtn.addEventListener("click", logout);
  loadCatalog();
});
