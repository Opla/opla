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
import { defaultShortcuts } from '@/hooks/useShortcuts';
import { shortcutAsText } from '@/utils/shortcuts';

function ShortcutBadge({ command }: { command: string }) {
  const keys = shortcutAsText(command);

  return <div className="ml-2 whitespace-break-spaces text-muted-foreground">{keys}</div>;
}

function ShortcutSettings() {
  const { t } = useTranslation();

  return (
    <div className="flex w-full justify-center">
      <table className="table-auto">
        <thead>
          <tr>
            <th className="px-4 py-2 text-left">{t('Command')}</th>
            <th className="px-4 py-2 text-left">{t('Keybinding')}</th>
            <th className="px-4 py-2 text-left">{t('Description')}</th>
          </tr>
        </thead>
        <tbody>
          {defaultShortcuts.map((shortcut) => (
            <tr key={shortcut.command}>
              <td className="border px-4 py-2">{t(shortcut.command)}</td>
              <td className="border px-4 py-2" aria-label={t(shortcut.command)}>
                <ShortcutBadge command={shortcut.command} />
              </td>
              <td className="border px-4 py-2">{t(shortcut.description)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export { ShortcutBadge, ShortcutSettings };
