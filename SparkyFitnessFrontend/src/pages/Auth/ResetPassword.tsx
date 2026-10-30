import { useState, useEffect } from 'react';
import BrandMark from '@/components/BrandMark';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { usePreferences } from '@/contexts/PreferencesContext';
import { debug, info } from '@/utils/logging';
import useToggle from '@/hooks/use-toggle';
import PasswordToggle from '@/components/PasswordToggle';
import { useResetPasswordMutation } from '@/hooks/Auth/useAuth';
import { getErrorMessage } from '@/utils/api';
import { useTranslation } from 'react-i18next';
import { PASSWORD_RULE_HINT, passwordRuleError } from './passwordRules';

const ResetPassword = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const { loggingLevel } = usePreferences();
  debug(loggingLevel, 'ResetPassword: Component rendered.');

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const { isToggled: showPassword, toggleHandler: passwordToggleHandler } =
    useToggle();
  const { mutateAsync: resetPassword } = useResetPasswordMutation();

  const token = searchParams.get('token');

  useEffect(() => {
    if (!token) {
      setMessage(
        'Sıfırlama bağlantısı geçersiz ya da eksik. Yeni bir bağlantı iste.'
      );
      toast({
        title: t('common.error', 'Error'),
        description: t(
          'auth.resetPassword.invalidOrMissingPasswordReset',
          'Invalid or missing password reset token.'
        ),
        variant: 'destructive',
      });
    }
  }, [token, t]);

  const validatePassword = passwordRuleError;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    info(loggingLevel, 'ResetPassword: Attempting to reset password.');
    setLoading(true);
    setMessage('');
    setPasswordError(null);

    if (!token) {
      setMessage(
        'Sıfırlama bağlantısı geçersiz ya da eksik. Yeni bir bağlantı iste.'
      );
      setLoading(false);
      return;
    }

    const validationError = validatePassword(newPassword);
    if (validationError) {
      setPasswordError(validationError);
      setLoading(false);
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('Şifreler aynı değil.');
      setLoading(false);
      return;
    }

    try {
      await resetPassword({ token, newPassword });
      setMessage('Şifren değişti. Yeni şifrenle giriş yapabilirsin.');
      navigate('/'); // Redirect to root
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
              'auth.resetPassword.setYourNewPassword',
              'Set your new password.'
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2 relative">
              <Label htmlFor="new-password">
                {t('auth.resetPassword.newPassword', 'New Password')}
              </Label>
              <Input
                id="new-password"
                type={showPassword ? 'text' : 'password'}
                placeholder={t(
                  'auth.resetPassword.enterNewPassword',
                  'Enter new password'
                )}
                value={newPassword}
                onChange={(e) => {
                  setNewPassword(e.target.value);
                  setPasswordError(validatePassword(e.target.value));
                }}
                required
                minLength={8}
                autoComplete="new-password"
                className="h-11 pr-12 text-base"
              />
              <PasswordToggle
                showPassword={showPassword}
                passwordToggleHandler={passwordToggleHandler}
              />
              {passwordError ? (
                <p className="text-sm text-danger-text">{passwordError}</p>
              ) : (
                <p className="text-sm text-muted-foreground">
                  {PASSWORD_RULE_HINT}
                </p>
              )}
            </div>
            <div className="space-y-2 relative">
              <Label htmlFor="confirm-password">
                {t(
                  'auth.resetPassword.confirmNewPassword',
                  'Confirm New Password'
                )}
              </Label>
              <Input
                id="confirm-password"
                type={showPassword ? 'text' : 'password'}
                placeholder={t(
                  'auth.resetPassword.confirmNewPassword2',
                  'Confirm new password'
                )}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                autoComplete="new-password"
                className="h-11 pr-12 text-base"
              />
              <PasswordToggle
                showPassword={showPassword}
                passwordToggleHandler={passwordToggleHandler}
              />
            </div>
            <Button
              type="submit"
              className="h-12 w-full text-base"
              disabled={
                loading || !!passwordError || newPassword !== confirmPassword
              }
            >
              {loading
                ? t('auth.resetPassword.resetting', 'Resetting...')
                : t('auth.resetPassword.resetPassword', 'Reset Password')}
            </Button>
            {message && (
              <p className="text-center text-sm text-muted-foreground">
                {message}
              </p>
            )}
            <div className="text-center text-sm">
              <a href="/" className="font-medium text-primary hover:underline">
                {t('auth.resetPassword.backToSignIn', 'Back to Sign In')}
              </a>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default ResetPassword;
