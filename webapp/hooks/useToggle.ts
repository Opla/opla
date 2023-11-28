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

import { useCallback, useState } from 'react';

type Toggle = [boolean, () => void, () => void, () => void];

/**
 * Hook to toggle an isolated boolean state with callbacks.
 * @example
 * const [isOpen, onOpen, onClose, onToggle] = useToggle();
 * @param {Boolean} [initialState = false] The initial state
 * @returns {Toggle} A tuple with the state reference and callbacks
 */
export default function useToggle(initialState = false): Toggle {
  const [isToggled, setToggled] = useState<boolean>(initialState);
  const onToggleOn = useCallback(() => setToggled(true), [setToggled]);
  const onToggleOff = useCallback(() => setToggled(false), [setToggled]);
  const onToggle = useCallback(() => setToggled(!isToggled), [isToggled, setToggled]);

  return [isToggled, onToggleOn, onToggleOff, onToggle];
}
