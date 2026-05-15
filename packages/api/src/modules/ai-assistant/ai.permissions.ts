import { hasMinPermission, type PermissionLevel, type ToolPermissionMap } from '@construction/shared'
import { AI_SOURCE_TOOL_IDS, type AiSourceToolId } from './ai.context'

export function isAiSourceId(value: unknown): value is AiSourceToolId {
  return typeof value === 'string' && (AI_SOURCE_TOOL_IDS as readonly string[]).includes(value)
}

export function canReadAiSource(permissions: ToolPermissionMap, sourceId: AiSourceToolId) {
  return hasMinPermission((permissions[sourceId] ?? 'NONE') as PermissionLevel, 'READ')
}

export function isAiSourceEnabled(sourceId: AiSourceToolId, enabledSourceTools: AiSourceToolId[] | null) {
  return !enabledSourceTools || enabledSourceTools.includes(sourceId)
}

export function getAllowedAiSources(permissions: ToolPermissionMap, enabledSourceTools: AiSourceToolId[] | null) {
  return new Set(
    AI_SOURCE_TOOL_IDS.filter(
      (sourceId) => isAiSourceEnabled(sourceId, enabledSourceTools) && canReadAiSource(permissions, sourceId),
    ),
  )
}
