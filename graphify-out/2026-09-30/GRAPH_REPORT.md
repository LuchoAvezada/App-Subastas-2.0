# Graph Report - App Subastas 2.0  (2026-09-25)

## Corpus Check
- Corpus is ~40,069 words - fits in a single context window. You may not need a graph.

## Summary
- 247 nodes · 570 edges · 17 communities (12 shown, 5 thin omitted)
- Extraction: 97% EXTRACTED · 3% INFERRED · 0% AMBIGUOUS · INFERRED: 19 edges (avg confidence: 0.84)
- Token cost: 76,364 input · 0 output

## Community Hubs (Navigation)
- Componentes de Administracion
- Dependencias del Proyecto
- Enrutamiento y Layout
- Tarjetas de Activos y Badges
- Config TypeScript (app)
- Autenticacion y Dominio
- Design System Agrotec
- Config TypeScript (node)
- Dependencias de Desarrollo
- Catalogo y Props de Componentes
- Configuracion Oxlint
- Guias de Diseno (Checklist/Motion)
- Config TypeScript (raiz)
- Herramientas Oxlint/TypeScript
- Tipos de Base de Datos

## God Nodes (most connected - your core abstractions)
1. `lucide-react` - 25 edges
2. `react` - 25 edges
3. `useAuth()` - 20 edges
4. `compilerOptions` - 18 edges
5. `cn()` - 15 edges
6. `compilerOptions` - 15 edges
7. `Button` - 14 edges
8. `useToast()` - 13 edges
9. `formatUSD()` - 13 edges
10. `react-router-dom` - 12 edges

## Surprising Connections (you probably didn't know these)
- `src/main.tsx entry script` --conceptually_related_to--> `React`  [INFERRED]
  index.html → README.md
- `index.html (app shell / Vite entry)` --conceptually_related_to--> `Vite`  [INFERRED]
  index.html → README.md
- `index.html (app shell / Vite entry)` --conceptually_related_to--> `Design System Subasta Agrotec`  [INFERRED]
  index.html → design-system/subasta-agrotec/MASTER.md
- `Carga de Inter (Google Fonts)` --implements--> `Tipografia Inter`  [INFERRED]
  index.html → design-system/subasta-agrotec/MASTER.md
- `index.html (app shell / Vite entry)` --shares_data_with--> `Roles semanticos de color`  [INFERRED]
  index.html → design-system/subasta-agrotec/MASTER.md

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Bootstrap de la app Vite + React** — index_app_shell, index_main_tsx, index_root, readme_react [INFERRED 0.75]
- **Sistema de tokens de diseno (Tailwind)** — design_system_subasta_agrotec_master_tailwind_tokens, design_system_subasta_agrotec_master_semantic_colors, design_system_subasta_agrotec_master_radius_scale, design_system_subasta_agrotec_master_shadow_scale [INFERRED 0.75]

## Communities (17 total, 5 thin omitted)

### Community 0 - "Componentes de Administracion"
Cohesion: 0.16
Nodes (28): lucide-react, papaparse, react, ActivoForm(), ColaboradoresList(), OfertaModal(), PanelEvaluacion(), Button (+20 more)

### Community 1 - "Dependencias del Proyecto"
Cohesion: 0.06
Nodes (33): dependencies, date-fns, date-fns-tz, lucide-react, papaparse, react, react-dom, react-router-dom (+25 more)

### Community 2 - "Enrutamiento y Layout"
Cohesion: 0.15
Nodes (19): react-router-dom, AdminRoute(), Header(), HeaderProps, Layout(), ProtectedRoute(), Sidebar(), SidebarProps (+11 more)

### Community 3 - "Tarjetas de Activos y Badges"
Cohesion: 0.14
Nodes (14): date-fns, date-fns-tz, ActivoCard(), ConfigSubasta(), Badge(), BadgeProps, EstadoBadge(), CountdownState (+6 more)

### Community 4 - "Config TypeScript (app)"
Cohesion: 0.10
Nodes (19): compilerOptions, allowArbitraryExtensions, allowImportingTsExtensions, erasableSyntaxOnly, jsx, lib, module, moduleDetection (+11 more)

### Community 5 - "Autenticacion y Dominio"
Cohesion: 0.14
Nodes (15): AuthContext, AuthContextType, AuthProvider(), AppConfig, Cargo, Categoria, CATEGORIA_MAP, CategoriaSlug (+7 more)

### Community 6 - "Design System Agrotec"
Cohesion: 0.15
Nodes (17): Paleta de marca Agrotec, Reglas de componente (a11y), Design System Subasta Agrotec, Tipografia Inter, Escala de radios, Roles semanticos de color, Escala de sombras, Minimalism & Swiss Style (+9 more)

### Community 7 - "Config TypeScript (node)"
Cohesion: 0.12
Nodes (16): compilerOptions, allowImportingTsExtensions, erasableSyntaxOnly, lib, module, moduleDetection, noEmit, noFallthroughCasesInSwitch (+8 more)

### Community 8 - "Dependencias de Desarrollo"
Cohesion: 0.17
Nodes (12): devDependencies, autoprefixer, oxlint, postcss, tailwindcss, @types/node, @types/papaparse, @types/react (+4 more)

### Community 9 - "Catalogo y Props de Componentes"
Cohesion: 0.24
Nodes (8): ActivoCardProps, ActivoFormProps, CatalogoGrid(), CatalogoGridProps, OfertaModalProps, EmptyState(), EmptyStateProps, Activo

### Community 10 - "Configuracion Oxlint"
Cohesion: 0.33
Nodes (5): plugins, rules, react/only-export-components, react/rules-of-hooks, $schema

### Community 11 - "Guias de Diseno (Checklist/Motion)"
Cohesion: 0.67
Nodes (3): Anti-patterns, Pre-Delivery Checklist, Motion (transiciones)

## Knowledge Gaps
- **103 isolated node(s):** `$schema`, `plugins`, `react/rules-of-hooks`, `react/only-export-components`, `name` (+98 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 114 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **5 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `Componentes de Administracion` to `Dependencias del Proyecto`, `Enrutamiento y Layout`, `Tarjetas de Activos y Badges`, `Autenticacion y Dominio`, `Catalogo y Props de Componentes`?**
  _High betweenness centrality (0.092) - this node is a cross-community bridge._
- **Why does `lucide-react` connect `Componentes de Administracion` to `Dependencias del Proyecto`, `Enrutamiento y Layout`, `Tarjetas de Activos y Badges`, `Catalogo y Props de Componentes`?**
  _High betweenness centrality (0.079) - this node is a cross-community bridge._
- **Why does `devDependencies` connect `Dependencias de Desarrollo` to `Dependencias del Proyecto`?**
  _High betweenness centrality (0.061) - this node is a cross-community bridge._
- **What connects `$schema`, `plugins`, `react/rules-of-hooks` to the rest of the system?**
  _103 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Dependencias del Proyecto` be split into smaller, more focused modules?**
  _Cohesion score 0.05714285714285714 - nodes in this community are weakly interconnected._
- **Should `Tarjetas de Activos y Badges` be split into smaller, more focused modules?**
  _Cohesion score 0.13852813852813853 - nodes in this community are weakly interconnected._
- **Should `Config TypeScript (app)` be split into smaller, more focused modules?**
  _Cohesion score 0.1 - nodes in this community are weakly interconnected._