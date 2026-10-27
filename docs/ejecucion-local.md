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
  - `15_registro_migraciones.sql` crea `sub_migraciones`. Desde ahí, cada script nuevo termina insertando su nombre en esa tabla, y `SELECT * FROM sub_migraciones` muestra qué tiene aplicado cada base.
  - `16_lecturas_con_sesion.sql` (F10) deja a la anon key leyendo solo el catálogo. Nómina, ofertas con postor y resultados se leen con `leer_datos(p_token, ...)`. También pasa las fotos guardadas con la IP del servidor a ruta relativa. Es transaccional e idempotente.
    - Se aplica junto con el frontend que la usa: el anterior deja de ver ofertas, colaboradores y resultados.
  - `17_login_rapido.sql` corrige `autenticar_usuario`: calculaba bcrypt para cada cuenta registrada y el login superaba el `statement_timeout` (500, código 57014). Solo reemplaza la función.
  - `18_procesar_ganadores_where.sql` corrige "DELETE requires a WHERE clause" al procesar ganadores: Supabase rechaza DELETE/UPDATE sin WHERE en la API, incluso dentro de funciones. Toda sentencia nueva de ese tipo debe llevar WHERE.
  - `19_adjudicacion_por_rondas.sql` (F11) permite una segunda ronda con los activos sin ofertas: "Procesar Ganadores" solo adjudica lo Disponible, no borra rondas anteriores, mantiene el tope por categoría en toda la subasta, pausa la publicación y solo corre después del cierre.
  - `20_restablecer_y_bloquear_cuenta.sql` (F12) agrega `restablecer_cuenta`, impide que un admin se bloquee a sí mismo, audita bloqueos y restablecimientos, y devuelve `id_cargo` a la vista de colaboradores (al editar, el cargo aparecía vacío). Transaccional e idempotente.
  - `21_login_cuenta_bloqueada.sql` (F12): con la contraseña correcta, un colaborador bloqueado ve "Su cuenta se encuentra bloqueada, contacte a su administrador." en lugar de "Credenciales inválidas.". Solo reemplaza `autenticar_usuario`.
  - `scripts/huella_esquema.sql` resume funciones, tablas, vistas, permisos de `anon` y políticas en una fila con hash por elemento. Si la huella del servidor coincide con la de una instalación limpia del repo, el esquema es el mismo.

## Publicación en el servidor on-prem (NUC)

- **Frontend:** desde la raíz del repo, en `main` y sin cambios sin commitear, ejecuta `.\scripts\deploy.ps1`.
  - El script se niega a publicar si hay algo sin commitear: así lo que corre en el NUC siempre es un commit de git.
  - Deja el commit publicado en `http://20.20.20.77/version.txt`.
  - En producción la app usa como API el mismo origen desde el que se abre, así que el build funciona por la LAN y por el túnel público (`https://sp009.taildad9ad.ts.net`). `.env.production.local` solo necesita `VITE_SUPABASE_ANON_KEY`.
- **Internet:** Tailscale Funnel publica el puerto 80 del NUC (`sudo tailscale funnel --bg 80`; se apaga con `sudo tailscale funnel --https=443 off`).
- **Límite de login por IP:** `scripts/nginx-limite-login.conf` va en `/etc/nginx/conf.d/` (instrucciones en el archivo).
- **Compresión:** `scripts/nginx-compresion.conf` también va en `/etc/nginx/conf.d/`. Sin él, el JS se envía sin comprimir.
- **Base de datos:** las migraciones no las aplica el script. Se aplican a mano en el NUC, de a una y en orden:
  ```bash
  docker exec -i supabase-db psql -U postgres -d postgres -v ON_ERROR_STOP=1 < NN_archivo.sql
  ```

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
