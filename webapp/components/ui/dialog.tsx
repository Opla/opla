/* eslint-disable react/jsx-props-no-spreading */
import { LegacyRef, useCallback, useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from './button';

function DialogClose({ className, onClose }: { className?: string; onClose: () => void }) {
  return (
    <Button
      variant="ghost"
      aria-label="Close"
      className={cn(
        'absolute right-2 top-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground',
        className,
      )}
      type="button"
      onClick={onClose}
    >
      <X className="h-4 w-4" strokeWidth={1.5} />
    </Button>
  );
}
DialogClose.displayName = 'DialogClose';

function Dialog({
  id,
  title,
  open,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  setOpen,
  onClose,
  children,
  size,
}: {
  id?: string;
  title?: string;
  open: boolean;
  setOpen?: (open: boolean) => void;
  onClose: () => void;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  children: React.ReactNode;
}) {
  const modalRef = useRef<HTMLDialogElement>(null);
  // Dialog setOpen TODO

  const handleDialogClick = useCallback(
    (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!document.body.classList.contains('modalbox-open') && target.nodeName === 'DIALOG') {
        event.stopPropagation();
        onClose();
      }
    },
    [onClose],
  );

  useEffect(() => {
    const dialog = modalRef;
    dialog.current?.addEventListener('click', handleDialogClick);
    if (open) {
      dialog.current?.showModal();
    } else {
      dialog.current?.close();
    }
    return () => {
      dialog.current?.removeEventListener('click', handleDialogClick);
    };
  }, [handleDialogClick, onClose, open]);

  let cssSize;
  switch (size) {
    case 'sm':
      cssSize = 'w-[30%] h-[30%]';
      break;
    case 'md':
      cssSize = 'w-[50%] h-[50%]';
      break;
    case 'lg':
      cssSize = 'w-[70%] h-[70%]';
      break;
    case 'xl':
      cssSize = 'w-[80%] h-[80%]';
      break;
    default:
      cssSize = ' ';
      break;
  }

  return (
    <dialog
      id={id}
      ref={modalRef}
      onCancel={onClose}
      className={cn(
        cssSize,
        `backdrop:secondary-foreground/20 relative rounded-lg bg-card shadow-lg transition-all backdrop:backdrop-blur-sm`,
      )}
    >
      {title && <div>{title}</div>}
      {children}
      <DialogClose onClose={onClose} />
    </dialog>
  );
}
/* const DialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      "fixed inset-0 z-50 bg-black/80  data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      className
    )}
    {...props}
  />
))
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName */

/* const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <DialogPortal>
    <DialogOverlay />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        "fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:rounded-lg",
        className
      )}
      {...props}
    >
      {children}
      <DialogPrimitive.Close className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground">
        <Cross2Icon className="h-4 w-4"  strokeWidth={1.5} />
        <span className="sr-only">Close</span>
      </DialogPrimitive.Close>
    </DialogPrimitive.Content>
  </DialogPortal>
))
DialogContent.displayName = DialogPrimitive.Content.displayName */

function DialogHeader({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('flex flex-col space-y-1.5 text-center sm:text-left', className)} {...props}>
      {children}
    </div>
  );
}
DialogHeader.displayName = 'DialogHeader';

function DialogFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('flex flex-shrink-0 flex-row-reverse gap-3', className)} {...props} />;
}
DialogFooter.displayName = 'DialogFooter';

function DialogTitle({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('pb-4 text-lg font-semibold leading-none tracking-tight', className)}
      {...props}
    />
  );
}
DialogTitle.displayName = 'DialogTitle';

function DialogContent({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('flex-auto leading-none tracking-tight', className)} {...props} />;
}
DialogContent.displayName = 'DialogContent';

function DialogDescription(
  { className, children, ...props }: React.HTMLAttributes<HTMLDivElement>,
  ref: LegacyRef<HTMLDivElement> | undefined,
) {
  return <div ref={ref} className={cn('text-sm text-muted-foreground', className)} {...props} />;
}
DialogDescription.displayName = 'DialogDescription';

export {
  Dialog,
  /* DialogPortal,
  DialogOverlay,
  DialogTrigger, */
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
};
