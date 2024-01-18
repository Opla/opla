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

import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { HtmlGenerator, parse } from 'latex.js';
import logger from '@/utils/logger';
import { toast } from '@/components/ui/Toast';

function Latex({ content }: { content: string }) {
  const [diagram, setDiagram] = useState<string | boolean>(true);

  useEffect(() => {
    try {
      const generator = new HtmlGenerator({ hyphenate: false });
      const fragment = parse(content, { generator }).domFragment();
      setDiagram(fragment.firstElementChild.outerHTML);
    } catch (error) {
      logger.error(error);
      setDiagram(false);
      toast.error(`Unable to render this diagram.${error}`);
    }
  }, [content]);

  if (diagram === true) {
    return (
      <div className="flex items-center gap-2">
        <Loader2 className="h-4 w-4 animate-spin text-neutral-900" />
        <p className="font-sans text-sm text-slate-700">Rendering diagram...</p>
      </div>
    );
  }
  if (diagram === false) {
    return <p className="font-sans text-sm text-slate-700">Unable to render this diagram.</p>;
  }
  return <div dangerouslySetInnerHTML={{ __html: diagram ?? '' }} />;
}

export default Latex;
