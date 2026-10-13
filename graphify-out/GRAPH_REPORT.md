# Graph Report - App Subastas 2.0  (2026-09-30)

## Corpus Check
- 80 files · ~41,005 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 7 file(s) not represented in the graph (top: (none) 3, .css 2, .example 1)

## Summary
- 352 nodes · 674 edges · 32 communities (22 shown, 10 thin omitted)
- Extraction: 97% EXTRACTED · 3% INFERRED · 0% AMBIGUOUS · INFERRED: 19 edges (avg confidence: 0.84)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- lucide-react
- package.json
- App.tsx
- utils.ts
- compilerOptions
- What You Must Do When Invoked
- Design System Subasta Agrotec
- compilerOptions
- graphify reference: extra exports and benchmark
- Ponytail
- .oxlintrc.json
- Pre-Delivery Checklist
- tsconfig.json
- Oxlint
- database.ts
- dependencies
- Ponytail Help
- graphify reference: query, path, explain
- ponytail-audit/SKILL.md
- Ponytail Gain
- ponytail-review/SKILL.md
- graphify reference: add a URL and watch a folder
- graphify reference: commit hook and native CLAUDE.md integration
- graphify reference: incremental update and cluster-only
- ponytail-debt/SKILL.md
- graphify reference: GitHub clone and cross-repo merge
- graphify reference: transcribe video and audio
- CLAUDE.md
- .claude/CLAUDE.md
- extraction-spec.md

## God Nodes (most connected - your core abstractions)
1. `lucide-react` - 26 edges
2. `react` - 26 edges
3. `useAuth()` - 20 edges
4. `compilerOptions` - 18 edges
5. `Button` - 15 edges
6. `useToast()` - 15 edges
7. `cn()` - 15 edges
8. `compilerOptions` - 15 edges
9. `formatUSD()` - 13 edges
10. `react-router-dom` - 12 edges

## Surprising Connections (you probably didn't know these)
- `index.html (app shell / Vite entry)` --conceptually_related_to--> `Design System Subasta Agrotec`  [INFERRED]
  index.html → design-system/subasta-agrotec/MASTER.md
- `index.html (app shell / Vite entry)` --shares_data_with--> `Roles semanticos de color`  [INFERRED]
  index.html → design-system/subasta-agrotec/MASTER.md
- `index.html (app shell / Vite entry)` --conceptually_related_to--> `Vite`  [INFERRED]
  index.html → README.md
- `Carga de Inter (Google Fonts)` --implements--> `Tipografia Inter`  [INFERRED]
  index.html → design-system/subasta-agrotec/MASTER.md
- `src/main.tsx entry script` --conceptually_related_to--> `React`  [INFERRED]
  index.html → README.md

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Sistema de tokens de diseno (Tailwind)** — design_system_subasta_agrotec_master_tailwind_tokens, design_system_subasta_agrotec_master_semantic_colors, design_system_subasta_agrotec_master_radius_scale, design_system_subasta_agrotec_master_shadow_scale [INFERRED 0.75]
- **Bootstrap de la app Vite + React** — index_app_shell, index_main_tsx, index_root, readme_react [INFERRED 0.75]

## Communities (32 total, 10 thin omitted)

### Community 0 - "lucide-react"
Cohesion: 0.10
Nodes (45): lucide-react, papaparse, react, ActivoCard(), ActivoCardProps, ActivoForm(), ActivoFormProps, CatalogoGridProps (+37 more)

### Community 1 - "package.json"
Cohesion: 0.05
Nodes (38): devDependencies, autoprefixer, oxlint, postcss, tailwindcss, @types/node, @types/papaparse, @types/react (+30 more)

### Community 2 - "App.tsx"
Cohesion: 0.09
Nodes (32): react-router-dom, CatalogoGrid(), ColaboradoresList(), AdminRoute(), Header(), HeaderProps, Layout(), ProtectedRoute() (+24 more)

### Community 3 - "utils.ts"
Cohesion: 0.23
Nodes (9): ConfigSubasta(), Sidebar(), SidebarProps, CountdownState, useCountdown(), supabase, formatCountdown(), formatFechaAsuncion() (+1 more)

### Community 4 - "compilerOptions"
Cohesion: 0.10
Nodes (19): compilerOptions, allowArbitraryExtensions, allowImportingTsExtensions, erasableSyntaxOnly, jsx, lib, module, moduleDetection (+11 more)

### Community 5 - "What You Must Do When Invoked"
Cohesion: 0.08
Nodes (24): For /graphify add and --watch, For /graphify query, For the commit hook and native CLAUDE.md integration, For --update and --cluster-only, /graphify, Honesty Rules, Interpreter guard for subcommands, Part A - Structural extraction for code files (+16 more)

### Community 6 - "Design System Subasta Agrotec"
Cohesion: 0.15
Nodes (17): Paleta de marca Agrotec, Reglas de componente (a11y), Design System Subasta Agrotec, Tipografia Inter, Escala de radios, Roles semanticos de color, Escala de sombras, Minimalism & Swiss Style (+9 more)

### Community 7 - "compilerOptions"
Cohesion: 0.12
Nodes (16): compilerOptions, allowImportingTsExtensions, erasableSyntaxOnly, lib, module, moduleDetection, noEmit, noFallthroughCasesInSwitch (+8 more)

### Community 8 - "graphify reference: extra exports and benchmark"
Cohesion: 0.22
Nodes (8): graphify reference: extra exports and benchmark, Step 6b - Wiki (only if --wiki flag), Step 7 - Neo4j export (only if --neo4j or --neo4j-push flag), Step 7a - FalkorDB export (only if --falkordb or --falkordb-push flag), Step 7b - SVG export (only if --svg flag), Step 7c - GraphML export (only if --graphml flag), Step 7d - MCP server (only if --mcp flag), Step 8 - Token reduction benchmark (only if total_words > 5000)

### Community 9 - "Ponytail"
Cohesion: 0.22
Nodes (8): Boundaries, Intensity, Output, Persistence, Ponytail, Rules, The ladder, When NOT to be lazy

### Community 10 - ".oxlintrc.json"
Cohesion: 0.33
Nodes (5): plugins, rules, react/only-export-components, react/rules-of-hooks, $schema

### Community 11 - "Pre-Delivery Checklist"
Cohesion: 0.67
Nodes (3): Anti-patterns, Pre-Delivery Checklist, Motion (transiciones)

### Community 17 - "dependencies"
Cohesion: 0.22
Nodes (9): dependencies, date-fns, date-fns-tz, lucide-react, papaparse, react, react-dom, react-router-dom (+1 more)

### Community 18 - "Ponytail Help"
Cohesion: 0.25
Nodes (7): Configure Default Mode, Deactivate, Levels, More, Ponytail Help, Skills, Update

### Community 19 - "graphify reference: query, path, explain"
Cohesion: 0.33
Nodes (5): For /graphify explain, For /graphify path, graphify reference: query, path, explain, Step 0 — Constrained query expansion (REQUIRED before traversal), Step 1 — Traversal

### Community 20 - "ponytail-audit/SKILL.md"
Cohesion: 0.40
Nodes (4): Boundaries, Hunt, Output, Tags

### Community 21 - "Ponytail Gain"
Cohesion: 0.40
Nodes (4): Boundaries, Honesty boundary, Ponytail Gain, Scoreboard

### Community 22 - "ponytail-review/SKILL.md"
Cohesion: 0.40
Nodes (4): Boundaries, Examples, Format, Scoring

### Community 23 - "graphify reference: add a URL and watch a folder"
Cohesion: 0.50
Nodes (3): For /graphify add, For --watch, graphify reference: add a URL and watch a folder

### Community 24 - "graphify reference: commit hook and native CLAUDE.md integration"
Cohesion: 0.50
Nodes (3): For git commit hook, For native CLAUDE.md integration, graphify reference: commit hook and native CLAUDE.md integration

### Community 25 - "graphify reference: incremental update and cluster-only"
Cohesion: 0.50
Nodes (3): For --cluster-only, For --update (incremental re-extraction), graphify reference: incremental update and cluster-only

### Community 26 - "ponytail-debt/SKILL.md"
Cohesion: 0.50
Nodes (3): Boundaries, Output, Scan

## Knowledge Gaps
- **174 isolated node(s):** `$schema`, `plugins`, `react/rules-of-hooks`, `react/only-export-components`, `name` (+169 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 199 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **10 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `lucide-react` to `package.json`, `App.tsx`, `utils.ts`?**
  _High betweenness centrality (0.049) - this node is a cross-community bridge._
- **Why does `lucide-react` connect `lucide-react` to `package.json`, `App.tsx`, `utils.ts`?**
  _High betweenness centrality (0.042) - this node is a cross-community bridge._
- **What connects `$schema`, `plugins`, `react/rules-of-hooks` to the rest of the system?**
  _174 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `lucide-react` be split into smaller, more focused modules?**
  _Cohesion score 0.0979020979020979 - nodes in this community are weakly interconnected._
- **Should `package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.05 - nodes in this community are weakly interconnected._
- **Should `App.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.08985507246376812 - nodes in this community are weakly interconnected._
- **Should `compilerOptions` be split into smaller, more focused modules?**
  _Cohesion score 0.1 - nodes in this community are weakly interconnected._