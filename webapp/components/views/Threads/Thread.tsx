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

'use client';

import { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import { PanelLeft, PanelLeftClose, PanelRight, PanelRightClose } from 'lucide-react';
import { AppContext } from '@/context';
import {
  Asset,
  Conversation,
  ConversationConnector,
  ConversationConnectorType,
  LlmParameters,
  Message,
  MessageStatus,
  Model,
  PromptTemplate,
  Provider,
  ProviderType,
} from '@/types';
import useTranslation from '@/hooks/useTranslation';
import logger from '@/utils/logger';
import {
  createConversation,
  getConversation,
  updateConversation,
  updateOrCreateConversation,
  addAssetsToConversation,
  getConversationAssets,
  getConnectorModelId,
  getConversationModelId,
  addConnector,
  getConversationProvider,
  addConversationConnector,
} from '@/utils/data/conversations';
import useBackend from '@/hooks/useBackendContext';
import { buildContext, completion, getCompletionParametersDefinition } from '@/utils/providers';
import { findModel, findModelInAll, getModelsAsItems } from '@/utils/data/models';
import { findProvider } from '@/utils/data/providers';
import { toast } from '@/components/ui/Toast';
import useDebounceFunc from '@/hooks/useDebounceFunc';
import { ModalData, ModalsContext } from '@/context/modals';
import { ModalIds } from '@/modals';
import { MenuAction, Page } from '@/types/ui';
import { KeyedScrollPosition } from '@/hooks/useScroll';
import { findCompatiblePreset, getCompletePresetProperties } from '@/utils/data/presets';
import { openFileDialog } from '@/utils/backend/tauri';
import {
  ParsedPrompt,
  PromptToken,
  PromptTokenState,
  PromptTokenType,
  compareMentions,
  comparePrompts,
  parsePrompt,
  toPrompt,
} from '@/utils/parsers';
import { getConversationTitle } from '@/utils/conversations';
import validator from '@/utils/parsers/validator';
import { createMessage, changeMessageContent, mergeMessages } from '@/utils/data/messages';
import { getCommandManager } from '@/utils/commands';
import PromptArea from './Prompt';
import PromptsGrid from './PromptsGrid';
import ThreadMenu from './ThreadMenu';
import { Button } from '../../ui/button';
import ConversationView from './Conversation';
import EmptyView from '../../common/EmptyView';
import Opla from '../../icons/Opla';

function Thread({
  conversationId: _conversationId,
  displayExplorer,
  displaySettings,
  onChangeDisplayExplorer,
  onChangeDisplaySettings,
  onSelectMenu,
  onError,
}: {
  conversationId?: string;
  displayExplorer: boolean;
  displaySettings: boolean;
  onChangeDisplayExplorer: (displayExplorer: boolean) => void;
  onChangeDisplaySettings: (displaySettings: boolean) => void;
  onSelectMenu: (menu: MenuAction, data: string) => void;
  onError: (error: string) => void;
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
    setUsage,
    setProviders,
    presets,
  } = useContext(AppContext);
  const { backendContext, setActiveModel } = useBackend();
  const { activeModel: aModel } = backendContext.config.models;
  /* const [tempModelProvider, setTempModelProvider] = useState<[string, ProviderType] | undefined>(
    undefined,
  ); 
  */
  const [connector, setConnector] = useState<ConversationConnector | undefined>(undefined);
  const activeModel = getConnectorModelId(connector) || aModel;
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

  const disabled = !activeModel;

  useEffect(() => {
    const getNewMessages = async () => {
      let newMessages: Message[] = [];
      if (conversationId && selectedConversation) {
        newMessages = await readConversationMessages(selectedConversation.id, []);
        const stream = backendContext.streams?.[conversationId as string];
        newMessages = newMessages.filter((m) => !(m.author.role === 'system'));
        newMessages = newMessages.map((msg, index) => {
          if (stream && index === newMessages.length - 1) {
            return {
              ...msg,
              status: 'stream',
              content: stream.content.join(''),
              contentHistory: undefined,
            } as Message;
          }
          return { ...msg, conversationId };
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
    backendContext.streams,
    conversationId,
    filterConversationMessages,
    readConversationMessages,
    isMessageUpdating,
    selectedConversation,
  ]);

  const showEmptyChat = !conversationId;
  const selectedModel = getConversationModelId(selectedConversation) || activeModel;

  const { modelItems, commandManager } = useMemo(() => {
    const items = getModelsAsItems(providers, backendContext, selectedModel);
    const manager = getCommandManager(items);
    return { modelItems: items, commandManager: manager };
  }, [backendContext, providers, selectedModel]);

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

  const updateMessagesAndConversation = async (
    changedMessages: Message[],
    conversationMessages: Message[],
    selectedConversationId = conversationId,
    selectedConversations = conversations,
  ) => {
    const updatedConversations = updateOrCreateConversation(
      selectedConversationId,
      selectedConversations,
      messages?.[0]?.content as string,
    );
    const updatedMessages = mergeMessages(conversationMessages, changedMessages);
    await updateConversations(updatedConversations);
    await updateConversationMessages(selectedConversationId, updatedMessages);

    const updatedConversationId = selectedConversationId;
    return { updatedConversationId, updatedConversations, updatedMessages };
  };

  const handleSelectModel = async (
    model?: string,
    provider = ProviderType.opla,
    partial: Partial<Conversation> = {},
  ) => {
    logger.info(
      `handleSelectModel ${model} ${provider} activeModel=${typeof activeModel}`,
      selectedConversation,
    );
    const newConnector: ConversationConnector = {
      type: ConversationConnectorType.Model,
      modelId: model as string,
      provider,
    };
    if (model && selectedConversation) {
      const connectors = addConnector(selectedConversation.connectors, newConnector);
      const newConversations = updateConversation(
        { ...selectedConversation, connectors, parameters: {}, ...partial },
        conversations,
        true,
      );
      updateConversations(newConversations);
    } else if (model && !activeModel) {
      await setActiveModel(model);
    } else if (model) {
      // setTempModelProvider([model, provider]);
      setConnector(newConnector);
    }
  };

  const sendMessage = async (
    message: Message,
    conversationMessages: Message[],
    conversation: Conversation,
    updatedConversations: Conversation[],
  ) => {
    let model: Model | undefined;
    let providerName: string | undefined = model?.provider;
    const returnedMessage = { ...message };
    let provider: Provider | undefined;
    const conversationProvider = getConversationProvider(conversation);
    const conversationModel = getConversationModelId(conversation);
    if (conversationProvider && conversationModel) {
      provider = findProvider(conversationProvider, providers);
      model = findModel(conversationModel, provider?.models || []);
      if (provider) {
        providerName = provider.name;
      }
    }
    const modelName = message.author.name || model?.name || conversationModel || activeModel;
    if (!model || model.name !== modelName) {
      model = findModelInAll(modelName, providers, backendContext);
    }
    const name = model?.provider || model?.creator;
    if (name && name !== providerName) {
      provider = findProvider(name, providers);
      providerName = provider?.name;
    }
    logger.info(
      'sendMessage',
      name,
      model,
      provider,
      modelName,
      providerName,
      conversation,
      presets,
    );

    const llmParameters: LlmParameters[] = [];
    const preset = findCompatiblePreset(selectedConversation?.preset, presets, modelName, provider);
    const { parameters, system } = getCompletePresetProperties(preset, conversation, presets);
    if (parameters) {
      const parametersDefinition = getCompletionParametersDefinition(provider);
      Object.keys(parameters).forEach((key) => {
        const parameterDef = parametersDefinition[key];
        if (parameterDef) {
          const result = parameterDef.z.safeParse(parameters[key]);
          if (result.success) {
            llmParameters.push({ key, value: String(result.data) });
          }
        }
      });
    }
    const index = conversationMessages.findIndex((m) => m.id === message.id);
    const context = buildContext(conversation, conversationMessages, index);
    logger.info('sendMessage context', context, llmParameters, parameters, system);
    try {
      const response = await completion(
        model,
        providerName,
        { providers },
        context,
        system,
        conversationId,
        llmParameters,
      );
      setUsage(response.usage);
      returnedMessage.content = response.content.trim();
    } catch (e: any) {
      logger.error('sendMessage', e, typeof e);
      const error = String(e);
      onError(error);
      setErrorMessage({ ...errorMessage, [conversation.id]: error });
      returnedMessage.content = t('Oops, something went wrong.');
      returnedMessage.status = MessageStatus.Error;
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
    returnedMessage.status = MessageStatus.Delivered;

    await updateMessagesAndConversation(
      [returnedMessage],
      conversationMessages,
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

  const handleSendMessage = async () => {
    if (conversationId === undefined) {
      return;
    }

    const mentions = currentPrompt.tokens.filter((to) => to.type === PromptTokenType.Mention);
    const modelItem =
      mentions.length === 1
        ? modelItems.find((mi) => compareMentions(mi.value, mentions[0].value))
        : undefined;
    const modelName = modelItem?.value;

    const action = currentPrompt.tokens.find((to) => to.type === PromptTokenType.Action);

    if (action) {
      let updatedConversation = selectedConversation;
      let updatedConversations = conversations;
      const command = commandManager.getCommand(action.value, action.type);
      // logger.info('command action', command, action.value, action.type, currentPrompt.text);
      if (command) {
        command.execute?.(action.value);
        if (command.label === 'System') {
          const message = createMessage(
            { role: 'system', name: 'system' },
            currentPrompt.text,
            currentPrompt.raw,
          );
          let updatedConversationId: string | undefined;
          ({ updatedConversationId, updatedConversations } = await updateMessagesAndConversation(
            [message],
            getConversationMessages(conversationId),
          ));

          updatedConversation = getConversation(
            updatedConversationId,
            updatedConversations,
          ) as Conversation;
        } else if (command.label === 'Imagine') {
          const userMessage = createMessage(
            { role: 'user', name: 'You' },
            currentPrompt.raw,
            currentPrompt.raw,
          );
          const message = createMessage(
            { role: 'assistant', name: modelName || selectedModel },
            t("Soon, I'll be able to imagine wonderfull images..."),
          );
          let updatedConversationId: string | undefined;
          ({ updatedConversationId, updatedConversations } = await updateMessagesAndConversation(
            [userMessage, message],
            getConversationMessages(conversationId),
          ));

          updatedConversation = getConversation(
            updatedConversationId,
            updatedConversations,
          ) as Conversation;
        }
      }
      clearPrompt(updatedConversation, updatedConversations);
      return;
    }

    // logger.info('send modelName', modelName, modelItem, mentions);

    if (currentPrompt.text.length < 1) {
      if (modelName) {
        // Change conversation's model if there is only a model mention in the prompt
        // TODO handle parameters and key
        handleSelectModel(modelName, modelItem.group as ProviderType, { currentPrompt: undefined });
        setChangedPrompt(undefined);
        return;
      }
      const error = { ...errorMessage, [conversationId]: t('Please enter a message.') };
      setErrorMessage(error);
      return;
    }

    if (mentions.length > 1) {
      const error = { ...errorMessage, [conversationId]: t('Only one model at a time.') };
      setErrorMessage(error);
      return;
    }
    if (mentions.length === 1 && (!modelName || mentions[0].state === PromptTokenState.Error)) {
      const error = { ...errorMessage, [conversationId]: t('This model is not available.') };
      setErrorMessage(error);
      return;
    }

    setErrorMessage({ ...errorMessage, [conversationId]: '' });
    setIsProcessing({ ...isProcessing, [conversationId]: true });

    const userMessage = createMessage(
      { role: 'user', name: 'you' },
      currentPrompt.text,
      currentPrompt.raw,
    );
    let message = createMessage({ role: 'assistant', name: modelName || selectedModel }, '...');
    message.status = MessageStatus.Pending;
    userMessage.sibling = message.id;
    message.sibling = userMessage.id;

    const {
      updatedConversationId,
      updatedConversations: uc,
      updatedMessages,
    } = await updateMessagesAndConversation(
      [userMessage, message],
      getConversationMessages(conversationId),
    );
    let updatedConversations = uc;

    const conversation: Conversation = getConversation(
      updatedConversationId,
      updatedConversations,
    ) as Conversation;
    if (conversation.temp) {
      conversation.name = getConversationTitle(conversation);
    }

    /* conversation.currentPrompt = undefined;
    setChangedPrompt(undefined);
    conversation.temp = false;

    updatedConversations = updateConversation(conversation, updatedConversations);
    updateConversations(updatedConversations); */
    updatedConversations = clearPrompt(conversation, updatedConversations);

    logger.info('onSendMessage', updatedMessages, conversation);
    message = await sendMessage(message, updatedMessages, conversation, updatedConversations);

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
    setErrorMessage({ ...errorMessage, [conversationId]: '' });
    setIsProcessing({ ...isProcessing, [conversationId]: true });

    let message: Message = changeMessageContent(
      previousMessage,
      '...',
      '...',
      MessageStatus.Pending,
    );

    const { updatedConversationId, updatedConversations, updatedMessages } =
      await updateMessagesAndConversation([message], conversationMessages);

    const conversation: Conversation = getConversation(
      updatedConversationId,
      updatedConversations,
    ) as Conversation;

    message = await sendMessage(message, updatedMessages, conversation, updatedConversations);

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
      const parsedContent = parsePrompt({ text: newContent }, tokenValidator);
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
    (prompt: ParsedPrompt | undefined, conversationName = 'Conversation') => {
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
        const newConversation = createConversation('Conversation');
        updatedConversations.push(newConversation);
        newConversation.temp = true;
        newConversation.name = conversationName;
        newConversation.currentPrompt = prompt;
        /* if (tempModelProvider) {
          [newConversation.model, newConversation.provider] = tempModelProvider;
          setTempModelProvider(undefined);
        } */
        if (connector) {
          addConversationConnector(newConversation, connector);
          setConnector(undefined);
        }
        setTempConversationId(newConversation.id);
      }
      updateConversations(updatedConversations);
      setChangedPrompt(undefined);
    },
    [tempConversationId, conversationId, conversations, updateConversations, connector],
  );

  useDebounceFunc<ParsedPrompt | undefined>(handleUpdatePrompt, changedPrompt, 500);

  const handleChangePrompt = (prompt: ParsedPrompt) => {
    if (prompt.raw !== currentPrompt.raw) {
      setChangedPrompt(prompt);
    }
  };

  const handlePromptTemplateSelected = (prompt: PromptTemplate) => {
    handleUpdatePrompt(
      parsePrompt({ text: prompt.value, caretStartIndex: 0 }, tokenValidator),
      prompt.name,
    );
  };

  const handleScrollPosition = ({ key, position }: KeyedScrollPosition) => {
    const conversation = getConversation(key, conversations);
    if (conversation && conversation.scrollPosition !== position.y && position.y !== -1) {
      logger.info(`handleScrollPosition ${key} ${conversationId}`, position);
      conversation.scrollPosition = position.y;
      const updatedConversations = updateConversation(conversation, conversations, true);
      updateConversations(updatedConversations);
    }
  };

  const handleUploadFile = async () => {
    const conversation = getConversation(conversationId, conversations);
    if (conversation) {
      const files = await openFileDialog(false, [
        { name: 'conversations', extensions: ['pdf', 'txt', 'csv', 'json', 'md'] },
      ]);
      if (files) {
        const { conversation: updatedConversation, assets } = addAssetsToConversation(
          conversation,
          files,
        );
        const message = createMessage({ role: 'user', name: 'you' }, undefined, undefined, assets);
        const conversationMessages = getConversationMessages(conversationId);
        const updatedMessages = mergeMessages(conversationMessages, [message]);
        updateConversationMessages(conversationId, updatedMessages);
        const updatedConversations = updateConversation(updatedConversation, conversations, true);
        updateConversations(updatedConversations);
      }
    }
  };

  const prompt = changedPrompt === undefined ? currentPrompt : changedPrompt;
  return (
    <div className="flex h-full flex-col dark:bg-neutral-800/30">
      <div className="grow-0">
        <div className="justify-left flex w-full flex-row items-center gap-4 bg-neutral-50 p-3 text-xs text-neutral-500 dark:bg-neutral-900 dark:text-neutral-300">
          <div className="flex grow flex-row items-center">
            <ThreadMenu
              selectedModelName={selectedModel}
              selectedConversationId={conversationId}
              modelItems={modelItems}
              onSelectModel={handleSelectModel}
              onSelectMenu={onSelectMenu}
            />
          </div>
          <div className="flex-1">
            <p className="hidden rounded-md border border-neutral-600 px-3 py-1">-</p>
          </div>
          <div className="flex flex-1 flex-row justify-end gap-2">
            <Button
              aria-label="Toggle thread explorer"
              variant="ghost"
              size="sm"
              className="p-1"
              onClick={() => onChangeDisplayExplorer(!displayExplorer)}
            >
              {displayExplorer ? (
                <PanelLeftClose strokeWidth={1.0} />
              ) : (
                <PanelLeft strokeWidth={1.0} />
              )}
            </Button>
            <Button
              aria-label="Toggle thread settings"
              variant="ghost"
              size="sm"
              className="p-1"
              onClick={() => onChangeDisplaySettings(!displaySettings)}
            >
              {displaySettings ? (
                <PanelRightClose strokeWidth={1.0} />
              ) : (
                <PanelRight strokeWidth={1.0} />
              )}
            </Button>
          </div>
        </div>
      </div>

      {showEmptyChat ? (
        <div className="flex grow flex-col pb-10">
          <EmptyView
            className="m-2 grow"
            title={t('Chat with your private local GPT')}
            description={t('Opla works using your machine processing power.')}
            buttonLabel={disabled ? t('Start a conversation') : undefined}
            icon={<Opla className="h-10 w-10 animate-pulse" />}
          />
          <PromptsGrid onPromptSelected={handlePromptTemplateSelected} disabled={disabled} />
        </div>
      ) : (
        (prompt || (messages && messages[0]?.conversationId === conversationId)) && (
          <ConversationView
            conversationId={selectedConversation?.id as string}
            scrollPosition={
              selectedConversation && selectedConversation.scrollPosition !== undefined
                ? selectedConversation.scrollPosition
                : -1
            }
            messages={messages || []}
            onScrollPosition={handleScrollPosition}
            handleResendMessage={handleResendMessage}
            handleShouldDeleteMessage={handleShouldDeleteMessage}
            handleShouldDeleteAssets={handleShouldDeleteAssets}
            handleChangeMessageContent={handleChangeMessageContent}
          />
        )
      )}
      <div className="flex flex-col items-center text-sm dark:bg-neutral-800/30" />

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
          onUploadFile={handleUploadFile}
          tokenValidate={tokenValidator}
        />
      )}
    </div>
  );
}

export default Thread;
