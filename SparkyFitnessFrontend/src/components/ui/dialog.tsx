import * as React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';

import { cn } from '@/lib/utils';

import { useTranslation } from 'react-i18next';
const Dialog = DialogPrimitive.Root;

const DialogTrigger = DialogPrimitive.Trigger;

const DialogPortal = DialogPrimitive.Portal;

const DialogClose = DialogPrimitive.Close;

const DialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      'fixed inset-0 z-50 bg-black/80  data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
      className
    )}
    {...props}
  />
));
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName;

const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> & {
    requireConfirmation?: boolean;
  }
>(({ className, children, requireConfirmation = false, ...props }, ref) => {
  const { t } = useTranslation();
  const [showConfirm, setShowConfirm] = React.useState(false);
  // Only ask "close without saving?" once something was actually typed or
  // changed; closing an untouched picker should never need a second tap.
  const [dirty, setDirty] = React.useState(false);
  const hiddenCloseRef = React.useRef<HTMLButtonElement>(null);
  const confirmClose = requireConfirmation && dirty;

  const handleCloseAttempt = (e: Event | React.MouseEvent) => {
    if (confirmClose) {
      e.preventDefault();
      setShowConfirm(true);
    }
  };

  return (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Content
        ref={ref}
        className={cn(
          // Phones: a bottom sheet (DESIGN.md) that scrolls inside itself so a
          // sticky DialogFooter keeps Save in reach. sm+: the centered dialog.
          'dialog-viewport-fit fixed inset-x-0 bottom-0 z-50 grid w-full max-w-lg gap-4 rounded-t-3xl border-0 bg-background p-5 pb-[max(env(safe-area-inset-bottom),1.25rem)] shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=open]:slide-in-from-bottom-8 data-[state=closed]:slide-out-to-bottom-8',
          'sm:inset-x-auto sm:bottom-auto sm:left-[50%] sm:top-[50%] sm:translate-x-[-50%] sm:translate-y-[-50%] sm:rounded-2xl sm:border sm:p-6 sm:data-[state=closed]:zoom-out-95 sm:data-[state=open]:zoom-in-95 sm:data-[state=open]:slide-in-from-bottom-0 sm:data-[state=closed]:slide-out-to-bottom-0',
          className
        )}
        {...props}
        onOpenAutoFocus={(e) => {
          setDirty(false);
          props.onOpenAutoFocus?.(e);
        }}
        onInputCapture={() => setDirty(true)}
        onInteractOutside={(e) => {
          props.onInteractOutside?.(e);
          if (requireConfirmation && !e.defaultPrevented) handleCloseAttempt(e);
        }}
        onEscapeKeyDown={(e) => {
          props.onEscapeKeyDown?.(e);
          if (requireConfirmation && !e.defaultPrevented) handleCloseAttempt(e);
        }}
      >
        <div
          aria-hidden
          className="-mt-2 mb-[-0.5rem] h-1 w-9 justify-self-center rounded-full bg-caption/50 sm:hidden"
        />
        {children}

        {requireConfirmation ? (
          <button
            type="button"
            onClick={(e) =>
              confirmClose
                ? handleCloseAttempt(e)
                : hiddenCloseRef.current?.click()
            }
            className="absolute right-2 top-2 flex h-11 w-11 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none"
          >
            <X className="h-5 w-5" />
            <span className="sr-only">{t('common.close', 'Close')}</span>
          </button>
        ) : (
          <DialogPrimitive.Close className="absolute right-2 top-2 flex h-11 w-11 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none">
            <X className="h-5 w-5" />
            <span className="sr-only">{t('common.close', 'Close')}</span>
          </DialogPrimitive.Close>
        )}

        <DialogPrimitive.Close ref={hiddenCloseRef} className="hidden" />
      </DialogPrimitive.Content>

      {requireConfirmation && (
        <DialogPrimitive.Root open={showConfirm} onOpenChange={setShowConfirm}>
          <DialogPrimitive.Portal>
            <DialogOverlay className="z-60" />
            <DialogPrimitive.Content className="dialog-viewport-fit fixed left-[50%] top-[50%] z-[60] grid w-full max-w-md translate-x-[-50%] translate-y-[-50%] gap-4 rounded-2xl border bg-background p-6 shadow-lg data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95">
              <div className="flex flex-col space-y-1.5 text-center sm:text-left">
                <DialogPrimitive.Title className="text-lg font-semibold leading-none tracking-tight">
                  Kaydetmeden kapatılsın mı?
                </DialogPrimitive.Title>
                <DialogPrimitive.Description className="text-sm text-muted-foreground">
                  Yaptığın değişiklikler kaybolacak.
                </DialogPrimitive.Description>
              </div>
              <div className="mt-2 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => setShowConfirm(false)}
                  className="inline-flex h-11 items-center justify-center rounded-xl border border-input bg-background px-4 text-sm font-semibold hover:bg-accent"
                >
                  Düzenlemeye dön
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowConfirm(false);
                    hiddenCloseRef.current?.click();
                  }}
                  className="inline-flex h-11 items-center justify-center rounded-xl bg-destructive px-4 text-sm font-semibold text-destructive-foreground hover:bg-destructive/90"
                >
                  Kaydetmeden kapat
                </button>
              </div>
            </DialogPrimitive.Content>
          </DialogPrimitive.Portal>
        </DialogPrimitive.Root>
      )}
    </DialogPortal>
  );
});
DialogContent.displayName = DialogPrimitive.Content.displayName;

const DialogHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn('flex flex-col space-y-1.5 pr-8 text-left', className)}
    {...props}
  />
);
DialogHeader.displayName = 'DialogHeader';

const DialogFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      // Phones: pinned to the bottom of the scrolling sheet, full-width buttons.
      'sticky -bottom-5 z-10 -mx-5 flex flex-col-reverse gap-2 border-t border-border bg-background px-5 py-3 sm:static sm:mx-0 sm:flex-row sm:justify-end sm:gap-0 sm:space-x-2 sm:border-0 sm:p-0 [&>button]:h-11 sm:[&>button]:h-10',
      className
    )}
    {...props}
  />
);
DialogFooter.displayName = 'DialogFooter';

const DialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn(
      'text-lg font-semibold leading-none tracking-tight',
      className
    )}
    {...props}
  />
));
DialogTitle.displayName = DialogPrimitive.Title.displayName;

const DialogDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn('text-sm text-muted-foreground', className)}
    {...props}
  />
));
DialogDescription.displayName = DialogPrimitive.Description.displayName;

export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogClose,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
};
