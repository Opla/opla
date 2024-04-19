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

import { useContext, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { AppContext } from '@/context';
import {
  Conversation,
  AIService,
  AIServiceType,
  Message,
  MessageStatus,
  AvatarRef,
  MessageImpl,
  ModelState,
  Model,
} from '@/types';
import useTranslation from '@/hooks/useTranslation';
import logger from '@/utils/logger';
import {
  getConversation,
  updateConversation,
  getServiceModelId,
  getConversationModelId,
  addService,
  getDefaultConversationName,
  getConversationService,
  removeConversationService,
} from '@/utils/data/conversations';
import useBackend from '@/hooks/useBackendContext';
import { findModel, findModelInAll, getModelsAsItems } from '@/utils/data/models';
import { getAssistantId } from '@/utils/services';
import { toast } from '@/components/ui/Toast';
import { ModalData, ModalsContext } from '@/context/modals';
import { ModalIds } from '@/modals';
import { MenuAction } from '@/types/ui';
import { getMessageContentAsString, getMessageContentHistoryAsString } from '@/utils/data/messages';
import { getCommandManager } from '@/utils/commands';
import ContentView from '@/components/common/ContentView';
import { useAssistantStore } from '@/stores';
import { getLocalProvider } from '@/utils/data/providers';
import useShortcuts, { ShortcutIds } from '@/hooks/useShortcuts';
import ThreadHeader from './Header';
import { PromptProvider } from './Prompt/PromptContext';
import { ConversationProvider } from './Conversation/ConversationContext';
import { ConversationPanel } from './Conversation';
import Prompt from './Prompt';

function Thread({
  conversationId: _conversationId,
  rightToolbar,
  onSelectMenu,
  onError,
}: {
  conversationId?: string;
  rightToolbar: React.ReactNode;
  onSelectMenu: (menu: MenuAction, data: string) => void;
  onError: (conversationId: string, error: string) => void;
}) {
  const {
    providers,
    conversations,
    readConversationMessages,
    updateConversations,
    filterConversationMessages,
    updateConversationMessages,
  } = useContext(AppContext);

  const { config, downloads, streams, getActiveModel, setActiveModel } = useBackend();
  const searchParams = useSearchParams();
  const [service, setService] = useState<AIService | undefined>(undefined);
  const { getAssistant } = useAssistantStore();

  const [tempConversationId, setTempConversationId] = useState<string | undefined>(undefined);
  const conversationId = _conversationId || tempConversationId;
  const selectedConversation = conversations.find((c) => c.id === conversationId);

  const { showModal } = useContext(ModalsContext);
  const [conversationMessages, setConversationMessages] = useState<Message[]>([]);
  const [isMessageUpdating, setIsMessageUpdating] = useState<boolean>(false);

  const [copied, setCopied] = useState<{ [key: string]: boolean }>({});

  const { t } = useTranslation();

  useEffect(() => {
    const getNewMessages = async () => {
      let newMessages: MessageImpl[] = [];
      if (conversationId) {
        newMessages = (await readConversationMessages(conversationId, [])) as Message[];
        newMessages = newMessages?.filter((m) => !(m.author.role === 'system')) || [];
        newMessages = newMessages.map((msg, index) => {
          const { author } = msg;
          let last;
          if (
            index === newMessages.length - 1 ||
            (index === newMessages.length - 2 && author.role === 'user')
          ) {
            last = true;
          }
          const m: MessageImpl = { ...msg, author, conversationId, copied: copied[msg.id], last };
          return m;
        });
      }
      setConversationMessages(newMessages);
      setIsMessageUpdating(false);
    };
    if (isMessageUpdating) {
      return;
    }
    logger.info('getNewMessages', conversationId, isMessageUpdating);

    setIsMessageUpdating(true);
    getNewMessages();
  }, [conversationId, readConversationMessages, isMessageUpdating, copied]);

  const defaultConversationName = getDefaultConversationName(t);
  const { messages, tempConversationName } = useMemo(() => {
    const stream = streams?.[conversationId as string];
    let newMessages: MessageImpl[] = conversationMessages;
    if (stream) {
      newMessages = newMessages.map((msg, index) => {
        const { author } = msg;
        /* if (author.role === 'assistant') {
          const model = findModelInAll(author.name, providers, backendContext, true);
          author.name = model?.title || model?.name || author.name;
        } */
        if (stream && index === newMessages.length - 1) {
          const m: MessageImpl = {
            ...msg,
            author,
            status: MessageStatus.Stream,
            content: stream.content.join(''),
            contentHistory: undefined,
            conversationId,
          };
          return m;
        }
        return msg;
      });
    }
    const conversationName: string = newMessages?.[0]
      ? getMessageContentAsString(newMessages?.[0])
      : defaultConversationName;
    return { messages: newMessages, tempConversationName: conversationName };
  }, [conversationMessages, streams, conversationId, defaultConversationName]);

  const { modelItems, commandManager, assistant, selectedModelId, disabled, model } =
    useMemo(() => {
      let modelId: string | undefined =
        getConversationModelId(selectedConversation) ||
        getServiceModelId(service) ||
        (getServiceModelId(config.services.activeService) as string);
      const assistantId = searchParams?.get('assistant') || getAssistantId(selectedConversation);
      const newAssistant = getAssistant(assistantId);
      let activeModel: Model | undefined;
      if (!modelId) {
        modelId = getActiveModel();
        if (!modelId && downloads && downloads.length > 0) {
          modelId = downloads[0].id;
        }
        activeModel = findModel(modelId, config.models.items);
      } else {
        activeModel = findModelInAll(modelId, providers, config, true);
      }

      const download = downloads?.find((d) => d.id === activeModel?.id);
      if (activeModel && download) {
        activeModel.state = ModelState.Downloading;
      } else if (activeModel && activeModel.state === ModelState.Downloading) {
        activeModel.state = ModelState.Ok;
      }

      const items = getModelsAsItems(providers, config, modelId);
      let d = false;
      if (!activeModel) {
        modelId = undefined;
        d = true;
      } else if (activeModel.state === ModelState.Downloading) {
        d = true;
      }
      const manager = getCommandManager(items);

      return {
        modelItems: items,
        commandManager: manager,
        assistant: newAssistant,
        selectedModelId: modelId,
        disabled: d,
        model: activeModel,
      };
    }, [
      config,
      downloads,
      getActiveModel,
      getAssistant,
      providers,
      searchParams,
      selectedConversation,
      service,
    ]);

  const avatars = useMemo(() => {
    const newAvatars: AvatarRef[] = [];
    if (messages) {
      newAvatars.push({ ref: 'you', name: 'you' } as AvatarRef);
      if (assistant) {
        const avatar = { ref: assistant.id as string, name: assistant.name } as AvatarRef;
        avatar.url = assistant.avatar?.url;
        avatar.color = assistant.avatar?.color;
        avatar.fallback = assistant.avatar?.name;
        avatar.ref = assistant.id as string;
        newAvatars.push(avatar);
      }
      if (modelItems) {
        modelItems.forEach((item) => {
          const avatar = { ref: item.key, name: item.label } as AvatarRef;
          newAvatars.push(avatar);
        });
      }
    }
    return newAvatars;
  }, [assistant, messages, modelItems]);

  useEffect(() => {
    if (_conversationId && tempConversationId) {
      setTempConversationId(undefined);
    }
    if (!tempConversationId && !_conversationId) {
      const temp = conversations.find((c) => c.temp && c.currentPrompt);
      if (temp) {
        setTempConversationId(temp.id);
      }
    }
    if (_conversationId && conversations.find((c) => c.temp)) {
      updateConversations(conversations.filter((c) => !c.temp));
    }
    if (tempConversationId) {
      let tempConversation = conversations.find((c) => c.temp) as Conversation;
      if (tempConversation) {
        const usedService = getConversationService(tempConversation, AIServiceType.Assistant);
        if (usedService?.type === AIServiceType.Assistant) {
          const tempAssistant = getAssistant(usedService.assistantId);
          if (tempAssistant?.hidden) {
            tempConversation = removeConversationService(tempConversation, AIServiceType.Assistant);
            updateConversations(
              conversations.map((conversation) =>
                conversation.id === tempConversation.id ? tempConversation : conversation,
              ),
            );
          }
        }
      }
    }
  }, [_conversationId, conversations, updateConversations, tempConversationId, getAssistant]);

  const changeService = async (
    modelIdOrName: string,
    providerIdOrName: string,
    partial: Partial<Conversation> = {},
  ) => {
    logger.info(
      `ChangeService ${modelIdOrName} ${providerIdOrName} activeModel=${selectedModelId}`,
      selectedConversation,
    );
    const activeModel = findModelInAll(modelIdOrName, providers, config, true);
    if (!activeModel) {
      logger.error('Model not found', modelIdOrName);
      return;
    }
    const newService: AIService = {
      type: AIServiceType.Model,
      modelId: activeModel.id,
      providerIdOrName,
    };
    if (selectedConversation) {
      const services = addService(selectedConversation.services, newService);
      const newConversations = updateConversation(
        { ...selectedConversation, services, parameters: {}, ...partial },
        conversations,
        true,
      );
      updateConversations(newConversations);
    } else if (!selectedModelId && providerIdOrName === getLocalProvider(providers)?.id) {
      await setActiveModel(activeModel.id);
    } else if (activeModel.id) {
      setService(newService);
    }
  };

  const handleDeleteMessages = async (action: string, data: ModalData) => {
    if (conversationId === undefined) {
      return;
    }

    const message = data?.item as Message;
    logger.info(`delete ${action} ${data}`);
    if (message) {
      if (action === 'Delete') {
        const conversation = getConversation(conversationId, conversations);
        if (conversation) {
          const updatedMessages = filterConversationMessages(
            conversationId,
            (m) => m.id !== message.id && m.id !== message.sibling,
          );
          updateConversationMessages(conversationId, updatedMessages);
          /* if (message.assets) {
            conversation.assets = getConversationAssets(conversation)?.filter(
              (a: Asset) => !message.assets?.find((ma: string) => ma === a.id),
            );
          } */
        }
      }
    }
  };

  const handleShouldDeleteMessage = (message: Message) => {
    showModal(ModalIds.DeleteItem, {
      title: 'Delete this message and siblings ?',
      item: message,
      onAction: handleDeleteMessages,
    });
  };

  const handleShouldDeleteAssets = (message: Message) => {
    showModal(ModalIds.DeleteItem, {
      title: 'Delete this message and assets ?',
      item: message,
      onAction: handleDeleteMessages,
    });
  };

  const handleCopyMessage = (messageId: string, state: boolean) => {
    const newCopied = { ...copied, [messageId]: state };
    setCopied(newCopied);
  };

  useShortcuts(ShortcutIds.DELETE_MESSAGE, (e) => {
    e.preventDefault();
    const lastMessage = messages?.findLast((m) => m.author.role === 'user');
    logger.info('shortcut #delete-message', lastMessage);
    if (lastMessage) {
      handleShouldDeleteMessage(lastMessage);
    }
  });

  useShortcuts(ShortcutIds.COPY_MESSAGE, (e) => {
    e.preventDefault();
    const lastMessage = messages?.findLast((m) => m.author.role === 'assistant');

    logger.info('shortcut #copy-message', lastMessage);
    if (lastMessage) {
      const content = getMessageContentHistoryAsString(lastMessage, 0, true);
      if (typeof content === 'string') {
        navigator.clipboard.writeText(content);
        toast.success('Message copied to clipboard');
        handleCopyMessage(lastMessage.id, true);
      }
    }
  });

  return (
    <ContentView
      header={
        <ThreadHeader
          selectedAssistantId={assistant?.id}
          selectedModelId={selectedModelId}
          selectedConversationId={conversationId}
          modelItems={modelItems}
          onSelectModel={changeService}
          onSelectMenu={onSelectMenu}
        />
      }
      toolbar={rightToolbar}
    >
      <PromptProvider
        conversationId={conversationId}
        selectedConversation={selectedConversation}
        commandManager={commandManager}
        assistant={assistant}
        service={service}
        selectedModelId={selectedModelId}
        tempConversationId={tempConversationId}
        onUpdateService={setService}
        onUpdateTempConversation={setTempConversationId}
      >
        <ConversationProvider
          conversationId={conversationId}
          selectedConversation={selectedConversation}
          messages={messages}
          commandManager={commandManager}
          assistant={assistant}
          selectedModelId={selectedModelId}
          tempConversationName={tempConversationName}
          tempConversationId={tempConversationId}
          changeService={changeService}
          onError={onError}
        >
          <ConversationPanel
            selectedConversation={selectedConversation}
            selectedAssistantId={assistant?.id}
            selectedModelName={selectedModelId}
            messages={messages}
            avatars={avatars}
            modelItems={modelItems}
            disabled={disabled}
            onDeleteMessage={handleShouldDeleteMessage}
            onDeleteAssets={handleShouldDeleteAssets}
            onSelectMenu={onSelectMenu}
            onCopyMessage={handleCopyMessage}
          />
          <Prompt
            conversationId={conversationId as string}
            hasMessages={messages && messages[0]?.conversationId === conversationId}
            disabled={disabled}
            commandManager={commandManager}
            isModelLoading={model ? model.state === ModelState.Downloading : undefined}
          />
        </ConversationProvider>
      </PromptProvider>
    </ContentView>
  );
}

export default Thread;
