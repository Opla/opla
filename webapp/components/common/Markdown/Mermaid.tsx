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
import Link from 'next/link';
import { Loader2 } from 'lucide-react';
import mermaid from 'mermaid';
import { ANCHOR_CLASS_NAME } from './constants';

function Mermaid({ content }: { content: string }) {
  const [diagram, setDiagram] = useState<string | boolean>(true);

  useEffect(() => {
    const render = async () => {
      // Generate a random ID for mermaid to use.
      const id = `mermaid-svg-${Math.round(Math.random() * 10000000)}`;

      // Confirm the diagram is valid before rendering.
      if (await mermaid.parse(content, { suppressErrors: true })) {
        const { svg } = await mermaid.render(id, content);
        setDiagram(svg);
      } else {
        setDiagram(false);
      }
    };
    render();
  }, [content]);

  if (diagram === true) {
    return (
      <div className="flex items-center gap-2">
        <Loader2 className="h-4 w-4 animate-spin" />
        <p className="font-sans text-sm text-muted"> Rendering diagram...</p>
      </div>
    );
  }
  if (diagram === false) {
    return (
      <p className="font-sans text-sm text-muted">
        Unable to render this diagram.Try copying it into the{' '}
        <Link href="https://mermaid.live/edit" className={ANCHOR_CLASS_NAME} target="_blank">
          Mermaid Live Editor
        </Link>
        .
      </p>
    );
  }
  return <div dangerouslySetInnerHTML={{ __html: diagram ?? '' }} />;
}

export default Mermaid;
