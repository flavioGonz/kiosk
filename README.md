# 🛡️ BioCloud Kiosk - Next Generation

[![React](https://img.shields.io/badge/React-19-blue.svg)](https://reactjs.org/)
[![Vite](https://img.shields.io/badge/Vite-7-646CFF.svg)](https://vitejs.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6.svg)](https://www.typescriptlang.org/)
[![FaceAPI](https://img.shields.io/badge/Face--API-vladmandic-emerald.svg)](https://github.com/vladmandic/face-api)
[![License](https://img.shields.io/badge/License-MIT-gray.svg)](LICENSE)

Sistema de terminal biométrica inteligente para el control de asistencia institucional. Diseñado para ofrecer una experiencia de usuario premium, alta precisión en el reconocimiento facial y sincronización en tiempo real con la nube.

---

## ✨ Características Principales

### 👤 Reconocimiento Facial Avanzado
- **Motor Biométrico**: Basado en `face-api.js` (TensorFlow.js) para detección y reconocimiento en el borde (lado del cliente).
- **Multi-Enrolamiento**: Proceso de registro de 3 pasos capturando diferentes ángulos faciales para maximizar la tasa de acierto.
- **Vectores Cifrados**: Conversión de rasgos faciales en descriptores numéricos de 128 puntos para mayor seguridad y velocidad.

### 🔄 Sincronización Cloud Inteligente
- **Sync Bidireccional**: Descarga de nómina de funcionarios y subida de marcas de asistencia automáticamente.
- **Modo Offline First**: Capacidad de operar sin internet utilizando una base de datos local (IndexedDB) y sincronizando cuando la conexión se restablezca.
- **Reporting Granular**: Panel de control para visualizar el estado de sincronización de cada terminal y cada registro.

### 📱 Experiencia de Usuario (UX/UI)
- **Diseño Premium**: Interfaz moderna, animaciones con `framer-motion` y estética minimalista.
- **PWA Ready**: Aplicación instalable en Windows/Android para modo kiosco nativo a pantalla completa.
- **Notificaciones Push**: Alertas administrativas en tiempo real ante incidencias o desconexiones.

### 🎫 Gestión de Tickets
- **QR Generativo**: Generación de tickets digitales o impresos con códigos QR únicos que incluyen datos del funcionario y firma de tiempo.

---

## 🚀 Tecnologías

| Capa | Tecnología |
| :--- | :--- |
| **Frontend** | React 19, TypeScript, Vite |
| **Estilos** | CSS Moderno, Framer Motion, Lucide Icons |
| **Biometría** | Face-API.js (@vladmandic) |
| **Base de Datos** | Dexie.js (IndexedDB) |
| **Comunicación** | Fetch API, Socket.io Client |

---

## 🛠️ Instalación y Configuración

### Requisitos Previos
- Node.js (v18 o superior)
- Webcam (para el enrolamiento y escaneo)

### Pasos
1. **Clonar el repositorio**
   ```bash
   git clone https://github.com/flavioGonz/kiosk.git
   cd kiosk
   ```

2. **Instalar dependencias**
   ```bash
   npm install
   ```

3. **Ejecutar en modo desarrollo**
   ```bash
   npm run dev
   ```

4. **Configuración del Servidor (Opcional)**
   Si deseas utilizar el servidor de sincronización local incluido:
   ```bash
   cd server
   node index.js
   ```

---

## 🔐 Administración y Seguridad

### Acceso a Enrolamiento
Para habilitar el registro de nuevos funcionarios en el tótem:
1. Mantén presionada la pantalla principal durante **5 segundos**.
2. Ingresa la clave administrativa (Default: `flavio20`).
3. Sigue el asistente de pasos para ingresar datos y capturar las muestras faciales.

### Configuración Cloud
En el panel de administración (`/admin`), sección **Sync Cloud**, puedes configurar:
- **API Endpoint**: URL de los servicios centrales de ANEP.
- **Secret Key**: Llave de autorización para el túnel de datos.
- **Mapeo de Tablas**: Configuración flexible para integrar con bases de Datos MySQL o PostgreSQL externas.

---

## 📦 Estructura del Proyecto

- `/src/components`: Componentes de interfaz (Scanner, Admin, Enrolamiento).
- `/src/services`: Lógica de sincronización, notificaciones y persistencia.
- `/src/hooks`: Funcionalidades reutilizables de reconocimiento facial.
- `/src/db`: Configuración de esquemas de Dexie.js.
- `/server`: Backend minimalista para bridge de base de datos externa.

---

## 📄 Licencia
Este proyecto es propiedad de **ANEP** para uso institucional.

---
*Desarrollado con ❤️ para la modernización tecnológica educativa.*
