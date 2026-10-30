import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RotateCcw } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useState } from 'react';
import ConfirmationDialog from '@/components/ui/ConfirmationDialog';
import { useResetOnboarding } from '@/hooks/Onboarding/useOnboarding';
export const ResetOnboarding = () => {
  const { t } = useTranslation();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const { mutateAsync: resetOnboardingStatus, isPending: saving } =
    useResetOnboarding();
  const handleResetOnboarding = async () => {
    setConfirmOpen(false);
    try {
      await resetOnboardingStatus();
      window.location.reload();
    } catch (error) {
      console.error('Failed to reset onboarding', error);
    }
  };
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {t('goals.goalsSettings.resetOnboarding', 'Reset Onboarding')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground mb-4">
          {t(
            'goals.goalsSettings.resetOnboardingDescription',
            'Reset your onboarding status to revisit the initial questionnaire. You will be signed out after resetting.'
          )}
        </p>
        <Button
          onClick={() => setConfirmOpen(true)}
          disabled={saving}
          variant="ghost"
          className="h-11 px-0 text-danger-text hover:bg-transparent hover:text-danger-text"
        >
          <RotateCcw className="h-4 w-4 mr-2" />
          {t('goals.goalsSettings.resetOnboarding', 'Reset Onboarding')}
        </Button>
      </CardContent>
      <ConfirmationDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Başlangıç anketi sıfırlansın mı?"
        description="Anketi baştan doldurursun ve oturumun kapanır. Kayıtlı yemeklerin, antrenmanların ve ölçümlerin silinmez."
        variant="destructive"
        confirmLabel="Sıfırla"
        onConfirm={() => void handleResetOnboarding()}
      />
    </Card>
  );
};
