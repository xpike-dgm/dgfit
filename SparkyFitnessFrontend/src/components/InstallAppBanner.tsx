import { useState, useSyncExternalStore } from 'react';
import { ChevronRight, Download, Share, Smartphone, X } from 'lucide-react';
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

const writeDismissed = () => {
  try {
    localStorage.setItem(DISMISS_KEY, '1');
  } catch {
    // Private mode: the banner just comes back next time.
  }
};

// The browser fires `beforeinstallprompt` once, early; keep it here so both
// the Özet banner and the Menü row can use it whenever they are on screen.
let installEvent: BeforeInstallPromptEvent | null = null;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((listener) => listener());

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    installEvent = event as BeforeInstallPromptEvent;
    notify();
  });
  window.addEventListener('appinstalled', () => {
    installEvent = null;
    writeDismissed();
    notify();
  });
}

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

const useInstallEvent = () =>
  useSyncExternalStore(
    subscribe,
    () => installEvent,
    () => null
  );

/** Opens the browser's install prompt; true when the person accepted. */
const promptInstall = async (): Promise<boolean> => {
  const event = installEvent;
  if (!event) return false;
  await event.prompt();
  const choice = await event.userChoice;
  installEvent = null;
  notify();
  return choice.outcome === 'accepted';
};

/** How to add the app by hand: iPhone Safari, or the browser menu elsewhere. */
const InstallSteps = ({ ios }: { ios: boolean }) =>
  ios ? (
    <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-foreground">
      <li>
        Safari'nin alt çubuğundaki{' '}
        <Share
          className="inline h-4 w-4 align-text-bottom"
          aria-hidden="true"
        />{' '}
        Paylaş düğmesine dokun.
      </li>
      <li>Listeden “Ana Ekrana Ekle”yi seç, sonra Ekle'ye dokun.</li>
      <li>DG FIT'i ana ekrandaki simgesinden aç.</li>
    </ol>
  ) : (
    <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-foreground">
      <li>Tarayıcının sağ üstündeki ⋮ menüsüne dokun.</li>
      <li>“Ana ekrana ekle” ya da “Uygulamayı yükle”yi seç.</li>
      <li>DG FIT'i ana ekrandaki simgesinden aç.</li>
    </ol>
  );

/**
 * Suggests installing DG FIT on the home screen: Android gets the browser's
 * install prompt, iPhone gets the Share → Add to Home Screen steps. Once
 * closed it stays away; Menü keeps an "Ana ekrana ekle" row (InstallAppRow).
 */
const InstallAppBanner = () => {
  const event = useInstallEvent();
  const [dismissed, setDismissed] = useState(readDismissed);
  const [showIosSteps, setShowIosSteps] = useState(false);

  const dismiss = () => {
    setDismissed(true);
    writeDismissed();
  };

  if (dismissed || isStandalone()) return null;
  const ios = isIos();
  if (!ios && !event) return null;

  return (
    <div className="mb-3 rounded-2xl bg-card p-4 shadow-[0_1px_3px_rgba(15,23,41,0.06),0_1px_2px_rgba(15,23,41,0.04)] dark:shadow-none">
      <div className="flex items-start gap-3">
        <img
          src="/images/icons/icon-192x192.png"
          alt=""
          className="h-11 w-11 rounded-xl"
        />
        <div className="min-w-0 flex-1">
          <div className="font-semibold text-foreground">
            DG FIT'i telefonuna yükle
          </div>
          <div className="text-sm text-muted-foreground">
            Tam ekran açılır, bildirim alırsın.
          </div>
        </div>
        <button
          type="button"
          aria-label="Kapat"
          onClick={dismiss}
          className="-mt-2 -mr-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-muted-foreground active:bg-accent"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
      {ios && showIosSteps && <InstallSteps ios />}
      <div className="mt-3">
        {ios ? (
          !showIosSteps && (
            <Button
              className="h-11 w-full rounded-full text-base"
              onClick={() => setShowIosSteps(true)}
            >
              Nasıl yüklenir?
            </Button>
          )
        ) : (
          <Button
            className="h-11 w-full rounded-full text-base"
            onClick={async () => {
              if (await promptInstall()) dismiss();
            }}
          >
            <Download className="h-5 w-5" /> Yükle
          </Button>
        )}
      </div>
    </div>
  );
};

/**
 * Menü row that stays available after the banner was closed: opens the
 * browser's install prompt when there is one, otherwise shows the steps.
 * Hidden when DG FIT already runs from the home screen.
 */
export const InstallAppRow = () => {
  const event = useInstallEvent();
  const [showSteps, setShowSteps] = useState(false);
  if (isStandalone()) return null;
  const ios = isIos();

  return (
    <div className="mb-4 overflow-hidden rounded-2xl bg-card shadow-[0_1px_3px_rgba(15,23,41,0.06),0_1px_2px_rgba(15,23,41,0.04)] dark:shadow-none">
      <button
        type="button"
        aria-expanded={event ? undefined : showSteps}
        onClick={async () => {
          if (event) await promptInstall();
          else setShowSteps((open) => !open);
        }}
        className="flex w-full items-center p-4 text-left transition-opacity active:opacity-70"
      >
        <span className="mr-3 flex h-10 w-10 shrink-0 items-center justify-center text-primary">
          <Smartphone className="h-[22px] w-[22px]" strokeWidth={2.2} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-base font-semibold text-foreground">
            Ana ekrana ekle
          </span>
          <span className="mt-0.5 block text-sm text-muted-foreground">
            Uygulama gibi tam ekran aç
          </span>
        </span>
        <ChevronRight
          className={`h-5 w-5 text-muted-foreground transition-transform ${showSteps ? 'rotate-90' : ''}`}
        />
      </button>
      {showSteps && (
        <div className="border-t border-border px-4 pt-1 pb-4">
          <InstallSteps ios={ios} />
        </div>
      )}
    </div>
  );
};

export default InstallAppBanner;
