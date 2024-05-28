// Copyright 2024 Mik Bry
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

import { useContext, useMemo, useRef, useState } from 'react';
import { Sigma, PieChart } from 'lucide-react';
import { BlockMath } from 'react-katex';
import { Element } from 'hast';
import { Button } from '@/components/ui/button';
// import logger from '@/utils/logger';
import MarkDownContext from '@/hooks/useMarkdownProcessor/context';
import useTranslation from '@/hooks/useTranslation';
import Mermaid from './Mermaid';
// eslint-disable-next-line import/no-extraneous-dependencies
import 'highlight.js/styles/obsidian.min.css';
// eslint-disable-next-line import/no-extraneous-dependencies
import 'katex/dist/katex.min.css';
import CopyToClipBoard from '../CopyToClipBoard';

function CodeBlock({
  children,
  className,
  node,
}: JSX.IntrinsicElements['code'] & { node: Element }) {
  const { t } = useTranslation();
  const [showMermaidPreview, setShowMermaidPreview] = useState(true);
  const [showLatexPreview, setShowLatexPreview] = useState(true);
  const ref = useRef<HTMLElement>(null);

  const context = useContext(MarkDownContext);

  const { noHighlight, content, language } = useMemo(() => {
    const start = node.position?.start.offset || 0;
    const end = node.position?.end.offset;
    const code = context.content.substring(start, end);
    const match = code.match(/^`{3}(?<type>[\S]*)\n(?<content>[\s\S]*)`{3}$/);
    let newLanguage = match?.groups?.type || '';
    let newContent = match?.groups?.content.trimEnd() || '';
    if (match) {
      const column = node.position?.start.column || 1;
      if (column > 1) {
        newContent = newContent
          .split('\n')
          .map((line) => line.substring(column - 1))
          .join('\n');
      }
      // logger.info('CodeBlock', node, className, start, end, code, match, newLanguage, newContent);
    }

    let newNoHighlight = '';
    if (newLanguage.length === 0 && className && className.indexOf('language-') >= 0) {
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
  }, [children, className, context, node]);

  if (className) {
    let copyMessage = t('copied to clipboard');
    let display = '';
    if (language === 'math' && showLatexPreview) {
      display = 'latex';
      copyMessage = `${t('Formula')} ${copyMessage}`;
    } else if (language === 'mermaid' && showMermaidPreview) {
      display = 'mermaid';
      copyMessage = `${t('Diagram')} ${copyMessage}`;
    } else {
      copyMessage = `${t('Code')} ${copyMessage}`;
    }
    return (
      <div className="m-0 flex w-full flex-col p-0">
        <div className="flex w-full flex-row items-center justify-end gap-1 bg-card">
          <p className="flex-grow pl-4 text-xs text-card-foreground">{language}</p>
          <CopyToClipBoard title={t('Copy to clipboard')} message={copyMessage} text={content} />
          {language === 'mermaid' ? (
            <Button
              variant="ghost"
              aria-label={t('Toggle Mermaid preview')}
              title={t('Toggle Mermaid preview')}
              size="sm"
              onClick={() => {
                setShowMermaidPreview(!showMermaidPreview);
              }}
            >
              <PieChart className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
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
              <Sigma className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
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
