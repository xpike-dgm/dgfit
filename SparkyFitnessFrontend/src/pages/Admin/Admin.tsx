import { ChevronDown } from 'lucide-react';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import AuthenticationSettings from './AuthenticationSettings';
import BackupSettings from './BackupSettings';
import OidcSettings from './OidcSettings';
import UserManagement from './UserManagement';
import InviteCodes from './InviteCodes';
import AiUsage from './AiUsage';
import GlobalAISettings from './GlobalAISettings';
import GlobalProviderSettings from './GlobalProviderSettings';

/** DG FIT admin: everyday tasks first, server plumbing folded away. */
const AdminPage = () => {
  return (
    <div className="flex flex-col space-y-4">
      <InviteCodes />
      <GlobalAISettings />
      <AiUsage />
      <UserManagement />
      <BackupSettings />
      <Collapsible>
        <CollapsibleTrigger className="group flex w-full items-center justify-between px-1 pt-2 text-left text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Gelişmiş (giriş, OIDC, veri sağlayıcıları)
          <ChevronDown className="h-4 w-4 transition-transform group-data-[state=open]:rotate-180" />
        </CollapsibleTrigger>
        <CollapsibleContent className="flex flex-col space-y-4 pt-4">
          <GlobalProviderSettings />
          <AuthenticationSettings />
          <OidcSettings />
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
};

export default AdminPage;
