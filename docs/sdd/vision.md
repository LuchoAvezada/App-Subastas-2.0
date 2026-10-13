# Visión del Producto — App Subastas 2.0 (Agrotec S.A.)

## 1. Información General
- **Producto:** App Subastas 2.0
- **Organización:** Agrotec S.A. (Paraguay) — Empresa del grupo Agrihold
- **Metodología de Desarrollo:** Spec-Driven Development (SDD) con GitHub Spec Kit
- **Entorno Inicial:** Repositorio local, migración limpia sin código heredado

## 2. Objetivo de Negocio
Construir una plataforma web interna y privada para Agrotec S.A. destinada a la subasta y venta exclusiva entre los colaboradores de la empresa de activos informáticos en desuso (notebooks, celulares, tablets y otros equipos), maximizando la transparencia, equidad, valor de recuperación y satisfacción del personal mediante un proceso automatizado con criterios de adjudicación predefinidos y objetivos.

## 3. Usuarios y Roles

### 3.1. Colaborador Participante (Rol: USUARIO - `id_rol = 2`)
- **Quiénes son:** Todos los empleados activos y formalmente habilitados de Agrotec S.A.
- **Acceso:** Mediante Cédula de Identidad paraguaya (`ci_documento`) previamente registrada por el Administrador y contraseña personal configurada por el propio colaborador.
- **Capacidades:**
  - Iniciar sesión y gestionar su acceso seguro.
  - Explorar el catálogo de activos clasificados por categoría (Tablets, Celulares, Notebooks, Otros) con detalles técnicos y fotos.
  - Visualizar el precio base de cada activo (en USD), el **monto líder actual y la cantidad de ofertas recibidas sin revelar nombres de los postores** (Q-01), y el tiempo restante de la subasta.
  - Enviar una oferta por activo (monto >= precio base).
  - Cancelar su oferta vigente mientras la subasta siga abierta; si cancela, no podrá volver a ofertar por ese activo (Q-02).
  - Consultar en "Mis Ofertas" el resumen de sus postulaciones.
  - Consultar los resultados oficiales una vez finalizada la subasta (con tope de adjudicación de máximo 1 activo por categoría - Q-03).

### 3.2. Administrador del Sistema (Rol: ADMINISTRADOR - `id_rol = 1`)
- **Quiénes son:** Personal designado de Tecnología (TI) y/o Recursos Humanos.
- **Capacidades:**
  - Cadastrar colaboradores (individualmente o por importación masiva), asignar roles y habilitar/inhabilitar participantes.
  - Administrar el catálogo de activos: crear, editar, subir fotos vía Supabase Storage (Q-04), fijar precio base en USD y cambiar estados (`Disponible`, `Cerrado`, `Adjudicado`).
  - Configurar los parámetros de la subasta: fecha y hora de cierre (`fecha_fin_subasta`).
  - Monitorear ofertas recibidas y auditoría de accesos/cambios.
  - Ejecutar el proceso de adjudicación automática con tope de 1 activo por categoría y desempates objetivos por jerarquía y antigüedad (Q-03).
  - Gestionar reasignación automática al siguiente postor en caso de desistimiento de un ganador (Q-05).
  - Publicar y exportar los resultados finales.
  - **Restricción de negocio:** Los administradores **no pueden realizar ofertas** en la subasta para garantizar absoluta imparcialidad.

### 3.3. Visitante / No Habilitado (Rol: VISITANTE - `id_rol = 3` o `habilitado = 'NO'`)
- Usuarios registrados sin permisos de oferta o empleados inhabilitados por la empresa. Solo lectura informativa (si aplica) o bloqueo de participación.

---

## 4. Alcance

### 4.1. Dentro del Alcance (In-Scope)
1. **Autenticación y Seguridad Corporativa:**
   - Acceso con cédula paraguaya (`ci_documento`) y contraseña con hash `pgcrypto` (`gen_salt('bf', 10)`).
   - Pre-registro obligatorio por Administrador (ningún usuario externo puede auto-crearse cuenta).
   - Bloqueo preventivo por intentos fallidos de inicio de sesión y registro de auditoría (`sub_intentos_login`).
2. **Gestión de Catálogo de Activos:**
   - Categorías predefinidas: Tablets, Celulares, Notebooks, Otros.
   - Atributos por activo: marca, modelo, número de serie, observaciones, FAM (código de activo fijo), fotos almacenadas en Supabase Storage (Q-04) y precio base en USD.
3. **Módulo de Ofertas y Pujas:**
   - Regla de negocio: oferta por colaborador por activo disponible.
   - Información visible del activo: precio base, **monto líder actual y cantidad actual de ofertas enviadas** (anónimos, sin nombre de los postores - Q-01).
   - Regla de cancelación: se permite cancelar la oferta mientras la subasta esté abierta, pero veta definitivamente volver a ofertar por ese activo (Q-02).
   - Validación estricta de monto ofertado >= precio base en USD.
   - Cierre automático de ofertas al cumplirse la fecha/hora de fin de la subasta.
   - Exclusión de ofertas para perfiles que no sean rol `USUARIO`.
4. **Algoritmo de Adjudicación y Desempate:**
   - Regla de equidad: **Tope de adjudicación de máximo 1 activo por categoría por colaborador** (Q-03).
   - Criterio 1: Mayor monto ofertado.
   - Criterio 2 (Desempate por jerarquía): Menor número de `nivel_jerarquia` (nivel 1 = mayor jerarquía).
   - Criterio 3 (Desempate por antigüedad): Menor `fecha_ingreso` (empleado más antiguo en Agrotec).
   - Registro auditable del criterio de adjudicación (`GANADO POR OFERTA MAS ALTA`, `GANADO POR JERARQUIA`, `GANADO POR ANTIGUEDAD`).
5. **Panel Administrativo y Gestión de Resultados:**
   - CRUD de activos y subida de imágenes a Supabase Storage (Q-04).
   - Gestión y visualización de colaboradores habilitados.
   - Panel de control de la subasta (configuración de fecha límite, disparador de cierre y procesamiento de ganadores).
   - Gestión de desistimientos con reasignación automática al siguiente postor elegible (Q-05).
   - Vista de auditoría de cambios y accesos.
6. **Diseño e Identidad Visual Agrotec:**
   - Implementación estricta de la guía de marca con tokens centralizados (`verde #1C5A34`, `rojo #8A2733`, Gabarito WOFF2 con SIL OFL, escala de espaciado múltiplos de 4, contraste AA).
7. **Localización e Idioma:**
   - Un solo idioma: Español de Paraguay (`es-PY`), sin multilenguaje.
   - Zona horaria de visualización y control: `America/Asuncion` (UTC para almacenamiento).
   - Moneda oficial de la subasta: USD.

### 4.2. Fuera del Alcance (Out-of-Scope)
1. **Pasarelas de Pago en Línea:** El pago o retención por descuento en nómina es un proceso administrativo y contable interno fuera de la aplicación.
2. **Subasta Pública o Abierta:** No se admite registro ni participación de personas ajenas a Agrotec S.A.
3. **Logística y Despacho:** La entrega física de los equipos se coordina en las oficinas de Agrotec.
4. **Mecanismos Multilenguaje o Multidivisa:** La interfaz no tendrá conmutador de idiomas ni soporte para guaraníes u otras monedas en esta fase.

---

## 5. Restricciones del Sistema

| Tipo | Restricción | Motivo |
|---|---|---|
| **Arquitectura** | Spec-Driven Development (GitHub Spec Kit) | Trazabilidad completa: spec -> plan -> tasks -> tests -> code. |
| **Identidad** | Acceso solo por cédula de colaboradores previamente cargados | Control de nómina interna y seguridad laboral. |
| **Idioma y Región** | Español (`es-PY`), zona horaria `America/Asuncion` | Operación exclusiva en Agrotec Paraguay. |
| **Moneda** | Dólares estadounidenses (USD) | Moneda estándar corporativa para activos tecnológicos. |
| **Privacidad** | Datos personales mínimos y cero datos reales en repositorios | Protección de datos de los colaboradores y buenas prácticas de seguridad. |
| **Diseño** | Tokens en un solo archivo, paleta Agrotec, tipografía Gabarito | Consistencia y cumplimiento de la guía de marca oficial. |
| **Stack** | React 19 + TypeScript + Vite + Tailwind CSS / Vanilla CSS + Supabase (PostgreSQL / RPC / Storage) | Stack actual definido para la aplicación. |
