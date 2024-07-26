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
  Avatar,
  ViewSettings,
  PageSettings,
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
import { findModel, findModelInAll, getAnyFirstModel, getModelsAsItems } from '@/utils/data/models';
import { getAssistantId } from '@/utils/services';
import { toast } from '@/components/ui/Toast';
import { ModalData, ModalsContext } from '@/context/modals';
import { ModalIds } from '@/modals';
import { MenuAction } from '@/types/ui';
import { getMessageContentAsString, getMessageContentHistoryAsString } from '@/utils/data/messages';
import { getCommandManager } from '@/utils/commands';
import ContentView from '@/components/common/ContentView';
import { useAssistantStore, useModelsStore } from '@/stores';
import { getLocalProvider } from '@/utils/data/providers';
import useShortcuts, { ShortcutIds } from '@/hooks/useShortcuts';
import { getSelectedViewName } from '@/utils/views';
import { DefaultPageSettings } from '@/utils/constants';
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
    isConversationMessagesLoaded,
    getConversationMessages,
    readConversationMessages,
    updateConversations,
    filterConversationMessages,
    updateConversationMessages,
  } = useContext(AppContext);

  const {
    activeService,
    settings,
    downloads,
    streams,
    getActiveModel,
    setActiveModel,
    setSettings,
  } = useBackend();
  const searchParams = useSearchParams();
  const [service, setService] = useState<AIService | undefined>(undefined);
  const { assistants, getAssistant } = useAssistantStore();
  const modelStorage = useModelsStore();

  const [tempConversationId, setTempConversationId] = useState<string | undefined>(undefined);
  const conversationId = _conversationId || tempConversationId;
  const selectedConversation = conversations.find((c) => c.id === conversationId);

  const { showModal } = useContext(ModalsContext);
  const [conversationMessages, setConversationMessages] = useState<Message[]>([]);
  const [isMessageUpdating, setIsMessageUpdating] = useState<boolean>(false);
  const [processing, setProcessing] = useState<boolean>(false);
  const [copied, setCopied] = useState<{ [key: string]: boolean }>({});

  const { t } = useTranslation();

  useEffect(() => {
    const getNewMessages = async () => {
      let newMessages: MessageImpl[] = [];
      if (conversationId) {
        let p = false;
        if (isConversationMessagesLoaded(conversationId)) {
          newMessages = getConversationMessages(conversationId);
        } else {
          newMessages = await readConversationMessages(conversationId, []);
        }
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
          if (
            msg.status &&
            msg.status !== MessageStatus.Delivered &&
            msg.status !== MessageStatus.Error
          ) {
            p = true;
          }
          return m;
        });
        setProcessing(p);
      }
      setConversationMessages(newMessages);
      setIsMessageUpdating(false);
    };
    if (isMessageUpdating) {
      return;
    }
    logger.info('getNewMessages', conversationId, isMessageUpdating, selectedConversation);

    setIsMessageUpdating(true);
    getNewMessages();
  }, [
    conversationId,
    isConversationMessagesLoaded,
    getConversationMessages,
    readConversationMessages,
    isMessageUpdating,
    copied,
    selectedConversation,
  ]);

  const defaultConversationName = getDefaultConversationName(t);
  const { messages, tempConversationName, views } = useMemo(() => {
    const stream = streams?.[conversationId as string];
    let newMessages: MessageImpl[] = conversationMessages;
    if (stream) {
      newMessages = newMessages.map((msg) => {
        const { author } = msg;
        if (stream.messageId === msg.id) {
          const m: MessageImpl = {
            ...msg,
            author,
            status: MessageStatus.Stream,
            content: stream.content?.join?.(''),
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

    const pagesSettings = settings.pages;
    const conversationViewName = getSelectedViewName(conversationId);
    const conversationSettings = pagesSettings?.[conversationViewName];
    const viewSettings: ViewSettings[] = [
      { ...(conversationSettings || DefaultPageSettings) },
      ...(conversationSettings?.views || []),
    ];

    return { messages: newMessages, tempConversationName: conversationName, views: viewSettings };
  }, [streams, conversationId, conversationMessages, defaultConversationName, settings.pages]);

  const { modelItems, commandManager, assistant, selectedModelId, disabled, model } =
    useMemo(() => {
      let modelId: string | undefined =
        getConversationModelId(selectedConversation) ||
        getServiceModelId(service) ||
        (getServiceModelId(activeService) as string);
      const assistantId = searchParams?.get('assistant') || getAssistantId(selectedConversation);
      const newAssistant = getAssistant(assistantId);
      let activeModel: Model | undefined;
      if (!modelId) {
        modelId = getActiveModel();
        if (!modelId && downloads && downloads.length > 0) {
          modelId = downloads[0].id;
        }
        activeModel = findModel(modelId, modelStorage.items);
      } else {
        activeModel = findModelInAll(modelId, providers, modelStorage, true);
      }

      const download = downloads?.find((d) => d.id === activeModel?.id);

      if (!activeModel && !download) {
        activeModel = getAnyFirstModel(providers, modelStorage);
        modelId = activeModel?.id;
      }

      if (activeModel && download) {
        activeModel.state = ModelState.Downloading;
      } else if (activeModel && activeModel.state === ModelState.Downloading) {
        activeModel.state = ModelState.Ok;
      }

      const items = getModelsAsItems(providers, modelStorage, modelId);
      let d = false;
      if (!activeModel) {
        modelId = undefined;
        d = true;
      } else if (activeModel.state === ModelState.Downloading) {
        d = true;
      }
      const manager = getCommandManager(
        items,
        assistants.filter((a) => a.id !== assistantId),
      );

      return {
        modelItems: items,
        commandManager: manager,
        assistant: newAssistant,
        selectedModelId: modelId,
        disabled: d,
        model: activeModel,
      };
    }, [
      assistants,
      activeService,
      modelStorage,
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
      assistants.forEach((a) => {
        const avatar = { ref: a.id, name: a.name } as AvatarRef;
        avatar.url = a.avatar?.url;
        avatar.color = a.avatar?.color;
        avatar.fallback = a.avatar?.name;
        avatar.ref = a.id;
        newAvatars.push(avatar);
      });

      if (modelItems) {
        modelItems.forEach((item) => {
          const avatar = { ref: item.key, name: item.label } as AvatarRef;
          const icon = item.icon as unknown as Avatar;
          avatar.url = icon?.url;
          avatar.color = icon?.color;
          avatar.fallback = icon?.name;
          avatar.ref = item.key as string;
          newAvatars.push(avatar);
        });
      }
    }
    return newAvatars;
  }, [assistants, messages, modelItems]);

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
    const activeModel = findModelInAll(modelIdOrName, providers, modelStorage, true);
    if (!activeModel) {
      logger.error('changeService Model not found', modelIdOrName);
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

  const handleSplitView = () => {
    const pagesSettings = settings.pages;
    const conversationViewName = getSelectedViewName(conversationId);
    if (views.length < 4 && pagesSettings?.[conversationViewName]) {
      const updatedPageSettings: PageSettings = pagesSettings[conversationViewName];
      const updatedViews = [...(updatedPageSettings.views || [])];
      updatedViews.push({ ...views[views.length - 1] });
      updatedPageSettings.views = updatedViews;
      setSettings({
        ...settings,
        pages: {
          ...pagesSettings,
          [conversationViewName]: updatedPageSettings,
        },
      });
    }
  };

  const handleCloseView = () => {
    const pagesSettings = settings.pages;
    const conversationViewName = getSelectedViewName(conversationId);
    if (views.length > 1 && pagesSettings?.[conversationViewName]) {
      const updatedPageSettings: PageSettings = pagesSettings[conversationViewName];
      const updatedViews = [...(updatedPageSettings.views || [])];
      updatedViews.pop();
      updatedPageSettings.views = updatedViews.length === 0 ? undefined : updatedViews;
      setSettings({
        ...settings,
        pages: {
          ...pagesSettings,
          [conversationViewName]: updatedPageSettings,
        },
      });
    }
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
          views={views}
          onSelectModel={changeService}
          onSelectMenu={onSelectMenu}
          onCloseView={handleCloseView}
          onSplitView={handleSplitView}
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
          processing={processing}
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
