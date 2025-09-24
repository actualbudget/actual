# 📊 Actual Budget - Visión General de la Arquitectura del Producto

## 🎯 ¿Qué es Actual Budget?

Actual Budget es una herramienta de finanzas personales que funciona bajo el principio de "local-first" (primero local). Esto significa que tus datos viven principalmente en tu dispositivo, garantizando privacidad y control total sobre tu información financiera, con capacidad de sincronización opcional entre dispositivos.

### 🔑 Características Principales
- ✅ **100% Gratuito y Open Source**
- 🔒 **Privacidad Total** - Tus datos permanecen en tu dispositivo
- 🔄 **Sincronización Opcional** - Comparte datos entre dispositivos si lo deseas
- 🌐 **Multi-plataforma** - Web, Desktop (Windows, Mac, Linux)
- 📱 **Local-First** - Funciona sin conexión a internet

---

## 🏗️ Arquitectura General del Sistema

```mermaid
graph TB
    subgraph "Frontend Applications"
        WEB[🌐 Web App<br/>React + TypeScript]
        DESKTOP[💻 Desktop App<br/>Electron]
    end
    
    subgraph "Core Engine"
        CORE[⚡ Loot-Core<br/>Business Logic Engine]
        DB[(🗄️ SQLite Database<br/>Local Storage)]
    end
    
    subgraph "Synchronization Layer"
        SYNC[🔄 Sync Server<br/>Node.js + Express]
        CRDT[📊 CRDT Engine<br/>Conflict Resolution]
    end
    
    subgraph "Infrastructure"
        DOCKER[🐳 Docker<br/>Containerization]
        API[🔌 API Layer<br/>External Integrations]
    end
    
    WEB --> CORE
    DESKTOP --> CORE
    CORE --> DB
    CORE --> CRDT
    CRDT --> SYNC
    SYNC --> DOCKER
    CORE --> API
```

---

## 📦 Componentes Principales

### 1. 🎨 **Frontend - Interfaces de Usuario**

#### **Web Application (@actual-app/web)**
- **Propósito**: Interfaz web principal que funciona en cualquier navegador
- **Tecnología**: React + TypeScript + Vite
- **Características**:
  - Dashboard de presupuestos
  - Gestión de cuentas y transacciones
  - Reportes y gráficos
  - Interfaz responsive para diferentes dispositivos

#### **Desktop Application (desktop-electron)**
- **Propósito**: Aplicación nativa para escritorio
- **Tecnología**: Electron (empaqueta la web app)
- **Ventajas**:
  - Experiencia más integrada con el sistema operativo
  - Mejor rendimiento para uso intensivo
  - Acceso a funcionalidades del sistema

### 2. ⚙️ **Motor Central - Loot-Core**

Este es el **corazón** de la aplicación. Piénsalo como el "cerebro" que maneja toda la lógica de negocio.

```mermaid
graph LR
    subgraph "Loot-Core Engine"
        BUDGET[💰 Budget Logic<br/>Envelope Budgeting]
        TRANS[💳 Transaction Engine<br/>Import/Export]
        RULES[📋 Rules Engine<br/>Auto-categorization]
        CALC[🧮 Calculations<br/>Reports & Analytics]
    end
    
    BUDGET --> TRANS
    TRANS --> RULES
    RULES --> CALC
```

**Responsabilidades**:
- 💰 **Gestión de Presupuestos**: Implementa el sistema de "envelope budgeting"
- 💳 **Procesamiento de Transacciones**: Import/export de bancos, categorización
- 📊 **Cálculos Financieros**: Balances, proyecciones, reportes
- 🔒 **Seguridad de Datos**: Encriptación y validación

### 3. 🔄 **Servidor de Sincronización (sync-server)**

#### **¿Para qué sirve?**
Imagina que usas Actual en tu computadora de casa y en tu laptop del trabajo. El servidor de sincronización mantiene ambas versiones actualizadas automáticamente.

```mermaid
sequenceDiagram
    participant D1 as 💻 Dispositivo 1
    participant SS as 🔄 Sync Server
    participant D2 as 📱 Dispositivo 2
    
    D1->>SS: Envía cambios locales
    SS->>SS: Procesa y almacena cambios
    SS->>D2: Notifica nuevos cambios
    D2->>SS: Descarga cambios
    D2->>D2: Aplica cambios localmente
```

**Características**:
- 🔒 **Opcional**: Puedes usar Actual completamente offline
- 🏠 **Self-hosted**: Tú controlas dónde viven tus datos
- 🔐 **Seguro**: Los datos están encriptados en tránsito y reposo

### 4. 📊 **CRDT Engine - Resolución de Conflictos**

**¿Qué son los CRDTs?**
CRDT significa "Conflict-free Replicated Data Types". Es una tecnología que permite que múltiples dispositivos modifiquen los mismos datos sin crear conflictos.

**Ejemplo práctico**:
- En tu casa agregas una transacción de $50 en "Comida"
- En el trabajo agregas otra de $30 en "Transporte"
- Ambas se sincronizan automáticamente sin problemas

### 5. 🔌 **API y Integraciones**

```mermaid
graph LR
    subgraph "External Integrations"
        BANKS[🏦 Bank Imports<br/>OFX, QFX, CSV]
        TOOLS[🛠️ External Tools<br/>YNAB, Mint Migration]
        EXPORT[📤 Export Formats<br/>CSV, PDF Reports]
    end
    
    API[🔌 API Layer] --> BANKS
    API --> TOOLS
    API --> EXPORT
```

---

## 🚀 Flujo de Datos y Operaciones

### 📥 **Flujo de una Transacción Nueva**

```mermaid
flowchart TD
    START[👤 Usuario ingresa transacción] --> VALIDATE[✅ Validación en Frontend]
    VALIDATE --> CORE[⚡ Procesa en Loot-Core]
    CORE --> RULES[📋 Aplica reglas automáticas]
    RULES --> BUDGET[💰 Actualiza presupuesto]
    BUDGET --> STORE[💾 Guarda en SQLite local]
    STORE --> SYNC{🔄 ¿Sync habilitado?}
    SYNC -->|Sí| SERVER[📤 Envía a servidor]
    SYNC -->|No| END[✅ Completado]
    SERVER --> DEVICES[📱 Notifica otros dispositivos]
    DEVICES --> END
```

### 📊 **Generación de Reportes**

```mermaid
flowchart LR
    USER[👤 Usuario solicita reporte] --> QUERY[🔍 Query a base de datos]
    QUERY --> CALC[🧮 Cálculos en Loot-Core]
    CALC --> FORMAT[📋 Formato de presentación]
    FORMAT --> DISPLAY[📊 Muestra en UI]
```

---

## 🛠️ Estructura de Desarrollo

### 📁 **Organización del Código**

```
actual/
├── 📁 packages/
│   ├── 🎨 desktop-client/     # Interfaz web React
│   ├── 💻 desktop-electron/   # App Electron
│   ├── ⚡ loot-core/         # Motor central
│   ├── 🔄 sync-server/       # Servidor sincronización
│   ├── 🔌 api/               # API externa
│   ├── 📊 crdt/              # Manejo de conflictos
│   └── 🧩 component-library/ # Componentes reutilizables
├── 🐳 docker-compose.yml      # Configuración Docker
├── 📋 package.json            # Configuración principal
└── 📚 README.md              # Documentación
```

### 🔄 **Proceso de Build y Deploy**

```mermaid
graph LR
    DEV[👨‍💻 Desarrollo] --> BUILD[🏗️ Build Process]
    BUILD --> WEB[🌐 Web Bundle]
    BUILD --> DESKTOP[💻 Desktop Apps]
    BUILD --> SERVER[🔄 Server Image]
    
    WEB --> DEPLOY1[🚀 Web Deploy]
    DESKTOP --> DEPLOY2[📦 App Packages]
    SERVER --> DEPLOY3[🐳 Docker Hub]
```

---

## 🎯 Modelos de Negocio y Deployment

### 🏠 **Opciones de Instalación**

| Opción | Audiencia | Complejidad | Control |
|--------|-----------|-------------|----------|
| 🌐 **Web Local** | Usuarios técnicos | Media | Total |
| 💻 **Desktop Apps** | Usuarios generales | Baja | Total |
| ☁️ **PikaPods** | No técnicos | Muy baja | Medio |
| 🚁 **Fly.io** | Semi-técnicos | Baja | Alto |
| 🐳 **Docker Self-hosted** | Técnicos | Alta | Total |

### 💰 **Modelo de Monetización**

```mermaid
pie title Estrategia de Sustentabilidad
    "Open Source Gratuito" : 70
    "Hosting Gestionado" : 20
    "Donaciones/Sponsors" : 10
```

---

## 🔒 **Seguridad y Privacidad**

### 🛡️ **Principios de Seguridad**

1. **🏠 Local-First**: Los datos viven en tu dispositivo
2. **🔐 Encriptación**: Datos encriptados en tránsito y reposo
3. **🔒 Zero-Knowledge**: El servidor no puede leer tus datos
4. **📱 Control Total**: Tú decides qué sincronizar y dónde

### 🔐 **Flujo de Seguridad**

```mermaid
sequenceDiagram
    participant U as 👤 Usuario
    participant C as 💻 Cliente
    participant S as 🔄 Servidor
    
    U->>C: Ingresa datos financieros
    C->>C: 🔐 Encripta localmente
    C->>S: 📤 Envía datos encriptados
    S->>S: 💾 Almacena (sin poder leer)
    S->>C: 📥 Sincroniza con otros dispositivos
    C->>C: 🔓 Desencripta localmente
```

---

## 🎨 **Experiencia del Usuario**

### 📱 **Interfaces Principales**

1. **📊 Dashboard**
   - Vista general del presupuesto
   - Gráficos de gastos por categoría
   - Alertas y notificaciones

2. **💳 Gestión de Transacciones**
   - Import automático desde bancos
   - Categorización inteligente
   - Reglas automáticas

3. **💰 Presupuesto (Envelope Method)**
   - Asignación de dinero a categorías
   - Seguimiento de gastos vs presupuesto
   - Proyecciones futuras

4. **📈 Reportes y Analytics**
   - Tendencias de gastos
   - Comparativas mensuales
   - Objetivos de ahorro

---

## 🚀 **Roadmap y Evolución**

### 🎯 **Ventajas Competitivas**

- ✅ **Privacidad Total**: A diferencia de Mint o Personal Capital
- ✅ **Control Completo**: No dependes de servicios externos
- ✅ **Gratuito**: Sin suscripciones mensuales
- ✅ **Open Source**: Transparencia total del código
- ✅ **Multi-plataforma**: Funciona en cualquier dispositivo

### 🔮 **Visión Futura**

```mermaid
timeline
    title Roadmap del Producto
    
    Presente : Core Features
             : Web + Desktop Apps
             : Basic Sync
    
    Q1 2025  : Mobile App
             : Advanced Reports
             : AI Categorization
    
    Q2 2025  : Bank Integrations
             : Goal Tracking
             : Family Sharing
    
    Q3 2025  : Investment Tracking
             : Multi-currency
             : Advanced Analytics
```

---

## 🤝 **Comunidad y Contribuciones**

### 👥 **Ecosistema**

- **📝 Documentación**: [actualbudget.org](https://actualbudget.org)
- **💬 Discord**: Comunidad activa de usuarios
- **🐛 GitHub Issues**: Reportes de bugs y features
- **🌍 Traducciones**: Soporte multi-idioma via Weblate

### 🏆 **Métricas de Éxito**

- ⭐ **+15,000 stars** en GitHub
- 👥 **Comunidad activa** de contributores
- 🌍 **Uso global** en múltiples idiomas
- 📈 **Crecimiento constante** de usuarios

---

## 💡 **Conclusión**

Actual Budget representa una nueva generación de herramientas financieras que prioriza:

1. **👤 Control del Usuario**: Tú posees y controlas tus datos
2. **🔒 Privacidad**: Datos locales, encriptación end-to-end
3. **🆓 Accesibilidad**: Completamente gratuito y open source
4. **🛠️ Flexibilidad**: Multiple opciones de deployment
5. **🌍 Comunidad**: Desarrollo colaborativo y transparente

Esta arquitectura permite que usuarios desde principiantes hasta expertos en finanzas encuentren valor en la herramienta, mientras mantienen control total sobre su información financiera más sensible.

---

*📝 Documento generado como Product Manager Overview - Para detalles técnicos específicos, consultar la documentación de desarrollo en `/docs/contributing/`*
