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
// Inspiration :
// https://codesandbox.io/p/sandbox/splitview-p37yw?file=%2Fsrc%2Fcomponents%2FSplitView.tsx%3A1%2C1-118%2C3
import React, { useEffect, useRef, useState } from 'react';
import LeftPanel from './LeftPanel';

type SplitViewProps = {
  left: React.ReactElement;
  children: React.ReactNode;
  className?: string;
  width?: number;
  minWidth?: number;
};

export default function SplitView({
  left,
  children,
  className,
  width = 260,
  minWidth = 140,
}: SplitViewProps) {
  const [leftWidth, setLeftWidth] = useState<undefined | number>(width);
  const [separatorXPosition, setSeparatorXPosition] = useState<undefined | number>(undefined);
  const [dragging, setDragging] = useState(false);

  const splitPaneRef = useRef<HTMLDivElement>(null);

  const onMouseDown = (e: React.MouseEvent) => {
    setSeparatorXPosition(e.clientX);
    setDragging(true);
  };

  const onTouchStart = (e: React.TouchEvent) => {
    setSeparatorXPosition(e.touches[0].clientX);
    setDragging(true);
  };

  const onMove = (clientX: number) => {
    if (dragging && leftWidth && separatorXPosition) {
      const newLeftWidth = leftWidth + clientX - separatorXPosition;
      setSeparatorXPosition(clientX);

      if (newLeftWidth < minWidth) {
        setLeftWidth(minWidth);
        return;
      }

      if (splitPaneRef.current) {
        const splitPaneWidth = splitPaneRef.current.clientWidth;

        if (newLeftWidth > splitPaneWidth - minWidth) {
          setLeftWidth(splitPaneWidth - minWidth);
          return;
        }
      }

      setLeftWidth(newLeftWidth);
    }
  };

  const onMouseMove = (e: MouseEvent) => {
    e.preventDefault();
    onMove(e.clientX);
  };

  const onTouchMove = (e: TouchEvent) => {
    onMove(e.touches[0].clientX);
  };

  const onMouseUp = () => {
    setDragging(false);
  };

  useEffect(() => {
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('touchmove', onTouchMove);
    document.addEventListener('mouseup', onMouseUp);

    return () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('touchmove', onTouchMove);
      document.removeEventListener('mouseup', onMouseUp);
    };
  });

  return (
    <div className={`flex h-full flex-row ${className ?? ''}`} ref={splitPaneRef}>
      <LeftPanel leftWidth={leftWidth} setLeftWidth={setLeftWidth}>
        {left}
      </LeftPanel>
      <button
        type="button"
        aria-label="Resize"
        className="flex cursor-col-resize items-center self-stretch"
        onMouseDown={onMouseDown}
        onTouchStart={onTouchStart}
        onTouchEnd={onMouseUp}
      >
        <div className="h-full border-[1px] border-neutral-300 hover:border-orange-500 dark:border-neutral-900" />
      </button>
      {children}
    </div>
  );
}
