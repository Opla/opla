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

// There is a problem with next-themes, we don't know if we are using systemTheme or not
// This patched version of useTheme will return a boolean to know if we are using systemTheme or not
// Also there is another bug: https://github.com/pacocoursey/next-themes/issues/164
import { useTheme as _useTheme } from 'next-themes';

type UseThemeProps = {
  theme?: string;
  setTheme: (theme: string) => void;
  isSystem: boolean;
};

export default function useTheme(): UseThemeProps {
  const { theme, setTheme } = _useTheme();
  const storedTheme = localStorage.getItem('theme');
  const isSystem = (storedTheme as string) === 'system' || !storedTheme;
  return { theme, setTheme, isSystem };
}
