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

import { useState } from 'react';
import { useRouter } from 'next/router';
import ButtonCard from '@/components/common/ButtonCard';
import Dialog from '@/components/common/Modal';
import useTranslation from '@/hooks/useTranslation';
import { Provider, ProviderType } from '@/types';
import { createProvider } from '@/utils/data/providers';
import { Button } from '@/components/ui/button';
import { Page } from '@/types/ui';
import { ParameterValue } from '@/components/common/Parameter';
import { useProviderStore } from '@/stores';
import ProviderCreate from './providers';

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <>
      <div className="mb-4 text-lg font-bold">{title}</div>
      <div className="relative flex w-full flex-1 flex-row justify-between">{children}</div>
    </>
  );
}

export default function NewProvider({
  id,
  open,
  onClose,
}: {
  id: string;
  open: boolean;
  onClose: () => void | undefined;
}) {
  const [provider, setProvider] = useState<Partial<Provider>>({});
  const [step, setStep] = useState(1);
  const { t } = useTranslation();
  const { providers, setProviders } = useProviderStore();
  const router = useRouter();

  const isOpla = !!providers.find((p) => p.type === ProviderType.opla);

  const handleClose = () => {
    setStep(1);
    setProvider({});
    onClose();
  };

  const handleChoose = (type: ProviderType, name: string) => {
    const newProvider = createProvider(name, { type });
    setProvider(newProvider);
    setStep(2);
  };

  const handleBack = () => {
    setStep(step - 1);
  };

  const handleNext = () => {
    setStep(step + 1);
  };

  const handleCreate = () => {
    const newProvider = createProvider(provider.name as string, provider);
    setProviders([...providers, newProvider]);
    handleClose();
    router.push(`${Page.Providers}/${newProvider.id}`);
  };

  const handleParameterChange = (name: string, value: ParameterValue) => {
    const newProvider = { ...provider, [name]: value };
    setProvider(newProvider);
  };

  return (
    <Dialog id={id} size="lg" open={open} onClose={handleClose}>
      <div className="flex h-full w-full flex-col justify-between gap-3 p-2 pb-4">
        {step === 1 && (
          <Panel title={t('Choose a provider')}>
            <>
              <ButtonCard
                title="Opla"
                disabled={isOpla}
                selected={provider?.type === ProviderType.opla}
                description={t('Easy to run on your machine')}
                onClick={() => handleChoose(ProviderType.opla, 'Opla')}
              />
              <ButtonCard
                title="OpenAI"
                disabled={providers.find((p) => p.type === ProviderType.openai) !== undefined}
                selected={provider?.type === ProviderType.openai}
                description={t('Using your OpenAI account')}
                onClick={() => handleChoose(ProviderType.openai, 'OpenAI')}
              />
              <ButtonCard
                title={t('Server')}
                description={t('For experts, it needs to be compatible with OpenAI API')}
                selected={provider?.type === ProviderType.server}
                onClick={() => handleChoose(ProviderType.server, t('Remote server'))}
              />
            </>
          </Panel>
        )}
        {step === 2 && (
          <Panel title={`${provider.name}: ${t('configuration')}`}>
            <ProviderCreate provider={provider} onParameterChange={handleParameterChange} />
          </Panel>
        )}
        {step === 3 && (
          <Panel title={`${provider.name}: ${t('advanced configuration')}`}>
            <ProviderCreate
              provider={provider}
              onParameterChange={handleParameterChange}
              advanced
            />
          </Panel>
        )}
        <div className="flex w-full flex-shrink-0 flex-row items-center gap-2 px-2 pt-4">
          <div className="flex w-full flex-row gap-2">
            {provider?.type && step > 1 && (
              <Button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  handleCreate();
                }}
              >
                {t('Create')}
              </Button>
            )}
          </div>
          <div className="flex w-full flex-row-reverse gap-2">
            <div> {step}/3</div>
            <Button
              variant="outline"
              disabled={!provider?.type || step === 3}
              onClick={(e) => {
                e.preventDefault();
                handleNext();
              }}
              className="disabled:opacity-50"
            >
              {t('Next')}
            </Button>
            <Button
              disabled={step === 1}
              variant="outline"
              onClick={(e) => {
                e.preventDefault();
                handleBack();
              }}
              className="disabled:opacity-50"
            >
              {t('Back')}
            </Button>
          </div>
        </div>
      </div>
    </Dialog>
  );
}
