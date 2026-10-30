import { formatDistanceToNow } from 'date-fns';
import { tr } from 'date-fns/locale';

/** "3 saat önce" for feed items; drops date-fns' hedging "yaklaşık". */
export const timeAgo = (at: string): string =>
  formatDistanceToNow(new Date(at), { addSuffix: true, locale: tr }).replace(
    /^yaklaşık /,
    ''
  );
