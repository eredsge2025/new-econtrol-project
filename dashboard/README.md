# eControl Admin Dashboard

Panel de administración construido con Next.js 14 (App Router) para gestionar LAN Centers.

## Stack Tecnológico

- **Framework**: Next.js 14 (App Router)
- **Lenguaje**: TypeScript
- **Estilos**: Tailwind CSS
- **UI Components**: shadcn/ui (próximamente)
- **State Management**: Zustand + TanStack Query
- **Forms**: React Hook Form + Zod

## Requisitos

-Node.js 20+
- npm

## Instalación

```bash
npm install
```

## Desarrollo

```bash
npm run dev
```

La aplicación estará disponible en `http://localhost:3000`

## Build

```bash
npm run build
npm start
```

## Estructura

```
dashboard/
├── app/
│   ├── (auth)/          # Rutas de autenticación
│   ├── (dashboard)/     # Rutas del panel admin
│   ├── api/             # API Routes
│   ├── layout.tsx       # Layout raíz
│   └── page.tsx         # Página principal
├── components/          # Componentes reutilizables
├── lib/                 # Utilidades
└── public/              # Assets estáticos
```

## Próximos Pasos

1. Configurar shadcn/ui
2. Crear sistema de autenticación
3. Implementar comunicación con Backend API
4. Diseñar vistas de administración (PCs, Sesiones, Usuarios)
