import { useState } from 'react';
import { Copy, Ticket, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import {
  useCreateInviteMutation,
  useDeleteInviteMutation,
  useInviteCodes,
} from '@/hooks/Dgfit/useAccount';

const inviteLink = (code: string) =>
  `${window.location.origin}/login?invite=${encodeURIComponent(code)}`;

const copyInvite = async (code: string) => {
  try {
    await navigator.clipboard.writeText(inviteLink(code));
    toast({ title: 'Davet bağlantısı kopyalandı' });
  } catch {
    toast({ title: 'Kopyalanamadı', description: inviteLink(code) });
  }
};

/** DG FIT admin card: create and manage signup invite codes. */
const InviteCodes = () => {
  const { data: invites = [], isLoading } = useInviteCodes();
  const createInvite = useCreateInviteMutation();
  const deleteInvite = useDeleteInviteMutation();
  const [note, setNote] = useState('');
  const [maxUses, setMaxUses] = useState('1');

  const handleCreate = async () => {
    const created = await createInvite.mutateAsync({
      note: note.trim() || undefined,
      maxUses: Math.min(100, Math.max(1, Number(maxUses) || 1)),
    });
    setNote('');
    await copyInvite(created.code);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Ticket className="h-5 w-5 text-primary" />
          Davet Kodları
        </CardTitle>
        <CardDescription>
          DG FIT'e yalnızca davet koduyla kayıt olunur. Kod oluşturun,
          bağlantıyı arkadaşınıza gönderin.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-[1fr_120px_auto] sm:items-end">
          <div className="space-y-1">
            <Label htmlFor="invite-note">Not (kimin için?)</Label>
            <Input
              id="invite-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="ör. Ahmet"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="invite-uses">Kullanım</Label>
            <Input
              id="invite-uses"
              type="number"
              min={1}
              max={100}
              value={maxUses}
              onChange={(e) => setMaxUses(e.target.value)}
            />
          </div>
          <Button onClick={handleCreate} disabled={createInvite.isPending}>
            Kod oluştur
          </Button>
        </div>

        {isLoading ? (
          <p className="text-sm text-muted-foreground">Yükleniyor…</p>
        ) : invites.length === 0 ? (
          <p className="text-sm text-muted-foreground">Henüz davet kodu yok.</p>
        ) : (
          <ul className="divide-y divide-border rounded-md border">
            {invites.map((invite) => {
              const exhausted = invite.used_count >= invite.max_uses;
              return (
                <li
                  key={invite.code}
                  className="flex items-center gap-3 px-3 py-2 text-sm"
                >
                  <div className="min-w-0 flex-1">
                    <div className="font-mono font-semibold">
                      {invite.code}
                      {exhausted && (
                        <span className="ml-2 rounded bg-muted px-1.5 py-0.5 font-sans text-xs text-muted-foreground">
                          kullanıldı
                        </span>
                      )}
                    </div>
                    <div className="truncate text-xs text-muted-foreground">
                      {invite.note ? `${invite.note} · ` : ''}
                      {invite.used_count}/{invite.max_uses} kullanım
                      {invite.used_by.length > 0 &&
                        ` · ${invite.used_by.join(', ')}`}
                    </div>
                  </div>
                  {!exhausted && (
                    <Button
                      size="icon"
                      variant="ghost"
                      aria-label="Bağlantıyı kopyala"
                      onClick={() => copyInvite(invite.code)}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  )}
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label="Kodu sil"
                    onClick={() => deleteInvite.mutate(invite.code)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
};

export default InviteCodes;
