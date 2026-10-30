import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusCircle, Edit, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { usePreferences } from '@/contexts/PreferencesContext';
import { GoalPreset } from '@/types/goals';
import { fmtTr } from '@/utils/numberFormatting';

interface GoalPresetsSectionProps {
  handleCreatePresetClick: () => void;
  handleDeletePreset: (presetId: string) => void;
  handleEditPresetClick: (preset: GoalPreset) => void;
  goalPresets: GoalPreset[];
}

export const GoalPresetsSection = ({
  handleCreatePresetClick,
  handleDeletePreset,
  handleEditPresetClick,
  goalPresets,
}: GoalPresetsSectionProps) => {
  const { t } = useTranslation();
  const { energyUnit, convertEnergy, getEnergyUnitString } = usePreferences();

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 space-y-0 pb-2">
        <CardTitle>
          {t('goals.goalsSettings.goalPresets', 'Goal Presets')}
        </CardTitle>
        <Button className="h-11" onClick={handleCreatePresetClick}>
          <PlusCircle className="w-4 h-4 mr-2" />{' '}
          {t('goals.goalsSettings.createNewPreset', 'Create New Preset')}
        </Button>
      </CardHeader>
      <CardContent>
        {goalPresets.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {t(
              'goals.goalsSettings.noGoalPresets',
              'No goal presets defined yet. Create one to get started!'
            )}
          </p>
        ) : (
          <div className="space-y-4">
            {goalPresets.map((preset) => (
              <div
                key={preset.id}
                className="flex items-center justify-between gap-2 rounded-xl border py-2 pl-3 pr-1"
              >
                <div className="min-w-0">
                  <h4 className="font-semibold">{preset.preset_name}</h4>
                  <p className="text-sm text-muted-foreground">
                    {t('goals.goalsSettings.presetKcalMacros', {
                      calories: fmtTr(
                        convertEnergy(preset.calories, 'kcal', energyUnit),
                        0
                      ),
                      protein: fmtTr(preset.protein || 0, 0),
                      carbs: fmtTr(preset.carbs || 0, 0),
                      fat: fmtTr(preset.fat || 0, 0),
                      energyUnit: getEnergyUnitString(energyUnit),
                      defaultValue:
                        '{{calories}} {{energyUnit}}, {{protein}}g P, {{carbs}}g C, {{fat}}g F',
                    })}
                  </p>
                </div>
                <div className="flex shrink-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-11 w-11"
                    aria-label={t('goals.goalsSettings.edit', 'Edit')}
                    onClick={() => handleEditPresetClick(preset)}
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-11 w-11 text-destructive hover:text-destructive"
                    aria-label={t('goals.goalsSettings.delete', 'Delete')}
                    onClick={() => preset.id && handleDeletePreset(preset.id)}
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
