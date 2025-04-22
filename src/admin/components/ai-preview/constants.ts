import { UpdateRequiredType } from '#/admin/types/suggestion';

export const CONTENT_TYPES = [
  UpdateRequiredType.OTHER_POST_CONTENT,
  UpdateRequiredType.OTHER_POST_TITLE,
  UpdateRequiredType.POST_CONTENT,
  UpdateRequiredType.POST_TITLE,
] as UpdateRequiredType[];

export const isContentType = (type: UpdateRequiredType) => CONTENT_TYPES.includes(type);
