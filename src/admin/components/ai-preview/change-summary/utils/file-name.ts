import { FileNameInfo } from '#/admin/components/ai-preview/change-summary/types';
import { UpdateRequiredType } from '#/admin/types/suggestion';
import { Change } from '#/admin/types/suggestion';

export const getFileName = (change: Change): FileNameInfo => {
  switch (change.fileType) {
    case UpdateRequiredType.POST_TITLE:
      return { title: 'Post Title', subtitle: '' };
    case UpdateRequiredType.POST_CONTENT:
      return { title: 'Post Content', subtitle: '' };
    case UpdateRequiredType.OTHER_POST_TITLE:
      return { title: 'Title', subtitle: change.fileName };
    case UpdateRequiredType.OTHER_POST_EXCERPT:
      return { title: 'Excerpt', subtitle: change.fileName };
    case UpdateRequiredType.OTHER_POST_CONTENT:
      return { title: 'Content', subtitle: change.fileName };
    case UpdateRequiredType.THEME_MOD:
      return { title: 'Theme Mod', subtitle: change.fileIdentifier || '' };
    default:
      return { title: change.fileName, subtitle: '' };
  }
};

export const getFullFileName = (change: Change): string => {
  const fileInfo = getFileName(change);
  return fileInfo.subtitle ? `${fileInfo.title}: ${fileInfo.subtitle}` : fileInfo.title;
};
