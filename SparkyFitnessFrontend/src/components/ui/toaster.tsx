import { useToast } from '@/hooks/use-toast';
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from '@/components/ui/toast';

const GENERIC_TITLES = new Set(['Başarılı', 'Başarılı!', 'Success', 'Tamam']);

export function Toaster() {
  const { toasts } = useToast();

  return (
    <ToastProvider>
      {toasts.map(({ id, title, description, action, ...props }) => (
        <Toast key={id} {...props}>
          <div className="grid gap-0.5">
            {/* A bare "Başarılı" heading adds nothing; the sentence says it. */}
            {title && !(GENERIC_TITLES.has(String(title)) && description) && (
              <ToastTitle>{title}</ToastTitle>
            )}
            {!!description && (
              <ToastDescription>{description}</ToastDescription>
            )}
          </div>
          {action}
          <ToastClose />
        </Toast>
      ))}
      <ToastViewport />
    </ToastProvider>
  );
}
