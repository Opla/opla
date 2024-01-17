// Copyright 2024 mik
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import { useEffect, useRef, useState } from 'react';
import { Calculator, Check, Copy, CornerUpRight } from 'lucide-react';
import { Dialog } from '@/components/ui/dialog';
import Latex from './Latex';
import Mermaid from './Mermaid';
// eslint-disable-next-line import/no-extraneous-dependencies
import 'highlight.js/styles/obsidian.min.css';
// import 'latex.js/dist/css/katex.css';

function CodeBlock({ children, className }: JSX.IntrinsicElements['code']) {
  const [copied, setCopied] = useState(false);
  const [showMermaidPreview, setShowMermaidPreview] = useState(false);
  const [showLatexPreview, setShowLatexPreview] = useState(false);
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    if (copied) {
      const interval = setTimeout(() => setCopied(false), 1000);
      return () => clearTimeout(interval);
    }
    return () => {};
  }, [copied]);

  // Highlight.js adds a `className` so this is a hack to detect if the code block
  // is a language block wrapped in a `pre` tag.
  if (className) {
    const isMermaid = className.includes('language-mermaid');
    const isLatex = className.includes('language-latex');

    return (
      <>
        <code ref={ref} className={`${className} my-auto flex-shrink flex-grow`}>
          {children}
        </code>
        <div className="flex flex-shrink-0 flex-grow-0 flex-col gap-1">
          <button
            type="button"
            className="border-1 rounded-sm border-neutral-200 p-1 text-neutral-900 transition-colors hover:bg-neutral-200 dark:border-neutral-300 dark:text-neutral-100"
            aria-label="copy code to clipboard"
            title="Copy code to clipboard"
            onClick={() => {
              if (ref.current) {
                navigator.clipboard.writeText(ref.current.innerText ?? '');
                setCopied(true);
              }
            }}
          >
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          </button>
          {isMermaid ? (
            <>
              <button
                type="button"
                className="border-1 rounded-sm border-neutral-200 p-1 text-neutral-900 transition-colors hover:bg-neutral-200 dark:border-neutral-300 dark:text-neutral-100"
                aria-label="Open Mermaid preview"
                title="Open Mermaid preview"
                onClick={() => {
                  setShowMermaidPreview(true);
                }}
              >
                <CornerUpRight className="h-4 w-4" />
              </button>
              <Dialog
                open={showMermaidPreview}
                setOpen={setShowMermaidPreview}
                title="Mermaid diagram preview"
                size="xl"
                onClose={() => {}}
              >
                <Mermaid content={children?.toString() ?? ''} />
              </Dialog>
            </>
          ) : null}
          {isLatex ? (
            <>
              <button
                type="button"
                className="border-1 rounded-sm border-neutral-200 p-1 text-neutral-900 transition-colors hover:bg-neutral-200 dark:border-neutral-300 dark:text-neutral-100"
                aria-label="Open Latex preview"
                title="Open Latex preview"
                onClick={() => {
                  setShowLatexPreview(true);
                }}
              >
                <Calculator className="h-4 w-4" />
              </button>
              <Dialog
                open={showLatexPreview}
                setOpen={setShowLatexPreview}
                title="Latex diagram preview"
                size="xl"
                onClose={() => {}}
              >
                <Latex content={children?.toString() ?? ''} />
              </Dialog>
            </>
          ) : null}
        </div>
      </>
    );
  }

  return (
    <code className="font-code -my-0.5 inline-block rounded bg-neutral-100 p-0.5 text-neutral-950 dark:bg-neutral-700 dark:text-neutral-100">
      {children}
    </code>
  );
}

export default CodeBlock;
