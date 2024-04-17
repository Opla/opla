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
import { AppContext } from '@/context';
import {
  Conversation,
  AIService,
  Message,
  MessageStatus,
  AvatarRef,
  MessageImpl,
  ModelState,
  Model,
  Usage,
  Assistant,
} from '@/types';
import useTranslation from '@/hooks/useTranslation';
import logger from '@/utils/logger';
import {
  createConversation,
  getConversation,
  updateConversation,
  getConversationModelId,
  addConversationService,
  getDefaultConversationName,
} from '@/utils/data/conversations';
import useBackend from '@/hooks/useBackendContext';
import { tokenize } from '@/utils/providers';
import { findModelInAll } from '@/utils/data/models';
import { getActiveService } from '@/utils/services';
import useDebounceFunc from '@/hooks/useDebounceFunc';
import { MenuAction, MenuItem, Page } from '@/types/ui';
import { ParsedPrompt, PromptToken, comparePrompts, parsePrompt, toPrompt } from '@/utils/parsers';
import { getConversationTitle } from '@/utils/conversations';
import validator from '@/utils/parsers/validator';
import {
  createMessage,
  changeMessageContent,
  getMessageRawContentAsString,
} from '@/utils/data/messages';
import { getMentionCommands, preProcessingCommands } from '@/utils/commands';
import { getDefaultAssistantService } from '@/utils/data/assistants';
import useShortcuts, { ShortcutIds } from '@/hooks/useShortcuts';
import { CommandManager } from '@/utils/commands/types';
import { sendMessage, updateMessageContent } from '@/utils/messages';
import PromptArea from './Prompt';
import { ConversationPanel } from './Conversation';

type ConversationManagerProps = {
  selectedConversation: Conversation | undefined;
  conversationId?: string;
  messages: MessageImpl[];
  avatars: AvatarRef[];
  commandManager: CommandManager;
  assistant: Assistant | undefined;
  model: Model | undefined;
  selectedModelId: string | undefined;
  tempConversationName: string | undefined;
  tempConversationId: string | undefined;
  modelItems: MenuItem[];
  disabled: boolean;
  notFocused: boolean;
  service: AIService | undefined;
  changeService: (
    modelIdOrName: string,
    providerIdOrName: string,
    partial: Partial<Conversation>,
  ) => Promise<void>;
  onError: (conversationId: string, error: string) => void;
  onCopyMessage: (messageId: string, state: boolean) => void;
  onDeleteMessage: (message: Message) => void;
  onDeleteAssets: (message: Message) => void;
  onSelectMenu: (menu: MenuAction, data: string) => void;
  onUpdateService: (service: AIService | undefined) => void;
  onUpdateTempConversation: (id: string | undefined) => void;
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
  tempConversationName,
  tempConversationId,
  service,
  changeService,
  onCopyMessage,
  onError,
  onDeleteMessage,
  onDeleteAssets,
  onSelectMenu,
  onUpdateService,
  onUpdateTempConversation,
}: ConversationManagerProps) {
  const router = useRouter();
  const context = useContext(AppContext);
  const {
    providers,
    conversations,
    updateConversations,
    getConversationMessages,
    updateMessagesAndConversation,
    setUsage,
  } = context;

  const { backendContext } = useBackend();
  const [selectedMessageId, setSelectedMessageId] = useState<string | undefined>(undefined);
  const [usage, updateUsage] = useState<Usage | undefined>({ tokenCount: 0 });
  const [changedPrompt, setChangedPrompt] = useState<ParsedPrompt | undefined>(undefined);
  const [isProcessing, setIsProcessing] = useState<{ [key: string]: boolean }>({});
  const [errorMessage, setErrorMessage] = useState<{ [key: string]: string }>({});

  const { t } = useTranslation();

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
          selectedModelId;
        const activeService = getActiveService(
          selectedConversation,
          assistant,
          providers,
          backendContext,
          selectedModelNameOrId,
        );
        const response = await tokenize(activeService, text);
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
    selectedModelId,
    usage,
  ]);

  const parseAndValidatePrompt = (text: string, caretStartIndex = 0) =>
    parsePrompt({ text, caretStartIndex }, tokenValidator);

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

  const handleError = (id: string, error: string) => {
    onError(id, error);
    setErrorMessage({ ...errorMessage, [id]: error });
  };

  const preProcessingSendMessage = async (
    prompt: ParsedPrompt,
    conversation: Conversation,
    previousMessage?: Message,
  ) => {
    if (!selectedModelId) {
      setErrorMessage({ type: 'error', error: 'No model selected' });
      return undefined;
    }
    const result = await preProcessingCommands(
      conversation.id,
      prompt,
      commandManager,
      conversation,
      conversations,
      tempConversationName || '',
      selectedModelId,
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

    let selectedModel;
    if (result.modelName) {
      selectedModel = findModelInAll(result.modelName, providers, backendContext, true);
    } else {
      selectedModel = findModelInAll(
        getConversationModelId(selectedConversation) || selectedModelId,
        providers,
        backendContext,
        true,
      );
    }
    if (!selectedModel) {
      setErrorMessage({ ...errorMessage, [conversation.id]: 'Model not found' });
      setIsProcessing({ ...isProcessing, [conversation.id]: false });
    }

    return selectedModel;
  };

  const handleSendMessage = async (prompt = currentPrompt) => {
    if (conversationId === undefined || !selectedConversation) {
      return;
    }

    const selectedModel = await preProcessingSendMessage(
      prompt,
      selectedConversation as Conversation,
    );
    if (!selectedModel) {
      return;
    }

    const userMessage = createMessage({ role: 'user', name: 'you' }, prompt.text, prompt.raw);
    let message = createMessage({ role: 'assistant', name: selectedModel.name }, '...');
    message.author.metadata = { ...message.author.metadata, modelId: selectedModel.id };
    if (assistant) {
      message.author.metadata.assistantId = assistant.id;
    }
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
      selectedModel,
      selectedModelId,
      updatedMessages,
      updatedConversation,
    );
    message = await sendMessage(
      message,
      updatedMessages,
      updatedConversation,
      updatedConversations,
      prompt,
      selectedModel.name as string,
      assistant,
      commandManager,
      context,
      backendContext,
      setUsage,
      handleError,
    );

    if (tempConversationId) {
      router.replace(`${Page.Threads}/${tempConversationId}`, undefined, { shallow: true });
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
    const selectedModel = await preProcessingSendMessage(
      prompt,
      selectedConversation as Conversation,
      previousMessage,
    );
    if (!selectedModel) {
      return;
    }

    let message: Message = changeMessageContent(
      previousMessage,
      '...',
      '...',
      MessageStatus.Pending,
    );
    if (message.author.name !== selectedModel.name) {
      message.author.name = selectedModel.name;
      message.author.metadata = { ...message.author.metadata, modelId: selectedModel.id };
      if (assistant) {
        message.author.metadata.assistantId = assistant.id;
      }
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
      selectedModel.name as string,
      assistant,
      commandManager,
      context,
      backendContext,
      setUsage,
      handleError,
    );

    setIsProcessing({ ...isProcessing, [conversationId]: false });
  };

  const handleChangeMessageContent = async (
    message: Message,
    newContent: string,
    submit: boolean,
  ) => {
    if (conversationId === undefined) {
      return;
    }

    const parsedContent = parseAndValidatePrompt(newContent);
    const updatedMessages = await updateMessageContent(
      message,
      parsedContent,
      conversationId,
      tempConversationName,
      context,
    );
    if (updatedMessages && submit) {
      const sibling = updatedMessages.find((m) => m.id === message.sibling);
      if (sibling) {
        await handleResendMessage(sibling, updatedMessages);
      }
    }
  };

  const handleUpdatePrompt = useCallback(
    (prompt: ParsedPrompt | undefined, conversationName = getDefaultConversationName(t)) => {
      if (prompt?.raw === '' && tempConversationId) {
        setChangedPrompt(undefined);
        updateConversations(conversations.filter((c) => !c.temp));
        onUpdateTempConversation(undefined);
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
          onUpdateService(undefined);
        } else if (service) {
          newConversation = addConversationService(newConversation, service);
          onUpdateService(undefined);
        }
        updatedConversations.push(newConversation);
        onUpdateTempConversation(newConversation.id);
      }
      updateConversations(updatedConversations);
      setChangedPrompt(undefined);
    },
    [
      t,
      tempConversationId,
      conversationId,
      conversations,
      updateConversations,
      assistant,
      service,
      onUpdateTempConversation,
      onUpdateService,
    ],
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

  useShortcuts(ShortcutIds.RESEND_MESSAGE, (e) => {
    e.preventDefault();
    const lastMessage = messages?.findLast((m) => m.author.role === 'assistant');

    logger.info('shortcut #resend-message', lastMessage);
    if (lastMessage) {
      handleResendMessage(lastMessage);
    }
  });

  const prompt = changedPrompt === undefined ? currentPrompt : changedPrompt;

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
        selectedMessageId={selectedMessageId}
        messages={messages}
        avatars={avatars}
        modelItems={modelItems}
        disabled={disabled}
        isPrompt={!!prompt}
        onResendMessage={handleResendMessage}
        onDeleteMessage={onDeleteMessage}
        onDeleteAssets={onDeleteAssets}
        onChangeMessageContent={handleChangeMessageContent}
        onSelectPrompt={handleUpdatePrompt}
        onSelectMenu={onSelectMenu}
        onStartMessageEdit={handleStartMessageEdit}
        parseAndValidatePrompt={parseAndValidatePrompt}
        onCopyMessage={onCopyMessage}
      />
      {(prompt || (messages && messages[0]?.conversationId === conversationId)) && (
        <PromptArea
          conversationId={conversationId as string}
          disabled={disabled}
          commandManager={commandManager}
          prompt={prompt}
          isLoading={isLoading}
          errorMessage={conversationId ? errorMessage[conversationId] : ''}
          onSendMessage={handleSendMessage}
          onUpdatePrompt={handleChangePrompt}
          tokenValidate={tokenValidator}
          usage={usage}
          placeholder={placeholder}
          needFocus={notFocused}
        />
      )}
    </>
  );
}

export default ConversationManager;
