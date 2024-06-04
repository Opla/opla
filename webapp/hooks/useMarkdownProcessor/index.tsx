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

import { Children, Fragment, createElement, isValidElement, useEffect, useState } from 'react';
import { Element, Root } from 'hast';
import * as prod from 'react/jsx-runtime';
// import mermaid from 'mermaid';
import flattenChildren from 'react-keyed-flatten-children';
import rehypeHighlight from 'rehype-highlight';
import rehypeReact, { Options } from 'rehype-react';
import rehypeKatex from 'rehype-katex';
import remarkGfm from 'remark-gfm';
import remarkParse from 'remark-parse';
import remarkRehype from 'remark-rehype';
import remarkMath from 'remark-math';
import { Plugin, unified } from 'unified';
import { visit } from 'unist-util-visit';
import CodeBlock from '@/components/common/Markdown/CodeBlock';
import { ANCHOR_CLASS_NAME } from '@/components/common/Markdown';
import MarkDownContext from './context';

// Inspiration:
// https://www.skovy.dev/blog/vercel-ai-rendering-markdown?seed=imyoqy
const rehypeListItemParagraphToDiv: Plugin<[], Root> = () => (tree) => {
  visit(tree, 'element', (e: unknown) => {
    const element = e as Element;
    if (element.tagName === 'li') {
      element.children = element.children.map((c: unknown) => {
        const child = c as Element;
        if (child.type === 'element' && child.tagName === 'p') {
          child.tagName = 'div';
        }
        return child;
      });
    }
  });
  return tree;
};
const p = prod as any; // Fix ts errors
const production = {
  createElement,
  passNode: true,
  Fragment: p.Fragment,
  jsx: p.jsx,
  jsxs: p.jsxs,
  components: {
    a: ({ href, children }: JSX.IntrinsicElements['a']) => (
      <a href={href} target="_blank" rel="noreferrer" className={ANCHOR_CLASS_NAME}>
        {children}
      </a>
    ),
    h1: ({ children, id }: JSX.IntrinsicElements['h1']) => (
      <h1
        className="mb-6 mt-6 font-sans text-2xl font-semibold text-neutral-950 dark:text-neutral-100"
        id={id}
      >
        {children}
      </h1>
    ),
    h2: ({ children, id }: JSX.IntrinsicElements['h2']) => (
      <h2
        className="mb-6 mt-6 font-sans text-2xl font-medium text-neutral-950 dark:text-neutral-100"
        id={id}
      >
        {children}
      </h2>
    ),
    h3: ({ children, id }: JSX.IntrinsicElements['h3']) => (
      <h3
        className="mb-6 mt-2 font-sans text-xl font-semibold text-neutral-950 dark:text-neutral-100"
        id={id}
      >
        {children}
      </h3>
    ),
    h4: ({ children, id }: JSX.IntrinsicElements['h4']) => (
      <h4
        className="my-6 font-sans text-xl font-medium text-neutral-950 dark:text-neutral-100"
        id={id}
      >
        {children}
      </h4>
    ),
    h5: ({ children, id }: JSX.IntrinsicElements['h5']) => (
      <h5
        className="my-6 font-sans text-lg font-semibold text-neutral-950 dark:text-neutral-100"
        id={id}
      >
        {children}
      </h5>
    ),
    h6: ({ children, id }: JSX.IntrinsicElements['h6']) => (
      <h6
        className="my-6 font-sans text-lg font-medium text-neutral-950 dark:text-neutral-100"
        id={id}
      >
        {children}
      </h6>
    ),
    p: (props: JSX.IntrinsicElements['p']) => (
      <p className="mb-6 font-sans text-sm text-neutral-900 dark:text-neutral-100">
        {props.children}
      </p>
    ),
    strong: ({ children }: JSX.IntrinsicElements['strong']) => (
      <strong className="font-semibold text-neutral-950 dark:text-neutral-100">{children}</strong>
    ),
    em: ({ children }: JSX.IntrinsicElements['em']) => <em>{children} </em>,
    code: CodeBlock,
    pre: ({ children }: JSX.IntrinsicElements['pre']) => (
      <div className="relative">
        <pre className="font-code flex items-start overflow-x-auto rounded-sm border-neutral-200 bg-neutral-100 text-sm dark:border-neutral-800 dark:bg-neutral-900 [&>code.hljs]:bg-transparent [&>code.hljs]:p-0">
          {children}
        </pre>
      </div>
    ),
    ul: ({ children }: JSX.IntrinsicElements['ul']) => (
      <ul className="my-6 flex flex-col gap-3 pl-3 text-neutral-900 dark:text-neutral-100 [&_ol]:my-3 [&_ul]:my-3">
        {Children.map(flattenChildren(children).filter(isValidElement), (child, index) => (
          // eslint-disable-next-line react/no-array-index-key
          <li key={index} className="flex items-start gap-2">
            <div className="mt-1 block h-1 w-1 shrink-0 rounded-full bg-current" />
            {child}
          </li>
        ))}
      </ul>
    ),
    ol: ({ children }: JSX.IntrinsicElements['ol']) => (
      <ol className="my-6 flex flex-col gap-3 pl-3 text-neutral-900 dark:text-neutral-100 [&_ol]:my-3 [&_ul]:my-3">
        {Children.map(flattenChildren(children).filter(isValidElement), (child, index) => (
          // eslint-disable-next-line react/no-array-index-key
          <li key={index} className="flex items-start gap-2">
            <div
              className="min-w-[1.4ch] shrink-0 font-sans text-sm font-semibold text-neutral-900 dark:text-neutral-100"
              aria-hidden
            >
              {index + 1}.
            </div>
            {child}
          </li>
        ))}
      </ol>
    ),
    li: ({ children }: JSX.IntrinsicElements['li']) => (
      <div className="w-full font-sans text-sm"> {children} </div>
    ),
    table: ({ children }: JSX.IntrinsicElements['table']) => (
      <div className="mb-6 overflow-x-auto">
        <table className="table-auto border-2 border-neutral-200">{children}</table>
      </div>
    ),
    thead: ({ children }: JSX.IntrinsicElements['thead']) => (
      <thead className="bg-neutral-100 dark:bg-neutral-700">{children}</thead>
    ),
    th: ({ children }: JSX.IntrinsicElements['th']) => (
      <th className="border-2 border-neutral-200 p-2 font-sans text-sm font-semibold text-neutral-950 dark:text-neutral-100">
        {children}
      </th>
    ),
    td: ({ children }: JSX.IntrinsicElements['td']) => (
      <td className="border-2 border-neutral-200 p-2 font-sans text-sm text-neutral-900 dark:text-neutral-100">
        {children}
      </td>
    ),
    blockquote: ({ children }: JSX.IntrinsicElements['blockquote']) => (
      <blockquote className="border-l-4 border-neutral-200 pl-2 italic text-neutral-900 dark:text-neutral-100">
        {children}
      </blockquote>
    ),
  },
};

const processor = unified()
  .use(remarkParse)
  .use(remarkMath)
  .use(remarkGfm)
  .use(remarkRehype)
  .use(rehypeKatex)
  .use(rehypeHighlight, { detect: true })
  .use(rehypeListItemParagraphToDiv)
  .use(rehypeReact, production as Options);

const useMarkdownProcessor = (content: string) => {
  const [Content, setContent] = useState(createElement(Fragment));

  useEffect(() => {
    (async function proceed() {
      const file = await processor.process(content);
      setContent(file.result);
    })();
  }, [content]);

  return { Content, MarkDownContext };
};

export default useMarkdownProcessor;

export { MarkDownContext };
