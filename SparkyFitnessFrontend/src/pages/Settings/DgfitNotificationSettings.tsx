import { useEffect, useState } from 'react';
import { Bell, Share, SquarePlus } from 'lucide-react';
import { AccordionContent, AccordionTrigger } from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { TimeInput } from '@/components/ui/TimeInput';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  isIos,
  isStandalone,
  pushSupported,
  useDisablePush,
  useEnablePush,
  usePushStatus,
  useTestPush,
  useUpdateNotificationSettings,
  type NotificationSettings,
} from '@/hooks/Dgfit/usePush';

/** Shown on iPhone/iPad until DG FIT is opened from the Home Screen. */
export const IosInstallSteps = () => (
  <div className="space-y-2 rounded-xl border border-primary/40 bg-primary/5 p-3 text-sm">
    <p className="font-semibold">
      iPhone'da bildirim için DG FIT'i ana ekrana ekle:
    </p>
    <ol className="list-decimal space-y-1 pl-5">
      <li>
        Safari'de alttaki <Share className="inline h-4 w-4" /> Paylaş düğmesine
        dokun.
      </li>
      <li>
        <SquarePlus className="inline h-4 w-4" /> "Ana Ekrana Ekle"yi seç ve
        Ekle'ye bas.
      </li>
      <li>
        Ana ekrandaki DG FIT simgesinden aç, sonra buradan bildirimleri aç.
      </li>
    </ol>
    <p className="text-xs text-muted-foreground">iOS 16.4 veya üstü gerekir.</p>
  </div>
);

const TIME_FIELDS = [
  [
    'workout_reminder',
    'workout_reminder_time',
    'Antrenman hatırlatması',
    'Programında antrenman olan günlerde, henüz antrenman girmediysen',
  ],
  [
    'food_reminder',
    'food_reminder_time',
    'Yemek hatırlatması',
    'O gün hiç yemek girmediysen',
  ],
] as const;

export const DgfitNotificationSettings = () => {
  const { data } = usePushStatus();
  const enable = useEnablePush();
  const disable = useDisablePush();
  const test = useTestPush();
  const update = useUpdateNotificationSettings();
  const [subscribed, setSubscribed] = useState<boolean | null>(null);

  const supported = pushSupported();
  const needsInstall = isIos() && !isStandalone();

  useEffect(() => {
    if (!supported) return;
    let cancelled = false;
    navigator.serviceWorker.ready
      .then((registration) => registration.pushManager.getSubscription())
      .then((subscription) => {
        if (!cancelled) setSubscribed(!!subscription);
      })
      .catch(() => {
        if (!cancelled) setSubscribed(false);
      });
    return () => {
      cancelled = true;
    };
  }, [supported, enable.isSuccess, disable.isSuccess]);

  const settings = data?.settings;
  const change = (patch: Partial<NotificationSettings>) => update.mutate(patch);

  return (
    <>
      <AccordionTrigger
        className="flex items-center gap-2 p-4 hover:no-underline"
        description="Antrenman, yemek ve arkadaş bildirimleri"
      >
        <Bell className="h-5 w-5" />
        Bildirimler
      </AccordionTrigger>
      <AccordionContent className="space-y-5 p-4 pt-0">
        {needsInstall ? (
          <IosInstallSteps />
        ) : !supported ? (
          <p className="text-sm text-muted-foreground">
            Bu tarayıcı bildirimleri desteklemiyor.
          </p>
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            {subscribed ? (
              <>
                <span className="text-sm text-emerald-500">
                  Bu cihazda bildirimler açık
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => test.mutate()}
                  disabled={test.isPending}
                >
                  Test bildirimi gönder
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => disable.mutate()}
                >
                  Kapat
                </Button>
              </>
            ) : (
              <Button
                onClick={() => data && enable.mutate(data.publicKey)}
                disabled={!data || enable.isPending}
              >
                <Bell className="h-4 w-4" /> Bu cihazda bildirimleri aç
              </Button>
            )}
          </div>
        )}

        {settings && (
          <div className="space-y-4">
            {TIME_FIELDS.map(([flag, timeKey, label, hint]) => (
              <div key={flag} className="space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <Label id={`notif-${flag}-label`} htmlFor={`notif-${flag}`}>
                      {label}
                    </Label>
                    <p className="text-xs text-muted-foreground">{hint}</p>
                  </div>
                  <Switch
                    id={`notif-${flag}`}
                    checked={settings[flag]}
                    onCheckedChange={(checked) => change({ [flag]: checked })}
                  />
                </div>
                {settings[flag] && (
                  <div className="w-36">
                    <TimeInput
                      key={settings[timeKey]}
                      aria-labelledby={`notif-${flag}-label`}
                      defaultValue={settings[timeKey]}
                      onBlur={(value) =>
                        value &&
                        value !== settings[timeKey] &&
                        change({ [timeKey]: value })
                      }
                    />
                  </div>
                )}
              </div>
            ))}
            <div className="flex items-center justify-between gap-3">
              <div>
                <Label htmlFor="notif-water">Su hatırlatması</Label>
                <p className="text-xs text-muted-foreground">
                  Saat 15:00'te 1 litreden az su içtiysen
                </p>
              </div>
              <Switch
                id="notif-water"
                checked={settings.water_reminder}
                onCheckedChange={(checked) =>
                  change({ water_reminder: checked })
                }
              />
            </div>
            <div className="flex items-center justify-between gap-3">
              <div>
                <Label htmlFor="notif-friends">Arkadaş bildirimleri</Label>
                <p className="text-xs text-muted-foreground">
                  Arkadaşlık istekleri ve kabulleri
                </p>
              </div>
              <Switch
                id="notif-friends"
                checked={settings.friend_activity}
                onCheckedChange={(checked) =>
                  change({ friend_activity: checked })
                }
              />
            </div>
          </div>
        )}
      </AccordionContent>
    </>
  );
};
