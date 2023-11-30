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

'use client';

import Image from 'next/image';
import { BiLogoDiscordAlt, BiLogoGithub } from 'react-icons/bi';

export default function Home() {
  return (
    <div className="w-full p-4">
      <header className="w-full p-4">
        <h1 className="w-full text-center text-2xl font-extrabold">Opla</h1>
        <h2 className="w-full text-center text-xl">The ultimate Open-source generative AI App</h2>
        <p className="w-full text-center text-sm font-light">
          Run on your machine and prompt to any open LLMs & more.
        </p>
        <p className="mt-8 flex w-full justify-center">
          <Image width={32} height={32} className="" src="/logo.png" alt="logo" />
        </p>
      </header>
      <main className="w-full p-4 pt-10">
        <p className="flex w-full justify-center p-4 pt-10 text-center">
          <a href="https://github.com/Opla/opla" target="_blank" className="flex items-center">
            <BiLogoGithub />
            <span className="ml-2">Contribute on Github</span>
          </a>
          <a href="https://discord.gg/RJD4Xa2Y" target="_blank" className="ml-4 flex items-center">
            <BiLogoDiscordAlt />
            <span className="ml-2">Discuss on Discord</span>
          </a>
        </p>
      </main>
    </div>
  );
}
