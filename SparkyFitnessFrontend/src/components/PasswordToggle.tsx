import { Eye, EyeOff } from 'lucide-react';
import { Toggle } from './ui/toggle';

type PasswordToggleProps = {
  showPassword: boolean;
  passwordToggleHandler: () => void;
};

/**
 * Show/hide button laid over a 44px password field that sits under a Label
 * (14px label + 8px gap), so it covers the field's full height.
 */
const PasswordToggle: React.FC<PasswordToggleProps> = ({
  showPassword,
  passwordToggleHandler,
}) => (
  <Toggle
    pressed={showPassword}
    onPressedChange={passwordToggleHandler}
    className="absolute right-0 top-[22px] h-11 w-11 rounded-lg p-0 text-muted-foreground hover:bg-transparent data-[state=on]:bg-transparent data-[state=on]:text-primary"
    aria-label={showPassword ? 'Şifreyi gizle' : 'Şifreyi göster'}
  >
    {showPassword ? (
      <EyeOff className="h-5 w-5" />
    ) : (
      <Eye className="h-5 w-5" />
    )}
  </Toggle>
);

export default PasswordToggle;
