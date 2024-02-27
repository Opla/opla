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

const useAutoResizeTextarea = (
  ref: React.ForwardedRef<HTMLTextAreaElement>,
  minRows = 1,
  maxRows = 11,
) => {
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  React.useImperativeHandle(ref, () => textareaRef.current!);

  const updateTextareaHeight = React.useCallback(() => {
    const textarea = textareaRef?.current;
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

      const style = calculateAutoSizeStyle(textarea, true, minRows, maxRows);
      const { height: calculatedHeight } = style;
      if (computed.maxHeight !== 'none') {
        // const maxHeight = pxValueAsNumber(computed.maxHeight, textarea.scrollHeight);
        // const h = Math.max(Number(`${calculatedHeight}`), Number(`${maxHeight}`));
        height = `${calculatedHeight}px`;
      }
      /* logger.info(
        'autoresize height',
        height,
        style,
        textarea.scrollHeight,
        `scrollTop=${textarea.scrollTop}`,
        computed.height,
        textarea.value,
        computed.maxHeight,
        computed.maxHeight,
        pxValueAsNumber(computed.maxHeight, textarea.scrollHeight),
      ); */
      textarea.style.height = height;

      if (parent?.classList.contains('textarea-container')) {
        parent.style.height = height;
      }
      const overlay = parent?.querySelector('.textarea-overlay') as HTMLElement;
      if (overlay) {
        let scrollBarWidth = textarea.offsetWidth - textarea.clientWidth - 2;
        if (scrollBarWidth < 0) scrollBarWidth = 0;
        if (scrollBarWidth > 1) scrollBarWidth = 0.5;
        // logger.info('scrollBarWidth', scrollBarWidth);
        overlay.style.transform = `translate(${scrollBarWidth}px, -${textarea.scrollTop}px)`;
      }
    }
  }, [maxRows, minRows]);

  React.useEffect(() => {
    const textarea = textareaRef?.current;
    // logger.info('autoresize effect', textarea);
    /* const resizeObserver = new ResizeObserver(() => {
      updateTextareaHeight();
    }); */
    updateTextareaHeight();
    textarea?.addEventListener('scroll', updateTextareaHeight);
    document?.addEventListener('selectionchange', updateTextareaHeight);
    // if (textarea) resizeObserver.observe(textarea);
    return () => {
      document?.removeEventListener('selectionchange', updateTextareaHeight);
      textarea?.removeEventListener('scroll', updateTextareaHeight);
      // resizeObserver.unobserve(textarea as Element);
      if (textarea) {
        textarea.style.height = 'auto';
        const parent = textarea.parentElement!;
        if (parent?.classList.contains('textarea-container')) {
          parent.style.height = 'auto';
        }
      }
    };
  }, [updateTextareaHeight]);

  return { textAreaRef: textareaRef, updateTextarea: updateTextareaHeight };
};

export default useAutoResizeTextarea;
