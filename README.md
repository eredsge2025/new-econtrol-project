# 🎮 eControl - Sistema de Gestión para LAN Centers

Sistema completo de gestión multi-tenant para LAN Centers con dashboard web moderno.

## 🚀 Estado del Proyecto

**Backend**: ✅ 100% Funcional (44 endpoints)  
**Frontend**: ✅ 80% Funcional  
**Sistema de Roles**: 🔄 30% Completado

---

## ⚡ Quick Start

### Backend
```bash
cd backend
npm install
npm run start:dev
# http://localhost:3001
```

### Frontend
```bash
cd dashboard
npm install
npm run dev
# http://localhost:3000
```

### Login Demo
```
Email: test@econtrol.com
Password: Test123!
```

---

## 📦 Features Implementadas

### ✅ Core Modules
- **Auth**: JWT authentication
- **Users**: Balance management, stats
- **LANs**: Multi-tenant LAN centers
- **Zones**: Areas con tarifas base
- **PCs**: 5 estados, specs flexibles
- **Rate Schedules**: Auto-gen desde baseRate
- **Bundles**: Paquetes guardables
- **Sessions**: Cobro por escalones ⭐

### ✅ Frontend
- Login + Protected routes
- Dashboard con stats
- LANs list
- Sessions activas (auto-refresh 5s)
- Sidebar + Navbar responsive

---

## 💡 Algoritmo de Cobro por Escalones

No se cobra por minuto exacto, sino por el **próximo schedule superior**:

```
Schedules: 15min=$0.75, 30min=$1.50, 60min=$3.00

Juega 5min  → Cobra $0.75  (schedule 15min)
Juega 18min → Cobra $1.50  (schedule 30min)
Juega 35min → Cobra $3.00  (schedule 60min)
```

---

## 🔐 Sistema de Roles (En Desarrollo)

```
SUPER_ADMIN → Aprueba LAN_ADMINs
    ↓
LAN_ADMIN → Gestiona su LAN
    ↓
STAFF → Cajeros, personal
    ↓
CLIENT → Usuarios finales
```

**Estado**: Schema actualizado, migration lista, faltan endpoints.

---

## 📚 Documentación

- `walkthrough.md` - Resumen completo de la sesión
- `NEXT_STEPS.md` - Guía de próximos pasos
- `TESTING_SESSIONS.md` - Guía de testing manual
- `QUICK_REFERENCE.md` - Endpoints rápidos
- `implementation_plan.md` - Plan de roles

---

## 🛠️ Tech Stack

**Backend**:
- NestJS 10
- PostgreSQL 18
- Prisma ORM
- JWT Auth
- TypeScript

**Frontend**:
- Next.js 14 (App Router)
- Tailwind CSS 4
- shadcn/ui
- TanStack Query
- Axios

---

## 📊 Métricas

- **Endpoints**: 44
- **Módulos Backend**: 8
- **Páginas Frontend**: 4
- **Líneas de código**: ~3,000+
- **Archivos creados**: ~80

---

## 🎯 Para Continuar

Ver `NEXT_STEPS.md` para plan detallado.

**Siguiente**: Completar sistema de roles (~5 horas)

---

**Creado con**: ❤️ + NestJS + Next.js  
**Licencia**: MIT
