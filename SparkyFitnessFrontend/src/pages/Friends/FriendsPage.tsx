import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { tr } from 'date-fns/locale';
import {
  Check,
  Dumbbell,
  Medal,
  Scale,
  Search,
  Trophy,
  UserPlus,
  X,
} from 'lucide-react';
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
  kg >= 1000
    ? `${(kg / 1000).toLocaleString('tr-TR', { maximumFractionDigits: 1 })} ton`
    : `${kg} kg`;

const timeAgo = (at: string) =>
  formatDistanceToNow(new Date(at), { addSuffix: true, locale: tr });

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
        className="flex w-full items-center gap-3 text-left"
      >
        <UserAvatar user={user} />
        <div className="min-w-0 flex-1">
          <div className="truncate font-semibold">{user?.name ?? '—'}</div>
          <div className="text-xs text-muted-foreground">
            @{user?.username} · {timeAgo(item.at)}
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
        <div className="flex items-center gap-2 rounded-xl bg-muted/40 p-3 text-sm">
          <Scale className="h-4 w-4 text-primary" />
          Kilosunu güncelledi:{' '}
          <span className="font-semibold">{item.weight_kg} kg</span>
          {item.change_kg !== null && item.change_kg !== 0 && (
            <span
              className={
                item.change_kg < 0 ? 'text-emerald-500' : 'text-amber-500'
              }
            >
              ({item.change_kg > 0 ? '+' : ''}
              {item.change_kg})
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

const FriendsTab = () => {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const debounced = useDebounce(query, 300);
  const { data: list } = useFriends();
  const { data: results = [] } = useUserSearch(debounced);
  const sendRequest = useSendFriendRequest();
  const acceptRequest = useAcceptFriendRequest();
  const removeFriendship = useRemoveFriendship();

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Kullanıcı adıyla ara (ör. xpike)"
            className="pl-9"
            autoCapitalize="none"
          />
        </div>
        {debounced.trim().length >= 2 && (
          <div className="space-y-2">
            {results.length === 0 ? (
              <p className="text-sm text-muted-foreground">Kimse bulunamadı.</p>
            ) : (
              results.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center gap-3 rounded-xl border p-3"
                >
                  <UserAvatar user={user} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-semibold">{user.name}</div>
                    <div className="text-xs text-muted-foreground">
                      @{user.username}
                    </div>
                  </div>
                  {user.friendship_status === 'accepted' ? (
                    <span className="text-xs text-muted-foreground">
                      Arkadaşsınız
                    </span>
                  ) : user.friendship_status === 'pending' && user.outgoing ? (
                    <span className="text-xs text-muted-foreground">
                      İstek gönderildi
                    </span>
                  ) : (
                    <Button
                      size="sm"
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
              ))
            )}
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
              className="flex items-center gap-3 rounded-xl border border-primary/40 bg-primary/5 p-3"
            >
              <UserAvatar user={user} />
              <div className="min-w-0 flex-1">
                <div className="truncate font-semibold">{user.name}</div>
                <div className="text-xs text-muted-foreground">
                  @{user.username}
                </div>
              </div>
              <Button
                size="icon"
                aria-label="Kabul et"
                onClick={() => acceptRequest.mutate(user.friendship_id)}
              >
                <Check className="h-4 w-4" />
              </Button>
              <Button
                size="icon"
                variant="outline"
                aria-label="Reddet"
                onClick={() => removeFriendship.mutate(user.friendship_id)}
              >
                <X className="h-4 w-4" />
              </Button>
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
          <button
            key={user.friendship_id}
            type="button"
            onClick={() => navigate(`/arkadaslar/${user.id}`)}
            className="flex w-full items-center gap-3 rounded-xl border bg-card p-3 text-left hover:bg-muted"
          >
            <UserAvatar user={user} />
            <div className="min-w-0 flex-1">
              <div className="truncate font-semibold">{user.name}</div>
              <div className="text-xs text-muted-foreground">
                @{user.username}
              </div>
            </div>
          </button>
        ))}
      </section>

      {(list?.outgoing.length ?? 0) > 0 && (
        <section className="space-y-2">
          <h3 className="text-sm font-semibold text-muted-foreground">
            Bekleyen istekler
          </h3>
          {list!.outgoing.map((user) => (
            <div
              key={user.friendship_id}
              className="flex items-center gap-3 rounded-xl border p-3"
            >
              <UserAvatar user={user} />
              <div className="min-w-0 flex-1">
                <div className="truncate font-semibold">@{user.username}</div>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => removeFriendship.mutate(user.friendship_id)}
              >
                İptal
              </Button>
            </div>
          ))}
        </section>
      )}
    </div>
  );
};

const LeaderboardTab = () => {
  const [metric, setMetric] = useState<LeaderboardMetric>('weekly_workouts');
  const { data: exercises = [] } = useLeaderboardExercises();
  const [exerciseId, setExerciseId] = useState<string | undefined>();
  const { data } = useLeaderboard(metric, exerciseId);
  const usersById = new Map((data?.users ?? []).map((u) => [u.id, u]));
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
            ['weekly_workouts', 'Haftalık antrenman'],
            ['weekly_volume', 'Haftalık hacim'],
            ['exercise', 'Hareket'],
          ] as const
        ).map(([value, label]) => (
          <Button
            key={value}
            size="sm"
            variant={metric === value ? 'default' : 'outline'}
            onClick={() => setMetric(value)}
            className="whitespace-normal text-xs"
          >
            {label}
          </Button>
        ))}
      </div>
      {metric === 'exercise' && (
        <Select value={exerciseId} onValueChange={setExerciseId}>
          <SelectTrigger>
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
          return (
            <div
              key={row.user_id}
              className={`flex items-center gap-3 rounded-xl border p-3 ${
                index === 0 ? 'border-amber-500/50 bg-amber-500/5' : ''
              }`}
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
                <div className="truncate font-semibold">{user?.name}</div>
                {row.detail && (
                  <div className="text-xs text-muted-foreground">
                    En iyi set: {row.detail}
                  </div>
                )}
              </div>
              <div className="text-right">
                <div className="font-bold">
                  {row.value.toLocaleString('tr-TR')}
                </div>
                <div className="text-[10px] text-muted-foreground">{unit}</div>
              </div>
            </div>
          );
        })}
        {data && data.rows.length === 0 && (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Henüz veri yok.
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
      <h2 className="text-2xl font-extrabold tracking-tight">Arkadaşlar</h2>
      <Tabs defaultValue={incoming > 0 ? 'friends' : 'feed'}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="feed">Akış</TabsTrigger>
          <TabsTrigger value="friends">
            Arkadaşlar
            {incoming > 0 && (
              <span className="ml-1 rounded-full bg-primary px-1.5 text-[10px] text-primary-foreground">
                {incoming}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="leaderboard">Sıralama</TabsTrigger>
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
