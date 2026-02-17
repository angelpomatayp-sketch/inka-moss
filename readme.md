# Inka Moss - MVP

Este repositorio contiene el MVP del sistema web de comercio sostenible para Inka Moss.

## Alcance del MVP
Historias de usuario incluidas:
- HU01 Registro de productos.
- HU02 Publicación en catálogo (solo aprobados).
- HU03 Visualización de catálogo.
- HU04 Registro de pedidos.
- HU05 Registro de trazabilidad.

Roles del MVP:
- RECOLECTOR
- COMPRADOR
- ADMIN

## Stack
- Backend: Node.js + Express
- DB: PostgreSQL
- ORM: Prisma
- Frontend: HTML/CSS/JS (estático)

## Variables de entorno
Crea un archivo `.env` con:

```
DATABASE_URL=postgresql://USER:PASS@HOST:PORT/DB
JWT_SECRET=tu_secreto
PORT=3000
```

## Ejecutar en local
```
npm install
npx prisma generate
npx prisma migrate dev --name init
npm run dev
```

## Deploy en Render
1. Crea un **Web Service** en Render y conecta el repo.
2. Crea un **PostgreSQL** en Render y copia el `DATABASE_URL`.
3. Configura variables de entorno en Render:
   - `DATABASE_URL`
   - `JWT_SECRET`
4. Build command:
```
npm install
npx prisma generate
npx prisma migrate deploy
```
5. Start command:
```
npm start
```

## Endpoints principales
- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/products` (RECOLECTOR)
- `POST /api/products/:id/traceability` (RECOLECTOR)
- `POST /api/products/:id/approve` (ADMIN)
- `POST /api/products/:id/publish` (RECOLECTOR)
- `GET /api/products` (CATALOGO)
- `POST /api/orders` (COMPRADOR)

## Accesos de prueba
- **ADMIN**: `admin@inka.pe` / `Admin123!`
- **RECOLECTOR**: `recolector@inka.pe` / `Recolector123!`
- **COMPRADOR**: `comprador@inka.pe` / `Comprador123!`
