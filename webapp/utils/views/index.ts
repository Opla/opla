import { Page, ViewName } from '@/types/ui';

// eslint-disable-next-line import/prefer-default-export
export const getSelectedViewName = (selectedThreadId: string | undefined, view = ViewName.Recent) =>
  `${view === ViewName.Recent ? Page.Threads : Page.Archives}${selectedThreadId ? `/${selectedThreadId}` : ''}`;
