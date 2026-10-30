import { WifiOff } from 'lucide-react';
import { useOnlineStatus } from './useOnlineStatus';

/**
 * Thin strip at the top of every page while offline. Changes made meanwhile
 * (water, diary, finished workouts) wait in the app and are sent when the
 * connection is back, as long as the app stays open.
 */
const OfflineBanner = () => {
  const online = useOnlineStatus();
  if (online) return null;
  return (
    <div
      role="status"
      className="sticky top-[max(env(safe-area-inset-top),0px)] z-40 -mx-4 mb-3 flex items-center gap-2 bg-amber-500/15 px-4 py-2 text-sm font-medium text-foreground backdrop-blur sm:mx-0 sm:rounded-xl"
    >
      <WifiOff className="h-4 w-4 shrink-0 text-amber-600" aria-hidden="true" />
      Çevrimdışısın, değişiklikler bağlanınca gönderilir.
    </div>
  );
};

export default OfflineBanner;
