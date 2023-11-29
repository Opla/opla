// Copyright 2023 mik
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

import { useEffect, useCallback, RefObject } from 'react';

const useClickOutside = (target: RefObject<HTMLDivElement>, onClose = () => {}) => {
  useEffect(() => {
    target.current?.classList.add('modalbox');
    const handleCloseModal = (e: MouseEvent) => {
      if (target.current && !target.current.contains(e.target as Node)) {
        onClose();
        document.body.classList.remove('modalbox-open');
      }
    };
    window.addEventListener('click', handleCloseModal);
    return () => {
      window.removeEventListener('click', handleCloseModal);
    };
  }, [target, onClose]);
  const openModal = useCallback(() => {
    document.body.classList.add('modalbox-open');
  }, []);
  const closeModal = useCallback(() => {
    document.body.classList.remove('modalbox-open');
  }, []);
  const toggleModal = useCallback(() => {
    document.body.classList.toggle('modalbox-open');
  }, []);
  return { openModal, closeModal, toggleModal };
};

export default useClickOutside;
