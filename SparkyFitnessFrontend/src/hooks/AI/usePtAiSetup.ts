import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  createGlobalAIService,
  updateGlobalAIService,
} from '@/api/Settings/aiServiceSettingsService';
import { aiServiceKeys, settingsKeys } from '@/api/keys/admin';
import type { AiServiceSettingsResponse } from '@workspace/shared';

/** The Claude model DG FIT uses by default (server `getDefaultModel('anthropic')`). */
export const PT_AI_DEFAULT_MODEL = 'claude-haiku-5-5';
export const PT_AI_SERVICE_NAME = 'PT AI (Claude)';

/**
 * The global Claude service the simple "PT AI" admin form edits: the active
 * Anthropic one first, else any Anthropic one, else none (the form creates it).
 */
export const findPtAiService = (
  services: AiServiceSettingsResponse[]
): AiServiceSettingsResponse | undefined =>
  services.find((s) => s.service_type === 'anthropic' && s.is_active) ??
  services.find((s) => s.service_type === 'anthropic');

interface SavePtAiInput {
  /** Existing service to update, or undefined to create a new one. */
  existing?: AiServiceSettingsResponse;
  /** New key; blank keeps the stored key of an existing service. */
  apiKey: string;
  model: string;
}

/**
 * Saves the shared Claude key for PT AI as a global, active Anthropic
 * service. Updates send every field because the server's update overwrites
 * the row (only a blank key is kept).
 */
export const useSavePtAiKey = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ existing, apiKey, model }: SavePtAiInput) => {
      const key = apiKey.trim();
      if (existing) {
        return updateGlobalAIService(existing.id, {
          service_name: existing.service_name,
          service_type: 'anthropic',
          custom_url: existing.custom_url,
          system_prompt: existing.system_prompt,
          is_active: true,
          model_name: model,
          chat_tool_profile: existing.chat_tool_profile ?? 'full',
          reasoning_effort: existing.reasoning_effort ?? 'medium',
          supports_audio_input: existing.supports_audio_input,
          ...(key ? { api_key: key } : {}),
        });
      }
      return createGlobalAIService({
        service_name: PT_AI_SERVICE_NAME,
        service_type: 'anthropic',
        api_key: key,
        is_active: true,
        model_name: model,
        chat_tool_profile: 'full',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: aiServiceKeys.global() });
      queryClient.invalidateQueries({ queryKey: aiServiceKeys.user() });
      queryClient.invalidateQueries({ queryKey: aiServiceKeys.active() });
      queryClient.invalidateQueries({ queryKey: settingsKeys.all });
    },
    meta: {
      successMessage: 'PT AI açık. Anahtar kaydedildi.',
      errorMessage: 'Anahtar kaydedilemedi. Tekrar dene.',
    },
  });
};
