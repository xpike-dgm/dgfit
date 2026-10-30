import { useState } from 'react';
import { AtSign } from 'lucide-react';
import { AccordionContent, AccordionTrigger } from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { usePrivacy, useUpdatePrivacy } from '@/hooks/Dgfit/useFriends';
import {
  useMyUsername,
  useUpdateUsernameMutation,
} from '@/hooks/Dgfit/useAccount';

const SHARE_OPTIONS = [
  ['share_workouts', 'Antrenmanlarım ve kaldırdığım ağırlıklar'],
  ['share_weight', 'Kilom'],
  ['share_nutrition', 'Kalori ve makrolarım'],
  ['share_measurements', 'Vücut ölçülerim'],
  ['share_programs', 'Haftalık programlarım'],
] as const;

/** Username (friends find you by it) and what friends can see. */
export const DgfitSocialSettings = () => {
  const { data } = useMyUsername();
  const updateUsername = useUpdateUsernameMutation();
  // Unedited, the field shows the saved username.
  const [draft, setUsername] = useState<string | null>(null);
  const username = draft ?? data?.username ?? '';

  const valid = /^[a-z0-9_.]{3,20}$/.test(username);
  const { data: privacy } = usePrivacy();
  const updatePrivacy = useUpdatePrivacy();

  return (
    <>
      <AccordionTrigger
        className="flex items-center gap-2 p-4 hover:no-underline"
        description="Kullanıcı adın ve arkadaşlarının ne görebileceği"
      >
        <AtSign className="h-5 w-5" />
        Kullanıcı Adı & Gizlilik
      </AccordionTrigger>
      <AccordionContent className="p-4 pt-0 space-y-6">
        <form
          className="space-y-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (valid) updateUsername.mutate(username);
          }}
        >
          <Label htmlFor="dgfit-username">Kullanıcı adı</Label>
          <div className="flex gap-2">
            <Input
              id="dgfit-username"
              value={username}
              onChange={(e) =>
                setUsername(
                  e.target.value.toLowerCase().replace(/[^a-z0-9_.]/g, '')
                )
              }
              placeholder="ör. xpike"
              autoCapitalize="none"
            />
            <Button
              type="submit"
              disabled={
                !valid ||
                username === data?.username ||
                updateUsername.isPending
              }
            >
              Kaydet
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            3-20 karakter: küçük harf, rakam, _ ve .
          </p>
        </form>
        <div className="space-y-3">
          <div>
            <h4 className="font-semibold">Arkadaşlarla paylaş</h4>
            <p className="text-xs text-muted-foreground">
              Kapattığın bilgiler arkadaşlarının akışında ve profil sayfanda
              görünmez.
            </p>
          </div>
          {SHARE_OPTIONS.map(([key, label]) => (
            <div key={key} className="flex items-center justify-between gap-4">
              <Label htmlFor={`privacy-${key}`} className="font-normal">
                {label}
              </Label>
              <Switch
                id={`privacy-${key}`}
                checked={privacy?.[key] ?? true}
                disabled={!privacy || updatePrivacy.isPending}
                onCheckedChange={(checked) =>
                  updatePrivacy.mutate({ [key]: checked })
                }
              />
            </div>
          ))}
        </div>
      </AccordionContent>
    </>
  );
};
