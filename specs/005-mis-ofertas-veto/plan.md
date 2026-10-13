# Plan de Implementación: F05 — Mis Ofertas y Cancelación con Veto

**Branch**: `005-mis-ofertas-veto` | **Fecha**: 2026-10-13

---

## 1. Arquitectura Técnica

### Componentes y Módulos a Desarrollar/Actualizar:
1. **Módulo de Gestión de Vetos (`src/lib/vetos.ts` o hook `useVetos.ts`)**:
   - Funciones puras y reactivas:
     - `getVetosColaborador(idColaborador: number): VetoRegistro[]`
     - `hasVetoColaborador(idColaborador: number, idActivo: number): boolean`
     - `registrarVeto(veto: VetoRegistro): void`
   - Persistencia determinística vinculada al colaborador (`localStorage` + backend).
2. **Hook de Ofertas (`src/hooks/useOfertas.ts`)**:
   - Incorporar método `cancelarOferta(idOferta: number, idActivo: number): Promise<RpcResponse>`.
   - Validar estado de la subasta antes de procesar el retiro.
   - Disparar `registrarVeto` y refrescar lista de ofertas.
3. **Página de Mis Ofertas (`src/pages/MisOfertasPage.tsx`)**:
   - Agregar columna de Acciones en la tabla con botón "Cancelar Oferta".
   - Deshabilitar si la subasta expiró (`useCountdown().isExpired`).
   - Modal institucional `ModalCancelarOferta` con advertencia de veto permanente.
   - Sección de "Historial de Posturas Canceladas" mostrando los activos vetados.
4. **Catálogo y Modal de Ofertas (`ActivoCard.tsx` y `OfertaModal.tsx`)**:
   - Detectar si el usuario posee veto en el activo.
   - Si tiene veto, mostrar botón deshabilitado *"Oferta cancelada (Veto)"*.
   - Modal de oferta bloqueado con mensaje de veto permanente si se intenta ingresar.

---

## 2. Plan de Fases

1. **Fase 1: TDD & Contratos de Dominio**
   - Crear `tests/mis-ofertas.test.ts` cubriendo:
     - Cancelación de oferta activa y retiro del listado.
     - Imposibilidad de cancelar cuando la subasta está cerrada.
     - Registro de veto para el colaborador y activo.
     - Bloqueo de nueva postura cuando existe veto activo.
2. **Fase 2: Implementación de Lógica de Negocio y Hooks**
   - Crear `src/lib/vetos.ts`.
   - Modificar `src/hooks/useOfertas.ts` con `cancelarOferta`.
3. **Fase 3: Interfaz de Usuario e Integración**
   - Actualizar `src/pages/MisOfertasPage.tsx`.
   - Actualizar `src/components/activos/ActivoCard.tsx` y `src/components/ofertas/OfertaModal.tsx`.
4. **Fase 4: Verificación Visual y Calidad**
   - Ejecutar `npm.cmd test`, `npm.cmd run lint`, `npm.cmd run build`.
   - Verificación con `browser_subagent`.
   - Commit, merge y push a `main`.
