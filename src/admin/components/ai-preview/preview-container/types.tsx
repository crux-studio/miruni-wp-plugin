import { ReactNode } from 'react';

export interface TabConfig {
  name: string;
  content: ReactNode;
  padding?: string | number; // Optional padding for the tab panel
  disabled?: boolean; // Whether the tab is disabled
  disabledTooltip?: string; // Tooltip to explain why the tab is disabled
}
export const PublishState = {
  PUBLISHING: 'PUBLISHING',
  PUBLISHED: 'PUBLISHED',
  NOT_PUBLISHED: 'NOT_PUBLISHED',
} as const;

export type PublishState = (typeof PublishState)[keyof typeof PublishState];
