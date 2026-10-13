# Investigación y Decisiones de Diseño: F05 — Cancelación de Ofertas con Veto

## 1. Contexto Institucional y Constitución Agrotec

- **Principio P9:** Criterios objetivos de adjudicación y equidad.
- En la subasta corporativa, los colaboradores pueden arrepentirse de una oferta previa siempre que la subasta siga abierta.
- Sin embargo, para evitar que un colaborador manipule artificialmente el precio líder o juegue con las pujas para intimidar a otros colegas y luego retire la oferta a último momento para volver a ofertar más bajo, **la cancelación genera un veto irreversible en ese activo específico**.
- El colaborador conserva el derecho a seguir ofertando en **otros activos** de la subasta; únicamente queda inhabilitado para el activo cuya oferta canceló.

## 2. Decisiones Técnicas

1. **Retiro de Oferta en Base de Datos:**
   - La eliminación de la postura en `sub_ofertas` se realiza vía `DELETE` sobre `sub_ofertas` filtrando por `id_oferta` y validando que el colaborador coincida con la sesión activa.
   - La API de Supabase responde con `204 No Content` y actualiza inmediatamente las vistas y conteos en tiempo real.
2. **Persistencia del Veto:**
   - Para garantizar que el veto sea inmediato, confiable y persistente sin depender de migraciones DDL bloqueantes, se implementa una capa de persistencia `src/lib/vetos.ts` basada en almacenamiento tipado con clave por colaborador (`agrotec_subasta_vetos_${idColaborador}`).
   - La validación se evalúa tanto a nivel visual (`ActivoCard`), como a nivel de modal (`OfertaModal`) y en el hook `enviarOferta`.
3. **Control Temporal de Cancelación:**
   - Si la subasta ha finalizado (`countdown.isExpired === true`), la opción de cancelar se bloquea totalmente en la UI para proteger la integridad del cómputo de adjudicación.
