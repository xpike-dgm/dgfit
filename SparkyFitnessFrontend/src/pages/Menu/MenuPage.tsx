import { useNavigate } from 'react-router-dom';
import {
  BarChart3,
  ChefHat,
  ChevronRight,
  Dumbbell,
  LogOut,
  Scale,
  Settings as SettingsIcon,
  Shield,
  Sparkles,
  Target,
  Users,
  Utensils,
  type LucideIcon,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useChatbotVisibility } from '@/contexts/ChatbotVisibilityContext';
import { useTheme } from '@/contexts/ThemeContext';
import { cn } from '@/lib/utils';

interface Row {
  label: string;
  hint: string;
  icon: LucideIcon;
  tint: string;
  onClick: () => void;
}

const THEMES = [
  ['light', 'Açık'],
  ['dark', 'Koyu'],
  ['system', 'Sistem'],
] as const;

/** Grouped settings rows, as on the SparkyFitness mobile Library and Settings tabs. */
const RowGroup = ({ title, rows }: { title: string; rows: Row[] }) => (
  <div className="mb-4 overflow-hidden rounded-2xl bg-card shadow-[0_1px_3px_rgba(15,23,41,0.06),0_1px_2px_rgba(15,23,41,0.04)] dark:shadow-none">
    <div className="px-4 pt-3 pb-1 text-xs font-bold uppercase tracking-wider text-muted-foreground">
      {title}
    </div>
    {rows.map(({ label, hint, icon: Icon, tint, onClick }, index) => (
      <button
        key={label}
        type="button"
        onClick={onClick}
        className={cn(
          'flex w-full items-center p-4 text-left transition-opacity active:opacity-70',
          index > 0 && 'border-t border-border'
        )}
      >
        <span
          className={cn(
            'mr-3 flex h-10 w-10 shrink-0 items-center justify-center',
            tint
          )}
        >
          <Icon className="h-[22px] w-[22px]" strokeWidth={2.2} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-base font-semibold text-foreground">
            {label}
          </span>
          <span className="mt-0.5 block truncate text-sm text-muted-foreground">
            {hint}
          </span>
        </span>
        <ChevronRight className="h-5 w-5 text-muted-foreground" />
      </button>
    ))}
  </div>
);

/** DG FIT phone menu: everything that does not fit the bottom bar. */
const MenuPage = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { openChat } = useChatbotVisibility();
  const { theme, setTheme } = useTheme();

  const library: Row[] = [
    {
      label: 'Hareketler',
      hint: 'Hareket kütüphanesi',
      icon: Dumbbell,
      tint: 'text-primary',
      onClick: () => navigate('/exercises'),
    },
    {
      label: 'Yiyecekler',
      hint: 'Besin veritabanı ve öğünler',
      icon: Utensils,
      tint: 'text-cat-green',
      onClick: () => navigate('/foods'),
    },
    {
      label: 'Tarifler',
      hint: 'Shake ve yemek tarifi oluştur',
      icon: ChefHat,
      tint: 'text-cat-amber',
      onClick: () => navigate('/tarifler'),
    },
  ];
  const social: Row[] = [
    {
      label: 'Arkadaşlar',
      hint: 'Akış, profiller ve sıralama',
      icon: Users,
      tint: 'text-cat-violet',
      onClick: () => navigate('/arkadaslar'),
    },
    {
      label: 'PT AI',
      hint: 'Yaz, fotoğraf at, sor',
      icon: Sparkles,
      tint: 'text-primary',
      onClick: openChat,
    },
  ];
  const tracking: Row[] = [
    {
      label: 'Gelişim',
      hint: 'Grafikler ve rekorlar',
      icon: BarChart3,
      tint: 'text-cat-green',
      onClick: () => navigate('/reports'),
    },
    {
      label: 'Kilo & Ölçümler',
      hint: 'Kilo, vücut ölçüleri, fotoğraflar',
      icon: Scale,
      tint: 'text-cat-pink',
      onClick: () => navigate('/checkin'),
    },
    {
      label: 'Hedefler',
      hint: 'Kalori ve makro hedefi',
      icon: Target,
      tint: 'text-cat-amber',
      onClick: () => navigate('/goals'),
    },
  ];
  const account: Row[] = [
    {
      label: 'Ayarlar',
      hint: 'Profil, bildirimler, gizlilik',
      icon: SettingsIcon,
      tint: 'text-muted-foreground',
      onClick: () => navigate('/settings'),
    },
  ];
  if (user?.role === 'admin') {
    account.push({
      label: 'Yönetim',
      hint: 'Davet kodları, kullanıcılar, AI',
      icon: Shield,
      tint: 'text-muted-foreground',
      onClick: () => navigate('/admin'),
    });
  }

  return (
    <div className="pb-4">
      <h1 className="mb-6 text-2xl font-bold text-foreground">Menü</h1>
      <RowGroup title="Kütüphane" rows={library} />
      <RowGroup title="Sosyal & Koç" rows={social} />
      <RowGroup title="Takip" rows={tracking} />
      <RowGroup title="Hesap" rows={account} />

      <div className="mb-4 rounded-2xl bg-card p-4 shadow-[0_1px_3px_rgba(15,23,41,0.06),0_1px_2px_rgba(15,23,41,0.04)] dark:shadow-none">
        <div className="mb-2 text-sm font-medium text-muted-foreground">
          Görünüm
        </div>
        <div className="flex rounded-xl bg-raised p-1">
          {THEMES.map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setTheme(value)}
              className={cn(
                'flex-1 rounded-lg py-2 text-sm font-medium',
                theme === value
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-caption'
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <button
        type="button"
        onClick={async () => {
          await signOut();
          navigate('/login');
        }}
        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-card p-4 text-base font-medium text-danger-text shadow-[0_1px_3px_rgba(15,23,41,0.06),0_1px_2px_rgba(15,23,41,0.04)] dark:shadow-none"
      >
        <LogOut className="h-5 w-5" /> Çıkış yap
      </button>
    </div>
  );
};

export default MenuPage;
