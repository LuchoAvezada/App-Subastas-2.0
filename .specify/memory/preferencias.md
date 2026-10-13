# Memoria de Preferencias — App Subastas 2.0

## Idioma y Comunicación
- **Idioma exclusivo:** Español siempre (respuestas, avisos de progreso, preguntas y opciones). Solo identificadores de código, comandos, rutas y citas literales en inglés.
- **Formato de cierre de tarea:** Exactamente tres puntos concisos:
  1. Qué cambió
  2. Qué se comprobó
  3. Qué tengo que hacer yo
- **Ritmo:** Avance rápido de punta a punta en cada feature sin pedir aprobación en cada micro-paso.
- **Interrupciones mínimas:** Solo preguntar cuando se requiere decisión de alcance/negocio, bloqueo real o acción externa irreversible.
- **Formato de preguntas:** Siempre ofrecer opciones estructuradas con una recomendada.
- **Rigor:** No inventar requisitos; las dudas se documentan como preguntas abiertas (**Q-xx**) en `docs/sdd/preguntas-abiertas.md`.

## Identidad Visual y Guía de Marca Agrotec
- **Tokens centralizados:** Un solo archivo fuente de verdad (`src/marca-agrotec.css` / CSS del framework). Ningún componente define colores, fuentes o radios sueltos.
- **Colores principales:**
  - Verde oscuro `#1C5A34`: botones primarios, enlaces activos, titulares, iconos destacados.
  - Rojo `#8A2733`: eyebrows, insignias, alertas, acentos mínimos.
- **Neutros y Fondos:** Fondos blancos o `#F5F5F5`. Tarjetas blancas con borde `#E4E4E4`, sin sombras pesadas, sin degradados oscuros.
- **Tipografía:** Gabarito (400 Regular y 700 Bold, SIL OFL 1.1) con respaldo `Segoe UI, Arial, sans-serif`.
- **Escala de diseño:** Múltiplos de 4 en espaciados, fuentes y bordes.
- **Accesibilidad:** Contraste mínimo AA y foco visible en controles interactivos.

## Región y Datos
- **Localización:** `es-PY`, zona horaria `America/Asuncion` para vista/cálculos, UTC para base de datos.
- **Moneda:** USD por defecto.
- **Privacidad:** Datos personales mínimos, cero datos personales reales en repositorios o seeds.
