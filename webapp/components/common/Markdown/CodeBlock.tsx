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
import { Sigma, Check, Clipboard, PieChart } from 'lucide-react';
import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
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

  let language = '';
  if (className && className.indexOf('language-') >= 0) {
    language = className?.substring(className.indexOf('language-') + 9);
  }
  if (className) {
    return (
      <div className="m-0 flex w-full flex-col p-0">
        <div className="flex w-full flex-row items-center justify-end gap-1 bg-neutral-900">
          <p className="flex-grow pl-4 text-xs text-neutral-400">{language}</p>
          <Button
            variant="ghost"
            className=""
            size="sm"
            aria-label="Copy code to clipboard"
            title="Copy code to clipboard"
            onClick={() => {
              if (ref.current) {
                navigator.clipboard.writeText(ref.current.innerText ?? '');
                setCopied(true);
              }
            }}
          >
            {copied ? (
              <Check className="h-4 w-4 text-neutral-400" strokeWidth={1.5} />
            ) : (
              <Clipboard className="h-4 w-4 text-neutral-400" strokeWidth={1.5} />
            )}
          </Button>
          {language === 'mermaid' ? (
            <>
              <Button
                variant="ghost"
                className=""
                aria-label="Open Mermaid preview"
                title="Open Mermaid preview"
                size="sm"
                onClick={() => {
                  setShowMermaidPreview(true);
                }}
              >
                <PieChart className="h-4 w-4 text-neutral-400" strokeWidth={1.5} />
              </Button>
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
          {language === 'latex' ? (
            <>
              <Button
                variant="ghost"
                className=""
                size="sm"
                aria-label="Open Latex preview"
                title="Open Latex preview"
                onClick={() => {
                  setShowLatexPreview(true);
                }}
              >
                <Sigma className="h-4 w-4 text-neutral-400" strokeWidth={1.5} />
              </Button>
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
        <code ref={ref} className={`${className} w-full flex-shrink flex-grow`}>
          {children}
        </code>
      </div>
    );
  }

  return (
    <code className="font-code inline-block rounded bg-neutral-100 text-neutral-950 dark:bg-neutral-700 dark:text-neutral-100">
      {children}
    </code>
  );
}

export default CodeBlock;
