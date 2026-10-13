# Data Model & Design Tokens: F01 — Base del Proyecto y Tokens de Identidad Visual Agrotec

Esta feature no modifica esquemas de base de datos relacionales, sino que define y formaliza el **modelo de datos de tokens de diseño** (Design Tokens) que rige todas las capas de interfaz de usuario.

---

## 1. Tokens de Color Corporativos

| Token CSS | Token Tailwind | Valor | Rol de Negocio |
|---|---|---|---|
| `--marca-verde` | `marca-verde` / `agrotec-800` | `#1C5A34` | Color principal: acciones primarias, navegación activa, titulares |
| `--marca-rojo` | `marca-rojo` | `#8A2733` | Acentos: eyebrows, alertas, badges de estado crítico |
| `--marca-verde-suave`| `marca-verde-suave` / `agrotec-50` | `#E8F0EB` | Fondos de hover, elemento activo de menú, chips sutiles |
| `--marca-gris-oscuro`| `marca-gris-oscuro` | `#6D6D6D` | Texto secundario y descriptores |
| `--marca-gris-claro` | `marca-gris-claro` | `#BEBEBE` | Bordes de botones secundarios y campos de formulario |
| `--marca-rosa` | `marca-rosa` | `#F9D7E0` | Fondo de avisos, badges de advertencia / cierre |
| `--marca-marron` | `marca-marron` | `#B26A46` | Estados complementarios |
| `--marca-dorado` | `marca-dorado` | `#BB913D` | Destacados y premios |
| `--marca-texto` | `marca-texto` | `#262626` | Texto principal de alta legibilidad |
| `--marca-linea` | `marca-linea` | `#E4E4E4` | Líneas divisorias y bordes de tarjetas |
| `--marca-fondo` | `marca-superficie` | `#F5F5F5` | Fondo general de la aplicación |

---

## 2. Escala Tipográfica (Múltiplos de 4)

| Nivel | Tamaño | Peso | Uso |
|---|---|---|---|
| Titular principal de cabecera | 62 px (40 px en móvil) | Bold (700) | Portadas y bienvenida principal |
| Titular de página | 48 px (32 px en móvil) | Bold (700) | Encabezado de catálogo y páginas principales |
| Título de sección | 28 px | Regular (400) | Agrupadores de contenido |
| Subtítulo / intro | 24 px / 20 px | Regular (400) | Párrafos introductorios destacados |
| Cuerpo, menús y formularios | 16 px | Regular (400) / Bold (700) | Textos de navegación, inputs y tablas |
| Etiquetas pequeñas (eyebrows) | 12 px | Bold (700), Mayúsculas | Etiquetas sobre títulos (espaciado 0.12em) |

---

## 3. Radios y Espaciados

- **Controles (botones, inputs, badges):** `8px` (`rounded-lg`)
- **Tarjetas y modales:** `16px` (`rounded-2xl` o `rounded-xl`)
- **Píldoras y avatares:** `9999px` (`rounded-full`)
- **Espaciados:** `4px · 8px · 12px · 16px · 24px · 32px · 48px · 64px`
