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
import { useContext } from 'react';
import { AlertTriangle, Bug, File, Palette, Settings2, X } from 'lucide-react';
import useTranslation from '@/hooks/useTranslation';
import { AppContext } from '@/context';
import useBackend from '@/hooks/useBackendContext';
import { getConversationAssets, updateConversation } from '@/utils/data/conversations';
import { Conversation, Preset } from '@/types';
import { getFilename } from '@/utils/misc';
import EditPresets from '@/components/common/EditPresets';
import { ConversationError } from '@/types/ui';
import CopyToClipBoard from '@/components/common/CopyToClipBoard';
import { getActiveService } from '@/utils/services';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../ui/tabs';
import { Textarea } from '../../ui/textarea';
import { Button } from '../../ui/button';

export default function Settings({
  conversationId,
  errors,
}: {
  conversationId?: string;
  errors: ConversationError[];
}) {
  const { t } = useTranslation();
  const { conversations, updateConversations, providers } = useContext(AppContext);
  const { config, server } = useBackend();

  const selectedConversation = conversations.find((c) => c.id === conversationId);
  const service = getActiveService(selectedConversation, undefined, providers, config);
  const { model, provider } = service;

  const handleNoteChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const { value } = e.target;
    if (selectedConversation) {
      const newConversations = updateConversation(
        { ...selectedConversation, note: value },
        conversations,
        true,
      );
      updateConversations(newConversations);
    }
  };

  const deleteConversationAsset = (index: number) => {
    if (selectedConversation) {
      const newConversations = updateConversation(
        {
          ...selectedConversation,
          assets: getConversationAssets(selectedConversation)?.filter((_, i) => i !== index),
        },
        conversations,
        true,
      );
      updateConversations(newConversations);
    }
  };

  const handleChangePreset = (newPreset: Partial<Conversation>) => {
    if (selectedConversation) {
      const newConversations = updateConversation(
        { ...selectedConversation, ...newPreset },
        conversations,
        true,
      );
      updateConversations(newConversations);
    }
  };

  const buildLogs = () => {
    let logs = '';
    if (provider && provider.type === 'opla') {
      logs = server.stderr?.join('\n') || '';
      logs += server.stdout?.join('\n') || '';
    } else {
      logs = provider?.errors?.join('\n') || '';
    }
    return logs;
  };

  return (
    <div className="scrollbar-trigger flex h-full w-full">
      <Tabs defaultValue="settings" className="w-full py-3">
        <div className="px-4">
          <TabsList className="justify-left w-full gap-4">
            <TabsTrigger value="settings">
              <Settings2 className="h-4 w-4" strokeWidth={1.5} />
            </TabsTrigger>
            <TabsTrigger value="appearance">
              <Palette className="h-4 w-4" strokeWidth={1.5} />
            </TabsTrigger>
            <TabsTrigger value="documents">
              <File className="h-4 w-4" strokeWidth={1.5} />
            </TabsTrigger>
            <TabsTrigger value="debug">
              <Bug className="h-4 w-4" strokeWidth={1.5} />
            </TabsTrigger>
          </TabsList>
        </div>
        <TabsContent value="settings" className="h-full py-4">
          <EditPresets<Conversation>
            presetProperties={selectedConversation as Partial<Preset>}
            provider={provider}
            model={model}
            service={service}
            onChange={handleChangePreset}
            className="h-full"
          />
        </TabsContent>
        <TabsContent value="appearance" className="px-4">
          {t('Thread / Document view')}
        </TabsContent>
        <TabsContent value="documents" className="px-4">
          {selectedConversation?.updatedAt && (
            <div className="w-full p-2 text-sm text-muted-foreground">
              <div className="ellipsis flex w-full flex-row justify-between tabular-nums">
                <div className="line-clamp-1 text-xs">{t('ID')}:</div>
                <div className="ellipsis mb-4 line-clamp-1 break-all text-xs">
                  {selectedConversation.id}
                </div>
              </div>
              <div className="flex flex-row justify-between tabular-nums">
                <div>{t('Updated')} :</div>
                <div>{new Date(selectedConversation?.updatedAt).toLocaleString()}</div>
              </div>
              <div className="flex w-full flex-row justify-between tabular-nums">
                <div>{t('Created')} :</div>
                <div>{new Date(selectedConversation?.createdAt).toLocaleString()}</div>
              </div>
            </div>
          )}
          <div className="w-full p-2">
            <Textarea
              value={selectedConversation?.note ?? ''}
              disabled={!!selectedConversation?.temp}
              placeholder={t('Write a note...')}
              className="min-h-[240px] resize-none  overflow-y-hidden"
              onChange={handleNoteChange}
            />
          </div>

          {selectedConversation && (
            <div className="w-full p-2 text-sm text-muted-foreground">
              <div className="py-4">{t('Files')}</div>
              {getConversationAssets(selectedConversation)?.map((asset, index) => (
                <div className="flex w-full flex-row items-center p-1 text-xs" key={asset.id}>
                  <File className="mr-2 h-4 w-4" strokeWidth={1.5} />
                  <span className="ellipsis mr-2 line-clamp-1 grow break-all">
                    {asset.type === 'file' ? getFilename(asset.file) || '' : ''}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-1"
                    onClick={() => {
                      deleteConversationAsset(index);
                    }}
                  >
                    <X className="h-4 w-4 text-destructive" strokeWidth={1.5} />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
        <TabsContent value="debug" className="flex w-full items-center justify-between px-4">
          <span className="text-muted-foreground">{t('Debug')}</span>
          <CopyToClipBoard
            title={t('Copy logs to clipboard')}
            message={t('Logs copied to clipboard')}
            text={buildLogs()}
          />
        </TabsContent>
        <TabsContent value="debug" className="px-4">
          {errors.map((error) => (
            <div key={error.id} className="p-2 text-xs text-error">
              <p>
                <AlertTriangle className="mr-2 inline-flex h-4 w-4 text-error" />
                <span>{error.message}</span>
              </p>
            </div>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}
