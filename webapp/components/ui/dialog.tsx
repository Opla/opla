/* eslint-disable react/jsx-props-no-spreading */
import React, { Ref, forwardRef, useCallback, useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from './button';

function DialogClose({ className, onClose }: { className?: string; onClose: () => void }) {
  return (
    <Button
      variant="ghost"
      aria-label="Close"
      className={cn(
        'data-[state=open]:bg-accent data-[state=open]:text-muted-foreground absolute top-2 right-2 disabled:pointer-events-none',
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

const DialogOverlay = forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  (
    { className, ...props }: React.HTMLAttributes<HTMLDivElement>,
    ref: Ref<HTMLDivElement> | undefined,
  ) => (
    <div
      ref={ref}
      className={cn(
        'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-50 bg-black/80',
        className,
      )}
      {...props}
    />
  ),
);

DialogOverlay.displayName = 'DialogOverlay';

const LegacyDialog = forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  (
    { className, children, ...props }: React.HTMLAttributes<HTMLDivElement>,
    ref: Ref<HTMLDivElement> | undefined,
  ) => (
    <>
      <DialogOverlay />
      <div
        ref={ref}
        className={cn(
          'bg-background data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] fixed top-[50%] left-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border p-6 shadow-lg duration-200 sm:rounded-lg',
          className,
        )}
        {...props}
      >
        {children}
      </div>
    </>
  ),
);
LegacyDialog.displayName = 'Dialog';

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
  const legacyModalRef = useRef<HTMLDivElement>(null);
  const nativeDialog = typeof HTMLDialogElement === 'function';

  const handleDialogClick = useCallback(
    (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      const buttons = target.querySelectorAll('button');
      let isSubContentOpen = document.body.classList.contains('modalbox-open');
      buttons.forEach((button) => {
        if (button.getAttribute('data-state') === 'open') {
          isSubContentOpen = true;
        }
      });

      if (!isSubContentOpen && target.nodeName === 'DIALOG') {
        event.stopPropagation();
        onClose();
      }
    },
    [onClose],
  );

  useEffect(() => {
    const dialog = modalRef;
    const legacyDialog = legacyModalRef;
    if (nativeDialog && dialog.current) {
      dialog.current.addEventListener('click', handleDialogClick);
      if (open) {
        dialog.current.showModal();
      } else {
        dialog.current.close();
      }
    } else if (!nativeDialog && legacyDialog.current) {
      legacyDialog.current.addEventListener('click', handleDialogClick);
      if (open) {
        legacyDialog.current.classList.remove('hidden');
      } else {
        legacyDialog.current.classList.add('hidden');
      }
    }
    return () => {
      dialog.current?.removeEventListener('click', handleDialogClick);
      legacyDialog.current?.removeEventListener('click', handleDialogClick);
    };
  }, [handleDialogClick, onClose, open, nativeDialog]);

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

  if (!nativeDialog) {
    return (
      <LegacyDialog ref={legacyModalRef}>
        {title && <div>{title}</div>}
        {children}
        <DialogClose onClose={onClose} />
      </LegacyDialog>
    );
  }
  return (
    <dialog
      id={id}
      ref={modalRef}
      onCancel={onClose}
      className={cn(
        cssSize,
        `backdrop:secondary-foreground/20 bg-card relative rounded-lg shadow-lg transition-all backdrop:backdrop-blur-xs`,
      )}
    >
      {title && <div>{title}</div>}
      {children}
      <DialogClose onClose={onClose} />
    </dialog>
  );
}

function DialogHeader({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('flex flex-col space-y-1.5 text-center sm:text-left', className)} {...props}>
      {children}
    </div>
  );
}
DialogHeader.displayName = 'DialogHeader';

function DialogFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('flex shrink-0 flex-row-reverse gap-3', className)} {...props} />;
}
DialogFooter.displayName = 'DialogFooter';

function DialogTitle({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('pb-4 text-lg leading-none font-semibold tracking-tight', className)}
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
  ref: Ref<HTMLDivElement> | undefined,
) {
  return <div ref={ref} className={cn('text-muted-foreground text-sm', className)} {...props} />;
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
