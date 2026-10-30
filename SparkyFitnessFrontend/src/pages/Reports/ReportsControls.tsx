import { useTranslation } from 'react-i18next';
import { DateRangePickerWithPresets } from '@/components/ui/DateRangeWithPresets';
import { Button } from '@/components/ui/button';
import {
  BarChart3,
  Dumbbell,
  Activity,
  Table as TableIcon,
  GitCompareArrows,
} from 'lucide-react';

interface ReportsControlsProps {
  startDate: string;
  endDate: string;
  onStartDateChange: (date: string) => void;
  onEndDateChange: (date: string) => void;
  activeTab: string;
  onTabChange: (tab: string) => void;
  showDateRange: boolean;
}

const ReportsControls = ({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  activeTab,
  onTabChange,
  showDateRange,
}: ReportsControlsProps) => {
  const { t } = useTranslation();

  // DG FIT shows the gym-and-food reports; sleep, stress, fasting, heart
  // rate, medication and symptom tabs stay hidden.
  const reportTypes = [
    {
      id: 'exercise-charts',
      label: t('reports.exerciseProgressTab', 'Exercise'),
      icon: Dumbbell,
    },
    {
      id: 'measurements',
      label: t('reports.measurementsTab', 'Measurements'),
      icon: Activity,
    },
    {
      id: 'charts',
      label: t('reports.nutrientsTab', 'Nutrients'),
      icon: BarChart3,
    },
    {
      id: 'table',
      label: t('reports.tableTab', 'Table'),
      icon: TableIcon,
    },
    {
      id: 'compare',
      label: t('reports.compareTab', 'Compare'),
      icon: GitCompareArrows,
    },
  ];

  return (
    <div className="w-full flex flex-col lg:flex-row items-center gap-4 lg:gap-6">
      {/* Navigation Pills */}
      <div className="-mx-4 flex items-center gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:mx-0 sm:flex-wrap sm:px-0 flex-1 w-full">
        {reportTypes.map((type) => {
          const Icon = type.icon;
          const isActive = activeTab === type.id;
          return (
            <Button
              key={type.id}
              variant={isActive ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => onTabChange(type.id)}
              className={`shrink-0 rounded-full px-4 h-9 gap-2 transition-all ${
                isActive
                  ? 'bg-primary text-primary-foreground shadow-sm hover:bg-primary'
                  : 'bg-card text-muted-foreground hover:text-foreground hover:bg-card'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span className="text-xs font-semibold">{type.label}</span>
            </Button>
          );
        })}
      </div>

      {showDateRange && (
        <>
          {/* Vertical Divider (Desktop Only) */}
          <div className="hidden lg:block w-px h-6 bg-border" />

          {/* Secondary Filter: Date Picker */}
          <div className="shrink-0">
            <DateRangePickerWithPresets
              startDate={startDate}
              endDate={endDate}
              onStartDateChange={onStartDateChange}
              onEndDateChange={onEndDateChange}
            />
          </div>
        </>
      )}
    </div>
  );
};

export default ReportsControls;
