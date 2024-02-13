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
import { useCallback, useRef, MutableRefObject } from 'react';

export type Position2D = {
  x: number;
  y: number;
};

type Rect = {
  x: number;
  y: number;
  width: number;
  height: number;
  top?: number;
  right?: number;
  bottom?: number;
  left?: number;
};

export type KeyedScrollPosition = { key: string | undefined; position: Position2D; rect?: Rect };

export const EmptyPosition: Position2D = {
  x: -1,
  y: -1,
};

const getBoundingClientRect = (element?: HTMLDivElement): Rect =>
  element?.getBoundingClientRect() || {
    x: 0,
    y: 0,
    width: 1,
    height: 1,
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  };

const containerRectToPercentage = (element: HTMLDivElement, parent: HTMLDivElement): Rect => {
  const elementRect = getBoundingClientRect(element);
  const parentRect = getBoundingClientRect(parent);
  let width = elementRect.width - parentRect.width;
  if (width === 0) {
    width = -1;
  }

  let height = elementRect.height - parentRect.height;
  if (height === 0) {
    height = -1;
  }
  console.log('elementRect.y', elementRect.y, parentRect.y, height, elementRect, parentRect);
  const x = width < 1 ? 0 : +(((-elementRect.x + parentRect.x) / width) * 100).toFixed(2);
  const y = height < 1 ? 0 : +(((-elementRect.y + parentRect.y) / height) * 100).toFixed(2);
  return {
    x,
    y,
    width,
    height,
  };
};

export default function useScroll(
  key: string,
  position: Position2D,
  onUpdatePosition: (props: KeyedScrollPosition) => void,
): [
  React.RefCallback<HTMLDivElement>,
  (scrollPosition: Position2D, forceUpdate?: boolean) => void,
] {
  const previousNode: MutableRefObject<HTMLDivElement | undefined> = useRef();
  const keyedPosition = useRef<KeyedScrollPosition>({ key, position });

  logger.info(`useScroll ref ${key}`, position);

  const handleScroll = useCallback(() => {
    const parent = previousNode.current as HTMLDivElement;
    const element = parent?.firstChild as HTMLDivElement;
    const parentRect = parent?.getBoundingClientRect();
    if (!element || !parentRect) {
      return;
    }
    const rect: Rect = containerRectToPercentage(element, parent);
    if (rect.x === position.x && rect.y === position.y) {
      logger.info('same position');
      return;
    }
    logger.info(`handleScroll newPosition ${key}`, position, rect);
    if (rect.width && rect.height) {
      const newKeyedPosition: KeyedScrollPosition = {
        key,
        position: { x: rect.x, y: rect.y },
        rect,
      };
      if (
        (keyedPosition.current.key === key &&
          keyedPosition.current.position.x !== newKeyedPosition.position.x) ||
        keyedPosition.current.position.y !== newKeyedPosition.position.y
      ) {
        keyedPosition.current = newKeyedPosition;
        if (
          keyedPosition.current.rect?.height === newKeyedPosition.rect?.height &&
          keyedPosition.current.rect?.width === newKeyedPosition.rect?.width
        ) {
          onUpdatePosition(newKeyedPosition);
        } else {
          logger.info('skip update', keyedPosition.current, newKeyedPosition);
        }
      }
    }
  }, [position, onUpdatePosition, key]);

  const scrollTo = useCallback(
    (scrollPosition: Position2D) => {
      if (scrollPosition.x === -1 && scrollPosition.y === -1) {
        return;
      }
      const parent = previousNode.current as HTMLDivElement;
      if (parent) {
        logger.info(`scrollTo ${key} ${parent}`, scrollPosition, position);
        const element = parent.firstChild as HTMLDivElement;
        if (!element) {
          return;
        }

        const currentRect: Rect = containerRectToPercentage(
          element as HTMLDivElement,
          parent as HTMLDivElement,
        );
        logger.info('currentRect', currentRect, scrollPosition, position);
        if (currentRect.height < 1) {
          logger.info('not scroll', scrollPosition, currentRect);
          return;
        }
        if (currentRect.x === scrollPosition.x && currentRect.y === scrollPosition.y) {
          logger.info('same position', scrollPosition, currentRect);
          return;
        }

        const elementRect = getBoundingClientRect(element);
        const parentRect = getBoundingClientRect(parent);
        let width = elementRect.width - parentRect.width;
        if (width === 0) {
          width = -1;
        }

        let height = elementRect.height - parentRect.height;
        if (height === 0) {
          height = -1;
        }
        const newPosition: Position2D = {
          x: width < 1 ? 0 : -(scrollPosition.x / 100) * (width + parentRect.x),
          y: height < 1 ? 0 : -(scrollPosition.y / 100) * (height + parentRect.y),
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
        parent.scrollTo(-newPosition.x, -newPosition.y);
        const rect = containerRectToPercentage(element, parent);
        keyedPosition.current = { key, position: { x: rect.x, y: rect.y }, rect };
      }
    },
    [key, position],
  );

  /* useEffect(() => {
      if (previousNode.current?.nodeType === Node.ELEMENT_NODE) {
        previousNode.current.addEventListener('scroll', handleScroll, { passive: true });
      }
      return () => {
        if (previousNode.current) {
          previousNode.current.removeEventListener('scroll', handleScroll);
        }
      };
    }, [handleScroll, previousNode]); */

  const customRef = useCallback(
    (node: HTMLDivElement) => {
      if (previousNode.current === node) {
        return;
      }
      const listener = () => {
        handleScroll();
      };

      const resizeListener = () => {
        // handleScroll();
        console.log('resizeListener');
      };

      if (previousNode.current?.nodeType === Node.ELEMENT_NODE) {
        previousNode.current.removeEventListener('scroll', listener);
        previousNode.current.firstChild?.removeEventListener('resize', resizeListener);
      }

      if (node?.nodeType === Node.ELEMENT_NODE) {
        node.addEventListener('scroll', listener, { passive: true });
        node.firstChild?.addEventListener('resize', resizeListener);
      }
      previousNode.current = node;
    },
    [handleScroll],
  );
  return [customRef, scrollTo];
}
