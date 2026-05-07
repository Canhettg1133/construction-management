import { z } from "zod";
import { AI_SOURCE_TOOL_IDS } from "./ai.context";

export const createThreadSchema = z.object({
  body: z.object({
    title: z.string().trim().min(1).max(200).optional(),
    providerProfileId: z.string().trim().min(1).max(191).optional(),
  }),
});

export const sendMessageSchema = z.object({
  body: z.object({
    content: z.string().trim().min(1, "Nội dung không được để trống").max(4000),
    intent: z
      .enum(["CHAT", "DRAFT_DAILY_REPORT", "DRAFT_SAFETY_CHECKLIST", "DRAFT_QUALITY_CHECKLIST"])
      .default("CHAT"),
  }),
});

export const updateAiSettingsSchema = z.object({
  body: z.object({
    enabledSourceTools: z.array(z.enum(AI_SOURCE_TOOL_IDS)).nullable().optional(),
    customSystemPrompt: z.string().trim().max(3000).nullable().optional(),
    defaultProviderProfileId: z.string().trim().min(1).max(191).nullable().optional(),
  }),
});

export const createProviderProfileSchema = z.object({
  body: z.object({
    name: z.string().trim().min(1).max(120),
    provider: z.enum(["MOCK", "OPENAI_RESPONSES", "OPENAI_COMPATIBLE", "GEMINI_DIRECT", "OLLAMA"]),
    baseUrl: z.string().trim().url().nullable().optional(),
    model: z.string().trim().min(1).max(120),
    apiKey: z.string().trim().min(1).max(4000).nullable().optional(),
    apiKeys: z.array(z.string().trim().min(1).max(4000)).max(50).nullable().optional(),
    config: z.record(z.unknown()).nullable().optional(),
    isEnabled: z.boolean().optional(),
    isDefault: z.boolean().optional(),
  }),
});

export const updateProviderProfileSchema = z.object({
  body: z.object({
    name: z.string().trim().min(1).max(120).optional(),
    provider: z.enum(["MOCK", "OPENAI_RESPONSES", "OPENAI_COMPATIBLE", "GEMINI_DIRECT", "OLLAMA"]).optional(),
    baseUrl: z.string().trim().url().nullable().optional(),
    model: z.string().trim().min(1).max(120).optional(),
    apiKey: z.string().trim().min(1).max(4000).nullable().optional(),
    apiKeys: z.array(z.string().trim().min(1).max(4000)).max(50).nullable().optional(),
    clearApiKey: z.boolean().optional(),
    config: z.record(z.unknown()).nullable().optional(),
    isEnabled: z.boolean().optional(),
    isDefault: z.boolean().optional(),
  }),
});

export const providerTestSchema = z.object({
  body: z.object({
    profileId: z.string().trim().min(1).max(191).optional(),
    name: z.string().trim().min(1).max(120).optional(),
    provider: z.enum(["MOCK", "OPENAI_RESPONSES", "OPENAI_COMPATIBLE", "GEMINI_DIRECT", "OLLAMA"]).optional(),
    baseUrl: z.string().trim().url().nullable().optional(),
    model: z.string().trim().min(1).max(120).optional(),
    apiKey: z.string().trim().min(1).max(4000).nullable().optional(),
    config: z.record(z.unknown()).nullable().optional(),
  }),
});

export const createProviderCredentialsSchema = z.object({
  body: z.object({
    keys: z.union([z.string().trim().min(1), z.array(z.string().trim().min(1).max(4000)).max(50)]),
    label: z.string().trim().min(1).max(120).nullable().optional(),
  }),
});

export const updateProviderCredentialSchema = z.object({
  body: z.object({
    label: z.string().trim().min(1).max(120).optional(),
    isEnabled: z.boolean().optional(),
  }),
});

export const exportProviderCredentialsSchema = z.object({
  body: z.object({
    confirmation: z.literal("EXPORT_PLAINTEXT_AI_KEYS"),
  }),
});
