# Quickstart & Verification Guide: F01 — Base del Proyecto y Tokens de Identidad Visual Agrotec

Esta guía resume cómo levantar y verificar rápidamente los entregables de la feature F01.

---

## 1. Comandos de Verificación Rápida

Ejecutar en la terminal del proyecto:

```powershell
# 1. Ejecutar las pruebas unitarias automatizadas
npm.cmd test

# 2. Verificar reglas de lint y calidad
npm.cmd run lint

# 3. Validar chequeo de tipos TypeScript y empaquetado
npm.cmd run build
```

---

## 2. Puntos de Inspección Visual en Navegador

Levantar el entorno local:
```powershell
npm.cmd run dev
```

1. **Pantalla de Inicio de Sesión (`/login`):**
   - Fondo de superficie neutro limpio `#F5F5F5`.
   - Logo oficial de Agrotec (`/brand/logo-agrotec.svg`) nítido y centrado.
   - Eyebrow en rojo corporativo `#8A2733` ("PORTAL DE SUBASTAS").
   - Titular en verde corporativo `#1C5A34` con fuente Gabarito.
   - Tarjeta blanca con borde `#E4E4E4` y sin sombras marcadas ni fondos oscuros.
   - Botón primario verde `#1C5A34` con texto blanco.
2. **Navegación Lateral (`Sidebar`):**
   - Logo oficial en el encabezado del menú.
   - Elemento activo con fondo verde suave `#E8F0EB`, texto verde `#1C5A34` y barra lateral izquierda verde de 4 px.
   - Tarjeta de cuenta regresiva blanca con borde tenue.
3. **Cabecera (`Header`):**
   - Fondo blanco con borde izquierdo verde de 4 px.
4. **Pestaña del Navegador:**
   - Favicon oficial con las hojas del isotipo de Agrotec.
