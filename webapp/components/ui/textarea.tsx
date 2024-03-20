import * as React from 'react';

import { cn } from '@/lib/utils';

import useAutoResizeTextarea from '@/hooks/useAutoResizeTextArea';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  autoresize?: boolean;
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, autoresize, children, ...props }, ref) => {
    const { textAreaRef } = useAutoResizeTextarea(ref);
    const classes = cn(
      'focus-visible:caret-primary flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
      autoresize ? 'resize-none' : 'min-h-[80px]',
      className,
    );
    if (autoresize) {
      // We put the textarea inside a div to make sure it doesn't grow too much and doesn't "wobbles" upper content
      return (
        <div className="textarea-container relative w-full overflow-hidden">
          <textarea
            className={classes}
            ref={textAreaRef}
            // eslint-disable-next-line react/jsx-props-no-spreading
            {...props}
          />
          {children}
        </div>
      );
    }
    return (
      <textarea
        className={classes}
        ref={textAreaRef}
        // eslint-disable-next-line react/jsx-props-no-spreading
        {...props}
      />
    );
  },
);

Textarea.displayName = 'Textarea';

export { Textarea };
