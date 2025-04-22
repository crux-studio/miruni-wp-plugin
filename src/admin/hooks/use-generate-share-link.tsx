import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';

import { useToast } from '@chakra-ui/react';

import { useCreateShareableLinkMutation } from '@miruni/graphql';

import { useMiruniUser } from './use-miruni-user';

export const useGenerateShareLink = () => {
  const { t } = useTranslation();
  const { user } = useMiruniUser();

  const toast = useToast();

  const [createShareableLink] = useCreateShareableLinkMutation();

  const generateShareLink = useCallback(
    async ({
      projectId,
      storyId,
      teamId,
      workspaceId,
    }: {
      projectId: number;
      storyId: number;
      teamId: number;
      workspaceId: number;
    }) => {
      if (!user?.id || !storyId || !workspaceId || !teamId || !projectId)
        throw new Error('Generate share link: no enough data');
      return createShareableLink({
        variables: {
          link: `/share/${storyId}/`,
          sharedByUserId: user.id as number,
          projectId,
          storyId,
          teamId,
          workspaceId,
        },
      })
        .then((res) => {
          if (!res) throw new Error("Generate share link: shareable link has't been created");
          const baseUrl = `${location.protocol}//${location.host}`;
          const shareLinkId = res.data?.createShareableLink?.shareableLink?.id;
          if (!shareLinkId) throw new Error('Generate share link: there is no Share link ID');
          const shareLink = `${baseUrl}/share-link/${shareLinkId}`;
          return shareLink;
        })
        .catch((err) => {
          toast({
            title: t('common.error', 'Error'),
            description: t('generateShareLinkError', "Share link hasn't been generated"),
            status: 'error',
            duration: 5000,
          });
          window.newrelic?.noticeError(err);
        });
    },
    [createShareableLink, user?.id, t, toast],
  );

  return generateShareLink;
};
