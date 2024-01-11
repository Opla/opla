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

const useAutoResizeTextarea = (ref: React.ForwardedRef<HTMLTextAreaElement>) => {
  const textAreaRef = React.useRef<HTMLTextAreaElement>(null);

  React.useImperativeHandle(ref, () => textAreaRef.current!);

  React.useEffect(() => {
    const r = textAreaRef?.current;

    const updateTextareaHeight = () => {
      if (r) {
        if (r.value === '') {
          r.style.height = 'auto';
        } else {
          r.style.height = 'auto';
          r.style.height = `${r.scrollHeight}px`;
        }
      }
    };
    updateTextareaHeight();
    r?.addEventListener('input', updateTextareaHeight);

    return () => r?.removeEventListener('input', updateTextareaHeight);
  }, []);

  return { textAreaRef };
};

export default useAutoResizeTextarea;
