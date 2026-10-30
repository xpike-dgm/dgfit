import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createInviteCode,
  deleteInviteCode,
  getAiUsage,
  getMyUsername,
  listInviteCodes,
  updateMyUsername,
} from '@/api/Dgfit/accountApi';
import { getErrorMessage } from '@/utils/api';

export const dgfitAccountKeys = {
  username: ['dgfit', 'username'] as const,
  invites: ['dgfit', 'invites'] as const,
};

export const useMyUsername = () =>
  useQuery({ queryKey: dgfitAccountKeys.username, queryFn: getMyUsername });

export const useUpdateUsernameMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateMyUsername,
    onSuccess: (data) =>
      queryClient.setQueryData(dgfitAccountKeys.username, data),
    meta: {
      successMessage: 'Kullanıcı adı kaydedildi.',
      errorMessage: (error: unknown) => getErrorMessage(error),
    },
  });
};

export const useInviteCodes = () =>
  useQuery({ queryKey: dgfitAccountKeys.invites, queryFn: listInviteCodes });

export const useCreateInviteMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createInviteCode,
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: dgfitAccountKeys.invites }),
    meta: { errorMessage: (error: unknown) => getErrorMessage(error) },
  });
};

export const useDeleteInviteMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteInviteCode,
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: dgfitAccountKeys.invites }),
    meta: { errorMessage: (error: unknown) => getErrorMessage(error) },
  });
};

export const useAiUsage = (days: number) =>
  useQuery({
    queryKey: ['dgfit', 'ai-usage', days],
    queryFn: () => getAiUsage(days),
  });
