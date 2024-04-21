import { useEffect, useRef, useState } from 'react';
import { AlertTriangle, Check, Clipboard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/Toast';
import { cn } from '@/lib/utils';
import useTranslation from '@/hooks/useTranslation';

type CopyToClipBoardProps = {
  copied?: boolean;
  title: string;
  text: string;
  message: string;
  duration?: number;
  options?: {
    html?: string;
  };
  onCopy?: (copied: boolean) => void;
};

type CopyState = 'idle' | 'copied' | 'error';

function CopyToClipBoard({
  copied,
  title,
  text,
  message,
  duration = 2000,
  options = {},
  onCopy,
}: CopyToClipBoardProps) {
  const { t } = useTranslation();

  const [copySuccess, setCopySuccess] = useState<CopyState>('idle');
  const timer = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (copySuccess === 'copied' && !timer.current) {
      timer.current = setTimeout(() => {
        timer.current = undefined;
        setCopySuccess('idle');
        onCopy?.(false);
      }, duration);
    } else if (timer.current) {
      clearTimeout(timer.current);
      timer.current = undefined;
    }
    return () => {
      if (timer.current) {
        clearTimeout(timer.current);
        timer.current = undefined;
      }
    };
  }, [copySuccess, onCopy, duration]);

  useEffect(() => {
    if (copied && copySuccess !== 'copied') {
      setCopySuccess('copied');
    } else if (copied === false && copySuccess !== 'idle') {
      setCopySuccess('idle');
    }
  }, [copied, copySuccess]);

  const copyToClipboard = async () => {
    try {
      if (options.html) {
        /* type = "text/html";
        blob = new Blob([options.html], { type });
        data.push(new ClipboardItem({ [type]: blob })) */
        const tempElement = document.createElement('div');
        tempElement.innerHTML = options.html;
        const allElements = tempElement.querySelectorAll('*');
        allElements.forEach((e) => e.removeAttribute('class'));
        document.body.appendChild(tempElement);
        const range = document.createRange();
        range.selectNode(tempElement);
        const selection = window.getSelection();
        selection?.removeAllRanges();
        selection?.addRange(range);
        document.execCommand('copy');
        selection?.removeAllRanges();
        document.body.removeChild(tempElement);
      } else {
        const type = 'text/plain';
        const blob = new Blob([text], { type });
        const data = [new ClipboardItem({ [type]: blob })];
        await navigator.clipboard.write(data);
      }

      // await navigator.clipboard.writeText(text);
      setCopySuccess('copied');
      toast.success(message, { duration });
      onCopy?.(true);
      /* setTimeout(() => {
        setCopySuccess('idle');
        onCopy?.(false);
      }, 1000); */
    } catch (err) {
      setCopySuccess('error');
      toast.error(`${t('Failed to copy to clipboard')}: ${err}`, { duration });
    }
  };

  let Icon = Clipboard;
  let color = 'text-muted-foreground';
  if (copied || copySuccess === 'copied') {
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
      disabled={copied || copySuccess === 'copied' || text.length === 0}
      onClick={() => {
        copyToClipboard();
      }}
    >
      <Icon className={cn('h-4 w-4', color)} strokeWidth={1.5} />
    </Button>
  );
}

export default CopyToClipBoard;
