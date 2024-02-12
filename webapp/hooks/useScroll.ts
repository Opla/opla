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

import logger from '@/utils/logger';
import React, { useCallback, MutableRefObject, useEffect } from 'react';

export type Position2D = {
  x: number;
  y: number;
};

/* const emptyPosition: Position2D = {
    x: -1,
    y: -1,
}; */

export default function useScroll(
  previousNode: MutableRefObject<HTMLDivElement | undefined>,
  position: Position2D,
  onUpdatePosition: (pos: Position2D) => void,
) {
  // const position = useRef<Position2D>(defaultPosition);
  const [firstRender, setFirstRender] = React.useState(true);

  logger.info('useScroll ref', position);

  const handleScroll = useCallback(() => {
    if (firstRender) {
      setFirstRender(false);
      return;
    }
    const element = previousNode.current?.firstChild as Element;
    const parentRect = previousNode.current?.getBoundingClientRect();
    if (!element || !parentRect) {
      // position = emptyPosition;
      return;
    }
    const elementRect = element?.getBoundingClientRect();
    let width = (elementRect?.width ?? 0) - (parentRect?.width ?? 0);
    if (width === 0) {
      width = 1;
    }

    let height = (elementRect?.height ?? 0) - (parentRect?.height ?? 0);
    if (height === 0) {
      height = 1;
    }
    const newPosition: Position2D = {
      x: +(((-(elementRect?.x ?? 0) + (parentRect?.x ?? 0)) / width) * 100).toFixed(2),
      y: +(((-(elementRect?.y ?? 0) + (parentRect?.y ?? 0)) / height) * 100).toFixed(2),
    };
    logger.info('handleScroll newPosition', newPosition, width, height, elementRect, parentRect);
    if (elementRect) {
      // position.current = newPosition;
      onUpdatePosition(newPosition);
    }
  }, [firstRender, onUpdatePosition, previousNode]);

  const scrollTo = useCallback(
    (scrollPosition: Position2D) => {
      logger.info('scrollTo', scrollPosition, position);
      const node = previousNode.current;
      if (node && (scrollPosition.x !== position.x || scrollPosition.y !== position.y)) {
        const element = node.firstChild as Element;
        const parentRect = node.getBoundingClientRect();
        if (!element) {
          // position.current = emptyPosition;
          return;
        }
        const elementRect = element?.getBoundingClientRect();
        let width = (elementRect?.width ?? 0) - (parentRect?.width ?? 0);
        if (width === 0) {
          width = 1;
        }

        let height = (elementRect?.height ?? 0) - (parentRect?.height ?? 0);
        if (height === 0) {
          height = 1;
        }
        const newPosition: Position2D = {
          x: (scrollPosition.x / 100) * width,
          y: (scrollPosition.y / 100) * height,
        };
        logger.info(
          'scrollTo update',
          scrollTo,
          newPosition,
          width,
          height,
          elementRect,
          parentRect,
        );
        node.scrollTo(newPosition.x, newPosition.y);
        // position.current = scrollPosition;
      }
    },
    [position, previousNode],
  );

  useEffect(() => {
    if (previousNode.current?.nodeType === Node.ELEMENT_NODE) {
      previousNode.current.addEventListener('scroll', handleScroll, { passive: true });
    }
    return () => {
      if (previousNode.current) {
        previousNode.current.removeEventListener('scroll', handleScroll);
      }
    };
  }, [handleScroll, previousNode]);

  /* const customRef = React.useCallback(
        (node: HTMLDivElement) => {
            if (previousNode.current?.nodeType === Node.ELEMENT_NODE) {
                previousNode.current.removeEventListener('scroll', handleScroll);
            }

            if (node?.nodeType === Node.ELEMENT_NODE) {
                node.addEventListener('scroll', handleScroll, { passive: true });
            }

            previousNode.current = node;
            handleScroll();
        },
        [handleScroll],
    ); */
}
