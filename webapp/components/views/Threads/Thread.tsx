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

import { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import { useSearchParams } from 'next/navigation';
import { AppContext } from '@/context';
import {
  Asset,
  Conversation,
  AIService,
  AIServiceType,
  Message,
  MessageStatus,
  AvatarRef,
  AIImplService,
} from '@/types';
import useTranslation from '@/hooks/useTranslation';
import logger from '@/utils/logger';
import {
  createConversation,
  getConversation,
  updateConversation,
  getConversationAssets,
  getServiceModelId,
  getConversationModelId,
  addService,
  addConversationService,
  getDefaultConversationName,
} from '@/utils/data/conversations';
import useBackend from '@/hooks/useBackendContext';
import { completion, tokenize } from '@/utils/providers';
import { findModelInAll, getModelsAsItems } from '@/utils/data/models';
import { getActiveService, getAssistantId } from '@/utils/services';
import { toast } from '@/components/ui/Toast';
import useDebounceFunc from '@/hooks/useDebounceFunc';
import { ModalData, ModalsContext } from '@/context/modals';
import { ModalIds } from '@/modals';
import { MenuAction, Page } from '@/types/ui';
import { ParsedPrompt, PromptToken, comparePrompts, parsePrompt, toPrompt } from '@/utils/parsers';
import { getConversationTitle } from '@/utils/conversations';
import validator from '@/utils/parsers/validator';
import {
  createMessage,
  changeMessageContent,
  getMessageRawContentAsString,
  getMessageContentAsString,
} from '@/utils/data/messages';
import { getCommandManager, getMentionCommands, preProcessingCommands } from '@/utils/commands';
import ContentView from '@/components/common/ContentView';
import { useAssistantStore } from '@/stores';
import { getDefaultAssistantService } from '@/utils/data/assistants';
import { getLocalProvider } from '@/utils/data/providers';
import useShortcuts, { ShortcutIds } from '@/hooks/useShortcuts';
import PromptArea from './Prompt';
import { ConversationPanel } from './Conversation';
import ThreadHeader from './Header';

type Usage = {
  conversationId?: string;
  text?: string;
  tokenCount: number;
  activeService?: AIImplService;
};

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
  const router = useRouter();
  const {
    providers,
    conversations,
    readConversationMessages,
    updateConversations,
    getConversationMessages,
    filterConversationMessages,
    updateConversationMessages,
    updateMessagesAndConversation,
    setUsage,
    setProviders,
    presets,
  } = useContext(AppContext);
  const { backendContext, setActiveModel } = useBackend();
  const searchParams = useSearchParams();
  const [selectedMessageId, setSelectedMessageId] = useState<string | undefined>(undefined);
  const [service, setService] = useState<AIService | undefined>(undefined);
  const [usage, updateUsage] = useState<Usage | undefined>({ tokenCount: 0 });
  const { getAssistant } = useAssistantStore();

  const [tempConversationId, setTempConversationId] = useState<string | undefined>(undefined);
  const conversationId = _conversationId || tempConversationId;
  const selectedConversation = conversations.find((c) => c.id === conversationId);

  const [changedPrompt, setChangedPrompt] = useState<ParsedPrompt | undefined>(undefined);
  const { showModal } = useContext(ModalsContext);
  const [messages, setMessages] = useState<Message[] | undefined>(undefined);
  const [isMessageUpdating, setIsMessageUpdating] = useState<boolean>(false);

  const [isProcessing, setIsProcessing] = useState<{ [key: string]: boolean }>({});
  const [errorMessage, setErrorMessage] = useState<{ [key: string]: string }>({});

  const { t } = useTranslation();

  useEffect(() => {
    const getNewMessages = async () => {
      let newMessages: Message[] = [];
      if (conversationId && selectedConversation) {
        newMessages = await readConversationMessages(selectedConversation.id, []);
        const stream = backendContext.streams?.[conversationId as string];
        newMessages = newMessages.filter((m) => !(m.author.role === 'system'));
        newMessages = newMessages.map((msg, index) => {
          const { author } = msg;
          if (author.role === 'assistant') {
            const model = findModelInAll(author.name, providers, backendContext);
            author.name = model?.title || model?.name || author.name;
          }
          if (stream && index === newMessages.length - 1) {
            return {
              ...msg,
              author,
              status: 'stream',
              content: stream.content.join(''),
              contentHistory: undefined,
              conversationId,
            } as Message;
          }
          return { ...msg, author, conversationId };
        });
      }
      setMessages(newMessages);
      setIsMessageUpdating(false);
    };
    if (isMessageUpdating) {
      return;
    }
    logger.info('getNewMessages', conversationId, selectedConversation, isMessageUpdating);
    setIsMessageUpdating(true);
    getNewMessages();
  }, [
    backendContext,
    conversationId,
    filterConversationMessages,
    readConversationMessages,
    isMessageUpdating,
    selectedConversation,
    providers,
  ]);

  const tempConversationName = messages?.[0]
    ? getMessageContentAsString(messages?.[0])
    : getDefaultConversationName(t);

  const { modelItems, commandManager, assistant, activeModel, disabled } = useMemo(() => {
    const model =
      getServiceModelId(service) ||
      (getServiceModelId(backendContext.config.services.activeService) as string);
    const modelNameOrId = getConversationModelId(selectedConversation) || model;
    const assistantId = searchParams?.get('assistant') || getAssistantId(selectedConversation);
    const newAssistant = getAssistant(assistantId);
    const items = getModelsAsItems(providers, backendContext, modelNameOrId);
    const manager = getCommandManager(items);
    return {
      modelItems: items,
      commandManager: manager,
      assistant: newAssistant,
      activeModel: model,
      disabled: !model,
    };
  }, [backendContext, getAssistant, providers, searchParams, selectedConversation, service]);

  const avatars = useMemo(
    () =>
      messages?.map((msg) => {
        const avatar = { name: msg.author.name, ref: msg.author.name } as AvatarRef;
        if (msg.author.role === 'assistant') {
          const modelItem = modelItems.find((m) => m.value === msg.author.name);
          if (
            !avatar.name ||
            (assistant &&
              (!assistant?.targets || avatar.name === assistant?.targets?.[0]?.models?.[0]))
          ) {
            avatar.name = assistant?.name;
            avatar.url = assistant?.avatar?.url;
            avatar.color = assistant?.avatar?.color;
            avatar.fallback = assistant?.avatar?.name;
          } else if (modelItem) {
            avatar.name = modelItem.label;
          }
        }
        return avatar;
      }) ?? [],
    [assistant, messages, modelItems],
  );

  useEffect(() => {
    if (_conversationId && tempConversationId) {
      setTempConversationId(undefined);
    }
    if (!tempConversationId && !_conversationId) {
      const temp = conversations.find((c) => c.temp);
      if (temp) {
        setTempConversationId(temp.id);
      }
    }
    if (_conversationId && conversations.find((c) => c.temp)) {
      updateConversations(conversations.filter((c) => !c.temp));
    }
  }, [_conversationId, conversations, updateConversations, tempConversationId]);

  const tokenValidator = useCallback(
    (
      token: PromptToken,
      parsedPrompt: ParsedPrompt,
      _previousToken: PromptToken | undefined,
    ): [PromptToken, PromptToken | undefined] =>
      validator(commandManager, token, parsedPrompt, _previousToken),
    [commandManager],
  );

  const currentPrompt = useMemo(
    () => toPrompt(selectedConversation?.currentPrompt || '', tokenValidator),
    [selectedConversation?.currentPrompt, tokenValidator],
  );

  useEffect(() => {
    const afunc = async () => {
      const text = changedPrompt?.text || currentPrompt.text;
      if (
        usage?.conversationId !== selectedConversation?.id ||
        (text !== usage?.text && (selectedConversation?.currentPrompt || changedPrompt))
      ) {
        const modelsCommands = getMentionCommands(changedPrompt || currentPrompt, commandManager);
        const selectedModelNameOrId =
          modelsCommands[0]?.key ||
          getConversationModelId(selectedConversation, assistant) ||
          activeModel;
        const activeService = getActiveService(
          selectedConversation,
          assistant,
          providers,
          backendContext,
          selectedModelNameOrId,
        );
        const response = await tokenize(activeService, text);
        // logger.info('tokenize', response, response.tokens, activeService);
        updateUsage({
          conversationId: selectedConversation?.id,
          text,
          tokenCount: response?.tokens.length || 0,
          activeService,
        });
      }
    };
    afunc();
  }, [
    changedPrompt,
    currentPrompt,
    selectedConversation,
    commandManager,
    assistant,
    providers,
    backendContext,
    activeModel,
    usage,
  ]);

  const parseAndValidatePrompt = (text: string, caretStartIndex = 0) =>
    parsePrompt({ text, caretStartIndex }, tokenValidator);

  const changeService = async (
    model: string,
    providerIdOrName: string,
    partial: Partial<Conversation> = {},
  ) => {
    logger.info(
      `ChangeService ${model} ${providerIdOrName} activeModel=${typeof activeModel}`,
      selectedConversation,
    );
    const newService: AIService = {
      type: AIServiceType.Model,
      modelId: model as string,
      providerIdOrName,
    };
    if (model && selectedConversation) {
      const services = addService(selectedConversation.services, newService);
      const newConversations = updateConversation(
        { ...selectedConversation, services, parameters: {}, ...partial },
        conversations,
        true,
      );
      updateConversations(newConversations);
    } else if (model && !activeModel && providerIdOrName === getLocalProvider(providers)?.id) {
      await setActiveModel(model);
    } else if (model) {
      setService(newService);
    }
  };

  const sendMessage = async (
    message: Message,
    conversationMessages: Message[],
    conversation: Conversation,
    updatedConversations: Conversation[],
    prompt: ParsedPrompt,
    modelName: string,
  ) => {
    const returnedMessage = { ...message };
    const activeService = getActiveService(
      conversation,
      assistant,
      providers,
      backendContext,
      modelName,
    );
    logger.info('sendMessage', activeService, conversation, presets);

    try {
      const response = await completion(
        activeService,
        message,
        conversationMessages,
        conversation,
        presets,
        prompt,
        commandManager,
      );

      if (response.status === 'error') {
        throw new Error(response.message);
      }
      if (response.status === 'success') {
        setUsage(response.usage);
        returnedMessage.content = response.content.trim();
      }
    } catch (e: any) {
      logger.error('sendMessage', e, typeof e);
      const error = String(e);
      onError(conversation.id, error);
      setErrorMessage({ ...errorMessage, [conversation.id]: error });
      returnedMessage.content = t(error);
      returnedMessage.status = MessageStatus.Error;
      const { provider } = activeService;
      if (provider) {
        const { errors = [] } = provider || { errors: [] };
        const len = errors.unshift(error);
        if (len > 50) {
          errors.pop();
        }
        provider.errors = errors;
        const updatedProviders = providers.map((p) => (p.id === provider?.id ? provider : p));
        setProviders(updatedProviders);
      }

      toast.error(String(e));
    }
    if (returnedMessage.status !== MessageStatus.Error) {
      returnedMessage.status = MessageStatus.Delivered;
    }

    await updateMessagesAndConversation(
      [returnedMessage],
      conversationMessages,
      { name: conversation.name },
      conversation.id,
      updatedConversations,
    );
    return returnedMessage;
  };

  const clearPrompt = (
    conversation: Conversation | undefined,
    newConversations = conversations,
  ) => {
    setChangedPrompt(undefined);

    let updatedConversations = newConversations;
    if (conversation) {
      updatedConversations = updateConversation(
        { ...conversation, currentPrompt: undefined, temp: false },
        newConversations,
      );
      updateConversations(updatedConversations);
    }
    return updatedConversations;
  };

  const preProcessingSendMessage = async (
    prompt: ParsedPrompt,
    conversation: Conversation,
    previousMessage?: Message,
  ) => {
    const selectedModelNameOrId = getConversationModelId(conversation, assistant) || activeModel;
    const result = await preProcessingCommands(
      conversation.id,
      prompt,
      commandManager,
      conversation,
      conversations,
      tempConversationName,
      selectedModelNameOrId,
      previousMessage,
      { changeService, getConversationMessages, updateMessagesAndConversation, t },
    );
    if (result.type === 'error') {
      setErrorMessage({ ...errorMessage, [conversation.id]: result.error });
      return undefined;
    }
    if (result.type === 'return') {
      clearPrompt(result.updatedConversation, result.updatedConversations);
      return undefined;
    }
    return result;
  };

  const handleSendMessage = async (prompt = currentPrompt) => {
    if (conversationId === undefined || !selectedConversation) {
      return;
    }

    const selectedModelNameOrId =
      getConversationModelId(selectedConversation, assistant) || activeModel;

    const result = await preProcessingSendMessage(prompt, selectedConversation as Conversation);
    if (!result) {
      return;
    }
    const { modelName = selectedModelNameOrId } = result;

    setErrorMessage({ ...errorMessage, [conversationId]: '' });
    setIsProcessing({ ...isProcessing, [conversationId]: true });

    const userMessage = createMessage({ role: 'user', name: 'you' }, prompt.text, prompt.raw);
    let message = createMessage({ role: 'assistant', name: modelName }, '...');
    message.status = MessageStatus.Pending;
    userMessage.sibling = message.id;
    message.sibling = userMessage.id;

    const {
      updatedConversation,
      updatedConversations: uc,
      updatedMessages,
    } = await updateMessagesAndConversation(
      [userMessage, message],
      getConversationMessages(conversationId),
      { name: tempConversationName },
      conversationId,
    );
    let updatedConversations = uc;
    if (updatedConversation.temp) {
      updatedConversation.name = getConversationTitle(updatedConversation, t);
    }

    updatedConversations = clearPrompt(updatedConversation, updatedConversations);

    logger.info(
      'onSendMessage',
      modelName,
      selectedModelNameOrId,
      updatedMessages,
      updatedConversation,
    );
    message = await sendMessage(
      message,
      updatedMessages,
      updatedConversation,
      updatedConversations,
      prompt,
      modelName,
    );

    if (tempConversationId) {
      router.push(`${Page.Threads}/${tempConversationId}`);
    }

    setIsProcessing({ ...isProcessing, [conversationId]: false });
  };

  const handleResendMessage = async (
    previousMessage: Message,
    conversationMessages = getConversationMessages(conversationId),
  ) => {
    if (conversationId === undefined) {
      return;
    }

    const index = conversationMessages.findIndex((m) => m.id === previousMessage.id);
    const prompt = parseAndValidatePrompt(
      getMessageRawContentAsString(conversationMessages[index - 1]) || '',
    );
    const result = await preProcessingSendMessage(
      prompt,
      selectedConversation as Conversation,
      previousMessage,
    );
    if (!result) {
      return;
    }
    const selectedModelNameOrId =
      result.modelName || getConversationModelId(selectedConversation) || activeModel;

    setErrorMessage({ ...errorMessage, [conversationId]: '' });
    setIsProcessing({ ...isProcessing, [conversationId]: true });

    let message: Message = changeMessageContent(
      previousMessage,
      '...',
      '...',
      MessageStatus.Pending,
    );
    if (selectedModelNameOrId && message.author.name !== selectedModelNameOrId) {
      message.author.name = selectedModelNameOrId;
    }
    const { updatedConversation, updatedConversations, updatedMessages } =
      await updateMessagesAndConversation(
        [message],
        conversationMessages,
        { name: tempConversationName },
        conversationId,
      );

    message = await sendMessage(
      message,
      updatedMessages,
      updatedConversation,
      updatedConversations,
      prompt,
      selectedModelNameOrId as string,
    );

    setIsProcessing({ ...isProcessing, [conversationId]: false });
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
          if (message.assets) {
            conversation.assets = getConversationAssets(conversation).filter(
              (a: Asset) => !message.assets?.find((ma: string) => ma === a.id),
            );
          }
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

  const handleChangeMessageContent = async (
    message: Message,
    newContent: string,
    submit: boolean,
  ) => {
    if (conversationId === undefined) {
      return;
    }

    const conversation = getConversation(conversationId, conversations);
    if (conversation && message.content) {
      const parsedContent = parseAndValidatePrompt(newContent);
      const newMessage = changeMessageContent(message, parsedContent.text, parsedContent.raw);
      const conversationMessages = getConversationMessages(conversationId);
      const newMessages = conversationMessages.map((m) => {
        if (m.id === message.id) {
          return newMessage;
        }
        return m;
      });
      const { updatedMessages } = await updateMessagesAndConversation(
        newMessages,
        conversationMessages,
        { name: tempConversationName },
        conversationId,
        conversations,
      );

      if (submit) {
        const sibling = updatedMessages.find((m) => m.id === message.sibling);
        if (sibling) {
          await handleResendMessage(sibling, updatedMessages);
        }
      }
    }
  };

  const handleUpdatePrompt = useCallback(
    (prompt: ParsedPrompt | undefined, conversationName = getDefaultConversationName(t)) => {
      if (prompt?.raw === '' && tempConversationId) {
        setChangedPrompt(undefined);
        updateConversations(conversations.filter((c) => !c.temp));
        setTempConversationId(undefined);
        return;
      }
      const conversation = getConversation(conversationId, conversations) as Conversation;
      if (conversation && comparePrompts(conversation.currentPrompt, prompt)) {
        setChangedPrompt(undefined);
        return;
      }
      let updatedConversations: Conversation[];
      if (conversation) {
        conversation.currentPrompt = prompt;
        updatedConversations = conversations.filter((c) => !(c.temp && c.id !== conversationId));
        updatedConversations = updateConversation(conversation, updatedConversations, true);
      } else {
        updatedConversations = conversations.filter((c) => !c.temp);
        let newConversation = createConversation(conversationName);
        newConversation.temp = true;
        newConversation.currentPrompt = prompt;
        if (assistant) {
          const newService = getDefaultAssistantService(assistant);
          newConversation = addConversationService(newConversation, newService);
          setService(undefined);
        } else if (service) {
          newConversation = addConversationService(newConversation, service);
          setService(undefined);
        }
        updatedConversations.push(newConversation);
        setTempConversationId(newConversation.id);
      }
      updateConversations(updatedConversations);
      setChangedPrompt(undefined);
    },
    [t, tempConversationId, conversationId, conversations, updateConversations, assistant, service],
  );

  useDebounceFunc<ParsedPrompt | undefined>(handleUpdatePrompt, changedPrompt, 500);

  const handleChangePrompt = (prompt: ParsedPrompt) => {
    if (prompt.raw !== currentPrompt.raw) {
      setChangedPrompt(prompt);
    }
  };

  const handleStartMessageEdit = (messageId: string, index: number) => {
    const messageIndex = messages?.findIndex((m) => m.id === messageId);
    if (messageIndex === index) {
      setSelectedMessageId(undefined);
    }
  };

  useShortcuts(ShortcutIds.EDIT_MESSAGE, (e) => {
    e.preventDefault();
    const lastMessage = messages?.findLast((m) => m.author.role === 'user');
    logger.info('shortcut #edit-message', lastMessage);
    if (lastMessage && lastMessage.id !== selectedMessageId) {
      setSelectedMessageId(lastMessage.id);
    }
  });

  useShortcuts(ShortcutIds.DELETE_MESSAGE, (e) => {
    e.preventDefault();
    const lastMessage = messages?.findLast((m) => m.author.role === 'user');
    logger.info('shortcut #delete-message', lastMessage);
    if (lastMessage) {
      handleShouldDeleteMessage(lastMessage);
    }
  });

  useShortcuts(ShortcutIds.RESEND_MESSAGE, (e) => {
    e.preventDefault();
    const lastMessage = messages?.findLast((m) => m.author.role === 'assistant');

    logger.info('shortcut #resend-message', lastMessage);
    if (lastMessage) {
      handleResendMessage(lastMessage);
    }
  });

  const prompt = changedPrompt === undefined ? currentPrompt : changedPrompt;
  let selectedModelNameOrId: string | undefined =
    getConversationModelId(selectedConversation) || activeModel;
  const model = modelItems.find((m) => m.value === selectedModelNameOrId);
  if (!model) {
    selectedModelNameOrId = undefined;
  }
  return (
    <ContentView
      header={
        <ThreadHeader
          selectedAssistantId={assistant?.id}
          selectedModelName={selectedModelNameOrId}
          selectedConversationId={conversationId}
          modelItems={modelItems}
          onSelectModel={changeService}
          onSelectMenu={onSelectMenu}
        />
      }
      toolbar={rightToolbar}
    >
      <ConversationPanel
        selectedConversation={selectedConversation}
        selectedAssistantId={assistant?.id}
        selectedModelName={selectedModelNameOrId}
        selectedMessageId={selectedMessageId}
        messages={messages}
        avatars={avatars}
        modelItems={modelItems}
        disabled={disabled}
        isPrompt={!!prompt}
        onResendMessage={handleResendMessage}
        onDeleteMessage={handleShouldDeleteMessage}
        onDeleteAssets={handleShouldDeleteAssets}
        onChangeMessageContent={handleChangeMessageContent}
        onSelectPrompt={handleUpdatePrompt}
        onSelectMenu={onSelectMenu}
        onStartMessageEdit={handleStartMessageEdit}
        parseAndValidatePrompt={parseAndValidatePrompt}
      />
      {(prompt || (messages && messages[0]?.conversationId === conversationId)) && (
        <PromptArea
          conversationId={conversationId as string}
          disabled={disabled}
          commandManager={commandManager}
          prompt={prompt}
          isLoading={conversationId ? isProcessing[conversationId] : false}
          errorMessage={conversationId ? errorMessage[conversationId] : ''}
          onSendMessage={handleSendMessage}
          onUpdatePrompt={handleChangePrompt}
          tokenValidate={tokenValidator}
          usage={usage}
        />
      )}
    </ContentView>
  );
}

export default Thread;
