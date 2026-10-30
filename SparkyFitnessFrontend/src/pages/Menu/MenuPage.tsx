import { useNavigate } from 'react-router-dom';
import {
  BarChart3,
  ChefHat,
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

interface Tile {
  label: string;
  hint: string;
  icon: LucideIcon;
  onClick: () => void;
}

/** DG FIT phone menu: everything that does not fit the bottom bar. */
const MenuPage = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { openChat } = useChatbotVisibility();

  const tiles: Tile[] = [
    {
      label: 'PT AI',
      hint: 'Yaz, fotoğraf at, sor',
      icon: Sparkles,
      onClick: openChat,
    },
    {
      label: 'Gelişim',
      hint: 'Grafikler ve rekorlar',
      icon: BarChart3,
      onClick: () => navigate('/reports'),
    },
    {
      label: 'Tarifler',
      hint: 'Shake ve yemek tarifi',
      icon: ChefHat,
      onClick: () => navigate('/tarifler'),
    },
    {
      label: 'Arkadaşlar',
      hint: 'Akış ve sıralama',
      icon: Users,
      onClick: () => navigate('/arkadaslar'),
    },
    {
      label: 'Kilo & Ölçümler',
      hint: 'Kilo, ölçü, fotoğraf',
      icon: Scale,
      onClick: () => navigate('/checkin'),
    },
    {
      label: 'Hareketler',
      hint: 'Kütüphane ve programlar',
      icon: Dumbbell,
      onClick: () => navigate('/exercises'),
    },
    {
      label: 'Yiyecekler',
      hint: 'Besin veritabanı',
      icon: Utensils,
      onClick: () => navigate('/foods'),
    },
    {
      label: 'Hedefler',
      hint: 'Kalori ve makro hedefi',
      icon: Target,
      onClick: () => navigate('/goals'),
    },
    {
      label: 'Ayarlar',
      hint: 'Profil ve tercihler',
      icon: SettingsIcon,
      onClick: () => navigate('/settings'),
    },
  ];
  if (user?.role === 'admin') {
    tiles.push({
      label: 'Yönetim',
      hint: 'Davetler, kullanıcılar, AI',
      icon: Shield,
      onClick: () => navigate('/admin'),
    });
  }

  return (
    <div className="space-y-4 pb-4">
      <h2 className="text-2xl font-extrabold tracking-tight">Menü</h2>
      <div className="grid grid-cols-2 gap-3">
        {tiles.map(({ label, hint, icon: Icon, onClick }) => (
          <button
            key={label}
            type="button"
            onClick={onClick}
            className="flex flex-col items-start gap-2 rounded-2xl border bg-card p-4 text-left transition-colors hover:bg-muted"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 text-primary">
              <Icon className="h-5 w-5" />
            </span>
            <span className="font-semibold">{label}</span>
            <span className="text-xs text-muted-foreground">{hint}</span>
          </button>
        ))}
      </div>
      <button
        type="button"
        onClick={async () => {
          await signOut();
          navigate('/login');
        }}
        className="flex w-full items-center justify-center gap-2 rounded-2xl border p-3 text-sm text-muted-foreground hover:bg-muted"
      >
        <LogOut className="h-4 w-4" /> Çıkış yap
      </button>
    </div>
  );
};

export default MenuPage;
