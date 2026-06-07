# NEXO CAPTURE

Módulo de importação de plantas e geração de arquivos SketchUp para o ERP NEXO.

## Visão Geral

Transformar plantas baixas (DWG/JSON) em arquivos SketchUp (.SKP) compatíveis com Promob Connect, automatizando a criação de paredes, portas e janelas para projetistas de móveis planejados.

## Stack

- **Backend:** Node.js + TypeScript
- **Processamento:** Ruby + SketchUp API
- **Fila:** BullMQ + Redis
- **Storage:** AWS S3
- **Banco:** PostgreSQL + Prisma
- **Frontend:** React + TypeScript

## Estrutura

```
modules/capture/
├── api/                    # REST API
│   └── routes/           # Endpoints
├── application/           # Use Cases
│   ├── services/         # Business Logic
│   └── use-cases/        # Application Logic
├── domain/               # Entities & Rules
│   ├── entities/        # Wall, Door, Window, Room
│   ├── value-objects/   # Coordinates, Dimension
│   └── interfaces/      # Contracts
├── infrastructure/       # External Integrations
│   ├── parsers/         # DXF, JSON, PDF
│   ├── generators/     # SKP Generator
│   ├── repositories/   # S3, DB
│   └── queue/          # BullMQ Jobs
├── components/          # React UI
├── database/            # Prisma Schema
├── scripts/             # Ruby Scripts (SketchUp)
└── types/               # TypeScript Types
```

## Uso Rápido

### 1. Importar via JSON

```bash
curl -X POST http://localhost:3000/api/capture/import/json \
  -H "Content-Type: application/json" \
  -d '{
    "walls": [
      { "start": [0, 0], "end": [3500, 0], "thickness": 150 },
      { "start": [3500, 0], "end": [3500, 4000], "thickness": 150 },
      { "start": [3500, 4000], "end": [0, 4000], "thickness": 150 },
      { "start": [0, 4000], "end": [0, 0], "thickness": 150 }
    ],
    "doors": [
      { "wallIndex": 0, "position": 1200, "width": 800, "height": 2100 }
    ],
    "windows": [
      { "wallIndex": 1, "position": 1800, "width": 1200, "height": 1000, "sill": 1100 }
    ],
    "projectName": "Quarto Suite"
  }'
```

**Resposta:**
```json
{
  "projectId": "uuid",
  "name": "Quarto Suite",
  "status": "validating",
  "stats": {
    "wallCount": 4,
    "doorCount": 1,
    "windowCount": 1,
    "totalArea": 14.0,
    "roomCount": 1
  }
}
```

### 2. Verificar Status

```bash
curl http://localhost:3000/api/capture/projects/{projectId}/status
```

**Resposta:**
```json
{
  "projectId": "uuid",
  "status": "completed",
  "progress": 100,
  "currentStep": "Concluído",
  "steps": [
    { "name": "upload", "label": "Enviando arquivo", "status": "completed" },
    { "name": "parse", "label": "Processando geometria", "status": "completed" },
    { "name": "validate", "label": "Validando dados", "status": "completed" },
    { "name": "generate", "label": "Gerando arquivo SketchUp", "status": "completed" },
    { "name": "export", "label": "Finalizando", "status": "completed" }
  ]
}
```

### 3. Baixar SKP

```bash
curl -O http://localhost:3000/api/capture/projects/{projectId}/skp
```

## Configuração

```env
# .env
DATABASE_URL="postgresql://..."
REDIS_URL="redis://..."
AWS_REGION="us-east-1"
AWS_S3_BUCKET="nexo-capture"

# SketchUp (requer instalado localmente)
SKETCHUP_PATH="/Applications/SketchUp 2024/SketchUp.app"
```

## Componentes React

```tsx
import { CaptureImport } from '@/modules/capture';

// Usar no App
function CapturePage() {
  return <CaptureImport />;
}
```

## Roadmap

- [x] Sprint 1: MVP Core (JSON → SKP)
- [ ] Sprint 2: Suporte DWG/DXF
- [ ] Sprint 3: AI Integration (PDF/Image)
- [ ] Sprint 4: Promob Connect

## Autor

Eduardo Silva — NEXO ERP