// Copyright 2023 Mik Bry
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

import * as React from 'react';

const pxValueAsNumber = (px: string, defaultValue: number) => {
  if (px.indexOf('px') !== -1) {
    try {
      return parseInt(px.replace('px', ''), 10);
    } catch (e) {
      // ignore
    }
  }
  return defaultValue;
};

const useAutoResizeTextarea = (ref: React.ForwardedRef<HTMLTextAreaElement>) => {
  const textAreaRef = React.useRef<HTMLTextAreaElement>(null);

  React.useImperativeHandle(ref, () => textAreaRef.current!);

  const updateTextareaHeight = () => {
    const r = textAreaRef?.current;
    if (r) {
      const computed = window.getComputedStyle(r);
      if (r.value === '') {
        r.style.height = computed.minHeight;
        const parent = r.parentElement!;
        if (parent?.classList.contains('textarea-container')) {
          parent.style.height = computed.minHeight;
        }
        return;
      }

      r.style.height = '0px';
      const height = Math.min(r.scrollHeight, pxValueAsNumber(computed.maxHeight, r.scrollHeight));
      r.style.height = `${height}px`;
      const parent = r.parentElement!;
      if (parent?.classList.contains('textarea-container')) {
        parent.style.height = `${height}px`;
      }
    }
  };

  React.useEffect(() => {
    const r = textAreaRef?.current;
    updateTextareaHeight();
    r?.addEventListener('input', updateTextareaHeight);
    return () => {
      r?.removeEventListener('input', updateTextareaHeight);

      if (r) {
        r.style.height = 'auto';
        const parent = r.parentElement!;
        if (parent?.classList.contains('textarea-container')) {
          parent.style.height = 'auto';
        }
      }

    };
  }, []);

  return { textAreaRef, updateTextarea: updateTextareaHeight };
};

export default useAutoResizeTextarea;
