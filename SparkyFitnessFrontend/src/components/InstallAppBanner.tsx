import { useEffect, useState } from 'react';
import { Download, Share, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { isIos, isStandalone } from '@/hooks/Dgfit/usePush';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const DISMISS_KEY = 'dgfit-install-dismissed';

const readDismissed = () => {
  try {
    return localStorage.getItem(DISMISS_KEY) === '1';
  } catch {
    return false;
  }
};

/**
 * Suggests installing DG FIT on the home screen: Android gets the browser's
 * install prompt, iPhone gets the Share → Add to Home Screen steps.
 */
const InstallAppBanner = () => {
  const [installEvent, setInstallEvent] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(readDismissed);
  const [showIosSteps, setShowIosSteps] = useState(false);

  useEffect(() => {
    const onPrompt = (event: Event) => {
      event.preventDefault();
      setInstallEvent(event as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', onPrompt);
    return () => window.removeEventListener('beforeinstallprompt', onPrompt);
  }, []);

  const dismiss = () => {
    setDismissed(true);
    try {
      localStorage.setItem(DISMISS_KEY, '1');
    } catch {
      // Private mode: the banner just comes back next time.
    }
  };

  if (dismissed || isStandalone()) return null;
  const ios = isIos();
  if (!ios && !installEvent) return null;

  return (
    <div className="mb-4 rounded-2xl border border-primary/40 bg-primary/10 p-3 text-sm">
      <div className="flex items-start gap-3">
        <img
          src="/images/icons/icon-192x192.png"
          alt=""
          className="h-10 w-10 rounded-xl"
        />
        <div className="min-w-0 flex-1">
          <div className="font-semibold">DG FIT'i telefonuna yükle</div>
          <div className="text-xs text-muted-foreground">
            Tam ekran açılır, bildirim alırsın, salonda internet zayıfken bile
            çalışır.
          </div>
          {ios && showIosSteps && (
            <ol className="mt-2 list-decimal space-y-1 pl-4 text-xs">
              <li>
                Safari'de <Share className="inline h-3.5 w-3.5" /> Paylaş'a
                dokun.
              </li>
              <li>"Ana Ekrana Ekle"yi seç, Ekle'ye bas.</li>
              <li>DG FIT'i ana ekrandaki simgeden aç.</li>
            </ol>
          )}
          <div className="mt-2">
            {ios ? (
              !showIosSteps && (
                <Button size="sm" onClick={() => setShowIosSteps(true)}>
                  Nasıl yüklenir?
                </Button>
              )
            ) : (
              <Button
                size="sm"
                onClick={async () => {
                  await installEvent?.prompt();
                  const choice = await installEvent?.userChoice;
                  if (choice?.outcome === 'accepted') dismiss();
                  setInstallEvent(null);
                }}
              >
                <Download className="h-4 w-4" /> Yükle
              </Button>
            )}
          </div>
        </div>
        <button
          type="button"
          aria-label="Kapat"
          onClick={dismiss}
          className="text-muted-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

export default InstallAppBanner;
