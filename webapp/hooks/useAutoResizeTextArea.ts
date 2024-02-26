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

import calculateAutoSizeStyle from '@/utils/ui/calculateNodeHeight';
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
    const textarea = textAreaRef?.current;
    if (textarea) {

      const computed = window.getComputedStyle(textarea);
      if (textarea.value === '') {
        textarea.style.height = computed.minHeight;
        const parent = textarea.parentElement!;
        if (parent?.classList.contains('textarea-container')) {
          parent.style.height = computed.minHeight;
        }
        return;
      }
    
      //  textarea.style.overflow = "hidden";
      textarea.style.height = 'auto';
      // textarea.style.height = '0px';

      let height = 'none';
      const parent = textarea.parentElement;

      const style = calculateAutoSizeStyle(textarea, true);
      const { height: autoHeight } = style;
      if (computed.maxHeight !== 'none') {
        const maxHeight = autoHeight as number; // pxValueAsNumber(autoHeight, textarea.scrollHeight);
        const h = Math.min(textarea.scrollHeight, maxHeight);
        height = `${h}px`;
      }
      console.log('height', height, style, textarea.scrollHeight, computed.height, textarea.value, computed.maxHeight, computed.maxHeight, pxValueAsNumber(computed.maxHeight, textarea.scrollHeight));
      textarea.style.height = height;

      if (parent?.classList.contains('textarea-container')) {
        parent.style.height = height;
      }
    }
  };

  React.useLayoutEffect(() => {
    const r = textAreaRef?.current;
    const resizeObserver = new ResizeObserver(() => {
      updateTextareaHeight();
    });
    // updateTextareaHeight();
    r?.addEventListener('input', updateTextareaHeight);
    if (r) resizeObserver.observe(r);
    return () => {
      r?.removeEventListener('input', updateTextareaHeight);
      resizeObserver.unobserve(r as Element);
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
