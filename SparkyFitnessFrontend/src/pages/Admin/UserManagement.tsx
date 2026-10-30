import type React from 'react';
import { useState, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Search,
  UserCog,
  KeyRound,
  Lock,
  MoreHorizontal,
  Pencil,
  ShieldCheck,
  ShieldOff,
  Trash2,
  UserCheck,
  UserX,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from '@/components/ui/accordion';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import ConfirmationDialog from '@/components/ui/ConfirmationDialog';
import { type User } from '../../api/Admin/userManagementService';
import { useUsers } from '@/hooks/Admin/useUsers';
import { useDebounce } from '@/hooks/useDebounce';
import { useAuth } from '@/hooks/useAuth';
import { parseSearchTerms } from '@workspace/shared';
import { SETTINGS_CARD } from '@/pages/Settings/SettingsGroupToggle';

import {
  useUpdateUserFullName,
  useDeleteUser,
  useResetUserPassword,
  useUpdateUserStatus,
  useUpdateUserRole,
  useResetUserMfa,
} from '@/hooks/Admin/useUsers';

type SortKey = 'created_at' | 'full_name' | 'last_login_at';

type PendingAction =
  | { kind: 'delete' | 'resetPassword' | 'resetMfa' | 'role'; user: User }
  | { kind: 'status'; user: User; active: boolean };

const formatDay = (iso: string | null | undefined) =>
  iso
    ? new Date(iso).toLocaleDateString('tr-TR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      })
    : null;

const displayName = (user: User) => user.full_name || user.email;

/** DG FIT admin: phone-friendly user list (card per person + ⋯ menu). */
const UserManagement: React.FC = () => {
  const { t } = useTranslation();
  const { user: me } = useAuth();
  const location = useLocation();
  // The standalone /admin/user-management route shows the list open.
  const standalone = location.pathname.includes('user-management');

  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<SortKey>('created_at');
  const [pending, setPending] = useState<PendingAction | null>(null);
  const [renaming, setRenaming] = useState<User | null>(null);
  const [newName, setNewName] = useState('');

  const debouncedSearchTerm = useDebounce(searchTerm, 500);
  const sortOrder = sortBy === 'full_name' ? 'asc' : 'desc';
  const {
    data: users,
    isLoading,
    isError,
  } = useUsers(debouncedSearchTerm, sortBy, sortOrder);

  const { mutate: updateFullName } = useUpdateUserFullName();
  const { mutate: deleteUser } = useDeleteUser();
  const { mutate: resetPassword } = useResetUserPassword();
  const { mutate: updateStatus } = useUpdateUserStatus();
  const { mutate: updateRole } = useUpdateUserRole();
  const { mutate: resetMfa } = useResetUserMfa();

  const processedUsers = useMemo(() => {
    if (!users) return [];
    const sorted = [...users].sort((a, b) => {
      if (sortBy === 'full_name')
        return (a.full_name ?? '').localeCompare(b.full_name ?? '', 'tr');
      const at = a[sortBy] ? new Date(a[sortBy]).getTime() : 0;
      const bt = b[sortBy] ? new Date(b[sortBy]).getTime() : 0;
      return bt - at;
    });
    const terms = parseSearchTerms(searchTerm);
    if (terms.length === 0) return sorted;
    return sorted.filter((user) => {
      const searchStr =
        `${user.full_name ?? ''} ${user.email ?? ''}`.toLowerCase();
      return terms.every((term) => searchStr.includes(term));
    });
  }, [users, sortBy, searchTerm]);

  const confirmPending = () => {
    if (!pending) return;
    const { user } = pending;
    const name = displayName(user);
    switch (pending.kind) {
      case 'delete':
        deleteUser(user.id);
        break;
      case 'resetPassword':
        resetPassword({ userId: user.id, userName: name });
        break;
      case 'resetMfa':
        resetMfa({ userId: user.id, userName: name });
        break;
      case 'role':
        updateRole({
          userId: user.id,
          role: user.role === 'admin' ? 'user' : 'admin',
        });
        break;
      case 'status':
        updateStatus({
          userId: user.id,
          isActive: pending.active,
          userName: name,
        });
        break;
    }
    setPending(null);
  };

  const pendingCopy = (() => {
    if (!pending) return null;
    const name = displayName(pending.user);
    switch (pending.kind) {
      case 'delete':
        return {
          title: `${name} silinsin mi?`,
          description:
            'Hesap ve tüm kayıtları kalıcı olarak silinir. Bu işlem geri alınamaz.',
          confirm: 'Kullanıcıyı sil',
          destructive: true,
        };
      case 'resetPassword':
        return {
          title: `${name} için şifre sıfırlansın mı?`,
          description: 'Kişi yeni bir şifre belirlemek zorunda kalır.',
          confirm: 'Şifreyi sıfırla',
          destructive: false,
        };
      case 'resetMfa':
        return {
          title: `${name} için iki adımlı doğrulama sıfırlansın mı?`,
          description:
            'Doğrulama uygulaması ve e-posta kodu kapatılır; kişi yalnızca şifresiyle girer.',
          confirm: 'Sıfırla',
          destructive: false,
        };
      case 'role':
        return pending.user.role === 'admin'
          ? {
              title: `${name} yöneticilikten çıkarılsın mı?`,
              description: 'Yönetim ekranına artık giremez.',
              confirm: 'Yöneticilikten çıkar',
              destructive: false,
            }
          : {
              title: `${name} yönetici yapılsın mı?`,
              description:
                'Davet kodları, PT AI anahtarı, yedekler ve kullanıcılar dahil her şeyi yönetebilir.',
              confirm: 'Yönetici yap',
              destructive: false,
            };
      case 'status':
        return pending.active
          ? {
              title: `${name} yeniden etkinleştirilsin mi?`,
              description: 'Kişi tekrar giriş yapabilir.',
              confirm: 'Etkinleştir',
              destructive: false,
            }
          : {
              title: `${name} devre dışı bırakılsın mı?`,
              description:
                'Kişi giriş yapamaz; verileri silinmez. İstediğin zaman geri açabilirsin.',
              confirm: 'Devre dışı bırak',
              destructive: true,
            };
    }
  })();

  const saveRename = () => {
    if (!renaming) return;
    const trimmed = newName.trim();
    if (trimmed && trimmed !== renaming.full_name) {
      updateFullName({ userId: renaming.id, fullName: trimmed });
    }
    setRenaming(null);
  };

  const body = (() => {
    if (isLoading)
      return (
        <p className="text-sm text-muted-foreground">
          {t('admin.userManagement.loadingUsers', 'Loading...')}
        </p>
      );
    if (isError)
      return (
        <p className="text-sm text-destructive">
          {t('admin.userManagement.error', 'Error loading users')}
        </p>
      );
    return (
      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t(
              'admin.userManagement.searchUsers',
              'Search users...'
            )}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="h-11 pl-9"
          />
        </div>
        <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortKey)}>
          <SelectTrigger className="h-11" aria-label="Sıralama">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="created_at">En yeni kayıt</SelectItem>
            <SelectItem value="last_login_at">Son giriş</SelectItem>
            <SelectItem value="full_name">Ada göre</SelectItem>
          </SelectContent>
        </Select>

        {processedUsers.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">
            {t('admin.userManagement.noUsersFound', 'No users found.')}
          </p>
        ) : (
          <ul className="divide-y rounded-xl border">
            {processedUsers.map((user) => {
              const isMe = user.id === me?.id;
              const lastLogin = formatDay(user.last_login_at);
              return (
                <li
                  key={user.id}
                  className="flex items-start gap-2 p-3"
                  data-testid="admin-user-row"
                >
                  <div className="min-w-0 flex-1">
                    <p className="break-words font-semibold">
                      {user.full_name || '—'}
                      {isMe && (
                        <span className="font-normal text-muted-foreground">
                          {' '}
                          (sen)
                        </span>
                      )}
                    </p>
                    <p className="break-all text-sm text-muted-foreground">
                      {user.email}
                    </p>
                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                      {user.role === 'admin' && <Badge>Yönetici</Badge>}
                      {!user.is_active && (
                        <Badge variant="destructive">Devre dışı</Badge>
                      )}
                      {(user.mfa_totp_enabled || user.mfa_email_enabled) && (
                        <Badge variant="outline">İki adımlı doğrulama</Badge>
                      )}
                      <span>
                        {lastLogin ? `Son giriş ${lastLogin}` : 'Hiç giriş yok'}
                      </span>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-11 w-11 shrink-0"
                        aria-label={`${displayName(user)} için işlemler`}
                      >
                        <MoreHorizontal className="h-5 w-5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-60">
                      <DropdownMenuItem
                        className="min-h-11"
                        onSelect={() => {
                          setNewName(user.full_name ?? '');
                          setRenaming(user);
                        }}
                      >
                        <Pencil className="mr-2 h-4 w-4" />
                        Adı değiştir
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="min-h-11"
                        onSelect={() =>
                          setPending({ kind: 'resetPassword', user })
                        }
                      >
                        <KeyRound className="mr-2 h-4 w-4" />
                        Şifreyi sıfırla
                      </DropdownMenuItem>
                      {(user.mfa_totp_enabled || user.mfa_email_enabled) && (
                        <DropdownMenuItem
                          className="min-h-11"
                          onSelect={() =>
                            setPending({ kind: 'resetMfa', user })
                          }
                        >
                          <Lock className="mr-2 h-4 w-4" />
                          İki adımlı doğrulamayı sıfırla
                        </DropdownMenuItem>
                      )}
                      {!isMe && (
                        <>
                          <DropdownMenuItem
                            className="min-h-11"
                            onSelect={() => setPending({ kind: 'role', user })}
                          >
                            {user.role === 'admin' ? (
                              <ShieldOff className="mr-2 h-4 w-4" />
                            ) : (
                              <ShieldCheck className="mr-2 h-4 w-4" />
                            )}
                            {user.role === 'admin'
                              ? 'Yöneticilikten çıkar'
                              : 'Yönetici yap'}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="min-h-11"
                            onSelect={() =>
                              setPending({
                                kind: 'status',
                                user,
                                active: !user.is_active,
                              })
                            }
                          >
                            {user.is_active ? (
                              <UserX className="mr-2 h-4 w-4" />
                            ) : (
                              <UserCheck className="mr-2 h-4 w-4" />
                            )}
                            {user.is_active
                              ? 'Devre dışı bırak'
                              : 'Yeniden etkinleştir'}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="min-h-11 text-destructive focus:text-destructive"
                            onSelect={() =>
                              setPending({ kind: 'delete', user })
                            }
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Kullanıcıyı sil
                          </DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    );
  })();

  return (
    <>
      <Accordion
        type="multiple"
        className="w-full"
        defaultValue={standalone ? ['user-management'] : []}
      >
        <AccordionItem value="user-management" className={SETTINGS_CARD}>
          <AccordionTrigger
            className="flex items-center gap-2 p-4 hover:no-underline"
            description={
              users ? `${users.length} kişi` : 'Hesaplar, roller ve şifreler'
            }
          >
            <UserCog className="h-5 w-5" />
            {t('admin.userManagement.title', 'User Management')}
          </AccordionTrigger>
          <AccordionContent className="p-4 pt-0">{body}</AccordionContent>
        </AccordionItem>
      </Accordion>

      {pendingCopy && (
        <ConfirmationDialog
          open={!!pending}
          onOpenChange={(open) => !open && setPending(null)}
          onConfirm={confirmPending}
          title={pendingCopy.title}
          description={pendingCopy.description}
          variant={pendingCopy.destructive ? 'destructive' : 'default'}
          confirmLabel={pendingCopy.confirm}
        />
      )}

      <Dialog open={!!renaming} onOpenChange={(o) => !o && setRenaming(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adı değiştir</DialogTitle>
          </DialogHeader>
          <Input
            aria-label="Ad soyad"
            className="h-11"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && saveRename()}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenaming(null)}>
              Vazgeç
            </Button>
            <Button onClick={saveRename} disabled={!newName.trim()}>
              Kaydet
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default UserManagement;
