import { FC } from 'react';

import { Button, ButtonProps } from '@chakra-ui/react';

import { useCreateSnippet } from '#/admin/hooks/use-create-snippet';
import { useMiruniUser } from '#/admin/hooks/use-miruni-user';

type CreateNewProjectButtonProps = ButtonProps & {
  onCancel?: () => void;
  workspaceId?: number;
  teamId?: number;
  textOverride?: string;
};

export const CreateNewProjectButton: FC<CreateNewProjectButtonProps> = ({
  onCancel,
  workspaceId,
  teamId,
  textOverride,
  ...props
}) => {
  const { refetchMiruniUser } = useMiruniUser();
  const { createProjectWithSnippet, createProjectWithSnippetLoading } = useCreateSnippet();

  const onClickCreateNewProject = async () => {
    if (!workspaceId || !teamId) {
      throw new Error('Workspace ID and Team ID are required');
    }
    await createProjectWithSnippet({
      teamId,
      workspaceId,
    });
    await refetchMiruniUser();
    onCancel?.();
  };

  return (
    <Button
      variant="outline"
      onClick={onClickCreateNewProject}
      isDisabled={!workspaceId || !teamId}
      isLoading={createProjectWithSnippetLoading}
      borderColor="fuchsia.900"
      color="fuchsia.900"
      _hover={{ bg: 'fuchsia.50' }}
      size="md"
      {...props}
    >
      {textOverride ?? 'Create New Project'}
    </Button>
  );
};
