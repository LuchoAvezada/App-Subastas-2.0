# Feature Specification: F01 — Base del Proyecto y Tokens de Identidad Visual Agrotec

**Feature Branch**: `001-base-marca`  
**Created**: 2026-10-13  
**Status**: Approved  
**Input**: Base del Proyecto y Tokens de Identidad Visual Agrotec  

---

## 1. User Scenarios & Testing

### User Story 1 - Experiencia Visual y Reconocimiento de Marca Oficial (Prioridad: P1)
Como colaborador o administrador de Agrotec S.A., quiero que toda la plataforma refleje de forma fidedigna y consistente la identidad visual de la empresa (logo oficial de Agrotec, tipografía Gabarito, colores verde `#1C5A34` y rojo `#8A2733`, fondos limpios y tarjetas blancas con borde tenue), para tener la certeza de estar en una aplicación corporativa confiable, moderna y oficial del grupo Agrihold.

- **Por qué esta prioridad:** La identidad de marca y la accesibilidad son la base innegociable de toda la aplicación (Constitución P7). Todos los desarrollos posteriores se montan sobre este diseño.
- **Prueba independiente:** Cargar la aplicación en el navegador y comprobar visualmente que el logo oficial, la tipografía Gabarito, el favicon corporativo, las tarjetas limpias y los colores oficiales se visualizan correctamente en escritorio y móvil.
- **Escenarios de Aceptación:**
  1. **Given** un colaborador que accede a cualquier página, **When** visualiza el menú lateral y la cabecera, **Then** observa el logo oficial de Agrotec (`/brand/logo-agrotec.svg`) y el isotipo en la pestaña del navegador (`/favicon.svg`).
  2. **Given** un usuario navegando por la interfaz, **When** observa los textos y encabezados, **Then** la tipografía renderizada es Gabarito (400 Regular y 700 Bold) servida de forma local.

---

### User Story 2 - Tokens Centralizados y Componentes UI de Marca (Prioridad: P1)
Como desarrollador del equipo, quiero contar con una única capa fuente de verdad de tokens de marca en `src/marca-agrotec.css` y `app/marca-agrotec.css`, consumida por los componentes base (`Button`, `Badge`, `Sidebar`, `Header`, `Input`, `Modal`), para que ningún componente defina estilos, fuentes o colores sueltos.

- **Por qué esta prioridad:** Asegura la regla P2 de la constitución ("Configuración, no código disperso") y previene inconsistencias visuales y deuda técnica.
- **Prueba independiente:** Inspeccionar el código de los componentes base y comprobar que utilizan clases semánticas y variables de `marca-agrotec.css` / Tailwind sincronizado.
- **Escenarios de Aceptación:**
  1. **Given** el componente `Button`, **When** se utiliza con variante `primary`, **Then** aplica fondo verde `#1C5A34`, texto blanco y foco visible.
  2. **Given** el componente `Button`, **When** se utiliza con variante `secondary`, **Then** aplica fondo blanco, borde `#BEBEBE` y texto `#1C5A34`.
  3. **Given** el menú lateral `Sidebar`, **When** un elemento está activo, **Then** muestra fondo `#E8F0EB`, texto `#1C5A34` y una barra izquierda verde de 4 px.
  4. **Given** el encabezado `Header`, **When** se renderiza en pantalla, **Then** presenta fondo blanco y un borde izquierdo verde de 4 px (`#1C5A34`).

---

### User Story 3 - Entorno Local de Pruebas, Calidad y Tipos (Prioridad: P2)
Como desarrollador y auditor de calidad, quiero disponer de scripts estandarizados para correr pruebas (`vitest`), linter (`oxlint`) y validación de tipos TypeScript (`tsc`), junto con una guía de ejecución clara en `docs/ejecucion-local.md`, para asegurar la estabilidad del proyecto en cada commit.

- **Por qué esta prioridad:** Cumple con la constitución P8 (trazabilidad y ciclo SDD) garantizando que no se introduzcan regresiones.
- **Prueba independiente:** Ejecutar `npm.cmd test`, `npm.cmd run lint` y `npm.cmd run build` en la terminal y comprobar que todos finalizan con código de salida 0.
- **Escenarios de Aceptación:**
  1. **Given** la suite de pruebas unitarias, **When** se ejecuta `npm.cmd test`, **Then** todas las pruebas pasan en menos de 2 segundos.
  2. **Given** el código del proyecto, **When** se ejecuta `npm.cmd run lint`, **Then** se reportan 0 errores de sintaxis y buenas prácticas de React.
  3. **Given** el proyecto TypeScript, **When** se ejecuta `npm.cmd run build`, **Then** compila y genera los artefactos en `dist/` sin errores de tipos.

---

## 2. Requisitos Funcionales

- **RF-001:** Tipografía Gabarito (pesos 400 a 900, SIL OFL 1.1) servida localmente desde `public/fonts/gabarito-latin.woff2` acompañada de su licencia `public/fonts/OFL-gabarito.txt`.
- **RF-002:** Servir el logo vectorial oficial de Agrotec desde `public/brand/logo-agrotec.svg` y el favicon con las hojas del isotipo en `public/favicon.svg`.
- **RF-003:** Definir e importar la capa de tokens de marca en `src/marca-agrotec.css` y `app/marca-agrotec.css` como fuente única de verdad.
- **RF-004:** Configurar `tailwind.config.js` para exponer los colores corporativos (`marca.verde`, `marca.rojo`, `marca.gris-oscuro`, etc.) y la familia tipográfica `Gabarito`.
- **RF-005:** Implementar los patrones obligatorios:
  - Menú lateral blanco con borde derecho y elemento activo con fondo verde suave `#E8F0EB`, texto verde `#1C5A34` y barra izquierda verde de 4 px.
  - Cabecera blanca con borde izquierdo verde de 4 px.
  - Botón primario verde `#1C5A34` con texto blanco.
  - Botón secundario blanco con borde gris claro `#BEBEBE` y texto verde `#1C5A34`.
  - Tarjetas blancas con borde `#E4E4E4`, sin sombras marcadas ni degradados oscuros.
- **RF-006:** Mantener contraste visual mínimo AA y foco accesible visible (`:focus-visible`) en todos los controles interactivos.
- **RF-007:** Suite de pruebas con Vitest configurada en `package.json` (`"test": "vitest run"`).
- **RF-008:** Documentación completa de operación en `docs/ejecucion-local.md`.

---

## 3. Criterios de Éxito

- **SC-001:** 100% de los componentes UI base alineados a los tokens y patrones de marca de Agrotec.
- **SC-002:** Cero dependencias externas a servidores de fuentes (Google Fonts) en tiempo de ejecución.
- **SC-003:** 0 errores en `npm.cmd run lint` y 0 errores en `npm.cmd run build`.
- **SC-004:** Suite de pruebas unitarias ejecutándose exitosamente mediante `npm.cmd test`.
