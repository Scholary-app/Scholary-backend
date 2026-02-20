# 🎓 Scholary Backend API

Backend API para Scholary - Sistema de gestión de asistencias educativas.

## 📋 Descripción

API REST desarrollada con Node.js y Express para gestionar asistencias, estudiantes, clases y generar reportes analíticos para instituciones educativas.

## 🚀 Stack Tecnológico

- **Runtime**: Node.js (ES Modules)
- **Framework**: Express.js
- **ORM**: Prisma
- **Base de Datos**: PostgreSQL (Supabase)
- **Autenticación**: Google OAuth 2.0 + JWT
- **Validación**: Zod
- **Seguridad**: Helmet, CORS, bcryptjs

## 📁 Estructura del Proyecto

```
Scholary-backend/
├── src/
│   ├── config/          # Configuración (DB, OAuth, constantes)
│   ├── controllers/     # Controladores de rutas
│   ├── routes/          # Definición de rutas
│   ├── middlewares/     # Middlewares (auth, validación, errores)
│   ├── services/        # Lógica de negocio
│   ├── utils/           # Utilidades y helpers
│   ├── schemas/         # Schemas de validación con Zod
│   ├── app.js           # Configuración de Express
│   └── index.js         # Punto de entrada
├── prisma/              # Prisma schema y migraciones
├── .env.example         # Ejemplo de variables de entorno
├── .gitignore
└── package.json
```

## ⚙️ Instalación

1. **Clonar el repositorio**
   ```bash
   git clone https://github.com/Scholary-app/Scholary-backend.git
   cd Scholary-backend
   ```

2. **Instalar dependencias**
   ```bash
   npm install
   ```

3. **Configurar variables de entorno**
   ```bash
   cp .env.example .env
   ```
   
   Editar `.env` y configurar las variables necesarias:
   - `DATABASE_URL`: URL de conexión a PostgreSQL
   - `JWT_SECRET`: Secreto para firmar tokens JWT
   - `GOOGLE_CLIENT_ID`: ID de cliente de Google OAuth
   - `GOOGLE_CLIENT_SECRET`: Secreto de cliente de Google OAuth

4. **Iniciar el servidor**
   
   Desarrollo:
   ```bash
   npm run dev
   ```
   
   Producción:
   ```bash
   npm start
   ```

## 🔧 Scripts Disponibles

- `npm run dev` - Inicia el servidor en modo desarrollo con nodemon
- `npm start` - Inicia el servidor en modo producción
- `npm test` - Ejecuta las pruebas (pendiente configuración)

## 📡 Endpoints Principales

### Health Check
```
GET /health
```

Respuesta:
```json
{
  "success": true,
  "message": "Scholary API is running",
  "environment": "development",
  "timestamp": "2026-02-20T06:39:55.938Z"
}
```

### API Info
```
GET /
```

Respuesta:
```json
{
  "success": true,
  "message": "Welcome to Scholary API",
  "version": "1.0.0",
  "documentation": "/api-docs"
}
```

## 🔐 Seguridad

- **Helmet**: Configuración de headers HTTP seguros
- **CORS**: Control de acceso entre orígenes
- **bcryptjs**: Hash de contraseñas
- **JWT**: Autenticación basada en tokens
- **Validación**: Zod para validación de esquemas

## 🌍 Variables de Entorno

| Variable | Descripción | Requerido | Default |
|----------|-------------|-----------|---------|
| `PORT` | Puerto del servidor | No | 3000 |
| `NODE_ENV` | Entorno de ejecución | No | development |
| `DATABASE_URL` | URL de PostgreSQL | Sí | - |
| `JWT_SECRET` | Secreto para JWT | Sí | - |
| `JWT_EXPIRES_IN` | Expiración de tokens | No | 7d |
| `GOOGLE_CLIENT_ID` | Google OAuth Client ID | No | - |
| `GOOGLE_CLIENT_SECRET` | Google OAuth Secret | No | - |
| `GOOGLE_CALLBACK_URL` | Google OAuth Callback | No | - |
| `ALLOWED_ORIGINS` | Orígenes permitidos CORS | No | localhost:3000,5173 |

## 👥 Equipo de Desarrollo

- **Rafael Hernandez**: Base de datos (Supabase + Prisma Schema)
- **Josue Hernandez**: Backend API (Node.js + Express + Prisma ORM)

## 📝 Licencia

ISC

## 🔗 Enlaces

- [Documentación de Issues](./BACKEND_ISSUES.md)
- [Diccionario de Base de Datos](./DATABASE_DICTIONARY.md)
