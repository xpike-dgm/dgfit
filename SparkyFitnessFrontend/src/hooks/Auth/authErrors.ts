import { getErrorMessage } from '@/utils/api';

/**
 * Turns a sign-in or sign-up failure into one short Turkish sentence.
 * Better Auth answers with an HTTP status, a `code` (e.g.
 * INVALID_EMAIL_OR_PASSWORD) and an English message; DG FIT's own signup
 * checks already answer in Turkish, so those pass through unchanged.
 */
export const authErrorMessage = (
  err: unknown,
  flow: 'signin' | 'signup'
): string => {
  const record =
    err !== null && typeof err === 'object'
      ? (err as Record<string, unknown>)
      : {};
  const status = typeof record['status'] === 'number' ? record['status'] : 0;
  const code = typeof record['code'] === 'string' ? record['code'] : '';
  const message = getErrorMessage(err);

  if (status === 429 || /too many requests/i.test(message)) {
    return 'Çok fazla deneme yaptın, biraz sonra tekrar dene.';
  }
  if (
    status === 401 ||
    code === 'INVALID_EMAIL_OR_PASSWORD' ||
    message === 'Invalid credentials.' ||
    /invalid (email or password|credentials)/i.test(message)
  ) {
    return 'E-posta ya da şifre hatalı.';
  }
  if (
    status === 409 ||
    code === 'USER_ALREADY_EXISTS' ||
    code === '23505' ||
    /already exists/i.test(message)
  ) {
    return 'Bu e-postayla zaten bir hesap var. Giriş Yap sekmesini dene.';
  }
  if (code === 'INVALID_EMAIL' || /invalid email/i.test(message)) {
    return 'Geçerli bir e-posta adresi yaz.';
  }
  if (code === 'PASSWORD_TOO_SHORT') {
    return 'Şifre en az 8 karakter olmalı.';
  }
  if (code === 'PASSWORD_TOO_LONG') {
    return 'Şifre çok uzun.';
  }
  if (code === 'EMAIL_NOT_VERIFIED' || /not verified/i.test(message)) {
    return 'Önce e-posta adresini doğrulaman gerekiyor.';
  }
  if (/failed to fetch|network/i.test(message)) {
    return 'Sunucuya ulaşılamadı. İnternet bağlantını kontrol edip tekrar dene.';
  }
  if (message === 'Invalid origin') {
    return 'Bu adresten giriş yapılamıyor. Uygulamayı her zamanki adresinden aç.';
  }
  if (/signups? (are|is) currently disabled/i.test(message)) {
    return 'Şu an yeni kayıt alınmıyor.';
  }
  // DG FIT's signup checks (invite code, username) already speak Turkish.
  if (/[çğıöşüÇĞİÖŞÜ]/.test(message)) return message;

  return flow === 'signin'
    ? 'Giriş yapılamadı. Biraz sonra tekrar dene.'
    : 'Hesap oluşturulamadı. Biraz sonra tekrar dene.';
};
