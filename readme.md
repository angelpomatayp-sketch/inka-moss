# Inka Moss MVP

## Descripción general
Plataforma web de **comercio sostenible** para la empresa Inka Moss. Digitaliza la recolección, publicación y venta de musgo natural, conectando recolectores, compradores y administradores en un solo canal, con trazabilidad del origen y control administrativo.

## Objetivo general
Diseñar e implementar un sistema web que gestione la recolección, publicación y venta del musgo natural mediante procesos digitales integrados, trazabilidad del producto y un canal comercial unificado, para mejorar la organización operativa, ampliar la visibilidad comercial y fortalecer el modelo de negocio sostenible durante el primer año.

## Objetivos específicos
1. Diseñar y validar prototipos funcionales del sistema web con usuarios reales, garantizando usabilidad.
2. Implementar módulos de registro de productos, usuarios, catálogo, pedidos y trazabilidad con buen rendimiento (<3s en pruebas).
3. Incorporar un panel administrativo para validación, aprobación y control antes del despliegue.

## Alcance
Incluye plataforma web, interfaces, módulos funcionales, pruebas funcionales e integración, y validación en entorno de pruebas.

No incluye app móvil, pasarelas de pago online, automatización logística externa ni infraestructura productiva.

## Funcionalidades principales
- Registro y autenticación por roles (recolector, comprador, admin).
- Registro de productos (tipo, cantidad, precio, región, fotos).
- Publicación en catálogo y visualización pública.
- Registro de pedidos por compradores.
- Registro de trazabilidad (zona, comunidad, fecha).
- Panel administrativo para aprobación y control.

## Accesos de prueba
- **ADMIN**: `admin@inka.pe` / `Admin123!`
- **RECOLECTOR**: `recolector@inka.pe` / `Recolector123!`
- **COMPRADOR**: `comprador@inka.pe` / `Comprador123!`

## Rutas principales
- `/` Inicio público
- `/catalogo.html` Catálogo público
- `/login.html` Ingreso
- `/register.html` Registro
- `/panel.html` Panel por roles

## Stack
- Backend: Node.js + Express
- DB: PostgreSQL
- ORM: Prisma
- Frontend: HTML/CSS/JS
