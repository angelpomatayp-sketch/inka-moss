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
  applyRoleUI();
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
  window.location.href = "/login.html";
}

function openModal() {
  document.getElementById("prod-modal").classList.remove("hidden");
}

function closeModal() {
  document.getElementById("prod-modal").classList.add("hidden");
}

function openEditModal() {
  document.getElementById("edit-modal").classList.remove("hidden");
}

function closeEditModal() {
  document.getElementById("edit-modal").classList.add("hidden");
}

function openCart() {
  document.getElementById("cart-drawer").classList.remove("hidden");
}

function closeCart() {
  document.getElementById("cart-drawer").classList.add("hidden");
}

function applyRoleUI() {
  const loginBox = document.getElementById("login-box");
  const registerBox = document.getElementById("register-box");
  const tabs = document.querySelectorAll(".tab");
  if (state.token && state.role) {
    if (loginBox) loginBox.classList.add("hidden");
    if (registerBox) registerBox.classList.add("hidden");
    // show only relevant tab/panel
    tabs.forEach((t) => {
      const isRoleTab = t.dataset.tab?.toUpperCase() === state.role;
      t.classList.toggle("hidden", !isRoleTab);
      t.classList.toggle("active", isRoleTab);
    });
    switchTab(state.role.toLowerCase());
    // preload dashboard data by role
    if (state.role === "ADMIN") {
      loadAdminProducts().catch(() => {});
      loadAdminOrders().catch(() => {});
    }
    if (state.role === "RECOLECTOR") {
      loadMyProducts().catch(() => {});
    }
    if (state.role === "COMPRADOR") {
      loadCatalog().catch(() => {});
      renderCart();
    }
  } else {
    if (loginBox) loginBox.classList.remove("hidden");
    if (registerBox) registerBox.classList.remove("hidden");
    tabs.forEach((t, i) => {
      t.classList.remove("hidden");
      t.classList.toggle("active", i === 0);
    });
    switchTab("recolector");
  }
}

async function createProduct() {
  if (!validateRequired(["prod-name","prod-type","prod-qty","prod-price","prod-region","prod-photo"])) return;
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
  showToast("Producto creado");
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

async function publishProduct(productId) {
  const data = await api(`/api/products/${productId}/publish`, {
    method: "POST",
    headers: authHeader()
  });
  return data;
}

async function publishProductFromInput() {
  const productId = document.getElementById("publish-product-id").value;
  if (!productId) {
    document.getElementById("publish-msg").textContent = "Ingresa un ID válido.";
    return;
  }
  const data = await publishProduct(productId);
  document.getElementById("publish-msg").textContent = `Producto publicado: ${data.id}`;
  showToast("Producto publicado");
}

function getCart() {
  try {
    return JSON.parse(localStorage.getItem("cart") || "[]");
  } catch (_) {
    return [];
  }
}

function saveCart(cart) {
  localStorage.setItem("cart", JSON.stringify(cart));
}

function addToCart(product) {
  const cart = getCart();
  const existing = cart.find((c) => c.productId === product.id);
  if (existing) {
    existing.quantity += 1;
  } else {
    cart.push({
      productId: product.id,
      name: product.name,
      priceSoles: product.priceSoles,
      quantity: 1
    });
  }
  saveCart(cart);
  renderCart();
}

function renderCart() {
  const list = document.getElementById("cart-list");
  if (!list) return;
  const cart = getCart();
  list.innerHTML = "";
  updateBuyerStats(cart);
  if (cart.length === 0) {
    list.innerHTML = "<div class=\"notice\">Carrito vacío</div>";
    return;
  }
  cart.forEach((item) => {
    const div = document.createElement("div");
    div.className = "item";
    div.innerHTML = `
      <div class=\"item-title\">${item.name}</div>
      <div class=\"small\">S/ ${item.priceSoles} · Cantidad: ${item.quantity}</div>
      <div style=\"display:flex; gap:6px; margin-top:6px;\">
        <button data-cart-dec="${item.productId}">-</button>
        <button class=\"secondary\" data-cart-inc="${item.productId}\">+</button>
        <button class=\"danger\" data-cart-del="${item.productId}\">Quitar</button>
      </div>
    `;
    list.appendChild(div);
  });

  list.querySelectorAll("button[data-cart-inc]").forEach((btn) => {
    btn.addEventListener("click", () => updateCart(btn.getAttribute("data-cart-inc"), 1));
  });
  list.querySelectorAll("button[data-cart-dec]").forEach((btn) => {
    btn.addEventListener("click", () => updateCart(btn.getAttribute("data-cart-dec"), -1));
  });
  list.querySelectorAll("button[data-cart-del]").forEach((btn) => {
    btn.addEventListener("click", () => removeFromCart(btn.getAttribute("data-cart-del")));
  });
}

function updateBuyerStats(cart) {
  const items = cart.reduce((sum, c) => sum + c.quantity, 0);
  const total = cart.reduce((sum, c) => sum + (c.priceSoles * c.quantity), 0);
  const elItems = document.getElementById("buy-stat-items");
  const elTotal = document.getElementById("buy-stat-total");
  const elViewed = document.getElementById("buy-stat-viewed");
  if (elItems) elItems.textContent = items;
  if (elTotal) elTotal.textContent = total.toFixed(2);
  if (elViewed) elViewed.textContent = "Catálogo";
}
function updateCart(productId, delta) {
  const cart = getCart();
  const item = cart.find((c) => c.productId === productId);
  if (!item) return;
  item.quantity += delta;
  if (item.quantity <= 0) {
    removeFromCart(productId);
    return;
  }
  saveCart(cart);
  renderCart();
}

function removeFromCart(productId) {
  const cart = getCart().filter((c) => c.productId !== productId);
  saveCart(cart);
  renderCart();
}

async function loadCatalog() {
  const list = document.getElementById("catalog-list");
  list.innerHTML = "";
  const data = await api("/api/products");
  const elViewed = document.getElementById("buy-stat-viewed");
  if (elViewed) elViewed.textContent = data.length;
  data.forEach((p) => {
    const div = document.createElement("div");
    div.className = "item";
    const img = p.photos && p.photos[0] ? `<img src=\"${p.photos[0]}\" alt=\"${p.name}\" style=\"width:100%;border-radius:8px;margin-bottom:8px;height:140px;object-fit:cover;\" />` : "";
    div.innerHTML = `
      ${img}
      <div class="item-title">${p.name} <span class="badge">${p.type}</span></div>
      <div class="small">${p.region} · S/ ${p.priceSoles} · ${p.quantityKg} kg</div>
      <div class="small">ID: ${p.id}</div>
      <button data-add="${p.id}">Agregar al carrito</button>
    `;
    list.appendChild(div);
  });

  list.querySelectorAll("button[data-add]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-add");
      const product = data.find((p) => p.id === id);
      if (product) addToCart(product);
    });
  });
}

async function createOrder() {
  const cart = getCart();
  const address = document.getElementById("order-address").value;
  if (cart.length === 0) throw new Error("Carrito vacío");
  if (!address) throw new Error("Dirección requerida");
  const body = {
    address,
    items: cart.map((c) => ({ productId: c.productId, quantity: c.quantity }))
  };
  const data = await api("/api/orders", {
    method: "POST",
    headers: authHeader(),
    body: JSON.stringify(body)
  });
  document.getElementById("order-msg").textContent = `Pedido creado: ${data.id}`;
  saveCart([]);
  renderCart();
  showToast("Pedido creado");
}

async function loadMyProducts() {
  const list = document.getElementById("my-products-list");
  list.innerHTML = "";
  const data = await api("/api/recolector/products", { headers: authHeader() });
  updateRecolectorStats(data);
  data.forEach((p) => {
    const div = document.createElement("div");
    div.className = "item";
    const img = p.photos && p.photos[0] ? `<img src=\"${p.photos[0]}\" alt=\"${p.name}\" style=\"width:100%;border-radius:8px;margin-bottom:8px;height:140px;object-fit:cover;\" />` : "";
    const canPublish = p.status === "APPROVED";
    const statusClass = p.status ? p.status.toLowerCase() : "";
    div.innerHTML = `
      ${img}
      <div class="item-title">${p.name} <span class="status ${statusClass}">${p.status}</span></div>
      <div class="small">ID: ${p.id}</div>
      <div class="small">${p.region} · S/ ${p.priceSoles} · ${p.quantityKg} kg</div>
      <div class="small">Flujo: Registrar → Trazabilidad → Admin aprueba → Publicar</div>
      <div style="display:flex; gap:8px; margin-top:6px;">
        ${canPublish ? `<button data-publish="${p.id}">Publicar</button>` : ""}
        <button class="secondary" data-edit="${p.id}">Editar</button>
        <button class="secondary" data-copy="${p.id}">Copiar ID</button>
      </div>
    `;
    list.appendChild(div);
  });

  list.querySelectorAll("button[data-publish]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const id = btn.getAttribute("data-publish");
      await publishProduct(id);
      loadMyProducts();
    });
  });

  list.querySelectorAll("button[data-edit]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const id = btn.getAttribute("data-edit");
      const p = data.find((x) => x.id === id);
      if (!p) return;
      document.getElementById("edit-id").value = p.id;
      document.getElementById("edit-name").value = p.name || "";
      document.getElementById("edit-type").value = p.type || "";
      document.getElementById("edit-qty").value = p.quantityKg || "";
      document.getElementById("edit-price").value = p.priceSoles || "";
      document.getElementById("edit-region").value = p.region || "";
      document.getElementById("edit-photo").value = (p.photos && p.photos[0]) ? p.photos[0] : "";
      document.getElementById("edit-zone").value = p.traceability?.zone || "";
      document.getElementById("edit-community").value = p.traceability?.community || "";
      if (p.traceability?.harvestDate) {
        const d = new Date(p.traceability.harvestDate);
        document.getElementById("edit-date").value = d.toISOString().slice(0,10);
      } else {
        document.getElementById("edit-date").value = "";
      }
      openEditModal();
    });
  });

  list.querySelectorAll("button[data-copy]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const id = btn.getAttribute("data-copy");
      try { await navigator.clipboard.writeText(id); } catch (_) {}
    });
  });
}

async function loadBuyerOrders() {
  const list = document.getElementById("buyer-orders-list");
  list.innerHTML = "";
  const data = await api("/api/buyer/orders", { headers: authHeader() });
  if (data.length === 0) {
    list.innerHTML = "<div class=\"notice\">Sin pedidos</div>";
    return;
  }
  data.forEach((o) => {
    const div = document.createElement("div");
    div.className = "item";
    div.innerHTML = `
      <div class="item-title">Pedido ${o.id} <span class="badge">${o.status}</span></div>
      <div class="small">Dirección: ${o.address}</div>
      <div class="small">Items: ${o.items?.length || 0}</div>
    `;
    list.appendChild(div);
  });
}

function validateRequired(ids) {
  let ok = true;
  ids.forEach((id) => {
    const el = document.getElementById(id);
    if (!el) return;
    const empty = !String(el.value || "").trim();
    el.style.borderColor = empty ? "#ef4444" : "";
    if (empty) ok = false;
  });
  return ok;
}

function showToast(message, type = "success") {
  const el = document.getElementById("toast");
  if (!el) return;
  el.textContent = message;
  el.className = `toast ${type}`;
  el.classList.remove("hidden");
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => {
    el.classList.add("hidden");
  }, 2500);
}

function updateRecolectorStats(products) {
  const total = products.length;
  const published = products.filter((p) => p.status === "PUBLISHED").length;
  const pending = products.filter((p) => p.status === "PENDING").length;
  const trace = products.filter((p) => p.traceability).length;
  const elTotal = document.getElementById("reco-stat-total");
  const elPub = document.getElementById("reco-stat-published");
  const elPen = document.getElementById("reco-stat-pending");
  const elTrace = document.getElementById("reco-stat-trace");
  if (elTotal) elTotal.textContent = total;
  if (elPub) elPub.textContent = published;
  if (elPen) elPen.textContent = pending;
  if (elTrace) elTrace.textContent = trace;
}

async function loadAdminProducts() {
  const list = document.getElementById("admin-products-list");
  list.innerHTML = "";
  const data = await api("/api/admin/products", { headers: authHeader() });
  updateAdminStats(data);
  data.forEach((p) => {
    const div = document.createElement("div");
    div.className = "item product-card admin-card";
    const photo = p.photos && p.photos.length ? p.photos[0] : "";
    div.innerHTML = `
      ${photo ? `<img src="${photo}" alt="${p.name}" />` : `<div class="notice">Sin imagen</div>`}
      <div class="meta-row">
        <div class="item-title">${p.name}</div>
        <span class="badge">${p.status}</span>
      </div>
      <div class="small">${p.region} · <span class="price">S/ ${p.priceSoles}</span></div>
      <div class="small">ID: ${p.id}</div>
      <div class="small">Recolector: ${p.owner?.email || "—"}</div>
      <label>Imagen (URL)</label>
      <input class="inline-input" data-photo-id="${p.id}" type="url" value="${photo}" placeholder="https://..." />
      <div class="actions">
        <button data-approve="true" data-id="${p.id}">Aprobar</button>
        <button class="danger" data-approve="false" data-id="${p.id}">Rechazar</button>
        <button class="secondary" data-update="true" data-id="${p.id}">Guardar imagen</button>
      </div>
      <div class="small" id="admin-msg-${p.id}"></div>
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

  list.querySelectorAll("button[data-update]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const id = btn.getAttribute("data-id");
      const input = list.querySelector(`input[data-photo-id="${id}"]`);
      const url = input ? input.value : "";
      await api(`/api/products/${id}`, {
        method: "PATCH",
        headers: authHeader(),
        body: JSON.stringify({ photos: url ? [url] : [] })
      });
      const msg = document.getElementById(`admin-msg-${id}`);
      if (msg) msg.textContent = "Imagen actualizada.";
      loadAdminProducts();
      showToast("Imagen actualizada");
    });
  });
}

async function loadAdminOrders() {
  const list = document.getElementById("admin-orders-list");
  list.innerHTML = "";
  const data = await api("/api/admin/orders", { headers: authHeader() });
  updateOrdersStat(data);
  if (data.length === 0) {
    list.innerHTML = "<div class=\"notice\">Sin pedidos</div>";
    return;
  }
  data.forEach((o) => {
    const div = document.createElement("div");
    div.className = "item";
    div.innerHTML = `
      <div class="item-title">Pedido ${o.id} <span class="badge">${o.status}</span></div>
      <div class="small">Comprador: ${o.buyer?.email || ""}</div>
      <div class="small">Dirección: ${o.address}</div>
      <div class="small">Items: ${o.items?.length || 0}</div>
    `;
    list.appendChild(div);
  });
}

function updateAdminStats(products) {
  const published = products.filter((p) => p.status === "PUBLISHED").length;
  const pending = products.filter((p) => p.status === "PENDING").length;
  const statPublished = document.getElementById("stat-published");
  const statPending = document.getElementById("stat-pending");
  if (statPublished) statPublished.textContent = published;
  if (statPending) statPending.textContent = pending;
}

function updateOrdersStat(orders) {
  const statOrders = document.getElementById("stat-orders");
  if (statOrders) statOrders.textContent = orders.length;
  const statUsers = document.getElementById("stat-users");
  if (statUsers) statUsers.textContent = "3";
}

function initAdminMenu() {
  const buttons = document.querySelectorAll("[data-admin-view]");
  const productsView = document.getElementById("admin-products-view");
  const ordersView = document.getElementById("admin-orders-view");
  buttons.forEach((btn) => {
    btn.addEventListener("click", () => {
      buttons.forEach((b) => b.classList.toggle("active", b === btn));
      const view = btn.getAttribute("data-admin-view");
      if (productsView) productsView.classList.toggle("hidden", view !== "products");
      if (ordersView) ordersView.classList.toggle("hidden", view !== "orders");
    });
  });
}

function wire() {
  const onId = (id, fn) => {
    const el = document.getElementById(id);
    if (el) el.addEventListener("click", fn);
  };
  onId("login-btn", () => login().catch(e => setStatus(e.message, false)));
  onId("reg-btn", () => registerUser().catch(e => setStatus(e.message, false)));
  onId("logout-top", logout);

  onId("prod-create-btn", () => createProduct().catch(e => {
    const msg = document.getElementById("prod-create-msg");
    if (msg) msg.textContent = e.message;
  }));
  onId("open-prod-modal", openModal);
  document.querySelectorAll("[data-close-modal]").forEach((el) => el.addEventListener("click", closeModal));
  document.querySelectorAll("[data-close-edit]").forEach((el) => el.addEventListener("click", closeEditModal));

  onId("publish-btn", () => publishProductFromInput().catch(e => {
    const msg = document.getElementById("publish-msg");
    if (msg) msg.textContent = e.message;
  }));
  onId("my-products-btn", () => loadMyProducts().catch(e => {
    const list = document.getElementById("my-products-list");
    if (list) list.innerHTML = `<div class=\"error\">${e.message}</div>`;
  }));
  onId("catalog-btn", () => loadCatalog().catch(e => {
    const list = document.getElementById("catalog-list");
    if (list) list.innerHTML = `<div class=\"error\">${e.message}</div>`;
  }));
  onId("order-btn", () => createOrder().catch(e => {
    const msg = document.getElementById("order-msg");
    if (msg) msg.textContent = e.message;
  }));
  onId("buyer-orders-btn", () => loadBuyerOrders().catch(e => {
    const list = document.getElementById("buyer-orders-list");
    if (list) list.innerHTML = `<div class=\"error\">${e.message}</div>`;
  }));
  onId("open-cart", openCart);
  onId("close-cart", closeCart);

  onId("edit-save-btn", async () => {
    const id = document.getElementById("edit-id").value;
    if (!validateRequired(["edit-name","edit-type","edit-qty","edit-price","edit-region"])) return;
    const body = {
      name: document.getElementById("edit-name").value,
      type: document.getElementById("edit-type").value,
      quantityKg: Number(document.getElementById("edit-qty").value),
      priceSoles: Number(document.getElementById("edit-price").value),
      region: document.getElementById("edit-region").value,
      photos: [document.getElementById("edit-photo").value]
    };
    await api(`/api/products/${id}`, { method: "PATCH", headers: authHeader(), body: JSON.stringify(body) });

    const zone = document.getElementById("edit-zone").value;
    const community = document.getElementById("edit-community").value;
    const harvestDate = document.getElementById("edit-date").value;
    if (zone && community && harvestDate) {
      await api(`/api/products/${id}/traceability`, {
        method: "POST",
        headers: authHeader(),
        body: JSON.stringify({ zone, community, harvestDate })
      });
    }
    closeEditModal();
    loadMyProducts();
  });
  onId("admin-products-btn", () => loadAdminProducts().catch(e => {
    const list = document.getElementById("admin-products-list");
    if (list) list.innerHTML = `<div class=\"error\">${e.message}</div>`;
  }));
  onId("admin-orders-btn", () => loadAdminOrders().catch(e => {
    const list = document.getElementById("admin-orders-list");
    if (list) list.innerHTML = `<div class=\"error\">${e.message}</div>`;
  }));
}
initTabs();
wire();
setAuth(state.token, state.role, state.userId);
renderCart();
initAdminMenu();

