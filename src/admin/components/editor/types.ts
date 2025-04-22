import type { UpdateRequiredType } from '#/admin/types/suggestion';

export interface EditorContentMeta {
  postId: number;
  postTitle: string;
  postContent: string;
}

export interface EditorChange {
  id: string;
  title: string;
  language: string;
  value: string;
  type: UpdateRequiredType;
  suggestionId?: number;
  meta?: EditorContentMeta;
}

export type ContentTypeChange = Extract<EditorChange, { type: 'post_title' | 'post' }>;

export const isContentTypeChange = (
  change: EditorChange | undefined,
): change is ContentTypeChange => {
  return change?.type === 'post_title' || change?.type === 'post_content';
};
