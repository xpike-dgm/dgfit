import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getInitials } from '@/utils/settings';

interface UserAvatarProps {
  user?: { name?: string | null; avatar_url?: string | null } | null;
  className?: string;
}

export const UserAvatar = ({ user, className }: UserAvatarProps) => (
  <Avatar className={className ?? 'h-10 w-10'}>
    {user?.avatar_url && <AvatarImage src={user.avatar_url} alt="" />}
    <AvatarFallback className="bg-primary/15 font-semibold text-primary">
      {getInitials(user?.name ?? '?')}
    </AvatarFallback>
  </Avatar>
);
