export interface FileNameInfo {
  title: string;
  subtitle: string;
}

export interface FeedbackState {
  [key: number]: {
    isNegative: boolean | undefined;
    showComments: boolean;
    comment?: string;
    isExpanded: boolean;
  };
}
