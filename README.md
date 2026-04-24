# 💰 Mis Finanzas - Gestión Personal

<div align="center">

![Version](https://img.shields.io/badge/version-2.0.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)
![Platform](https://img.shields.io/badge/platform-Web%20%2B%20PWA-purple)
![Framework](https://img.shields.io/badge/framework-Vanilla%20JS-yellow)

**Aplicación web de gestión financiera personal con sincronización en la nube.**

[Ver Demo](https://proyectoi-os.vercel.app/) • [Reportar Bug](https://github.com/danielct2005/ProyectoiOS/issues)

</div>

---

## 📱 Características

### Core Features
- 💵 **Billetera** - Control de ingresos y gastos con categorización
- 📋 **Gastos Fijos** - Gestión de pagos recurrentes mensuales
- 💳 **Deudas** - Seguimiento de tarjetas y préstamos con cuotas
- 💸 **Por Cobrar** - Préstamos a terceros con control de cuotas
- 🐷 **Ahorros** - Metas de ahorro con seguimiento de progreso
- 📅 **Agenda** - Recordatorios y eventos importantes
- 📈 **Economía** - Indicadores económicos en tiempo real (UF, UTM, Dólar, Euro)
- 🌙 **Modo Oscuro** - Soporte para tema oscuro
- ☁️ **Sincronización** - Datos en Firebase Firestore
- 📴 **Modo Offline** - Funciona sin internet

### Technical Features
- **PWA** - Instalable como app nativa
- **Firebase Auth** - Login con email o anónimo
- **Sincronización en tiempo real** - Datos siempre actualizados
- **Diseño responsive** - Funciona en móvil y desktop

---

## 🏗️ Arquitectura

### Estructura de Archivos

```
/proyectoiOS/
├── index.html              # Entry Point (SPA)
├── app.js                 # Router principal
├── manifest.json         # PWA Manifest
├── sw.js                 # Service Worker
│
├── /core/                # ⭐ Fundamentos
│   ├── index.js
│   ├── state.js          # Estado global
│   ├── events.js        # Event Delegation
│   └── firebase.js      # Autenticación y sync
│
├── /utils/               # ⭐ Helpers
│   ├── index.js
│   ├── format.js        # formatCurrency, etc
│   ├── validate.js     # Validadores
│   └── dom.js          # Manipulación DOM
│
├── /services/           # ⭐ Lógica de negocio
│   ├── index.js
│   ├── finances.service.js
│   ├── cobr.service.js
│   ├── savings.service.js
│   ├── indicators.service.js
│   └── agenda.service.js
│
├── /ui/                 # ⭐ Renderizado
│   ├── index.js
│   ├── finanzas.ui.js
│   ├── cobros.ui.js
│   ├── savings.ui.js
│   ├── economia.ui.js
│   └── agenda.ui.js
│
└── /modules/            # Legacy (sin modificar)
    ├── storage.js
    ├── finanzas.js
    └── ...
```

### Reglas de Código

| Regla | Descripción |
|-------|-------------|
| **200 líneas max** | Ningún archivo > 200 líneas |
| **Separación UI/Lógica** | HTML separado de funciones |
| **Event Delegation** | Un solo listener por contenedor |
| **ES Modules** | Imports centralizados con index.js |

---

## 🚀 Instalación

### Prerrequisitos
- Node.js 18+
- Cuenta de Firebase (gratis)

### Pasos

1. **Clonar el repositorio**
```bash
git clone https://github.com/danielct2005/ProyectoiOS.git
cd ProyectoiOS
```

2. **Configurar Firebase**
   - Crear proyecto en [Firebase Console](https://console.firebase.google.com/)
   - Habilitar Authentication (Email/Password)
   - Habilitar Firestore Database
   - Copiar configuración en `modules/firebase.js`

3. **Ejecutar localmente**
```bash
# Con Python
python -m http.server 8000
# O con npx
npx serve .
```

4. **Deploy en Vercel**
```bash
npm i -g vercel
vercel deploy
```

---

## 📱 Uso

### Billetera
1. Ir a Billetera
2. Click en "➕ Agregar"
3. Seleccionar tipo (Ingreso/Gasto)
4. Ingresar monto y descripción
5. Guardar

### Por Cobrar
1. Ir a Por Cobrar
2. Click en "➕ Agregar"
3. Ingresar deudor, concepto, monto y cuotas
4. El sistema calcula automáticamente el monto por cuota
5. Click en "✓" para registrar cada pago

### Deudas
1. Ir a Finanzas → Deudas
2. Click en "➕ Agregar"
3. Ingresar producto, monto total y cuotas
4. Click en "✓" para registrar pagos

---

## 🐛 Troubleshooting

### Error: "No se guardan los datos"
- Verificar conexión a internet
- Revisar consola (F12) para errores
- Verificar que Firebase esté configurado

### La app no carga
- Verificar que no haya errores en la consola
- Limpiar cache del navegador

---

## 📄 Licencia

MIT License - Ver archivo LICENSE

---

## 🤝 Contribuir

1. Fork el proyecto
2. Crear branch (`git checkout -b feature/nueva-caracteristica`)
3. Commit cambios (`git commit -m 'Add: nueva caracteristica'`)
4. Push al branch
5. Abrir Pull Request

---

## 📊 Estado del Proyecto

| Métrica | Valor |
|--------|-------|
| Commits | 50+ |
| Versión | 2.0.0 |
| Última actualización | Abril 2026 |

---

<div align="center">

**Desarrollado con ❤️ por DC Dev**

[GitHub](https://github.com/danielct2005/ProyectoiOS) • [Demo](https://proyectoi-os.vercel.app/)

</div>