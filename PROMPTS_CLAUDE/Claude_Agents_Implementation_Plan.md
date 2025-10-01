# Plan de Implementación: PDF Import con Claude Code Agents

**Fecha:** 2025-10-01
**Branch:** `experimental/claude-agents`
**Objetivo:** Permitir la importación de extractos bancarios en PDF (Santander y Revolut) usando Claude Code Agents

---

## 📋 Resumen Ejecutivo

### Problema Original
Los usuarios tienen extractos bancarios en PDF que no pueden importar directamente a Actual Budget. Actualmente solo se soportan formatos como OFX, QIF, CSV, etc.

### Solución Propuesta
Integrar **Claude Code Agents** para automatizar la extracción de transacciones desde PDFs de bancos españoles (Santander y Revolut).

### ¿Por qué Claude Code Agents en lugar de Mastra?
El experimento anterior con Mastra falló por:
- ❌ Agente corría en proceso separado → problemas de filesystem
- ❌ Herramientas (tools) no se llamaban de forma confiable
- ❌ Errores de compatibilidad con modelos (V2 models)
- ❌ Timeouts con prompts grandes
- ❌ Arquitectura compleja con múltiples puntos de falla

**Claude Code Agents ofrece:**
- ✅ Agente corre en el mismo proceso que el backend
- ✅ Acceso directo al filesystem (Read, Write, Glob, Grep, etc.)
- ✅ Tools confiables y bien probadas
- ✅ Arquitectura simple con 1 punto de invocación
- ✅ Mejor debugging y manejo de errores
- ✅ Sin dependencias externas complejas

---

## 🏗️ Arquitectura Propuesta

### Flujo de Datos Completo

```
┌─────────────────────────────────────────────────────────────────────┐
│                         USUARIO                                     │
│  Selecciona PDF → Actual Budget UI                                 │
└────────────────────────────┬────────────────────────────────────────┘
                             │ PDF (base64)
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    FRONTEND (React)                                 │
│  - ImportTransactionsModal.tsx                                      │
│  - Account.tsx                                                      │
│  - Valida formato PDF                                               │
│  - Muestra loading state                                            │
└────────────────────────────┬────────────────────────────────────────┘
                             │ parseTransactionsFile('file.pdf', base64)
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│                  BACKEND - loot-core                                │
│  parse-file.ts                                                      │
│    └─ case '.pdf': return parsePDF(filepath)                       │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│                  pdf-adapter.ts (NUEVO)                             │
│  1. Guarda PDF temporal en: /tmp/actual-pdf-import-{uuid}.pdf      │
│  2. Invoca Claude Code Agent con Task tool                         │
│  3. Espera respuesta estructurada del agente                       │
│  4. Parsea JSON → Array de transacciones                           │
│  5. Limpia archivo temporal                                         │
│  6. Retorna: { errors[], transactions[] }                          │
└────────────────────────────┬────────────────────────────────────────┘
                             │ Task tool invocation
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│            CLAUDE CODE AGENT (general-purpose)                      │
│  Prompt:                                                            │
│    "Extract all transactions from this Spanish bank PDF:           │
│     {filepath}                                                      │
│                                                                     │
│     Expected banks: Santander or Revolut                           │
│     Return JSON with: bankName, accountNumber, transactions[]"     │
│                                                                     │
│  El agente tiene acceso a:                                          │
│    - Read: Leer el PDF (via pdf-parse o similar)                   │
│    - Grep: Buscar patrones en texto extraído                       │
│    - Tools propias de Claude Code                                   │
│                                                                     │
│  Proceso del agente:                                                │
│    1. Lee el PDF con Read tool                                     │
│    2. Extrae texto con pdf-parse                                   │
│    3. Identifica banco (Santander vs Revolut)                      │
│    4. Parsea transacciones con regex/patterns                      │
│    5. Estructura datos en JSON                                     │
│    6. Retorna resultado final                                      │
└────────────────────────────┬────────────────────────────────────────┘
                             │ Returns JSON
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     RESPUESTA                                       │
│  {                                                                  │
│    "bankName": "Revolut",                                           │
│    "accountNumber": "ES76...",                                      │
│    "transactions": [                                                │
│      {                                                              │
│        "date": "2025-09-15",                                        │
│        "description": "Amazon Prime",                               │
│        "amount": -8.99,                                             │
│        "balance": 1234.56                                           │
│      }                                                              │
│    ]                                                                │
│  }                                                                  │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    FRONTEND (React)                                 │
│  - Muestra preview de transacciones                                │
│  - Usuario confirma importación                                    │
│  - Transacciones se añaden a cuenta                                │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 🔧 Implementación Técnica Detallada

### 1. Modificaciones en Frontend

#### **Account.tsx** (línea ~590)
```typescript
// Agregar 'pdf' a extensiones permitidas
const res = await window.Actual.openFileDialog({
  filters: [
    {
      name: t('Financial files'),
      extensions: ['qif', 'ofx', 'qfx', 'csv', 'tsv', 'xml', 'pdf'], // ← NUEVO
    },
  ],
});
```

#### **ImportTransactionsModal.tsx** (línea ~515)
```typescript
// Agregar 'pdf' a extensiones permitidas
const res = await window.Actual.openFileDialog({
  filters: [
    {
      name: 'Financial Files',
      extensions: ['qif', 'ofx', 'qfx', 'csv', 'tsv', 'xml', 'pdf'], // ← NUEVO
    },
  ],
});
```

**Loading State para PDFs:**
```typescript
// Mostrar mensaje especial para PDFs (procesamiento más lento)
if (fileType === 'pdf') {
  setLoadingMessage('Extracting transactions from PDF with AI agent... This may take 30-60 seconds.');
}
```

---

### 2. Backend - parse-file.ts

**Archivo:** `packages/loot-core/src/server/transactions/import/parse-file.ts`

```typescript
import { parsePDF } from './pdf-adapter';

export async function parseFile(filepath, options) {
  // ... código existente ...

  const ext = filepath.slice(filepath.lastIndexOf('.')).toLowerCase();

  switch (ext) {
    case '.qif':
      return parseQIF(filepath);
    case '.csv':
    case '.tsv':
      return parseCSV(filepath, options);
    case '.ofx':
    case '.qfx':
      return parseOFX(filepath, options);
    case '.xml':
      return parseCAMT(filepath, options);
    case '.pdf':  // ← NUEVO
      return parsePDF(filepath);
    default:
      errors.push({
        message: 'Invalid file type',
        internal: '',
      });
  }

  return { errors, transactions: [] };
}
```

---

### 3. Backend - pdf-adapter.ts (NUEVO ARCHIVO)

**Archivo:** `packages/loot-core/src/server/transactions/import/pdf-adapter.ts`

```typescript
// @ts-strict-ignore
import * as fs from '../../../platform/server/fs';
import { logger } from '../../../platform/server/log';
import type { ParseFileResult } from './parse-file';

/**
 * PDF Adapter - Integrates Claude Code Agent for PDF transaction extraction
 *
 * Architecture:
 * 1. Save PDF to temp file
 * 2. Invoke Claude Code Agent via Task tool
 * 3. Agent reads PDF, identifies bank, extracts transactions
 * 4. Parse agent's JSON response
 * 5. Map to Actual Budget transaction format
 * 6. Clean up temp file
 */

type ClaudeAgentResponse = {
  bankName: string;
  accountNumber?: string;
  transactions: Array<{
    date: string;        // YYYY-MM-DD
    description: string;
    amount: number;      // negative for expenses, positive for income
    balance?: number;
  }>;
  success: boolean;
  error?: string;
};

/**
 * Invokes Claude Code Agent to extract transactions from PDF
 *
 * Uses the Task tool with general-purpose agent type.
 * The agent will have access to Read, Grep, and other filesystem tools.
 */
async function invokeClaudeAgent(pdfPath: string): Promise<ClaudeAgentResponse> {
  logger.info('[PDF Adapter] Invoking Claude Code Agent for:', pdfPath);

  const prompt = `
You are a Spanish bank statement parser. Extract ALL transactions from this PDF:
${pdfPath}

This PDF is from either Santander España or Revolut España.

Your task:
1. Read the PDF file using the Read tool (you may need to use pdf-parse library)
2. Identify which bank it is from (Santander or Revolut)
3. Extract ALL transactions with:
   - Date (format: YYYY-MM-DD)
   - Description/Payee
   - Amount (negative for expenses, positive for income)
   - Balance (if available)
4. Return ONLY a valid JSON object with this exact structure:

{
  "bankName": "Santander" or "Revolut",
  "accountNumber": "ES76..." (if found),
  "transactions": [
    {
      "date": "2025-09-15",
      "description": "Amazon Prime",
      "amount": -8.99,
      "balance": 1234.56
    }
  ],
  "success": true
}

IMPORTANT:
- Return ONLY the JSON object, no markdown, no code blocks
- Process ALL pages of the PDF
- Amounts: negative for expenses, positive for income
- Dates must be in YYYY-MM-DD format
- If there's an error, return: { "success": false, "error": "error message" }
`;

  // This is a placeholder - the actual implementation will use the Task tool
  // which is only available within Claude Code's execution context
  throw new Error(
    'Claude Code Agent invocation not implemented yet. ' +
    'This requires integration with Claude Code Task tool API.'
  );
}

/**
 * Main entry point: Parse PDF file and extract transactions
 */
export async function parsePDF(filepath: string): Promise<ParseFileResult> {
  logger.info('[PDF Adapter] Starting PDF parse for:', filepath);

  const errors: { message: string; internal: string }[] = [];

  try {
    // Step 1: Read PDF file
    const pdfBuffer = await fs.readFile(filepath, 'binary');
    if (!pdfBuffer || pdfBuffer.length === 0) {
      throw new Error('PDF file is empty or could not be read');
    }

    logger.info('[PDF Adapter] PDF file read successfully, size:', pdfBuffer.length);

    // Step 2: Save to temp location (if needed for agent)
    // The agent will have access to the original filepath

    // Step 3: Invoke Claude Code Agent
    const agentResponse = await invokeClaudeAgent(filepath);

    // Step 4: Validate response
    if (!agentResponse.success) {
      throw new Error(agentResponse.error || 'Agent failed to extract transactions');
    }

    if (!Array.isArray(agentResponse.transactions)) {
      throw new Error('Agent response missing transactions array');
    }

    logger.info(
      '[PDF Adapter] Agent extracted transactions:',
      agentResponse.transactions.length,
      'from bank:',
      agentResponse.bankName
    );

    // Step 5: Map to Actual Budget transaction format
    const transactions = agentResponse.transactions
      .filter(t => t.date && typeof t.amount === 'number')
      .map(t => ({
        amount: t.amount,
        date: t.date,
        payee_name: t.description || null,
        imported_payee: t.description || null,
        notes: agentResponse.accountNumber
          ? `Imported from ${agentResponse.bankName} (${agentResponse.accountNumber})`
          : `Imported from ${agentResponse.bankName}`,
      }));

    logger.info('[PDF Adapter] Successfully parsed', transactions.length, 'transactions');

    return { errors, transactions };

  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    logger.error('[PDF Adapter] Error parsing PDF:', errorMsg);

    errors.push({
      message: 'Failed to extract transactions from PDF',
      internal: errorMsg,
    });

    return { errors, transactions: [] };
  }
}
```

---

### 4. Integración con Claude Code Agent

**El desafío:** Claude Code Agents solo están disponibles dentro del contexto de ejecución de Claude Code (cuando Claude ejecuta código en tu máquina).

**Solución propuesta (3 opciones):**

#### **Opción A: Claude Code Extension API (Recomendada)**

Crear una extensión/API que exponga el Task tool para que el backend de Actual Budget pueda invocarlo:

```typescript
// Pseudo-código de la integración
import { ClaudeCodeTaskAPI } from '@claude-code/api'; // Hipotético

async function invokeClaudeAgent(pdfPath: string): Promise<ClaudeAgentResponse> {
  const result = await ClaudeCodeTaskAPI.runTask({
    type: 'general-purpose',
    prompt: `Extract transactions from PDF: ${pdfPath} ...`,
    timeout: 60000, // 60 segundos
  });

  return JSON.parse(result.output);
}
```

#### **Opción B: HTTP Bridge**

Crear un pequeño servidor HTTP que actúe como puente:

```
Backend → HTTP Request → Claude Code Bridge → Task Tool → Agent → Response
```

```typescript
async function invokeClaudeAgent(pdfPath: string): Promise<ClaudeAgentResponse> {
  const response = await fetch('http://localhost:9999/claude-agent/extract-pdf', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pdfPath }),
  });

  return response.json();
}
```

#### **Opción C: Simplified Approach - Direct Implementation**

En lugar de usar el Task tool, implementar la lógica de extracción directamente en el backend usando las mismas librerías que usaría el agente:

```typescript
import pdfParse from 'pdf-parse';

async function parsePDFDirect(filepath: string): Promise<ClaudeAgentResponse> {
  const pdfBuffer = await fs.readFile(filepath, 'binary');
  const pdfData = await pdfParse(pdfBuffer);
  const text = pdfData.text;

  // Identificar banco
  const isSantander = text.includes('Santander') || text.includes('SANTANDER');
  const isRevolut = text.includes('Revolut') || text.includes('REVOLUT');

  // Parsear transacciones con regex específicos para cada banco
  const transactions = isSantander
    ? parseSantanderTransactions(text)
    : parseRevolutTransactions(text);

  return {
    bankName: isSantander ? 'Santander' : 'Revolut',
    transactions,
    success: true,
  };
}
```

**Recomendación:** Empezar con **Opción C** (más simple, sin dependencias externas), y si se necesita más flexibilidad, migrar a **Opción A o B**.

---

## 📦 Dependencias Necesarias

```json
{
  "dependencies": {
    "pdf-parse": "^1.1.1"  // Para extraer texto de PDFs
  }
}
```

**Instalación:**
```bash
cd packages/loot-core
yarn add pdf-parse
```

---

## 🧪 Testing Strategy

### Unit Tests (pdf-adapter.test.ts)

```typescript
describe('PDF Adapter', () => {
  it('should extract Santander transactions', async () => {
    const result = await parsePDF('./test-data/santander-sample.pdf');
    expect(result.errors).toHaveLength(0);
    expect(result.transactions.length).toBeGreaterThan(0);
    expect(result.transactions[0]).toHaveProperty('date');
    expect(result.transactions[0]).toHaveProperty('amount');
  });

  it('should extract Revolut transactions', async () => {
    const result = await parsePDF('./test-data/revolut-sample.pdf');
    expect(result.errors).toHaveLength(0);
    expect(result.transactions.length).toBeGreaterThan(0);
  });

  it('should handle corrupted PDFs gracefully', async () => {
    const result = await parsePDF('./test-data/corrupted.pdf');
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.transactions).toHaveLength(0);
  });
});
```

### Integration Tests

1. **Manual Testing:** Subir PDFs reales de Santander y Revolut
2. **Visual Testing:** Verificar que transacciones se muestran correctamente en UI
3. **Error Handling:** Probar PDFs inválidos, vacíos, de otros bancos

---

## 🚀 Plan de Implementación (Fases)

### **Fase 1: Setup Básico** (1-2 horas)
- [ ] Crear `pdf-adapter.ts` con estructura básica
- [ ] Agregar case `.pdf` en `parse-file.ts`
- [ ] Agregar `'pdf'` a extensiones en UI (Account.tsx, ImportTransactionsModal.tsx)
- [ ] Instalar dependencia `pdf-parse`
- [ ] Commit: "feat: Add basic PDF import structure"

### **Fase 2: Implementación Direct Parsing (Opción C)** (2-3 horas)
- [ ] Implementar `parseSantanderTransactions(text)` con regex
- [ ] Implementar `parseRevolutTransactions(text)` con regex
- [ ] Agregar logging comprehensivo
- [ ] Testing manual con PDFs reales
- [ ] Commit: "feat: Implement direct PDF parsing for Santander and Revolut"

### **Fase 3: Refinamiento** (1-2 horas)
- [ ] Mejorar regex patterns basado en PDFs reales
- [ ] Agregar manejo de errores robusto
- [ ] Agregar validación de fechas y montos
- [ ] Mejorar mensajes de error para usuarios
- [ ] Commit: "fix: Improve PDF parsing accuracy and error handling"

### **Fase 4: Testing y Pulido** (1 hora)
- [ ] Crear unit tests
- [ ] Testing con múltiples PDFs de cada banco
- [ ] Verificar edge cases (PDFs vacíos, fechas inválidas, etc.)
- [ ] Documentación en CLAUDE.md
- [ ] Commit: "test: Add unit tests for PDF adapter"

### **Fase 5 (Opcional): Migración a Claude Agent** (2-3 horas)
Si se decide usar Claude Code Agent en lugar de parsing directo:
- [ ] Implementar HTTP Bridge (Opción B)
- [ ] O investigar Claude Code Extension API (Opción A)
- [ ] Migrar lógica de parsing a prompts del agente
- [ ] Testing comparativo (direct vs agent)

---

## 📊 Ventajas vs Desventajas

### ✅ Ventajas de Direct Parsing (Opción C)

| Ventaja | Descripción |
|---------|-------------|
| **Simplicidad** | No requiere agentes externos, HTTP bridges, ni procesos adicionales |
| **Velocidad** | Parsing instantáneo (~1-2 segundos) |
| **Confiabilidad** | Sin dependencias de APIs externas o modelos LLM |
| **Debugging** | Fácil de debuggear con logs y breakpoints |
| **Costo** | Gratis (no usa tokens de Claude API) |
| **Offline** | Funciona sin conexión a internet |

### ⚠️ Desventajas de Direct Parsing

| Desventaja | Descripción |
|------------|-------------|
| **Mantenimiento** | Regex patterns requieren actualizaciones si bancos cambian formato |
| **Escalabilidad** | Agregar nuevos bancos requiere escribir nuevos parsers manualmente |
| **Robustez** | Puede fallar con formatos inesperados o variaciones en PDFs |

### ✅ Ventajas de Claude Agent (Opciones A/B)

| Ventaja | Descripción |
|---------|-------------|
| **Flexibilidad** | El agente se adapta a cambios en formatos automáticamente |
| **Escalabilidad** | Agregar nuevos bancos solo requiere actualizar el prompt |
| **Robustez** | Maneja variaciones y edge cases mejor que regex |
| **Inteligencia** | Puede inferir contexto (ej: "pago en cuotas") |

### ⚠️ Desventajas de Claude Agent

| Desventaja | Descripción |
|------------|-------------|
| **Complejidad** | Requiere infraestructura adicional (HTTP bridge o API) |
| **Velocidad** | Más lento (~30-60 segundos por PDF) |
| **Costo** | Usa tokens de Claude API (puede ser costoso con muchos PDFs) |
| **Dependencia** | Requiere conexión a internet y disponibilidad de API |

---

## 🎯 Recomendación Final

### **Approach Recomendado: Hybrid**

1. **Empezar con Direct Parsing (Opción C)**
   - Implementación rápida y simple
   - Suficiente para el 80% de los casos
   - Sin dependencias externas complejas

2. **Agregar Claude Agent como Fallback (Futuro)**
   - Si el parsing directo falla o confianza es baja
   - Usar el agente como "segundo intento"
   - Solo para casos complejos o formatos nuevos

**Flujo Híbrido:**
```
PDF → Direct Parser → ¿Éxito? → Sí → Return transactions
                    → No → Invoke Claude Agent → Return transactions
```

Esto combina lo mejor de ambos mundos:
- ✅ Rápido y confiable para casos comunes
- ✅ Robusto con fallback inteligente
- ✅ Escalable a largo plazo

---

## 📝 Próximos Pasos Inmediatos

1. **Validar el plan** con el equipo/stakeholders
2. **Conseguir PDFs de muestra** de Santander y Revolut para testing
3. **Empezar Fase 1:** Setup básico de la estructura
4. **Iterar rápidamente** con PDFs reales

---

## 🔗 Referencias

- [PDF Parse Library](https://www.npmjs.com/package/pdf-parse)
- [Actual Budget Import Flow](https://github.com/actualbudget/actual/blob/master/packages/loot-core/src/server/transactions/import/)
- [Claude Code Task Tool Documentation](https://docs.claude.com/claude-code)

---

**¿Preguntas o ajustes al plan?** 🚀
