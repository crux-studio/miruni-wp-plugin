import { UpdateRequiredType } from '#/admin/types/suggestion';

// Helper function to get a formatted file name
export const getUpdateFileName = (
  fileName: string,
  fileType?: UpdateRequiredType,
  fileIdentifier?: string,
) => {
  switch (fileType) {
    case UpdateRequiredType.POST_TITLE:
      return 'Post Title';
    case UpdateRequiredType.POST_CONTENT:
      return 'Post Content';
    case UpdateRequiredType.OTHER_POST_TITLE:
      return `Title of post id: ${fileIdentifier}`;
    case UpdateRequiredType.OTHER_POST_CONTENT:
      return `Content of post id: ${fileIdentifier}`;
    case UpdateRequiredType.THEME_MOD:
      return `Theme Modification: ${fileIdentifier}`;
    default:
      return fileName;
  }
};
