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

// import logger from '@/utils/logger';
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
  const x = width < 1 ? 0 : +(((-elementRect.x + parentRect.x) / width) * 100).toFixed(2);
  const y = height < 1 ? 0 : +(((-elementRect.y + parentRect.y) / height) * 100).toFixed(2);
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
  // logger.info('compareXY', ax, ay, bx, by);
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
  const keyedPosition = useRef<KeyedScrollPosition>({ key, position });
  const isScrolling = useRef(false);
  const handler = useRef<ReturnType<typeof setTimeout> | undefined>();
  const isInit = useRef(true);
  const initHandler = useRef<ReturnType<typeof setTimeout> | undefined>();
  // logger.info(`useScroll ref ${key}`, position);

  const handleResize = useCallback(
    (contentRect: Rect) => {
      /* if (isScrolling.current) {
            // logger.info('handleResize isScrolling', isScrolling.current);
            return;
        } */

      const currentRect = keyedPosition.current.rect;
      const parent = previousNode.current as HTMLDivElement;
      // logger.info('handleResize', contentRect, currentRect, parent);
      if (
        parent &&
        currentRect &&
        (contentRect.width !== currentRect.width || contentRect.height !== currentRect.height)
      ) {
        const parentRect = getBoundingClientRect(parent);
        const { width, height } = contentRect;
        const newPosition: Position2D = {
          x: width < 1 ? 0 : -(position.x / 100) * (width + parentRect.x),
          y: height < 1 ? 0 : -(position.y / 100) * (height + parentRect.y),
        };
        /* logger.info(
                'resize update',
                newPosition,
                width,
                height,
                contentRect,
                parentRect,
            ); */
        parent.scrollTo({ left: -newPosition.x, top: -newPosition.y, behavior: 'instant' });
        const rect = { x: newPosition.x, y: newPosition.y, width, height };
        keyedPosition.current = { key, position: newPosition, rect };
      }
    },
    [key, position.x, position.y],
  );

  const handleScrollEnd = useCallback(() => {
    const parent = previousNode.current as HTMLDivElement;
    const element = parent?.firstChild as HTMLDivElement;
    const parentRect = parent?.getBoundingClientRect();
    if (!element || !parentRect) {
      isScrolling.current = false;
      return;
    }
    const rect: Rect = containerRectToPercentage(element, parent);
    if (rect.x === position.x && rect.y === position.y) {
      // logger.info('same position');
      isScrolling.current = false;
      return;
    }
    // logger.info(`handleScroll newPosition ${key}`, keyedPosition.current, position, rect);
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
        }
      }
    }

    isScrolling.current = false;
    // logger.info('handleScrollEnd isScrolling', isScrolling.current, handler.current);
  }, [position, onUpdatePosition, key]);

  const handleScroll = useCallback(() => {
    isScrolling.current = true;
    if (handler.current) {
      clearTimeout(handler.current);
    }
    handler.current = setTimeout(() => {
      handleScrollEnd();
    }, 400);
    // waitAfterScroll(handleScrollEnd);
  }, [handleScrollEnd]);

  const scrollTo = useCallback(
    (scrollPosition: Position2D) => {
      if (isScrolling.current || (scrollPosition.x === -1 && scrollPosition.y === -1)) {
        return;
      }

      const parent = previousNode.current as HTMLDivElement;
      if (parent) {
        // logger.info(`scrollTo isScrolling ${key} ${parent}`, isScrolling, scrollPosition, position);
        const element = parent.firstChild as HTMLDivElement;
        if (!element) {
          return;
        }

        const currentRect: Rect = containerRectToPercentage(
          element as HTMLDivElement,
          parent as HTMLDivElement,
        );
        // logger.info('currentRect', currentRect, scrollPosition, position);
        if (currentRect.height < 1) {
          // logger.info('not scroll', scrollPosition, currentRect);
          return;
        }
        // currentRect.x === scrollPosition.x && currentRect.y === scrollPosition.y
        if (compareXY(currentRect, scrollPosition)) {
          // logger.info('same position', scrollPosition, currentRect);
          return;
        }

        /* if (compareXY(position, scrollPosition)) {
                    // logger.info('same position', scrollPosition, currentRect);
                    return;
                } */

        // isScrolling.current = true;
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
        /* logger.info(
                    'scrollTo update',
                    newPosition,
                    width,
                    height,
                    elementRect,
                    parentRect,
                ); */
        parent.scrollTo(-newPosition.x, -newPosition.y);
        const rect = containerRectToPercentage(element, parent);
        keyedPosition.current = { key, position: { x: rect.x, y: rect.y }, rect };
        /* waitAfterScroll(() => {
                    isScrolling.current = false;
                }); */
        // isScrolling.current = false;
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

      if (node?.nodeType === Node.ELEMENT_NODE) {
        node.addEventListener('scroll', listener, { passive: true });
        resizeObserver.observe(node.firstChild as Element);
        isScrolling.current = false;

        isInit.current = true;
        if (initHandler.current) {
          clearTimeout(initHandler.current);
        }
        initHandler.current = setTimeout(() => {
          isInit.current = false;
        }, 400);
      }
      previousNode.current = node;
    },
    [handleResize, handleScroll],
  );
  return [customRef, scrollTo];
}
