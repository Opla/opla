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

import { useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Sigma, Check, Clipboard, PieChart } from 'lucide-react';
import { BlockMath } from 'react-katex';
import { Element } from 'hast';
import { Button } from '@/components/ui/button';
import logger from '@/utils/logger';
import MarkDownContext from '@/hooks/useMarkdownProcessor/context';
import Mermaid from './Mermaid';
// eslint-disable-next-line import/no-extraneous-dependencies
import 'highlight.js/styles/obsidian.min.css';
// eslint-disable-next-line import/no-extraneous-dependencies
import 'katex/dist/katex.min.css';

function CodeBlock({
  children,
  className,
  node,
}: JSX.IntrinsicElements['code'] & { node: Element }) {
  const [copied, setCopied] = useState(false);
  const [showMermaidPreview, setShowMermaidPreview] = useState(true);
  const [showLatexPreview, setShowLatexPreview] = useState(true);
  const ref = useRef<HTMLElement>(null);

  const context = useContext(MarkDownContext);

  useEffect(() => {
    if (copied) {
      const interval = setTimeout(() => setCopied(false), 1000);
      return () => clearTimeout(interval);
    }
    return () => {};
  }, [copied]);

  const { noHighlight, content, language } = useMemo(() => {
    const start = node.position?.start.offset || 0;
    const end = node.position?.end.offset;
    const code = context.content.substring(start, end);
    const match = code.match(/`{3}(?<type>[\w]*)\n(?<content>[\S\s]+?)\n`{3}/);
    let newLanguage = match?.groups?.type || '';
    let newContent = match?.groups?.content || '';
    logger.info('CodeBlock', className, start, end, code, newLanguage, newContent);

    let newNoHighlight = '';
    if (className && className.indexOf('language-') >= 0) {
      newLanguage = className?.substring(className.indexOf('language-') + 9);
    }
    if (newLanguage.startsWith('math') || newLanguage === 'latex') {
      newLanguage = 'math';
      newNoHighlight = 'no-highlight';
      const regex = /\\\[(.+)\\\]/g;
      if (newContent.length === 0 && children) {
        newContent = children?.toString().replace(regex, (_, latex: string) => `${latex}`) || '';
      }
    }
    return { noHighlight: newNoHighlight, content: newContent, language: newLanguage };
  }, [children, className, context, node.position]);

  if (className) {
    let display = '';
    if (language === 'math' && showLatexPreview) {
      display = 'latex';
    } else if (language === 'mermaid' && showMermaidPreview) {
      display = 'mermaid';
    }
    return (
      <div className="m-0 flex w-full flex-col p-0">
        <div className="flex w-full flex-row items-center justify-end gap-1 bg-card">
          <p className="flex-grow pl-4 text-xs text-card-foreground">{language}</p>
          <Button
            variant="ghost"
            className=""
            size="sm"
            aria-label="Copy code to clipboard"
            title="Copy code to clipboard"
            onClick={() => {
              if (ref.current) {
                navigator.clipboard.writeText(content || (children?.toString() ?? ''));
                setCopied(true);
              }
            }}
          >
            {copied ? (
              <Check className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
            ) : (
              <Clipboard className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
            )}
          </Button>
          {language === 'mermaid' ? (
            <Button
              variant="ghost"
              aria-label="Toggle Mermaid preview"
              title="Toggle Mermaid preview"
              size="sm"
              onClick={() => {
                setShowMermaidPreview(!showMermaidPreview);
              }}
            >
              <PieChart className="h-4 w-4" strokeWidth={1.5} />
            </Button>
          ) : null}
          {language === 'math' ? (
            <Button
              variant="ghost"
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

  return <code className="font-code inline-block rounded">{children}</code>;
}

export default CodeBlock;
