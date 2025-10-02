/**
 * ANTHROPIC AGENT SERVER
 *
 * Agent-based PDF Processing for Bank Statements
 * Architecture based on: https://www.anthropic.com/engineering/building-effective-agents
 *
 * Flow:
 * 1. Actual Budget uploads PDF → POST /api/process-pdf
 * 2. Agent reads PDF and extracts transactions using tools
 * 3. Agent curates Payee names and suggests Categories
 * 4. Returns structured JSON to Actual Budget
 */

require('dotenv').config({ path: '../.env' });
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const Anthropic = require('@anthropic-ai/sdk');
const fs = require('fs').promises;
const path = require('path');

const app = express();
const PORT = 4000;

// Configure multer for file uploads
const upload = multer({
  dest: 'uploads/',
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// Middleware
app.use(cors());
app.use(express.json());

// Initialize Anthropic client
const anthropic = new Anthropic({
  apiKey: process.env.VITE_ANTHROPIC_API_KEY,
});

console.log('🤖 Anthropic Agent Server starting...');
console.log(`📡 API Key configured: ${process.env.VITE_ANTHROPIC_API_KEY ? 'YES' : 'NO'}`);

/**
 * Agent Tool: Read PDF and extract text
 */
function createPDFReaderTool() {
  return {
    name: 'read_pdf',
    description: 'Reads a PDF file and extracts all text content from all pages',
    input_schema: {
      type: 'object',
      properties: {
        file_path: {
          type: 'string',
          description: 'Path to the PDF file to read'
        }
      },
      required: ['file_path']
    }
  };
}

/**
 * Agent Tool: Extract transactions from text
 */
function createTransactionExtractorTool() {
  return {
    name: 'extract_transactions',
    description: 'Extracts bank transactions from statement text',
    input_schema: {
      type: 'object',
      properties: {
        statement_text: {
          type: 'string',
          description: 'Raw text from bank statement'
        },
        bank_type: {
          type: 'string',
          enum: ['santander', 'revolut'],
          description: 'Type of bank for format-specific extraction'
        }
      },
      required: ['statement_text', 'bank_type']
    }
  };
}

/**
 * Agent Tool: Curate payee name
 */
function createPayeeCuratorTool() {
  return {
    name: 'curate_payee',
    description: 'Cleans and curates payee names by removing prefixes and extracting merchant/location',
    input_schema: {
      type: 'object',
      properties: {
        raw_description: {
          type: 'string',
          description: 'Raw transaction description from bank'
        }
      },
      required: ['raw_description']
    }
  };
}

/**
 * Execute tool based on agent's request
 */
async function executeTool(toolName, toolInput, pdfBase64) {
  console.log(`🔧 [Agent Tool] Executing: ${toolName}`);
  console.log(`📥 [Agent Tool] Input:`, JSON.stringify(toolInput).substring(0, 200));

  switch (toolName) {
    case 'read_pdf':
      // In a real implementation, you'd use a PDF library here
      // For now, we'll send the PDF directly to Claude in the initial message
      return {
        success: true,
        message: 'PDF content is included in the document attachment'
      };

    case 'extract_transactions':
      return {
        success: true,
        message: 'Transactions extracted successfully'
      };

    case 'curate_payee':
      const { raw_description } = toolInput;
      // Simple curation logic (agent will do the real work)
      const curated = raw_description
        .replace(/^Fecha valor:?\s*/i, '')
        .replace(/^Pago Movil En\s*/i, '')
        .replace(/^Compra\s*/i, '')
        .replace(/,?\s*Tarj\.\s*:\*\d+$/i, '')
        .replace(/,?\s*Tarjeta\s*\d+$/i, '')
        .trim();

      return {
        success: true,
        curated_payee: curated
      };

    default:
      return {
        success: false,
        error: `Unknown tool: ${toolName}`
      };
  }
}

/**
 * Main endpoint: Process PDF with Anthropic Agent
 */
app.post('/api/process-pdf', upload.single('pdf'), async (req, res) => {
  console.log('\n🚀 [Agent Server] New PDF processing request received');
  console.log(`📄 [Agent Server] File: ${req.file?.originalname} (${req.file?.size} bytes)`);

  try {
    if (!req.file) {
      throw new Error('No PDF file uploaded');
    }

    // Read PDF file as base64
    const pdfBuffer = await fs.readFile(req.file.path);
    const pdfBase64 = pdfBuffer.toString('base64');
    console.log(`📦 [Agent Server] PDF converted to base64: ${pdfBase64.length} chars`);

    // Build comprehensive agent prompt
    const agentPrompt = `You are an expert Spanish bank statement transaction extractor and curator.

I've attached a PDF bank statement from either Santander España or Revolut España.

Your task is to:

1. **READ THE PDF DOCUMENT COMPLETELY**
   - Extract all text from every page
   - Identify which bank this is from (Santander or Revolut)
   - Find the account number if present

2. **EXTRACT ALL TRANSACTIONS**
   - Find every single transaction in the document
   - For each transaction extract:
     * Date (in YYYY-MM-DD format)
     * Raw description (full text)
     * Amount (negative for expenses, positive for income)

3. **CURATE THE DATA**

   **CRITICAL: Payee Curation** (Most Important!)
   - Extract ONLY the merchant/person name and location
   - Remove prefixes like "Fecha valor:", "Pago Movil En", "Compra", etc.
   - Examples:
     * "Fecha valor: 17/07/2025 Pago Movil En La Mina, Madrid, Tarj. :*536242"
       → Payee: "La Mina, Madrid"
     * "Pago Movil En City Paseo Extr, Madrid"
       → Payee: "City Paseo Extr, Madrid"
     * "Compra Loomisp*campo Del Moro, Madrid, Tarjeta 123"
       → Payee: "Loomisp, Madrid"

   **Notes Field:**
   - Keep the FULL original transaction description
   - Remove "Fecha valor:" prefix but keep everything else

   **Category Suggestion:**
   - Intelligently suggest category based on merchant name
   - Categories: Restaurants, Groceries, Transportation, Shopping, Utilities,
     Healthcare, Entertainment, Transfer, Income, General

4. **RETURN STRUCTURED JSON**

Return ONLY valid JSON (no markdown, no code blocks) with this EXACT structure:

{
  "bankName": "Santander España" or "Revolut",
  "accountNumber": "ES2400497175032810076563" (if found),
  "transactions": [
    {
      "date": "2025-07-17",
      "payee": "La Mina, Madrid",
      "notes": "Pago Movil En La Mina, Madrid",
      "category": "Restaurants",
      "amount": -41.80,
      "confidence": 0.95
    }
  ],
  "totalTransactionsFound": 28,
  "extractionComplete": true,
  "success": true
}

IMPORTANT: Return ONLY the JSON object. No explanations, no markdown.`;

    // Call Claude API with document attachment (agent-like approach)
    console.log('🤖 [Agent] Sending PDF to Claude API with agent prompt...');

    const message = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 8192,
      temperature: 0,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'document',
            source: {
              type: 'base64',
              media_type: 'application/pdf',
              data: pdfBase64,
            },
          },
          {
            type: 'text',
            text: agentPrompt,
          },
        ],
      }],
    });

    console.log('✅ [Agent] Received response from Claude');
    console.log(`📊 [Agent] Response type: ${message.content[0].type}`);

    // Parse agent response
    const responseText = message.content[0].text;
    console.log(`📝 [Agent] Response length: ${responseText.length} chars`);
    console.log(`📄 [Agent] Response preview: ${responseText.substring(0, 200)}...`);

    // Clean and parse JSON
    let cleanedText = responseText.trim();
    if (cleanedText.startsWith('```')) {
      cleanedText = cleanedText.replace(/```json?\n?/g, '').replace(/```\n?$/g, '');
    }

    const result = JSON.parse(cleanedText);

    console.log(`✨ [Agent] Parsed successfully:`);
    console.log(`   - Bank: ${result.bankName}`);
    console.log(`   - Transactions: ${result.transactions.length}`);
    console.log(`   - Complete: ${result.extractionComplete}`);

    // Cleanup uploaded file
    await fs.unlink(req.file.path);
    console.log('🗑️  [Agent Server] Cleaned up uploaded file');

    // Return JSON response
    res.json(result);
    console.log('✅ [Agent Server] Response sent to client\n');

  } catch (error) {
    console.error('❌ [Agent Server] Error:', error.message);
    console.error('📚 [Agent Server] Stack:', error.stack);

    // Cleanup file if it exists
    if (req.file) {
      try {
        await fs.unlink(req.file.path);
      } catch (e) {
        // Ignore cleanup errors
      }
    }

    res.status(500).json({
      success: false,
      error: error.message,
      bankName: 'Unknown',
      transactions: [],
      totalTransactionsFound: 0,
      extractionComplete: false,
    });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'Anthropic PDF Agent Server',
    apiKeyConfigured: !!process.env.VITE_ANTHROPIC_API_KEY
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`\n🚀 Anthropic Agent Server running on http://localhost:${PORT}`);
  console.log(`📡 Endpoint: POST http://localhost:${PORT}/api/process-pdf`);
  console.log(`🏥 Health check: GET http://localhost:${PORT}/health\n`);
});
