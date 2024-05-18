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

import { useContext, useMemo, useState } from 'react';
import { Bot } from 'lucide-react';
import { AppContext } from '@/context';
import { AIService, Assistant, Conversation, Ui } from '@/types';
import useTranslation from '@/hooks/useTranslation';
import AvatarView from '@/components/common/AvatarView';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { getAssistantTargetsAsItems, getDefaultAssistantService } from '@/utils/data/assistants';
import { getStateColor } from '@/utils/ui';
import { addConversationService, updateConversation } from '@/utils/data/conversations';
import ServiceBadge from './ServiceBadge';

type AssistantTitleProps = {
  assistant: Assistant;
  conversation: Conversation | undefined;
  selectedTargetId: string | undefined;
  selectedItem: Ui.MenuItem | undefined;
  onEnableProvider: () => void;
};

export default function AssistantTitle({
  assistant,
  conversation,
  selectedTargetId,
  selectedItem,
  onEnableProvider,
}: AssistantTitleProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const { conversations, updateConversations } = useContext(AppContext);
  const service = conversation?.services?.[0] || getDefaultAssistantService(assistant);
  const target = assistant?.targets?.find((tg) => tg.id === selectedTargetId);
  const targetItems: Ui.MenuItem[] = useMemo(
    () => (assistant ? getAssistantTargetsAsItems(assistant, target?.id) : []),
    [assistant, target],
  );

  const handleSelectAssistantTarget = async (item: Ui.MenuItem) => {
    if (!conversation) {
      return;
    }
    const targetId = item.value as string;
    const newConversation: Conversation = addConversationService(conversation, {
      ...service,
      targetId,
    } as AIService);
    const newConversations = updateConversation(newConversation, conversations);
    updateConversations(newConversations);
  };

  let targetState = Ui.BasicState.disabled;

  if (target && !target.disabled) {
    targetState = Ui.BasicState.active;
  } else if (selectedItem && selectedItem.state) {
    targetState = selectedItem.state;
  }

  return (
    <Popover open={targetItems.length > 1 && open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          disabled={targetItems.length < 2}
          className="flex gap-4 px-3 capitalize text-foreground !opacity-100"
        >
          {assistant && (
            <AvatarView
              avatar={assistant.avatar}
              className="mr-2 h-4 w-4"
              icon={assistant.avatar ? undefined : <Bot className="h-4 w-4" strokeWidth={1.5} />}
            />
          )}
          <span className="font-extrabold">{assistant?.name ?? t('Assistant not found')}</span>
          {target && targetState && (
            <ServiceBadge
              state={targetState}
              providerName={target?.provider}
              handleEnableProvider={onEnableProvider}
            />
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-full p-0">
        <Command>
          <CommandInput placeholder={t('Filter target...')} autoFocus />
          <CommandList>
            <CommandEmpty>{t('No target found.')}</CommandEmpty>
            <CommandGroup>
              {targetItems.map((item) => (
                <CommandItem
                  key={item.label}
                  value={item.value}
                  onSelect={() => {
                    handleSelectAssistantTarget(item);
                    setOpen(false);
                  }}
                  className="flex w-full items-center justify-between"
                >
                  <span className="capitalize">{item.label}</span>
                  <Badge
                    variant="secondary"
                    className={`ml-4 bg-gray-300 capitalize text-gray-600 ${getStateColor(item.state, 'text', true)}`}
                  >
                    {item.group || 'local'}
                  </Badge>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
