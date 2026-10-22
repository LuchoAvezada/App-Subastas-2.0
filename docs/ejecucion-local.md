# Guía de Ejecución Local — App Subastas 2.0 (Agrotec S.A.)

Esta guía documenta los pasos para levantar el entorno de desarrollo, ejecutar las pruebas, verificar el linter y validar la interfaz en pantallas de escritorio y móviles.

---

## 1. Requisitos Previos

- **Node.js**: v20 o superior.
- **Gestor de paquetes**: npm (v10+).
- **Git**: Configurado localmente.
- **Base de Datos / Backend**: Instancia de Supabase con los esquemas y funciones de `sql/` ejecutados (`00_instalacion_completa.sql` o migraciones secuenciales).
  - Si la base ya estaba instalada, ejecuta en el editor SQL de Supabase las migraciones nuevas en orden.
  - `13_sincronizacion_config.sql` (F08) activa Realtime en `sub_app_config`, para que el temporizador de cierre se actualice al instante en todos los clientes. Es idempotente.
  - `14_hardening_api.sql` (F09) quita a la anon key toda escritura directa y la lectura de `sub_usuarios`: desde ahí, toda escritura pasa por RPC con el token de sesión. Es idempotente.
    - Se aplica junto con el frontend que la usa: el frontend anterior deja de poder escribir.
    - Después, todos deben volver a iniciar sesión.

> [!NOTE]
> En entornos Windows PowerShell, si la política de scripts bloquea `npm.ps1`, utiliza el comando `npm.cmd` (ejemplo: `npm.cmd run dev`).

---

## 2. Variables de Entorno

Copia el archivo de ejemplo para configurar tus credenciales locales de Supabase:

```powershell
cp .env.example .env
```

Contenido requerido en `.env`:
```ini
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu-anon-key-aqui
```

---

## 3. Comandos de Desarrollo y Verificación

### 3.1. Levantar el servidor de desarrollo
Inicia el servidor local Vite con recarga rápida (HMR):
```powershell
npm.cmd run dev
```
La aplicación quedará disponible en: `http://localhost:5173`

### 3.2. Ejecutar Pruebas Automatizadas
Corre la suite de pruebas unitarias y de dominio con Vitest:
```powershell
npm.cmd run test
```

### 3.3. Ejecutar Linter
Valida la calidad del código y reglas de React/TypeScript con Oxlint:
```powershell
npm.cmd run lint
```

### 3.4. Chequeo de Tipos y Compilación de Producción
Verifica la integridad de tipos con el compilador de TypeScript y construye el bundle optimizado con Vite:
```powershell
npm.cmd run build
```

---

## 4. Revisión Visual y Cumplimiento de Marca

Al revisar cualquier pantalla visible:
1. **Tokens y Paleta de Marca:**
   - La capa central de estilos reside en [`src/marca-agrotec.css`](file:///c:/Users/jorge.avezada/OneDrive%20-%20Agrihold%20Management%20Corp/Escritorio/App%20Subastas%202.0/src/marca-agrotec.css).
   - Botones primarios: Verde corporativo `#1C5A34` con texto blanco.
   - Botones secundarios: Fondo blanco con borde `#BEBEBE` y texto `#1C5A34`.
   - Elemento activo de navegación: Fondo verde suave `#E8F0EB`, texto verde `#1C5A34` y barra izquierda verde de 4 px.
   - Fondos: Blanco o neutro `#F5F5F5`. Quedan prohibidos los fondos oscuros o degradados en menús, cabeceras o tarjetas.
   - Tarjetas: Fondo blanco con borde `#E4E4E4` y sin sombras pesadas.
2. **Tipografía Oficial:**
   - La fuente oficial es **Gabarito** (SIL OFL 1.1), servida localmente desde `public/fonts/gabarito-latin.woff2`.
3. **Comprobación Móvil:**
   - Abrir las herramientas de desarrollo del navegador y probar en resoluciones de 375 px, 768 px y 1280 px.
   - Verificar que no exista desplazamiento horizontal accidental ni elementos tapados por barras fijas.
