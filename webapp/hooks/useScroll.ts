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
import { Position2D, Rect, getBoundingClientRect } from '@/utils/ui';

export type KeyedScrollPosition = { key: string | undefined; position: Position2D; rect?: Rect };

const containerRectToPercentage = (elementRect: Rect, parentRect: Rect): Rect => {
  let width = +(elementRect.width - parentRect.width - parentRect.x).toFixed(1);
  if (width === 0) {
    width = -1;
  }

  let height = +(elementRect.height - parentRect.height - parentRect.y).toFixed(1);
  if (height === 0) {
    height = -1;
  }
  const ex = +elementRect.x.toFixed(1);
  const ey = +elementRect.y.toFixed(1);
  const x = width < 1 ? 0 : +((-ex / width) * 100).toFixed(1);
  const y = height < 1 ? 0 : +((-ey / height) * 100).toFixed(1);
  // logger.info('containerRectToPercentage', ey, elementRect, parentRect, x, y, height);
  return {
    x,
    y,
    width,
    height,
  };
};

const containerToPercentage = (element: HTMLDivElement, parent: HTMLDivElement): Rect => {
  const elementRect = getBoundingClientRect(element);
  const parentRect = getBoundingClientRect(parent);
  return containerRectToPercentage(elementRect, parentRect);
};

const percentageToContainerRect = (
  elementRect: Rect,
  parent: HTMLDivElement,
  position: Position2D,
): Rect => {
  const parentRect = getBoundingClientRect(parent);
  let width = +(elementRect.width - parentRect.width).toFixed(1);
  if (width === 0) {
    width = -1;
  }

  let height = +(elementRect.height - parentRect.height).toFixed(1);
  if (height === 0) {
    height = -1;
  }

  const x = width < 1 ? 0 : -((position.x / 100) * width).toFixed(1);
  const y = height < 1 ? 0 : -((position.y / 100) * height).toFixed(1) + 50;
  // logger.info('percentageToContainerRect', y, elementRect, parentRect, position, height);
  return {
    x,
    y,
    width,
    height,
  };
};

const compareXY = (a: Position2D, b: Position2D): boolean => {
  const ax = +a.x.toFixed(1);
  const ay = +a.y.toFixed(1);
  const bx = +b.x.toFixed(1);
  const by = +b.y.toFixed(1);

  return ax === bx && ay === by;
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
  const keyedRect = useRef<KeyedScrollPosition>({
    key,
    position: { x: -1, y: -1, width: -1, height: -1 } as Position2D,
  });
  const isScrolling = useRef(false);
  const handler = useRef<ReturnType<typeof setTimeout> | undefined>();
  const isResizing = useRef(true);

  const handleResize = useCallback(
    (contentRect: Rect) => {
      if (isScrolling.current) {
        // logger.info('handleResize isScrolling', isScrolling.current);
        return;
      }

      const currentRect = keyedRect.current.rect;
      const parent = previousNode.current as HTMLDivElement;
      logger.info('handleResize', contentRect, currentRect, parent);
      if (
        parent &&
        (!currentRect ||
          contentRect.width !== currentRect.width ||
          contentRect.height !== currentRect.height)
      ) {
        const rect = percentageToContainerRect(contentRect, parent, position);
        const { width, height, ...xy } = rect;
        if (height < 1 && width < 1) {
          return;
        }
        const compare = containerRectToPercentage(
          { width: contentRect.width, height: contentRect.height, x: rect.x, y: rect.y },
          getBoundingClientRect(parent),
        );
        logger.info(
          'resize update',
          `y=${position.y} yc=${compare.y}`,
          `y=${position.y} yc=${compare.y}`,
          position,
          compare,
          xy,
          width,
          height,
          contentRect,
        );
        parent.scrollTo({ left: -xy.x, top: -xy.y, behavior: 'instant' });
        keyedRect.current = { key, position: xy, rect };
        isResizing.current = true;
      }
    },
    [key, position],
  );

  const handleScrollEnd = useCallback(
    (rect: Rect) => {
      if (rect.x === position.x && rect.y === position.y) {
        // logger.info('handleScrollEnd same position');
        isScrolling.current = false;
        return;
      }
      // logger.info(`handleScrollEnd newPosition ${key}`, keyedRect.current, position, rect);
      if (rect.width && rect.height) {
        const newKeyedPosition: KeyedScrollPosition = {
          key,
          position: { x: rect.x, y: rect.y },
          rect,
        };
        /* if (
        (keyedRect.current.key === key &&
          keyedRect.current.position.x !== newKeyedPosition.position.x) ||
        keyedRect.current.position.y !== newKeyedPosition.position.y
      ) {
        keyedRect.current = newKeyedPosition;
        if (
          keyedRect.current.rect?.height === newKeyedPosition.rect?.height &&
          keyedRect.current.rect?.width === newKeyedPosition.rect?.width
        ) {
          onUpdatePosition(newKeyedPosition);
        }
      } */
        onUpdatePosition(newKeyedPosition);
      }

      isScrolling.current = false;
      // logger.info('handleScrollEnd isScrolling', isScrolling.current, handler.current);
    },
    [position, onUpdatePosition, key],
  );

  const handleScroll = useCallback(() => {
    isScrolling.current = true;

    if (handler.current) {
      clearTimeout(handler.current);
    }
    const parent = previousNode.current as HTMLDivElement;
    const element = parent?.firstChild as HTMLDivElement;
    const parentRect = getBoundingClientRect(parent);
    if (!element || !parentRect) {
      return;
    }
    const rect: Rect = containerToPercentage(element, parent);
    handler.current = setTimeout(() => handleScrollEnd(rect), 200);
    // waitAfterScroll(handleScrollEnd);
  }, [handleScrollEnd]);

  const scrollTo = useCallback(
    (scrollPosition: Position2D) => {
      logger.info('scrollTo', scrollPosition, position, isScrolling.current);
      if (isScrolling.current || (scrollPosition.x === -1 && scrollPosition.y === -1)) {
        return;
      }

      const parent = previousNode.current as HTMLDivElement;
      if (parent) {
        logger.info(`scrollTo isScrolling ${key} ${parent}`, isScrolling, scrollPosition, position);
        const element = parent.firstChild as HTMLDivElement;
        if (!element) {
          return;
        }

        const currentRect: Rect = containerToPercentage(
          element as HTMLDivElement,
          parent as HTMLDivElement,
        );
        logger.info('currentRect', currentRect, scrollPosition, position);
        if (currentRect.height < 1) {
          // logger.info('not scroll', scrollPosition, currentRect);
          return;
        }
        if (compareXY(currentRect, scrollPosition)) {
          // logger.info('same position', scrollPosition, currentRect);
          return;
        }

        const elementRect = getBoundingClientRect(element);
        const newPosition = percentageToContainerRect(elementRect, parent, scrollPosition);
        const compare = containerRectToPercentage(elementRect, getBoundingClientRect(parent));
        const parentRect = getBoundingClientRect(parent);
        logger.info('scrollTo update', compare, newPosition);
        parent.scrollTo(-newPosition.x, -newPosition.y + parentRect.y);
        const rect = containerToPercentage(element, parent);
        keyedRect.current = { key, position: { x: rect.x, y: rect.y }, rect };
        /* waitAfterScroll(() => {
                    isScrolling.current = false;
                }); */
        // isScrolling.current = false;
      }
    },
    [key, position],
  );

  const customRef = useCallback(
    (node: HTMLDivElement) => {
      if (previousNode.current === node) {
        return;
      }
      const listener = () => {
        handleScroll();
      };

      const resizeObserver = new ResizeObserver((entries: ResizeObserverEntry[]) => {
        if (node?.firstChild && entries[0]?.target === node.firstChild) {
          handleResize(entries[0].contentRect);
        }
      });

      if (previousNode.current?.nodeType === Node.ELEMENT_NODE) {
        previousNode.current.removeEventListener('scroll', listener);
        resizeObserver.unobserve(previousNode.current.firstChild as Element);
        if (handler.current) {
          clearTimeout(handler.current);
        }
        isScrolling.current = false;
      }
      previousNode.current = node;
      if (node?.nodeType === Node.ELEMENT_NODE) {
        node.addEventListener('scroll', listener, { passive: true });
        resizeObserver.observe(node.firstChild as Element);
        isScrolling.current = false;
      }
    },
    [handleResize, handleScroll],
  );
  return [customRef, scrollTo];
}
