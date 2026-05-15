import { existsSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { config as loadEnv } from 'dotenv'
import { z } from 'zod'

const currentFile = fileURLToPath(import.meta.url)
const configDir = dirname(currentFile)
const packageRoot = resolve(configDir, '../..')
const workspaceRoot = resolve(packageRoot, '../..')

// Load package-local defaults first, then let the workspace root remain the
// single source of truth for local development overrides.
for (const envPath of [resolve(packageRoot, '.env'), resolve(workspaceRoot, '.env')]) {
  if (existsSync(envPath)) {
    loadEnv({ path: envPath, override: true })
  }
}

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3001),
  DATABASE_URL: z.string().url(),
  JWT_SECRET: z.string().min(32),
  JWT_EXPIRES_IN: z.string().default('7d'),
  JWT_REFRESH_SECRET: z.string().min(32),
  JWT_REFRESH_EXPIRES_IN: z.string().default('30d'),
  UPLOAD_DIR: z.string().default('./uploads'),
  MAX_FILE_SIZE: z.coerce.number().default(10485760),
  DOCUMENT_TRASH_RETENTION_DAYS: z.coerce.number().int().min(1).default(30),
  SMTP_HOST: z.string().default('smtp.gmail.com'),
  SMTP_PORT: z.coerce.number().default(587),
  SMTP_USER: z.string().default(''),
  SMTP_PASS: z.string().default(''),
  APP_URL: z.string().default('http://localhost:5173'),
  FRONTEND_URL: z.string().default('http://localhost:5173'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug']).default('debug'),
  AI_SECRET_ENCRYPTION_KEY: z.string().optional(),
  AI_PROVIDER: z.enum(['MOCK', 'OPENAI_RESPONSES', 'OPENAI_COMPATIBLE', 'GEMINI_DIRECT', 'OLLAMA']).default('MOCK'),
  AI_OPENAI_API_KEY: z.string().optional(),
  AI_OPENAI_MODEL: z.string().default('gpt-5.4'),
  AI_OPENAI_COMPATIBLE_BASE_URL: z.string().optional(),
  AI_OPENAI_COMPATIBLE_API_KEY: z.string().optional(),
  AI_OPENAI_COMPATIBLE_MODEL: z.string().default('gpt-5.4'),
  AI_GEMINI_API_KEY: z.string().optional(),
  AI_GEMINI_MODEL: z.string().default('gemini-2.5-flash'),
  AI_OLLAMA_BASE_URL: z.string().default('http://localhost:11434'),
  AI_OLLAMA_MODEL: z.string().default('llama3.1'),
  AI_REQUEST_TIMEOUT_MS: z.coerce.number().int().min(1000).max(120000).default(30000),
})

export const env = envSchema.parse(process.env)
