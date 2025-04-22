import { useTranslation } from 'react-i18next';

import { Reference } from '@apollo/client';
import { StyleProps, useToast } from '@chakra-ui/react';

import { StoryAttachmentsConnection, useDeleteAttachmentMutation } from '@miruni/graphql';

export const useDeleteAttachment = () => {
  const { t } = useTranslation();
  const toast = useToast({
    styleConfig: {
      containerStyle: { '> div': { bg: 'black90' } } as StyleProps,
    },
  });
  const [deleteAttachmentMutation] = useDeleteAttachmentMutation({
    update: (cache, { data }) => {
      if (!data?.deleteStoryAttachment?.storyAttachment?.nodeId) return;
      cache.evict({ id: data.deleteStoryAttachment.storyAttachment.nodeId });
      cache.gc();
      // find story which is parent of this attachment
      if (!data?.deleteStoryAttachment?.storyAttachment?.story?.nodeId) return;
      cache.modify({
        id: data.deleteStoryAttachment.storyAttachment.story.nodeId,
        fields: {
          storyAttachments: (existing: StoryAttachmentsConnection | Reference | undefined) => {
            const _existing = existing as StoryAttachmentsConnection;
            if (!_existing?.nodes) return _existing;
            return {
              ..._existing,
              nodes: _existing?.nodes?.filter(
                (n) => n.nodeId !== data?.deleteStoryAttachment?.storyAttachment?.nodeId,
              ),
            };
          },
        },
      });
      cache.gc();
    },
  });

  const deleteAttachment = (attachmentId: number) =>
    deleteAttachmentMutation({ variables: { input: { id: attachmentId } } })
      .then(() => {
        toast({
          status: 'info',
          title: t('common.success', 'Success'),
          description: t('storyView.attachmentDeleted', 'Attachment deleted'),
        });
      })
      .catch(() => {
        toast({
          status: 'error',
          title: t('common.error', 'Error'),
          description: t('storyView.attachmentDeleteError', 'Error deleting attachment'),
        });
      });

  return {
    deleteAttachment,
  };
};
