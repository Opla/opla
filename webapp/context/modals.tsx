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

import Portal from '@/components/common/Portal';
import { createContext, useCallback, useMemo, useState } from 'react';
import { BaseNamedRecord } from '@/types';

export type ModalComponentRef = {
  visible: boolean;
  onClose: () => void | undefined;
  data?: { item: BaseNamedRecord };
};

export type ModalRef = {
  id: string;
  Component: (props: ModalComponentRef) => React.ReactNode;
};

type Context = {
  instances: {
    [key: string]: {
      render: (props: {
        name: string;
        visible: boolean;
        onClose: () => void;
        data: any;
      }) => React.ReactNode;
      visible: boolean;
      data: any;
    };
  };
  registerModal: (name: string, render: any, visible?: boolean, data?: any) => void;
  showModal: (modalName: string, data?: any) => void;
};

const initialContext: Context = {
  instances: {},
  registerModal: () => {},
  showModal: () => {},
};

const ModalsContext = createContext(initialContext);

function ModalsProvider({ children }: { children: React.ReactNode }) {
  const [modals, setModals] = useState(initialContext.instances);

  const registerModal = useCallback(
    (name: string, render: () => React.ReactNode, visible = false, data = undefined) => {
      if (!modals[name]) {
        setModals((prevModals) => ({ ...prevModals, ...{ [name]: { render, visible, data } } }));
      }
    },
    [modals],
  );

  const showModal = useCallback(
    (name: string, data = undefined) => {
      const instance = modals[name];

      if (instance) {
        setModals((prevModals) => ({
          ...prevModals,
          ...{ [name]: { ...instance, visible: true, data } },
        }));
      }
    },
    [modals],
  );

  const onClose = (name: string) => {
    const instance = modals[name];
    if (instance) {
      setModals((prevModals) => ({
        ...prevModals,
        ...{ [name]: { ...instance, visible: false, data: undefined } },
      }));
    }
  };

  const contextValue = useMemo(
    () => ({ instances: modals, registerModal, showModal }),
    [modals, registerModal, showModal],
  );

  return (
    <ModalsContext.Provider value={contextValue}>
      {children}
      <Portal>
        {Object.entries(modals).map(([name, { render, visible, data }]) =>
          visible ? render({ name, visible, onClose: () => onClose(name), data }) : null,
        )}
      </Portal>
    </ModalsContext.Provider>
  );
}

export { ModalsContext, ModalsProvider };
