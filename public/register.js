const apiBase = "";
async function api(path, options = {}) {
  const res = await fetch(apiBase + path, {
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options
  });
  const text = await res.text();
  let data = text;
  try { data = JSON.parse(text); } catch (_) {}
  if (!res.ok) throw new Error(data.error || text || "Error");
  return data;
}

document.getElementById("register-btn").addEventListener("click", async () => {
  const name = document.getElementById("name").value;
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;
  const role = document.getElementById("role").value;
  const msg = document.getElementById("msg");
  try {
    await api("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({ name, email, password, role })
    });
    msg.textContent = "Usuario registrado. Ahora inicia sesión.";
  } catch (e) {
    msg.textContent = e.message;
  }
});
