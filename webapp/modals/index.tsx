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

import Modal from '@/components/Modal';
import Settings from './settings';

export default function SettingsModal({
  visible,
  settingTab,
  onTabChanged,
  onClose,
}: {
  visible: boolean;
  settingTab?: string | undefined;
  onTabChanged: (tab: string) => void | undefined;
  onClose: () => void | undefined;
}) {
  return (
    <Modal id="settingsmodal" open={visible} onClose={onClose}>
      <Settings tab={settingTab} onTabChanged={onTabChanged} />
    </Modal>
  );
}
