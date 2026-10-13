# UI Component Contracts: F01 — Base del Proyecto y Tokens de Identidad Visual Agrotec

Este documento define el contrato de props y comportamiento visual de los componentes base del sistema de diseño de Agrotec.

---

## 1. Button (`src/components/ui/Button.tsx`)

```typescript
export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost' | 'success';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
}
```

### Contrato Visual de Variantes:
- `primary`: Fondo `#1C5A34`, texto `#FFFFFF`, foco visible con anillo `#1C5A34`.
- `secondary`: Fondo `#FFFFFF`, borde `#BEBEBE`, texto `#1C5A34`, hover fondo `#E8F0EB`.
- `outline`: Fondo `#FFFFFF`, borde `#BEBEBE`, texto `#262626`.
- `danger`: Fondo `#8A2733`, texto `#FFFFFF`.

---

## 2. Badge (`src/components/ui/Badge.tsx`)

```typescript
export interface BadgeProps {
  variant?: 'agrotec' | 'success' | 'warning' | 'danger' | 'info' | 'neutral';
  size?: 'sm' | 'md';
  children: ReactNode;
  className?: string;
}
```

### Contrato Visual de Variantes:
- `agrotec`: Fondo `#E8F0EB`, texto `#1C5A34`, borde tenue.
- `success`: Fondo `#E8F0EB`, texto `#1C5A34`, borde tenue.
- `danger` / `warning`: Fondo `#F9D7E0`, texto `#8A2733`, borde tenue.
- `neutral`: Fondo `#F5F5F5`, texto `#6D6D6D`, borde `#E4E4E4`.

---

## 3. Navegación y Cabeceras

- **Header (`src/components/layout/Header.tsx`):** Fondo `#FFFFFF`, borde inferior `#E4E4E4`, borde izquierdo verde de 4 px (`#1C5A34`).
- **Sidebar (`src/components/layout/Sidebar.tsx`):** Fondo `#FFFFFF`, borde derecho `#E4E4E4`. Elemento activo con fondo `#E8F0EB`, texto `#1C5A34` y barra lateral izquierda verde de 4 px.
