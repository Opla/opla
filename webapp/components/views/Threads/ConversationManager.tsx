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

import {
  Conversation,
  Message,
  AvatarRef,
  MessageImpl,
  ModelState,
  Model,
  Assistant,
} from '@/types';
import useTranslation from '@/hooks/useTranslation';
import { MenuAction, MenuItem } from '@/types/ui';
import { CommandManager } from '@/utils/commands/types';
import PromptArea from './Prompt';
import { ConversationPanel } from './Conversation';
import { useConversationContext } from './ConversationContext';
import { usePromptContext } from './Prompt/PromptContext';

type ConversationManagerProps = {
  selectedConversation: Conversation | undefined;
  conversationId: string | undefined;
  messages: MessageImpl[];
  avatars: AvatarRef[];
  commandManager: CommandManager;
  assistant: Assistant | undefined;
  model: Model | undefined;
  selectedModelId: string | undefined;
  modelItems: MenuItem[];
  disabled: boolean;
  notFocused: boolean;
  onCopyMessage: (messageId: string, state: boolean) => void;
  onDeleteMessage: (message: Message) => void;
  onDeleteAssets: (message: Message) => void;
  onSelectMenu: (menu: MenuAction, data: string) => void;
};

function ConversationManager({
  selectedConversation,
  conversationId,
  messages,
  avatars,
  commandManager,
  assistant,
  model,
  modelItems,
  selectedModelId,
  disabled,
  notFocused,
  onCopyMessage,
  onDeleteMessage,
  onDeleteAssets,
  onSelectMenu,
}: ConversationManagerProps) {
  const { isProcessing } = useConversationContext();
  const { selectTemplate } = usePromptContext();

  const { t } = useTranslation();

  let isLoading = conversationId ? isProcessing[conversationId] || false : false;
  let placeholder;
  if (!model || model?.state === ModelState.Downloading) {
    isLoading = true;
    if (model?.state === ModelState.Downloading) {
      placeholder = t('Loading the model, Please wait...');
    }
  }

  return (
    <>
      <ConversationPanel
        selectedConversation={selectedConversation}
        selectedAssistantId={assistant?.id}
        selectedModelName={selectedModelId}
        messages={messages}
        avatars={avatars}
        modelItems={modelItems}
        disabled={disabled}
        onDeleteMessage={onDeleteMessage}
        onDeleteAssets={onDeleteAssets}
        onSelectMenu={onSelectMenu}
        onCopyMessage={onCopyMessage}
        onSelectPromptTemplate={selectTemplate}
      />
        <PromptArea
          conversationId={conversationId as string}
          hasMessages={messages && messages[0]?.conversationId === conversationId}
          disabled={disabled}
          commandManager={commandManager}
          isLoading={isLoading}
          placeholder={placeholder}
          needFocus={notFocused}
        />
    </>
  );
}

export default ConversationManager;
