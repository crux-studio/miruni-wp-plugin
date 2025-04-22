import { useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

import { Grid } from '@chakra-ui/react';

import {
  CalenderIcon,
  CheckCircleOutlineIcon,
  DateInput,
  Person2Icon,
  StoryMainAttributesRow,
  StoryMainAttributeTag,
  Assignee,
  IAssigneeEntry,
  TagIcon,
  TableStory,
} from '@miruni/eds';
import { StoryIcon } from '@miruni/eds';
import {
  UpdateStoryTagsMutationVariables,
  useProjectMembersLazyQuery,
  useUserAccountByIdQuery,
} from '@miruni/graphql';
import {
  useTeamPriorities,
  useTeamStatuses,
  useTeamStoryTypes,
  useUpdateStory,
} from '@miruni/hooks';

import { useMiruniUser } from '#/admin/hooks/use-miruni-user';
import { logError } from '#/admin/utils/logging';

interface StoryDetailsSubHeaderProps {
  story?: TableStory | null;
}

export const StoryDetailsSubHeader = ({ story }: StoryDetailsSubHeaderProps) => {
  const { t } = useTranslation();
  const { userSnippet } = useMiruniUser();
  const { teamStatuses } = useTeamStatuses(userSnippet?.teamId, logError);
  const { teamStoryTypes } = useTeamStoryTypes(userSnippet?.teamId, logError);
  const { teamPriorities } = useTeamPriorities(userSnippet?.teamId, logError);
  const { updateStory } = useUpdateStory();
  const { data: assigneeData } = useUserAccountByIdQuery({
    variables: {
      id: story?.assignedUserId as number,
    },
    fetchPolicy: 'cache-first',
    skip: !story?.assignedUserId,
  });
  const [getProjectMembers, { data: projectMemberData }] = useProjectMembersLazyQuery();

  useEffect(() => {
    if (!userSnippet?.projectId) return;
    getProjectMembers({
      variables: {
        projectId: userSnippet?.projectId,
      },
    }).catch(logError);
  }, [projectMemberData]);

  const getPotentialAssignees = useCallback(async () => {
    const projectMembers =
      projectMemberData?.projectUserAccounts?.nodes.flatMap((m) => m.user) || [];
    return (
      projectMembers.reduce<IAssigneeEntry[]>((acc, m) => {
        if (m) {
          acc.push({
            id: m.id,
            name: m.name || m.email || '',
          });
        }
        return acc;
      }, []) || []
    );
  }, [getProjectMembers]);

  const onTagSwitchClick = useCallback(
    async (
      data: {
        id: number;
        label: string;
      },
      columnName: string,
    ) => {
      if (!story) return;
      const variables = {
        id: story.id,
        input: {
          [columnName]: data.id,
        },
      } as UpdateStoryTagsMutationVariables;
      await updateStory({ variables });
    },
    [updateStory, story],
  );

  const onAssigneeChange = (user: IAssigneeEntry) => {
    if (!user?.id) return;
    const variables = {
      id: story?.id as number,
      input: {
        assignedUserId: user.id > 0 ? user.id : null,
      },
    } as UpdateStoryTagsMutationVariables;
    updateStory({ variables }).catch(logError);
  };

  const onDueDateChange = useCallback(
    async (date: string | null) => {
      const variables: UpdateStoryTagsMutationVariables = {
        id: story?.id as number,
        input: {
          dueDate: date,
        },
      };
      await updateStory({ variables });
    },
    [updateStory, story],
  );

  if (!story) return null;

  const storyStatus = teamStatuses.find((status) => status.id === story.statusId);
  const storyType = teamStoryTypes.find((type) => type.id === story.storyTypeId);
  const storyPriority = teamPriorities.find((priority) => priority.id === story.priorityId);
  return (
    <Grid
      templateColumns="auto 2fr"
      gap={{
        base: 4,
      }}
      columnGap={{
        base: 4,
        md: 12,
      }}
      justifyContent="left"
      color="black70"
    >
      <StoryMainAttributesRow icon={CheckCircleOutlineIcon} label={t('storyView.status', 'Status')}>
        <StoryMainAttributeTag
          cellInfo={storyStatus?.label || ''}
          onTagSwitchClick={onTagSwitchClick}
          columnName="statusId"
          list={teamStatuses}
        />
      </StoryMainAttributesRow>
      <StoryMainAttributesRow icon={StoryIcon} label={t('storyView.type', 'Type')}>
        <StoryMainAttributeTag
          cellInfo={storyType?.label || ''}
          onTagSwitchClick={onTagSwitchClick}
          columnName="storyTypeId"
          list={teamStoryTypes}
        />
      </StoryMainAttributesRow>
      <StoryMainAttributesRow icon={CalenderIcon} label={t('storyView.dueDate', 'due date')}>
        <DateInput value={story?.dueDate || undefined} onChange={onDueDateChange} />
      </StoryMainAttributesRow>

      <StoryMainAttributesRow icon={Person2Icon} label={t('common.assignee', 'Assignee')}>
        <Assignee
          assignee={{
            id: assigneeData?.user?.id || -1,
            name: assigneeData?.user?.name || '',
          }}
          avatarProps={{
            size: 'xs',
            h: '1',
            w: '1',
          }}
          displayName={true}
          popoverPlacement="bottom"
          projectId={story.projectId}
          onAssigneeChange={onAssigneeChange}
          fontSize="14px"
          getPotentialAssignees={getPotentialAssignees}
          unassignedLabel={t('common.unassigned', 'Unassigned')}
          searchPlaceholder={t('common.search', 'Search')}
        />
      </StoryMainAttributesRow>
      <StoryMainAttributesRow icon={TagIcon} label={t('storyView.priority', 'Priority')}>
        <StoryMainAttributeTag
          cellInfo={storyPriority?.label || ''}
          onTagSwitchClick={onTagSwitchClick}
          columnName="priorityId"
          list={teamPriorities}
        />
      </StoryMainAttributesRow>
    </Grid>
  );
};
