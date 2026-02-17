const path = require("path");
const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const { PrismaClient } = require("@prisma/client");

dotenv.config();

const app = express();
const prisma = new PrismaClient();

const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || "dev-secret";

app.use(cors());
app.use(express.json({ limit: "2mb" }));
app.use(express.static(path.join(__dirname, "..", "public")));

function authRequired(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: "Missing token" });
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload;
    return next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid token" });
  }
}

function roleRequired(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: "Forbidden" });
    }
    return next();
  };
}

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

app.post("/api/auth/register", async (req, res) => {
  const { name, email, password, role } = req.body;
  if (!name || !email || !password || !role) {
    return res.status(400).json({ error: "Missing required fields" });
  }
  if (!["RECOLECTOR", "COMPRADOR", "ADMIN"].includes(role)) {
    return res.status(400).json({ error: "Invalid role" });
  }
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return res.status(409).json({ error: "Email already used" });
  const hashed = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: { name, email, password: hashed, role }
  });
  return res.status(201).json({ id: user.id, email: user.email, role: user.role });
});

app.post("/api/auth/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "Missing email or password" });
  }
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return res.status(401).json({ error: "Invalid credentials" });
  const ok = await bcrypt.compare(password, user.password);
  if (!ok) return res.status(401).json({ error: "Invalid credentials" });

  const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: "7d" });
  return res.json({ token, role: user.role, userId: user.id });
});

app.post("/api/products", authRequired, roleRequired("RECOLECTOR"), async (req, res) => {
  const { name, type, quantityKg, priceSoles, region, photos } = req.body;
  if (!name || !type || !quantityKg || !priceSoles || !region || !Array.isArray(photos)) {
    return res.status(400).json({ error: "Missing required fields" });
  }
  const product = await prisma.product.create({
    data: {
      name,
      type,
      quantityKg: Number(quantityKg),
      priceSoles: Number(priceSoles),
      region,
      photos,
      ownerId: req.user.id
    }
  });
  return res.status(201).json(product);
});

app.get("/api/products", async (req, res) => {
  const { type, region, q } = req.query;
  const products = await prisma.product.findMany({
    where: {
      status: "PUBLISHED",
      ...(q ? { name: { contains: String(q), mode: "insensitive" } } : {}),
      ...(type ? { type: String(type) } : {}),
      ...(region ? { region: String(region) } : {})
    },
    include: { traceability: true, owner: { select: { name: true } } }
  });
  return res.json(products);
});

app.get("/api/recolector/products", authRequired, roleRequired("RECOLECTOR"), async (req, res) => {
  const products = await prisma.product.findMany({
    where: { ownerId: req.user.id },
    include: { traceability: true }
  });
  return res.json(products);
});

app.post("/api/products/:id/traceability", authRequired, roleRequired("RECOLECTOR"), async (req, res) => {
  const { zone, community, harvestDate } = req.body;
  if (!zone || !community || !harvestDate) {
    return res.status(400).json({ error: "Missing required fields" });
  }
  const product = await prisma.product.findUnique({ where: { id: req.params.id } });
  if (!product || product.ownerId !== req.user.id) {
    return res.status(404).json({ error: "Product not found" });
  }
  const trace = await prisma.traceability.upsert({
    where: { productId: product.id },
    update: { zone, community, harvestDate: new Date(harvestDate) },
    create: { zone, community, harvestDate: new Date(harvestDate), productId: product.id }
  });
  return res.json(trace);
});

app.post("/api/products/:id/publish", authRequired, roleRequired("RECOLECTOR"), async (req, res) => {
  const product = await prisma.product.findUnique({ where: { id: req.params.id } });
  if (!product || product.ownerId !== req.user.id) {
    return res.status(404).json({ error: "Product not found" });
  }
  if (product.status !== "APPROVED") {
    return res.status(400).json({ error: "Product must be approved before publishing" });
  }
  const updated = await prisma.product.update({
    where: { id: product.id },
    data: { status: "PUBLISHED" }
  });
  return res.json(updated);
});

app.post("/api/products/:id/approve", authRequired, roleRequired("ADMIN"), async (req, res) => {
  const { approved } = req.body;
  if (typeof approved !== "boolean") {
    return res.status(400).json({ error: "approved must be boolean" });
  }
  const product = await prisma.product.findUnique({ where: { id: req.params.id } });
  if (!product) return res.status(404).json({ error: "Product not found" });
  const updated = await prisma.product.update({
    where: { id: product.id },
    data: { status: approved ? "APPROVED" : "REJECTED" }
  });
  return res.json(updated);
});

app.patch("/api/products/:id", authRequired, roleRequired("ADMIN"), async (req, res) => {
  const { name, type, quantityKg, priceSoles, region, photos } = req.body;
  const data = {};
  if (name) data.name = name;
  if (type) data.type = type;
  if (quantityKg !== undefined) data.quantityKg = Number(quantityKg);
  if (priceSoles !== undefined) data.priceSoles = Number(priceSoles);
  if (region) data.region = region;
  if (photos !== undefined) {
    if (!Array.isArray(photos)) {
      return res.status(400).json({ error: "photos must be an array" });
    }
    data.photos = photos;
  }
  const product = await prisma.product.findUnique({ where: { id: req.params.id } });
  if (!product) return res.status(404).json({ error: "Product not found" });
  const updated = await prisma.product.update({ where: { id: product.id }, data });
  return res.json(updated);
});

app.post("/api/orders", authRequired, roleRequired("COMPRADOR"), async (req, res) => {
  const { address, items } = req.body;
  if (!address || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: "Missing address or items" });
  }
  for (const item of items) {
    if (!item.productId || !item.quantity || Number(item.quantity) <= 0) {
      return res.status(400).json({ error: "Invalid items" });
    }
  }

  const order = await prisma.order.create({
    data: {
      address,
      buyerId: req.user.id,
      items: {
        create: items.map((item) => ({
          productId: item.productId,
          quantity: Number(item.quantity)
        }))
      }
    },
    include: { items: true }
  });

  return res.status(201).json(order);
});

app.get("/api/admin/products", authRequired, roleRequired("ADMIN"), async (_req, res) => {
  const products = await prisma.product.findMany({
    include: { owner: { select: { name: true, email: true } }, traceability: true }
  });
  return res.json(products);
});

app.get("/api/admin/orders", authRequired, roleRequired("ADMIN"), async (_req, res) => {
  const orders = await prisma.order.findMany({
    include: { buyer: { select: { name: true, email: true } }, items: true }
  });
  return res.json(orders);
});

app.use((err, _req, res, _next) => {
  // eslint-disable-next-line no-console
  console.error(err);
  res.status(500).json({ error: "Server error" });
});

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Server running on port ${PORT}`);
});
