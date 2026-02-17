const apiBase = "";

const state = {
  token: localStorage.getItem("token"),
  role: localStorage.getItem("role"),
  userId: localStorage.getItem("userId")
};

function setStatus(msg, ok = true) {
  const el = document.getElementById("session-status");
  el.textContent = msg;
  el.className = ok ? "notice success" : "notice error";
}

function setAuth(token, role, userId) {
  state.token = token;
  state.role = role;
  state.userId = userId;
  localStorage.setItem("token", token || "");
  localStorage.setItem("role", role || "");
  localStorage.setItem("userId", userId || "");
  setStatus(token ? `Autenticado como ${role}` : "No autenticado", !!token);
}

function authHeader() {
  return state.token ? { Authorization: `Bearer ${state.token}` } : {};
}

async function api(path, options = {}) {
  const res = await fetch(apiBase + path, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {})
    },
    ...options
  });
  const text = await res.text();
  let data = text;
  try { data = JSON.parse(text); } catch (_) {}
  if (!res.ok) throw new Error(data.error || text || "Error");
  return data;
}

function switchTab(tab) {
  document.querySelectorAll(".tab").forEach((t) => t.classList.toggle("active", t.dataset.tab === tab));
  document.querySelectorAll("[data-panel]").forEach((p) => p.classList.toggle("hidden", p.id !== tab));
}

function initTabs() {
  document.querySelectorAll(".tab").forEach((t) => {
    t.addEventListener("click", () => switchTab(t.dataset.tab));
  });
}

async function login() {
  const email = document.getElementById("login-email").value;
  const password = document.getElementById("login-password").value;
  const data = await api("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password })
  });
  setAuth(data.token, data.role, data.userId);
}

async function registerUser() {
  const name = document.getElementById("reg-name").value;
  const email = document.getElementById("reg-email").value;
  const password = document.getElementById("reg-password").value;
  const role = document.getElementById("reg-role").value;
  await api("/api/auth/register", {
    method: "POST",
    body: JSON.stringify({ name, email, password, role })
  });
  setStatus("Usuario registrado", true);
}

function logout() {
  setAuth("", "", "");
}

async function createProduct() {
  const body = {
    name: document.getElementById("prod-name").value,
    type: document.getElementById("prod-type").value,
    quantityKg: Number(document.getElementById("prod-qty").value),
    priceSoles: Number(document.getElementById("prod-price").value),
    region: document.getElementById("prod-region").value,
    photos: [document.getElementById("prod-photo").value]
  };
  const data = await api("/api/products", {
    method: "POST",
    headers: authHeader(),
    body: JSON.stringify(body)
  });
  document.getElementById("prod-create-msg").textContent = `Producto creado: ${data.id} (status ${data.status})`;
}

async function addTraceability() {
  const productId = document.getElementById("trace-product-id").value;
  const body = {
    zone: document.getElementById("trace-zone").value,
    community: document.getElementById("trace-community").value,
    harvestDate: document.getElementById("trace-date").value
  };
  const data = await api(`/api/products/${productId}/traceability`, {
    method: "POST",
    headers: authHeader(),
    body: JSON.stringify(body)
  });
  document.getElementById("trace-msg").textContent = `Trazabilidad registrada: ${data.id}`;
}

async function publishProduct() {
  const productId = document.getElementById("publish-product-id").value;
  const data = await api(`/api/products/${productId}/publish`, {
    method: "POST",
    headers: authHeader()
  });
  document.getElementById("publish-msg").textContent = `Producto publicado: ${data.id}`;
}

async function loadCatalog() {
  const list = document.getElementById("catalog-list");
  list.innerHTML = "";
  const data = await api("/api/products");
  data.forEach((p) => {
    const div = document.createElement("div");
    div.className = "item";
    div.innerHTML = `
      <div class="item-title">${p.name} <span class="badge">${p.type}</span></div>
      <div class="small">${p.region} · S/ ${p.priceSoles} · ${p.quantityKg} kg</div>
      <div class="small">ID: ${p.id}</div>
    `;
    list.appendChild(div);
  });
}

async function createOrder() {
  const body = {
    address: document.getElementById("order-address").value,
    items: [{
      productId: document.getElementById("order-product-id").value,
      quantity: Number(document.getElementById("order-qty").value)
    }]
  };
  const data = await api("/api/orders", {
    method: "POST",
    headers: authHeader(),
    body: JSON.stringify(body)
  });
  document.getElementById("order-msg").textContent = `Pedido creado: ${data.id}`;
}

async function loadAdminProducts() {
  const list = document.getElementById("admin-products-list");
  list.innerHTML = "";
  const data = await api("/api/admin/products", { headers: authHeader() });
  data.forEach((p) => {
    const div = document.createElement("div");
    div.className = "item";
    div.innerHTML = `
      <div class="item-title">${p.name} <span class="badge">${p.status}</span></div>
      <div class="small">ID: ${p.id} · ${p.owner?.email || ""}</div>
      <div class="small">${p.region} · S/ ${p.priceSoles}</div>
      <div style="display:flex; gap:8px; margin-top:8px;">
        <button data-approve="true" data-id="${p.id}">Aprobar</button>
        <button class="danger" data-approve="false" data-id="${p.id}">Rechazar</button>
      </div>
    `;
    list.appendChild(div);
  });

  list.querySelectorAll("button[data-approve]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const id = btn.getAttribute("data-id");
      const approved = btn.getAttribute("data-approve") === "true";
      await api(`/api/products/${id}/approve`, {
        method: "POST",
        headers: authHeader(),
        body: JSON.stringify({ approved })
      });
      loadAdminProducts();
    });
  });
}

function wire() {
  document.getElementById("login-btn").addEventListener("click", () => login().catch(e => setStatus(e.message, false)));
  document.getElementById("reg-btn").addEventListener("click", () => registerUser().catch(e => setStatus(e.message, false)));
  document.getElementById("logout-btn").addEventListener("click", logout);

  document.getElementById("prod-create-btn").addEventListener("click", () => createProduct().catch(e => {
    document.getElementById("prod-create-msg").textContent = e.message;
  }));
  document.getElementById("trace-btn").addEventListener("click", () => addTraceability().catch(e => {
    document.getElementById("trace-msg").textContent = e.message;
  }));
  document.getElementById("publish-btn").addEventListener("click", () => publishProduct().catch(e => {
    document.getElementById("publish-msg").textContent = e.message;
  }));
  document.getElementById("catalog-btn").addEventListener("click", () => loadCatalog().catch(e => {
    document.getElementById("catalog-list").innerHTML = `<div class="error">${e.message}</div>`;
  }));
  document.getElementById("order-btn").addEventListener("click", () => createOrder().catch(e => {
    document.getElementById("order-msg").textContent = e.message;
  }));
  document.getElementById("admin-products-btn").addEventListener("click", () => loadAdminProducts().catch(e => {
    document.getElementById("admin-products-list").innerHTML = `<div class="error">${e.message}</div>`;
  }));
}

initTabs();
wire();
setAuth(state.token, state.role, state.userId);
