import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';

import { useApolloClient } from '@apollo/client';

import { useStoryAttachmentsLazyQuery } from '@miruni/graphql';
import { DEFAULT_MAX_FILE_SIZE, Params } from '@miruni/models';

import { logError } from '#/admin/utils/logging';

export const useStoryAttachments = (storyNodeId: string, storyId?: number) => {
  const { t } = useTranslation();

  const apolloClient = useApolloClient();

  const [refreshStoryAttachments] = useStoryAttachmentsLazyQuery({
    fetchPolicy: 'network-only',
    onCompleted: (data) => {
      apolloClient.cache.modify({
        id: storyNodeId,
        fields: {
          storyAttachments: () => {
            return data?.storyAttachments || { nodes: [] };
          },
        },
      });
    },
  });
  const uploadFile = useCallback(
    async (file: File) => {
      if (!storyId) return;
      if (file.size > DEFAULT_MAX_FILE_SIZE) {
        throw new Error(
          t(
            'attachment.recordingSizeErrorMsg',
            'File size is too large. Please upload a file smaller than 100MB.',
          ),
        );
      }
      const formData = new FormData();
      formData.append('file', file);
      try {
        await fetch(`/api/upload?${Params.STORY_ID}=${storyId}`, {
          method: 'PUT',
          body: formData,
        });

        refreshStoryAttachments({
          variables: {
            storyId: storyId,
          },
        }).catch(logError);
      } catch {
        throw new Error(
          t('attachment.recordingUploadErrorMsg', 'Error uploading file. Please try again.'),
        );
      }
    },
    [refreshStoryAttachments, storyId, t],
  );

  return { uploadFile };
};
