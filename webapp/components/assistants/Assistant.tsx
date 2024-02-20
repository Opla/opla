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

import useTranslation from '@/hooks/useTranslation';
import logger from '@/utils/logger';
import useGlobalStore from '@/stores';
import RecordView from '../common/RecordView';

export type AssistantProps = {
  assistantId?: string;
};

export default function AssistantView({ assistantId }: AssistantProps) {
  const { t } = useTranslation();
  const { getAssistant } = useGlobalStore();

  const assistant = getAssistant(assistantId);

  logger.info('Assistant', assistantId);

  return (
    <RecordView title="Assistant" selectedId={assistantId}>
      <p>{t(assistant?.description || '')}</p>
    </RecordView>
  );
}
