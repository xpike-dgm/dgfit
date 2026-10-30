import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { timeAgo } from '@/utils/timeAgo';
import {
  Check,
  ChevronRight,
  Copy,
  Dumbbell,
  Medal,
  Scale,
  Search,
  Trophy,
  UserMinus,
  UserPlus,
  X,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import ConfirmationDialog from '@/components/ui/ConfirmationDialog';
import { useAuth } from '@/hooks/useAuth';
import { useMyUsername } from '@/hooks/Dgfit/useAccount';
import { toast } from '@/hooks/use-toast';
import { fmtTr, fmtTrUnit } from '@/utils/numberFormatting';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useDebounce } from '@/hooks/useDebounce';
import {
  useAcceptFriendRequest,
  useFeed,
  useFriends,
  useLeaderboard,
  useLeaderboardExercises,
  useRemoveFriendship,
  useSendFriendRequest,
  useUserSearch,
} from '@/hooks/Dgfit/useFriends';
import type {
  FeedItem,
  LeaderboardMetric,
  PublicUser,
} from '@/hooks/Dgfit/useFriends';
import { UserAvatar } from './UserAvatar';

const formatVolume = (kg: number) =>
  kg >= 1000 ? fmtTrUnit(kg / 1000, 'ton') : fmtTrUnit(kg, 'kg', 0);

const FeedCard = ({
  item,
  user,
  onOpen,
}: {
  item: FeedItem;
  user?: PublicUser;
  onOpen: () => void;
}) => (
  <Card>
    <CardContent className="space-y-2 p-4">
      <button
        type="button"
        onClick={onOpen}
        className="flex min-h-11 w-full items-center gap-3 text-left"
      >
        <UserAvatar user={user} />
        <div className="min-w-0 flex-1">
          <div className="truncate font-semibold">
            {user?.name || (user?.username ? `@${user.username}` : '—')}
          </div>
          <div className="text-xs text-muted-foreground">
            {timeAgo(item.at)}
          </div>
        </div>
      </button>
      {item.type === 'workout' ? (
        <div className="rounded-xl bg-muted/40 p-3">
          <div className="flex items-center gap-2 font-semibold">
            <Dumbbell className="h-4 w-4 text-primary" />
            {item.name}
            {item.has_pr && (
              <span className="ml-auto flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-xs text-amber-500">
                <Trophy className="h-3 w-3" /> PR
              </span>
            )}
          </div>
          <div className="mt-1 text-sm text-muted-foreground">
            {item.exercise_count} hareket · {item.set_count} set ·{' '}
            {formatVolume(item.volume_kg)}
          </div>
          <div className="mt-1 truncate text-xs text-muted-foreground">
            {item.exercises.slice(0, 4).join(', ')}
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-xl bg-muted/40 p-3 text-sm">
          <Scale className="h-4 w-4 text-primary" />
          Kilosunu güncelledi:{' '}
          <span className="font-semibold">
            {fmtTrUnit(item.weight_kg, 'kg')}
          </span>
          {item.change_kg !== null && item.change_kg !== 0 && (
            <span
              className={
                item.change_kg < 0 ? 'text-emerald-500' : 'text-amber-500'
              }
            >
              ({item.change_kg > 0 ? '+' : ''}
              {fmtTr(item.change_kg)})
            </span>
          )}
        </div>
      )}
    </CardContent>
  </Card>
);

const FeedTab = () => {
  const navigate = useNavigate();
  const { data, isLoading } = useFeed();
  const usersById = useMemo(
    () => new Map((data?.users ?? []).map((u) => [u.id, u])),
    [data?.users]
  );
  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Yükleniyor…</p>;
  }
  if (!data?.items.length) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        Son iki haftada paylaşılan bir şey yok. Arkadaş ekle, antrenman yap,
        akış dolsun!
      </p>
    );
  }
  return (
    <div className="space-y-3">
      {data.items.map((item, i) => (
        <FeedCard
          key={`${item.type}-${item.user_id}-${item.at}-${i}`}
          item={item}
          user={usersById.get(item.user_id)}
          onOpen={() => navigate(`/arkadaslar/${item.user_id}`)}
        />
      ))}
    </div>
  );
};

const MyUsernameCard = () => {
  const { data } = useMyUsername();
  const username = data?.username;
  if (!username) {
    return (
      <div className="rounded-xl bg-accent p-3 text-sm">
        Arkadaşlarının seni bulabilmesi için önce bir kullanıcı adı seç.{' '}
        <Link
          to="/settings?section=dgfit-social"
          className="font-semibold text-primary underline"
        >
          Kullanıcı adı belirle
        </Link>
      </div>
    );
  }
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(username);
      toast({ description: `Kullanıcı adın kopyalandı: @${username}` });
    } catch {
      toast({ description: `Kullanıcı adın: @${username}` });
    }
  };
  return (
    <div className="flex items-center gap-3 rounded-xl bg-accent p-3">
      <div className="min-w-0 flex-1 text-sm">
        <div className="text-muted-foreground">Senin kullanıcı adın</div>
        <div className="truncate font-semibold">@{username}</div>
      </div>
      <Button variant="outline" className="h-11 shrink-0" onClick={copy}>
        <Copy className="h-4 w-4" /> Kopyala
      </Button>
    </div>
  );
};

type PendingRemoval = {
  friendshipId: string;
  name: string;
  kind: 'decline' | 'unfriend';
};

const FriendsTab = () => {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const debounced = useDebounce(query, 300);
  const { data: list } = useFriends();
  const { data: results = [], isFetching } = useUserSearch(debounced);
  const sendRequest = useSendFriendRequest();
  const acceptRequest = useAcceptFriendRequest();
  const removeFriendship = useRemoveFriendship();
  const [pending, setPending] = useState<PendingRemoval | null>(null);
  const trimmed = query.trim();

  return (
    <div className="space-y-5">
      <MyUsernameCard />
      <div className="space-y-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Kullanıcı adıyla ara (ör. ahmet)"
            aria-label="Arkadaş ara"
            className="h-11 pl-9"
            autoCapitalize="none"
            autoCorrect="off"
          />
        </div>
        {trimmed.length === 1 && (
          <p className="text-sm text-muted-foreground">En az 2 harf yaz.</p>
        )}
        {debounced.trim().length >= 2 && (
          <div className="space-y-2">
            {results.length === 0
              ? !isFetching && (
                  <div className="rounded-xl border border-dashed p-3 text-sm text-muted-foreground">
                    <p className="font-medium text-foreground">
                      “{debounced.trim()}” adında kimse yok.
                    </p>
                    <p className="mt-1">
                      Arama yalnızca kullanıcı adına bakar. Arkadaşından
                      kullanıcı adını sor; henüz yoksa Ayarlar → Kullanıcı adı
                      ve gizlilik bölümünden bir tane belirlemesi gerekir.
                    </p>
                  </div>
                )
              : results.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center gap-3 rounded-xl border p-3"
                  >
                    <UserAvatar user={user} />
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-semibold">{user.name}</div>
                      <div className="truncate text-xs text-muted-foreground">
                        @{user.username}
                      </div>
                    </div>
                    {user.friendship_status === 'accepted' ? (
                      <span className="text-xs text-muted-foreground">
                        Arkadaşsınız
                      </span>
                    ) : user.friendship_status === 'pending' &&
                      user.outgoing ? (
                      <span className="text-xs text-muted-foreground">
                        İstek gönderildi
                      </span>
                    ) : (
                      <Button
                        className="h-11 shrink-0"
                        onClick={() => sendRequest.mutate(user.username ?? '')}
                        disabled={sendRequest.isPending}
                      >
                        <UserPlus className="h-4 w-4" />
                        {user.friendship_status === 'pending'
                          ? 'Kabul et'
                          : 'Ekle'}
                      </Button>
                    )}
                  </div>
                ))}
          </div>
        )}
      </div>

      {(list?.incoming.length ?? 0) > 0 && (
        <section className="space-y-2">
          <h3 className="text-sm font-semibold text-muted-foreground">
            Gelen istekler
          </h3>
          {list!.incoming.map((user) => (
            <div
              key={user.friendship_id}
              className="space-y-3 rounded-xl border border-primary/40 bg-primary/5 p-3"
            >
              <div className="flex items-center gap-3">
                <UserAvatar user={user} />
                <div className="min-w-0 flex-1">
                  <div className="truncate font-semibold">{user.name}</div>
                  <div className="truncate text-xs text-muted-foreground">
                    @{user.username}
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  className="h-11"
                  onClick={() => acceptRequest.mutate(user.friendship_id)}
                  disabled={acceptRequest.isPending}
                >
                  <Check className="h-4 w-4" /> Kabul et
                </Button>
                <Button
                  variant="outline"
                  className="h-11"
                  onClick={() =>
                    setPending({
                      friendshipId: user.friendship_id,
                      name: user.name,
                      kind: 'decline',
                    })
                  }
                >
                  <X className="h-4 w-4" /> Reddet
                </Button>
              </div>
            </div>
          ))}
        </section>
      )}

      <section className="space-y-2">
        <h3 className="text-sm font-semibold text-muted-foreground">
          Arkadaşların ({list?.friends.length ?? 0})
        </h3>
        {list?.friends.length === 0 && (
          <p className="text-sm text-muted-foreground">
            Henüz arkadaşın yok. Yukarıdan kullanıcı adıyla arayıp
            ekleyebilirsin.
          </p>
        )}
        {list?.friends.map((user) => (
          <div
            key={user.friendship_id}
            className="flex items-center rounded-xl border bg-card"
          >
            <button
              type="button"
              onClick={() => navigate(`/arkadaslar/${user.id}`)}
              className="flex min-h-11 min-w-0 flex-1 items-center gap-3 rounded-l-xl p-3 text-left hover:bg-muted"
            >
              <UserAvatar user={user} />
              <div className="min-w-0 flex-1">
                <div className="truncate font-semibold">{user.name}</div>
                <div className="truncate text-xs text-muted-foreground">
                  @{user.username}
                </div>
              </div>
              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
            </button>
            <Button
              variant="ghost"
              size="icon"
              className="mr-1 h-11 w-11 shrink-0 text-muted-foreground"
              aria-label={`${user.name} arkadaşlıktan çıkar`}
              onClick={() =>
                setPending({
                  friendshipId: user.friendship_id,
                  name: user.name,
                  kind: 'unfriend',
                })
              }
            >
              <UserMinus className="h-5 w-5" />
            </Button>
          </div>
        ))}
      </section>

      {(list?.outgoing.length ?? 0) > 0 && (
        <section className="space-y-2">
          <h3 className="text-sm font-semibold text-muted-foreground">
            Gönderdiğin istekler
          </h3>
          {list!.outgoing.map((user) => (
            <div
              key={user.friendship_id}
              className="flex items-center gap-3 rounded-xl border p-3"
            >
              <UserAvatar user={user} />
              <div className="min-w-0 flex-1">
                <div className="truncate font-semibold">@{user.username}</div>
                <div className="text-xs text-muted-foreground">
                  Yanıt bekleniyor
                </div>
              </div>
              <Button
                variant="outline"
                className="h-11 shrink-0"
                onClick={() => removeFriendship.mutate(user.friendship_id)}
              >
                Geri al
              </Button>
            </div>
          ))}
        </section>
      )}

      <ConfirmationDialog
        open={!!pending}
        onOpenChange={(open) => !open && setPending(null)}
        onConfirm={() => {
          if (pending) removeFriendship.mutate(pending.friendshipId);
          setPending(null);
        }}
        title={
          pending?.kind === 'decline'
            ? `${pending.name} isteği reddedilsin mi?`
            : `${pending?.name ?? ''} arkadaşlıktan çıkarılsın mı?`
        }
        description={
          pending?.kind === 'decline'
            ? 'İstek silinir. Kişi sana daha sonra yeniden istek gönderebilir.'
            : 'Artık birbirinizin antrenmanlarını ve paylaşımlarını görmezsiniz. Daha sonra yeniden arkadaş olabilirsiniz.'
        }
        variant="destructive"
        confirmLabel={pending?.kind === 'decline' ? 'Reddet' : 'Çıkar'}
      />
    </div>
  );
};

const LeaderboardTab = () => {
  const [metric, setMetric] = useState<LeaderboardMetric>('weekly_workouts');
  const { data: exercises = [] } = useLeaderboardExercises();
  const [exerciseId, setExerciseId] = useState<string | undefined>();
  const { data } = useLeaderboard(metric, exerciseId);
  const usersById = new Map((data?.users ?? []).map((u) => [u.id, u]));
  const myId = useAuth().user?.id;
  const unit =
    metric === 'weekly_workouts'
      ? 'antrenman'
      : metric === 'weekly_volume'
        ? 'kg hacim'
        : 'kg (tahmini 1RM)';

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-2">
        {(
          [
            ['weekly_workouts', 'Antrenman'],
            ['weekly_volume', 'Hacim'],
            ['exercise', 'Rekor'],
          ] as const
        ).map(([value, label]) => (
          <Button
            key={value}
            variant={metric === value ? 'default' : 'outline'}
            onClick={() => setMetric(value)}
            aria-pressed={metric === value}
            className="h-11 whitespace-nowrap px-2"
          >
            {label}
          </Button>
        ))}
      </div>
      <p className="text-sm text-muted-foreground">
        {metric === 'weekly_workouts'
          ? 'Bu hafta kim kaç antrenman yaptı.'
          : metric === 'weekly_volume'
            ? 'Bu hafta kaldırılan toplam ağırlık (set × tekrar × kg).'
            : 'Seçtiğin harekette en yüksek tahmini tek tekrar (1RM).'}
      </p>
      {metric === 'exercise' && (
        <Select value={exerciseId} onValueChange={setExerciseId}>
          <SelectTrigger className="h-11" aria-label="Hareket">
            <SelectValue placeholder="Hareket seç" />
          </SelectTrigger>
          <SelectContent>
            {exercises.map((e) => (
              <SelectItem key={e.exercise_id} value={e.exercise_id}>
                {e.name} ({e.people} kişi)
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
      <div className="space-y-2">
        {(data?.rows ?? []).map((row, index) => {
          const user = usersById.get(row.user_id);
          const isMe = row.user_id === myId;
          return (
            <div
              key={row.user_id}
              className={`flex items-center gap-3 rounded-xl border p-3 ${
                index === 0 ? 'border-amber-500/50 bg-amber-500/5' : ''
              } ${isMe ? 'ring-2 ring-primary/40' : ''}`}
            >
              <span className="w-6 text-center font-bold text-muted-foreground">
                {index < 3 ? (
                  <Medal
                    className={`mx-auto h-5 w-5 ${
                      ['text-amber-500', 'text-slate-300', 'text-orange-700'][
                        index
                      ]
                    }`}
                  />
                ) : (
                  index + 1
                )}
              </span>
              <UserAvatar user={user} />
              <div className="min-w-0 flex-1">
                <div className="truncate font-semibold">
                  {user?.name}
                  {isMe && (
                    <span className="font-normal text-muted-foreground">
                      {' '}
                      (sen)
                    </span>
                  )}
                </div>
                {row.detail && (
                  <div className="text-xs text-muted-foreground">
                    En iyi set: {row.detail}
                  </div>
                )}
              </div>
              <div className="text-right">
                <div className="font-bold">{fmtTr(row.value)}</div>
                <div className="text-[10px] text-muted-foreground">{unit}</div>
              </div>
            </div>
          );
        })}
        {data && data.rows.length === 0 && (
          <p className="py-6 text-center text-sm text-muted-foreground">
            {metric === 'exercise' && !exerciseId
              ? 'Sıralamayı görmek için bir hareket seç.'
              : 'Bu hafta henüz kayıt yok.'}
          </p>
        )}
      </div>
    </div>
  );
};

const FriendsPage = () => {
  const { data: list } = useFriends();
  const incoming = list?.incoming.length ?? 0;
  return (
    <div className="space-y-4 pb-4">
      <h2 className="hidden text-2xl font-bold sm:block">Arkadaşlar</h2>
      <Tabs defaultValue={incoming > 0 ? 'friends' : 'feed'}>
        <TabsList className="grid h-auto w-full grid-cols-3">
          <TabsTrigger value="feed" className="min-h-11">
            Akış
          </TabsTrigger>
          <TabsTrigger value="friends" className="min-h-11">
            Arkadaşlar
            {incoming > 0 && (
              <span className="ml-1 rounded-full bg-primary px-1.5 text-[10px] text-primary-foreground">
                {incoming}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="leaderboard" className="min-h-11">
            Sıralama
          </TabsTrigger>
        </TabsList>
        <TabsContent value="feed" className="mt-4">
          <FeedTab />
        </TabsContent>
        <TabsContent value="friends" className="mt-4">
          <FriendsTab />
        </TabsContent>
        <TabsContent value="leaderboard" className="mt-4">
          <LeaderboardTab />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default FriendsPage;
