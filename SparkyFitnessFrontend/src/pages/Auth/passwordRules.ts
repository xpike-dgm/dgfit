/** The password rule shown under every new-password field. */
export const PASSWORD_RULE_HINT =
  'En az 8 karakter; büyük harf, küçük harf, rakam ve bir simge (ör. ! ? .) içersin.';

/** First broken password rule as a Turkish sentence, or null when it passes. */
export const passwordRuleError = (pwd: string): string | null => {
  if (pwd.length < 8) return 'Şifre en az 8 karakter olmalı.';
  if (!/[A-ZÇĞİÖŞÜ]/.test(pwd)) return 'Şifrede en az bir büyük harf olmalı.';
  if (!/[a-zçğıöşü]/.test(pwd)) return 'Şifrede en az bir küçük harf olmalı.';
  if (!/[0-9]/.test(pwd)) return 'Şifrede en az bir rakam olmalı.';
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(pwd)) {
    return 'Şifrede en az bir simge olmalı (ör. ! ? . @).';
  }
  return null;
};
