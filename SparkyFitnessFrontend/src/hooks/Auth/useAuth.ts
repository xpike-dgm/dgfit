import { queryOptions, useMutation, useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  requestMagicLink,
  registerUser,
  loginUser,
  demoLogin,
  getLoginSettings,
  initiateOidcLogin,
  resetPassword,
  requestPasswordReset,
  getMfaFactors,
  getAccessibleUsers,
} from '@/api/Auth/auth';
import { authKeys } from '@/api/keys/auth';
import { getErrorMessage } from '@/utils/api';
import type { AuthResponse } from '@/types/auth';
import { authErrorMessage } from './authErrors';

/**
 * Sign-in / sign-up outcome. Failures resolve (not reject) with a Turkish
 * sentence so the page shows one inline message and the global mutation
 * handler adds no second, English toast.
 */
export type AuthResult =
  | { ok: true; data: AuthResponse }
  | { ok: false; message: string };

export const useDemoLoginMutation = () => {
  const { t } = useTranslation();
  return useMutation({
    mutationFn: () => demoLogin(),
    meta: {
      successMessage: t(
        'auth.demoLoginSuccess',
        'Welcome to SparkyFitness Demo!'
      ),
      errorMessage: (error: unknown) => getErrorMessage(error),
    },
  });
};

export const useLoginUserMutation = () =>
  useMutation({
    mutationFn: async ({
      email,
      password,
    }: {
      email: string;
      password: string;
    }): Promise<AuthResult> => {
      try {
        return { ok: true, data: await loginUser(email, password) };
      } catch (err) {
        return { ok: false, message: authErrorMessage(err, 'signin') };
      }
    },
  });

export const useRegisterUserMutation = () =>
  useMutation({
    mutationFn: async ({
      email,
      password,
      fullName,
      username,
      inviteCode,
    }: {
      email: string;
      password: string;
      fullName: string;
      username: string;
      inviteCode: string;
    }): Promise<AuthResult> => {
      try {
        return {
          ok: true,
          data: await registerUser(
            email,
            password,
            fullName,
            username,
            inviteCode
          ),
        };
      } catch (err) {
        return { ok: false, message: authErrorMessage(err, 'signup') };
      }
    },
  });

export const useRequestMagicLinkMutation = () => {
  const { t } = useTranslation();
  return useMutation({
    mutationFn: requestMagicLink,
    meta: {
      successMessage: t(
        'auth.magicLinkSent',
        'Magic link sent! Check your inbox.'
      ),
      errorMessage: t('auth.magicLinkError', 'Failed to request magic link.'),
    },
  });
};

export const useAuthSettings = () => {
  return useQuery({
    queryKey: authKeys.settings,
    queryFn: getLoginSettings,
    // Login settings change only when the operator edits server config, so a
    // short stale window is plenty. `staleTime: 0` with `refetchOnMount:
    // 'always'` handed the Auth page a new object identity on every refetch,
    // re-running the effect that arms the 800ms OIDC auto-redirect timer.
    staleTime: 1000 * 60 * 5,
  });
};

export const useInitiateOidcLoginMutation = () => {
  const { t } = useTranslation();
  return useMutation({
    mutationFn: initiateOidcLogin,
    meta: {
      // Kein Success-Message nötig, da Redirect erfolgt
      errorMessage: t('auth.oidcError', 'Failed to initiate provider login.'),
    },
  });
};

export const useRequestPasswordResetMutation = () => {
  const { t } = useTranslation();
  return useMutation({
    mutationFn: requestPasswordReset,
    // The page shows the outcome inline; a toast on top would repeat it.
    meta: {
      errorMessage: t(
        'auth.resetEmailError',
        'Failed to request password reset.'
      ),
    },
  });
};

export const useResetPasswordMutation = () => {
  const { t } = useTranslation();
  return useMutation({
    mutationFn: ({
      token,
      newPassword,
    }: {
      token: string;
      newPassword: string;
    }) => resetPassword(token, newPassword),
    meta: {
      successMessage: t(
        'auth.passwordResetSuccess',
        'Password has been reset successfully. You can now log in.'
      ),
      errorMessage: t(
        'auth.passwordResetError',
        'Failed to reset password. The link may be expired.'
      ),
    },
  });
};

export const mfaFactorsOptions = (email: string) =>
  queryOptions({
    queryKey: authKeys.mfaFactors(email),
    queryFn: () => getMfaFactors(email),
  });

export const useAccessibleUsersQuery = (enabled: boolean) => {
  return useQuery({
    queryKey: authKeys.identity,
    queryFn: getAccessibleUsers,
    enabled,
    staleTime: 1000 * 60 * 5,
  });
};
