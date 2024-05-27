// Copyright 2024 Mik Bry
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

import { useContext, useEffect, useRef } from 'react';
import { ModalComponentRef, ModalRef, ModalsContext } from '@/context/modals';

const useRegisterModals = (Modals: ModalRef[]) => {
  const { registerModal, showModal } = useContext(ModalsContext);
  const firstRender = useRef(true);

  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;

      Modals.forEach(({ id, Component }) => {
        registerModal(id, ({ visible = false, onClose = () => {}, data }: ModalComponentRef) => (
          <Component key={id} visible={visible} onClose={onClose} data={data} />
        ));
      });
    }
  }, [registerModal, Modals]);

  return { showModal };
};

export default useRegisterModals;
