import { useEffect, useState } from 'react';
import { AtSign } from 'lucide-react';
import { AccordionContent, AccordionTrigger } from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  useMyUsername,
  useUpdateUsernameMutation,
} from '@/hooks/Dgfit/useAccount';

/** Username (friends find you by it). */
export const DgfitSocialSettings = () => {
  const { data } = useMyUsername();
  const updateUsername = useUpdateUsernameMutation();
  const [username, setUsername] = useState('');

  useEffect(() => {
    setUsername(data?.username ?? '');
  }, [data?.username]);

  const valid = /^[a-z0-9_.]{3,20}$/.test(username);

  return (
    <>
      <AccordionTrigger
        className="flex items-center gap-2 p-4 hover:no-underline"
        description="Arkadaşların seni kullanıcı adınla bulur"
      >
        <AtSign className="h-5 w-5" />
        Kullanıcı Adı
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
      </AccordionContent>
    </>
  );
};
