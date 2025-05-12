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

import { useEffect, useState } from 'react';
import { Search } from 'lucide-react';
import useTranslation from '@/hooks/useTranslation';
import EmptyView from '@/components/common/EmptyView';
import { QueryResult } from '@/types';
import Link from 'next/link';
import { Page } from '@/types/ui';
import { ExplorerGroup } from '@/components/common/Explorer';
import { GrayPill } from '@/components/ui/Pills';
import { useThreadStore } from '@/stores';

type SearchPanelProps = {
  query?: string | undefined;
  onSelectResult?: (conversationId: string, messageId: string) => void;
};

export default function SearchPanel({ query, onSelectResult = () => {} }: SearchPanelProps) {
  const { t } = useTranslation();
  const [results, setResults] = useState<QueryResult[]>();
  const [count, setCount] = useState(0);
  const { searchConversationMessages } = useThreadStore();
  useEffect(() => {
    const search = async (q: string) => {
      const queryResponse = await searchConversationMessages(q);
      setResults(queryResponse.results);
      setCount(queryResponse.count);
    };

    if (query === undefined || query.length === 0) {
      setResults(undefined);
    } else {
      search(query);
    }
  }, [query, searchConversationMessages]);

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleSelect = () => {
    const value = '';
    if (value !== query) {
      onSelectResult('', '');
    }
  };

  return (
    <div className="flex w-full flex-col gap-2 p-2">
      {results && results?.length > 0 && (
        <div className="text-muted-foreground px-4 pb-4 text-sm">
          {t('result', { count })} {t('')} {t('in_conversation', { count: results.length })}{' '}
        </div>
      )}
      {results?.map((result) => (
        <ExplorerGroup
          key={result.id}
          title={
            <div className="flex w-full content-between items-center">
              <Link href={`${Page.Threads}/${result.id}`} className="flex-1">
                {result.name}
              </Link>
              <GrayPill label={`${result.entries.length}`} />
            </div>
          }
        >
          <div className="flex w-full flex-col p-2">
            {result.entries.map((entry) => (
              <div
                key={entry.id}
                className="text-muted-foreground m-2 line-clamp-1 text-sm break-all text-ellipsis"
              >
                <span>{entry.previousText}</span>
                <span className="bg-orange-800">{entry.match}</span>
                <span>{entry.afterText}</span>
              </div>
            ))}
          </div>
        </ExplorerGroup>
      ))}
      {results?.length === 0 && (
        <EmptyView
          title={t('No results')}
          description={t('the query is not present in conversations.')}
          icon={<Search className="text-muted h-16 w-16" />}
          className="h-full"
        />
      )}
    </div>
  );
}
