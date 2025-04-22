import { FC, useEffect } from 'react';

import { DESKTOP_BREAKPOINT, StoryAssets } from '@miruni/eds';
import {
  useStoriesTableCapturesByNodeIdQuery,
  useStoryDetailsBodyByIdQuery,
  useTeamMembersQuery,
} from '@miruni/graphql';
import { useWindowDimensions } from '@miruni/hooks';

import { useDeleteAttachment } from '#/admin/hooks/use-story-attachment';
import { useStoryAttachments } from '#/admin/hooks/use-upload-attachment';

export interface StoryDetailsMediaGalleryProps {
  showDevToolsButton?: boolean;
  devToolsUrl?: string;
  storyNodeId: string;
  teamId?: number;
  storyId: number;
}

export const StoryDetailsMediaGallery: FC<StoryDetailsMediaGalleryProps> = ({
  showDevToolsButton,
  devToolsUrl,
  storyNodeId,
  teamId,
  storyId,
}) => {
  const { data: storyDetailsBodyData } = useStoryDetailsBodyByIdQuery({
    variables: {
      id: storyId,
    },
    skip: !storyId,
  });
  const { data: storyCapturesData } = useStoriesTableCapturesByNodeIdQuery({
    variables: {
      storyNodeId,
    },
  });
  const storyBody = storyDetailsBodyData?.story;
  const captures = storyCapturesData?.storyByNodeId?.captures.nodes || [];
  const { data: teamMembers, fetchMore } = useTeamMembersQuery({
    variables: {
      condition: {
        teamId: teamId,
      },
      size: 100,
      teamId: teamId,
      includeProjects: true,
    },

    skip: !teamId,
  });

  const { width } = useWindowDimensions();
  const { uploadFile } = useStoryAttachments(storyNodeId, storyBody?.id);
  const { deleteAttachment } = useDeleteAttachment();

  useEffect(() => {
    if (!teamMembers?.teamUserAccounts?.pageInfo?.hasNextPage) return;

    fetchMore({
      variables: {
        condition: {
          teamId: teamId,
        },
        size: 100,
        after: teamMembers?.teamUserAccounts?.pageInfo?.endCursor,
      },
    }).catch(window.newrelic?.noticeError);
  }, [fetchMore, teamId, teamMembers]);

  return (
    <StoryAssets
      devToolsUrl={(showDevToolsButton && devToolsUrl) || undefined}
      captures={captures}
      storyAttachments={storyBody?.storyAttachments.nodes}
      users={teamMembers?.teamUserAccounts?.nodes.map((item) => item.user) || []}
      onUploadFile={uploadFile}
      deleteAttachment={deleteAttachment}
      hideModalButton={Boolean(width && width > 0 && width < parseInt(DESKTOP_BREAKPOINT))}
    />
  );
};
