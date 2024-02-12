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

import { useEffect, useMemo, useRef, useState } from 'react';
import { Sigma, Check, Clipboard, PieChart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { BlockMath } from 'react-katex';
import Mermaid from './Mermaid';
// eslint-disable-next-line import/no-extraneous-dependencies
import 'highlight.js/styles/obsidian.min.css';
// eslint-disable-next-line import/no-extraneous-dependencies
import 'katex/dist/katex.min.css';

function CodeBlock({ children, className }: JSX.IntrinsicElements['code']) {
  const [copied, setCopied] = useState(false);
  const [showMermaidPreview, setShowMermaidPreview] = useState(true);
  const [showLatexPreview, setShowLatexPreview] = useState(true);
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    if (copied) {
      const interval = setTimeout(() => setCopied(false), 1000);
      return () => clearTimeout(interval);
    }
    return () => {};
  }, [copied]);

  const { noHighlight, content, language } = useMemo(() => {
    let newNoHighlight = '';
    let newContent = '';
    let newLanguage = '';
    if (className && className.indexOf('language-') >= 0) {
      newLanguage = className?.substring(className.indexOf('language-') + 9);
    }
    if (newLanguage.startsWith('math') || newLanguage === 'latex') {
      newLanguage = 'math';
      newNoHighlight = 'no-highlight';
      const regex = /\\\[(.+)\\\]/g;
      newContent = children?.toString().replace(regex, (_, latex: string) => `${latex}`) || '';
    }
    return { noHighlight: newNoHighlight, content: newContent, language: newLanguage };
  }, [children, className]);

  if (className) {
    let display = '';
    if (language === 'math' && showLatexPreview) {
      display = 'latex';
    } else if (language === 'mermaid' && showMermaidPreview) {
      display = 'mermaid';
    }
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
                navigator.clipboard.writeText(children?.toString() ?? '');
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
            <Button
              variant="ghost"
              className={
                showMermaidPreview ? 'text-neutral-700 dark:text-neutral-200' : 'text-neutral-400'
              }
              aria-label="Toggle Mermaid preview"
              title="Toggle Mermaid preview"
              size="sm"
              onClick={() => {
                setShowMermaidPreview(!showMermaidPreview);
              }}
            >
              <PieChart className="h-4 w-4 text-neutral-400" strokeWidth={1.5} />
            </Button>
          ) : null}
          {language === 'math' ? (
            <Button
              variant="ghost"
              className={
                showLatexPreview ? 'text-neutral-700 dark:text-neutral-200' : 'text-neutral-400'
              }
              size="sm"
              aria-label="Toggle Latex preview"
              title="Toggle Latex preview"
              onClick={() => {
                setShowLatexPreview(!showLatexPreview);
              }}
            >
              <Sigma className="h-4 w-4 " strokeWidth={1.5} />
            </Button>
          ) : null}
        </div>
        <code ref={ref} className={`${className} ${noHighlight} w-full flex-shrink flex-grow`}>
          {display === 'latex' && <BlockMath math={content} />}
          {display === 'mermaid' && <Mermaid content={children?.toString() ?? ''} />}
          {display === '' && children}
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
