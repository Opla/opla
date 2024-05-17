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

const fitRect = (elementRect: Rect, parentRect: Rect): { width: number; height: number } => {
  const width = +(elementRect.width - parentRect.width - parentRect.x).toFixed(2);
  const height = +(elementRect.height - parentRect.height - parentRect.y).toFixed(2);
  return { width, height };
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const containerRectToPercentage = (elementRect: Rect, parentRect: Rect, from: string): Rect => {
  const { width, height } = fitRect(elementRect, parentRect);

  const x = +elementRect.x.toFixed(2);
  const y = +elementRect.y.toFixed(2);
  const px = width <= 0 ? -1 : +((-x / width) * 100).toFixed(2);
  const py = height <= 0 ? -1 : +((-y / height) * 100).toFixed(2);
  /* logger.info(
    'containerRectToPercentage',
    from,
    { x, y },
    { elementRect, parentRect },
    { px, py },
    { height, width },
  ); */
  return {
    x: px,
    y: py,
    width,
    height,
  };
};

const containerToPercentage = (
  element: HTMLDivElement,
  parent: HTMLDivElement,
  from: string,
): Rect => {
  const elementRect = getBoundingClientRect(element);
  const parentRect = getBoundingClientRect(parent);
  return containerRectToPercentage(elementRect, parentRect, from);
};

const percentagePositionToContainerRect = (
  elementRect: Rect,
  parent: HTMLDivElement,
  position: Position2D,
): Rect => {
  const px = position.x > 0 ? position.x : 0;
  const py = position.y > 0 ? position.y : 0;
  const parentRect = getBoundingClientRect(parent);

  const { width, height } = fitRect(elementRect, parentRect);

  const x = width <= 0 ? -1 : -((px / 100) * width).toFixed(2);
  const y = height <= 0 ? -1 : -((py / 100) * height).toFixed(2);
  /* logger.info(
    'percentageToContainerRect',
    { x, y },
    { elementRect, parentRect },
    { position },
    { px, py },
    { height, width },
  ); */
  return {
    x,
    y,
    width,
    height,
  };
};

const compareXY = (a: Position2D, b: Position2D): boolean => {
  let ax = +a.x.toFixed(2);
  let ay = +a.y.toFixed(2);
  let bx = +b.x.toFixed(2);
  let by = +b.y.toFixed(2);
  if (ax < 1) ax = 0;
  if (ay < 1) ay = 0;
  if (bx < 1) bx = 0;
  if (by < 1) by = 0;

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
  const previousScrollToY = useRef<number | undefined>(undefined);
  const isScrolling = useRef(false);
  const handler = useRef<ReturnType<typeof setTimeout> | undefined>();
  const isResizing = useRef(true);

  const handleResize = useCallback(
    (contentRect: Rect) => {
      const parent = previousNode.current as HTMLDivElement;
      const element = parent?.firstChild as HTMLDivElement;
      if (!element || isScrolling.current) {
        // logger.info('handleResize isScrolling', isScrolling.current);
        return;
      }

      const currentRect = keyedRect.current.rect;
      const elementRect = getBoundingClientRect(element);
      const parentRect = getBoundingClientRect(parent);
      const rect = percentagePositionToContainerRect(elementRect, parent, position);
      const { width, height } = rect;
      const currentY = +(-rect.y + parentRect.y).toFixed(2);
      /* logger.info(
        'handleResize',
        position,
        currentY,
        contentRect,
        rect,
        elementRect,
        currentRect,
        parentRect,
      ); */
      if (!currentRect || width !== currentRect.width || height !== currentRect.height) {
        // const rect = percentagePositionToContainerRect(contentRect, parent, position);
        if (rect.height < 1 && rect.width < 1) {
          logger.info('handleResize not scroll', rect, contentRect, currentRect, position);
          return;
        }
        const resizedRect = containerRectToPercentage(
          { width: contentRect.width, height: contentRect.height, x: rect.x, y: rect.y },
          getBoundingClientRect(parent),
          'handleResize',
        );
        const p = { x: +resizedRect.x.toFixed(2), y: +resizedRect.y.toFixed(2) };
        keyedRect.current = { key, position: p, rect };
        if (!compareXY(position, resizedRect)) {
          onUpdatePosition(keyedRect.current);
        }
        isResizing.current = true;
      }

      if (!currentRect || currentY !== previousScrollToY.current) {
        parent.scrollTo(-rect.x, currentY);
        previousScrollToY.current = currentY;
      }
    },
    [key, onUpdatePosition, position],
  );

  const handleScrollEnd = useCallback(
    (rect: Rect) => {
      // logger.info(`handleScrollEnd newPosition ${key}`, keyedRect.current, position, rect);
      if ((!compareXY(rect, position) && rect.width > 0) || rect.height > 0) {
        const newKeyedPosition: KeyedScrollPosition = {
          key,
          position: { x: rect.x, y: rect.y },
          rect,
        };
        onUpdatePosition(newKeyedPosition);
      }

      handler.current = setTimeout(() => {
        isScrolling.current = false;
        handler.current = undefined;
      }, 400);
      // logger.info('handleScrollEnd isScrolling', isScrolling.current, handler.current);
    },
    [position, onUpdatePosition, key],
  );

  const handleScroll = useCallback(() => {
    isScrolling.current = true;

    if (handler.current) {
      clearTimeout(handler.current);
      handler.current = undefined;
    }
    const parent = previousNode.current as HTMLDivElement;
    const element = parent?.firstChild as HTMLDivElement;
    // const parentRect = getBoundingClientRect(parent);
    if (!element) {
      // || !parentRect) {
      return;
    }

    handler.current = setTimeout(() => {
      const rect: Rect = containerToPercentage(element, parent, 'handleScroll');
      handleScrollEnd(rect);
      handler.current = undefined;
    }, 200);
    // waitAfterScroll(handleScrollEnd);
  }, [handleScrollEnd]);

  const scrollTo = useCallback(
    (newPosition: Position2D) => {
      // const scrollPosition = {x: +newPosition.x.toFixed(2), y: +newPosition.y.toFixed(2) };
      logger.info(
        'scrollTo',
        newPosition,
        keyedRect.current.position,
        position,
        isScrolling.current,
      );
      if (isScrolling.current || (newPosition.x === -1 && newPosition.y === -1)) {
        return;
      }
      if (keyedRect.current.key === key && compareXY(keyedRect.current.position, newPosition)) {
        return;
      }
      const parent = previousNode.current as HTMLDivElement;
      // logger.info(`scrollTo isScrolling ${key} ${parent}`, isScrolling, scrollPosition, position);
      const element = parent?.firstChild as HTMLDivElement;
      if (!element) {
        return;
      }

      const currentRect: Rect = containerToPercentage(
        element as HTMLDivElement,
        parent as HTMLDivElement,
        'scrollTo',
      );
      // logger.info('currentRect', currentRect, scrollPosition, position);
      if (currentRect.height < 1) {
        // logger.info('not scroll', scrollPosition, currentRect);
        return;
      }
      if (compareXY(currentRect, newPosition)) {
        // logger.info('same position', scrollPosition, currentRect);
        return;
      }

      const elementRect = getBoundingClientRect(element);
      const updatedPosition = percentagePositionToContainerRect(elementRect, parent, newPosition);
      const compare = containerRectToPercentage(
        elementRect,
        getBoundingClientRect(parent),
        'scrollTo2',
      );
      const parentRect = getBoundingClientRect(parent);
      logger.info('scrollTo update', compare, updatedPosition);
      const currentY = +(-updatedPosition.y + parentRect.y).toFixed(2);
      if (previousScrollToY.current !== currentY) {
        parent.scrollTo(-updatedPosition.x.toFixed(2), currentY);
        previousScrollToY.current = currentY;
      }

      const rect = containerToPercentage(element, parent, 'scrollTo3');
      keyedRect.current = { key, position: { x: +rect.x.toFixed(2), y: +rect.y.toFixed(2) }, rect };
      onUpdatePosition(keyedRect.current);
    },
    [key, onUpdatePosition, position],
  );

  /* useEffect(() => {
    if (!isScrolling.current && (keyedRect.current.key !== key || !compareXY(keyedRect.current.position, position))) {
      // scrollTo(position);
    }
  }, [key, position, scrollTo]); */

  const customRef = useCallback(
    (node: HTMLDivElement) => {
      if (previousNode.current === node) {
        return;
      }
      const listener = () => {
        handleScroll();
      };

      const resizeObserver = new ResizeObserver((entries: ResizeObserverEntry[]) => {
        if (node?.firstChild && entries[0]?.target === node.firstChild && !isScrolling.current) {
          handleResize(entries[0].contentRect);
        }
      });

      if (previousNode.current?.nodeType === Node.ELEMENT_NODE) {
        previousNode.current.removeEventListener('scroll', listener);
        resizeObserver.unobserve(previousNode.current.firstChild as Element);
        resizeObserver.disconnect();
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
