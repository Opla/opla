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

import * as React from 'react';
import { BiX } from 'react-icons/bi';

export default function Modal({
  onClose,
  children,
}: {
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      id="portal"
      role="button"
      tabIndex={0}
      className="portal fixed left-0 top-0 flex h-screen w-full items-center justify-center bg-black bg-opacity-50 p-40"
      onKeyUp={(e) => {
        e.preventDefault();
        if (e.key === 'Escape') onClose();
      }}
      onClick={onClose}
    >
      <div
        role="button"
        tabIndex={0}
        className="relative h-full w-full cursor-default rounded-lg bg-white shadow-lg transition-all dark:bg-gray-900"
        onKeyUp={(e) => {
          e.stopPropagation();
        }}
        onClick={(e) => {
          e.stopPropagation();
        }}
      >
        {children}
        <button
          aria-label="Close"
          className="absolute right-0 top-0 m-2"
          type="button"
          onClick={onClose}
        >
          <BiX className="h-6 w-6" />
        </button>
      </div>
    </div>
  );
}
