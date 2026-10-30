import { useState } from 'react';
import BrandMark from '@/components/BrandMark';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { usePreferences } from '@/contexts/PreferencesContext';
import { debug, info } from '@/utils/logging';
import { useRequestPasswordResetMutation } from '@/hooks/Auth/useAuth';
import { getErrorMessage } from '@/utils/api';

import { useTranslation } from 'react-i18next';
const ForgotPassword = () => {
  const { t } = useTranslation();
  const { loggingLevel } = usePreferences();
  debug(loggingLevel, 'ForgotPassword: Component rendered.');

  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const { mutateAsync: requestPasswordReset } =
    useRequestPasswordResetMutation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    info(loggingLevel, 'ForgotPassword: Attempting to request password reset.');
    setLoading(true);
    setMessage('');

    try {
      await requestPasswordReset(email);
      setMessage(
        'Bu e-postayla bir hesap varsa sıfırlama bağlantısını gönderdik. E-posta birkaç dakikada gelmezse seni davet eden arkadaşına ya da yöneticiye yaz.'
      );
    } catch (err: unknown) {
      const message = getErrorMessage(err);
      setMessage(message || 'Bir şeyler ters gitti. Tekrar dene.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background py-12 px-4 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md rounded-2xl border-border bg-card">
        <CardHeader className="text-center">
          <div className="flex items-center justify-center mb-4">
            <BrandMark />
          </div>
          <CardDescription>
            {t(
              'auth.forgotPasswordPage.enterYourEmailToReceive',
              'Enter your email to receive a password reset link.'
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">
                {t('auth.forgotPasswordPage.email', 'Email')}
              </Label>
              <Input
                id="email"
                type="email"
                placeholder={t(
                  'auth.forgotPasswordPage.enterYourEmail',
                  'Enter your email'
                )}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="h-11 text-base"
              />
            </div>
            <Button
              type="submit"
              className="h-12 w-full text-base"
              disabled={loading}
            >
              {loading
                ? t('auth.forgotPasswordPage.sending', 'Sending...')
                : t('auth.forgotPasswordPage.sendResetLink', 'Send Reset Link')}
            </Button>
            {message && (
              <p
                className="text-center text-sm text-muted-foreground"
                role="status"
              >
                {message}
              </p>
            )}
            <div className="text-center text-sm">
              <a
                href="/login"
                className="inline-flex min-h-11 items-center font-medium text-primary hover:underline"
              >
                {t('auth.forgotPasswordPage.backToSignIn', 'Back to Sign In')}
              </a>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default ForgotPassword;
