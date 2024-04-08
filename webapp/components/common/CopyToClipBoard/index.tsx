import { useState } from 'react';
import { AlertTriangle, Check, Clipboard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/Toast';
import { cn } from '@/lib/utils';

type CopyToClipBoardProps = {
  title: string;
  text: string;
};

type CopyState = 'idle' | 'copied' | 'error';

function CopyToClipBoard({ title, text }: CopyToClipBoardProps) {
  const [copySuccess, setCopySuccess] = useState<CopyState>('idle');

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopySuccess('copied');
      toast.success('Copied to clipboard');
      setTimeout(() => {
        setCopySuccess('idle');
      }, 1000);
    } catch (err) {
      setCopySuccess('error');
      toast.error(`Failed to copy to clipboard: ${err}`);
    }
  };

  let Icon = Clipboard;
  let color = 'text-muted-foreground';
  if (copySuccess === 'copied') {
    Icon = Check;
  } else if (copySuccess === 'error') {
    Icon = AlertTriangle;
    color = 'text-error';
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      aria-label={title}
      title={title}
      disabled={copySuccess === 'copied' || text.length === 0}
      onClick={() => {
        copyToClipboard();
      }}
    >
      <Icon className={cn('h-4 w-4', color)} strokeWidth={1.5} />
    </Button>
  );
}

export default CopyToClipBoard;
