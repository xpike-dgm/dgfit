import { apiCall } from '@/api/api';

export interface InviteCode {
  code: string;
  note: string | null;
  max_uses: number;
  used_count: number;
  expires_at: string | null;
  created_at: string;
  used_by: string[];
}

export const getMyUsername = (): Promise<{ username: string | null }> =>
  apiCall('/dgfit/account/me/username');

export const updateMyUsername = (
  username: string
): Promise<{ username: string }> =>
  apiCall('/dgfit/account/me/username', {
    method: 'PUT',
    body: { username },
  });

export const listInviteCodes = (): Promise<InviteCode[]> =>
  apiCall('/dgfit/account/invites');

export const createInviteCode = (body: {
  note?: string;
  maxUses?: number;
  expiresInDays?: number;
}): Promise<InviteCode> =>
  apiCall('/dgfit/account/invites', { method: 'POST', body });

export const deleteInviteCode = (code: string): Promise<void> =>
  apiCall(`/dgfit/account/invites/${encodeURIComponent(code)}`, {
    method: 'DELETE',
  });

export interface AiUsageReport {
  totals: {
    user_id: string;
    name: string;
    requests: number;
    input_tokens: string;
    output_tokens: string;
    cache_read_tokens: string;
    last_day: string;
    models: string[];
  }[];
  daily: { day: string; requests: number; tokens: string }[];
}

export const getAiUsage = (days: number): Promise<AiUsageReport> =>
  apiCall('/dgfit/account/ai-usage', { params: { days } });
