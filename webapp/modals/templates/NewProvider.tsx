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

import { useContext, useState } from 'react';
import { useRouter } from 'next/router';
import Card from '@/components/common/Card';
import Dialog from '@/components/common/Modal';
import useTranslation from '@/hooks/useTranslation';
import { Provider, ProviderType } from '@/types';
import { createProvider } from '@/utils/data/providers';
import logger from '@/utils/logger';
import { AppContext } from '@/context';
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
  onClose: _onClose,
}: {
  id: string;
  open: boolean;
  onClose: () => void | undefined;
}) {
  const [provider, setProvider] = useState<Partial<Provider>>({});
  const [step, setStep] = useState(1);
  const { t } = useTranslation();
  const { providers, setProviders } = useContext(AppContext);
  const router = useRouter();

  const isOpla = !!providers.find((p) => p.type === 'opla');

  const onClose = () => {
    setStep(1);
    setProvider({});
    _onClose();
  };

  const onChoose = (type: ProviderType, name: string) => {
    logger.info('onChoose', type, name, step);
    const newProvider = createProvider(name, { type });
    setProvider(newProvider);
    setStep(2);
  };

  const onBack = () => {
    setStep(step - 1);
  };

  const onNext = () => {
    setStep(step + 1);
  };

  const onCreate = () => {
    logger.info('onCreate', step, provider);
    const newProvider = createProvider(provider.name as string, provider);
    setProviders([...providers, newProvider]);
    onClose();
    router.push(`/providers/${newProvider.id}`);
  };

  const onParameterChange = (name: string, value: string | number | boolean) => {
    const newProvider = { ...provider, [name]: value };
    logger.info('onParameterChange', name, value, newProvider);
    setProvider(newProvider);
  };

  return (
    <Dialog id={id} size="md" open={open} onClose={onClose}>
      <div className="flex h-full w-full flex-col justify-between gap-3 p-2 pb-4">
        {step === 1 && (
          <Panel title={t('Choose a provider')}>
            <>
              <Card
                title="Opla"
                disabled={isOpla}
                selected={provider?.type === 'opla'}
                description={t('Easy to run on your machine')}
                onClick={() => onChoose('opla', 'Opla')}
              />
              <Card
                title="OpenAI"
                selected={provider?.type === 'api'}
                description={t('Using your access token')}
                onClick={() => onChoose('api', 'OpenAI')}
              />
              <Card
                title={t('Server')}
                description={t('For experts')}
                selected={provider?.type === 'server'}
                onClick={() => onChoose('server', t('Remote server'))}
              />
            </>
          </Panel>
        )}
        {step === 2 && (
          <Panel title={`${provider.name}: ${t('configuration')}`}>
            <ProviderCreate provider={provider} onParameterChange={onParameterChange} />
          </Panel>
        )}
        {step === 3 && (
          <Panel title={`${provider.name}: ${t('advanced configuration')}`}>
            <ProviderCreate provider={provider} onParameterChange={onParameterChange} advanced />
          </Panel>
        )}
        <div className="flex w-full flex-shrink-0 flex-row items-center gap-2 px-2 pt-4">
          <div className="flex w-full flex-row gap-2">
            {provider?.type && step > 1 && (
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  onCreate();
                }}
                className="rounded-md border border-neutral-600 px-3 py-1 disabled:opacity-50"
              >
                {t('Create')}
              </button>
            )}
          </div>
          <div className="flex w-full flex-row-reverse gap-2">
            <div> {step}/3</div>
            <button
              type="button"
              disabled={!provider?.type || step === 3}
              onClick={(e) => {
                e.preventDefault();
                onNext();
              }}
              className="disabled:opacity-50"
            >
              {t('Next')}
            </button>
            <button
              disabled={step === 1}
              type="button"
              onClick={(e) => {
                e.preventDefault();
                onBack();
              }}
              className="disabled:opacity-50"
            >
              {t('Back')}
            </button>
          </div>
        </div>
      </div>
    </Dialog>
  );
}
