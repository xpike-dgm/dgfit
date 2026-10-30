import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PlusCircle, Edit, Trash2 } from 'lucide-react';
import { usePreferences } from '@/contexts/PreferencesContext';
import { useTranslation } from 'react-i18next';
import { todayInZone, weeklyGoalPlanInForce } from '@workspace/shared';
import { useWeeklyGoalPlans } from '@/hooks/Goals/useGoals';
import { WeeklyGoalPlan } from '@/types/goals';
interface WeeklyGoalPlansSectionProps {
  /** A plan assigns ready-made goals to days, so it needs one first. */
  hasPresets: boolean;
  handleCreatePresetClick: () => void;
  handleCreateWeeklyPlanClick: () => void;
  handleEditWeeklyPlanClick: (plan: WeeklyGoalPlan) => void;
  handleDeleteWeeklyPlan: (planId: string) => void;
}
export const WeeklyGoalPlansSection = ({
  hasPresets,
  handleCreatePresetClick,
  handleCreateWeeklyPlanClick,
  handleDeleteWeeklyPlan,
  handleEditWeeklyPlanClick,
}: WeeklyGoalPlansSectionProps) => {
  const { formatDateInUserTimezone, timezone } = usePreferences();
  const { t } = useTranslation();

  const { data: weeklyPlans = [] } = useWeeklyGoalPlans();
  const planInForce = weeklyGoalPlanInForce(weeklyPlans, todayInZone(timezone));
  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 space-y-0 pb-2">
        <CardTitle>
          {t('goals.goalsSettings.weeklyGoalPlans', 'Weekly Goal Plans (WIP)')}
        </CardTitle>
        {hasPresets && (
          <Button className="h-11" onClick={handleCreateWeeklyPlanClick}>
            <PlusCircle className="w-4 h-4 mr-2" />{' '}
            {t('goals.goalsSettings.createNewPlan', 'Create New Plan')}
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {weeklyPlans.length === 0 && !hasPresets ? (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Haftalık plan her güne bir hazır hedef atar (örneğin antrenman
              günlerinde daha fazla kalori). Önce bir hazır hedef oluştur.
            </p>
            <Button
              variant="outline"
              className="h-11"
              onClick={handleCreatePresetClick}
            >
              <PlusCircle className="w-4 h-4 mr-2" />
              Önce bir hazır hedef oluştur
            </Button>
          </div>
        ) : weeklyPlans.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {t(
              'goals.goalsSettings.noWeeklyPlans',
              'No weekly goal plans defined yet. Create one to automate your goals!'
            )}
          </p>
        ) : (
          <div className="space-y-4">
            {weeklyPlans.map((plan) => (
              <div
                key={plan.id}
                className="flex items-center justify-between gap-2 rounded-xl border py-2 pl-3 pr-1"
              >
                <div className="min-w-0">
                  <h4 className="font-semibold">
                    {plan.plan_name}{' '}
                    {plan.id === planInForce?.id && (
                      <Badge variant="secondary">
                        {t('goals.goalsSettings.active', 'Active')}
                      </Badge>
                    )}
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    {t(
                      'goals.goalsSettings.startDateToEndDate',
                      '{{start_date}} to {{end_date}}',
                      {
                        start_date: formatDateInUserTimezone(plan.start_date),
                        end_date: plan.end_date
                          ? formatDateInUserTimezone(plan.end_date)
                          : t('common.indefinite', 'Indefinite'),
                      }
                    )}
                  </p>
                </div>
                <div className="flex shrink-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-11 w-11"
                    aria-label={t('goals.goalsSettings.edit', 'Edit')}
                    onClick={() => handleEditWeeklyPlanClick(plan)}
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-11 w-11 text-destructive hover:text-destructive"
                    aria-label={t('goals.goalsSettings.delete', 'Delete')}
                    onClick={() => plan.id && handleDeleteWeeklyPlan(plan.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
