import { Collapsible, CollapsibleContent } from '@/components/ui/collapsible';
import { SettingsGroupToggle } from '@/pages/Settings/SettingsGroupToggle';
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
    <div className="flex flex-col">
      <InviteCodes />
      <GlobalAISettings />
      <AiUsage />
      <UserManagement />
      <BackupSettings />
      <Collapsible>
        <SettingsGroupToggle
          label="Gelişmiş"
          hint="Giriş yöntemleri, OIDC, veri sağlayıcıları"
        />
        <CollapsibleContent className="flex flex-col">
          <GlobalProviderSettings />
          <AuthenticationSettings />
          <OidcSettings />
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
};

export default AdminPage;
