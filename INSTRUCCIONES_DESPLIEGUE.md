# Guía de Despliegue - Sistema eControl

Este documento detalla los pasos necesarios para desplegar los tres componentes principales del sistema: el Servidor (Backend), el Panel de Control Web (Dashboard) y el Agente Cliente (DotNet).

---

## 🚀 1. Servidor (Backend - NestJS + Prisma)

El servidor maneja la API, la base de datos y los WebSockets para la comunicación en tiempo real.

### Requisitos
- Node.js v18 o superior.
- PostgreSQL.

### Pasos
1. Entrar en la carpeta `backend`:
   ```bash
   cd backend
   ```
2. Instalar dependencias:
   ```bash
   npm install
   ```
3. Configurar variables de entorno:
   - Crear un archivo `.env` basado en `.env.example`.
   - Asegurar que `DATABASE_URL` apunte a tu base de datos PostgreSQL.
   - Definir `JWT_SECRET` y una `API_KEY_MASTER`.
4. Preparar la base de datos:
   ```bash
   npx prisma generate
   npx prisma db push
   ```
5. Compilar y ejecutar:
   ```bash
   npm run build
   npm run start:prod
   ```

---

## 💻 2. Panel de Control (Dashboard - Next.js)

La interfaz web para administradores.

### Pasos
1. Entrar en la carpeta `dashboard`:
   ```bash
   cd dashboard
   ```
2. Instalar dependencias:
   ```bash
   npm install
   ```
3. Configurar variables de entorno:
   - Crear un archivo `.env.local`.
   - Definir `NEXT_PUBLIC_API_URL` con la dirección IP/dominio del servidor backend (ej: `http://192.168.1.121:3001`).
4. Compilar y ejecutar:
   ```bash
   npm run build
   npm run start
   ```

---

## 🤖 3. Agente Cliente (Agente - .NET Avalonia)

El software que se instala en las PCs de los clientes (PCs de juego).

### Preparación del Paquete (En PC de Desarrollo)
1. Entrar en la carpeta `client-dotnet`.
2. Ejecutar el script de despliegue para compilar todos los componentes (Master, UI y Launcher):
   ```powershell
   powershell -ExecutionPolicy Bypass -File .\deploy_v2.ps1
   ```
3. Al finalizar, se creará una carpeta llamada `Release_V2`. Este es el paquete que debes copiar a las PCs clientes.

### Instalación en PCs Clientes
1. Copiar la carpeta `Release_V2` a la PC cliente.
2. Configurar el archivo `config.json` dentro de la carpeta:
   - `lanId`: El ID único del LAN Center.
   - `serverUrl`: La URL del backend (ej: `http://192.168.1.121:3001`).
   - `apiKey`: La API Key autorizada.
3. **Instalación del Servicio**:
   - Haz clic derecho sobre `install_service.bat` y selecciona **"Ejecutar como administrador"**.
   - El script copiará los archivos a `C:\eControl`, registrará el servicio de Windows "eControlMaestro" y configurará el inicio automático del Launcher.

### Notas del Cliente
- **WebView2**: El agente UI requiere el [Runtime de Microsoft Edge WebView2](https://developer.microsoft.com/en-us/microsoft-edge/webview2/) instalado en Windows.
- **Service Maestro**: El proceso de fondo (`agent-master.exe`) se encarga de bloquear/desbloquear y reportar estado.
- **Launcher**: El proceso `agent-launcher.exe` se encarga de iniciar la interfaz visual en cada sesión de usuario.

---

## 🛠️ Herramientas de Mantenimiento (En `client-dotnet`)
- `kill_agents.bat`: Cierra todos los procesos del agente para mantenimiento.
- `uninstall_clean.bat`: Elimina el servicio y limpia los archivos del sistema.
- `eControlLogs/`: Carpeta donde se guardan los logs para depuración.
