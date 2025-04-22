import { useCallback, useState, FC, useMemo, useEffect } from 'react';

import { LinkIcon } from '@chakra-ui/icons';
import { VStack, Text, Button, HStack, Divider, Icon } from '@chakra-ui/react';

import { useSearchWorkspacesLazyQuery } from '@miruni/graphql';

import {
  ProjectAutocomplete,
  ProjectAutocompleteSelectHandler,
  ProjectOption,
} from '#/admin/components/shared/autocomplete/project-autocomplete';
import {
  WorkspaceAutocomplete,
  WorkspaceOptionWithTeamId,
} from '#/admin/components/shared/autocomplete/workspace-autocomplete';
import { CreateNewProjectButton } from '#/admin/components/shared/create-new-project-button';
import { useCreateSnippet } from '#/admin/hooks/use-create-snippet';
import { useMiruniUser } from '#/admin/hooks/use-miruni-user';

interface UpdateProjectMappingProps {
  onCancel: () => void;
}

export const UpdateProjectMapping: FC<UpdateProjectMappingProps> = ({ onCancel }) => {
  const { userWorkspaces, userSnippet, refetchMiruniUser } = useMiruniUser();

  const defaultSelectedWorkspace = useMemo(() => {
    const userSnippetWorkspace = userSnippet?.workspaceId
      ? userWorkspaces.find((workspace) => workspace.id === userSnippet.workspaceId)
      : null;
    const firstWorkspace = userSnippetWorkspace ?? userWorkspaces[0];

    return {
      id: (userSnippetWorkspace?.id as number) || (firstWorkspace?.id as number),
      teamId: (userSnippetWorkspace?.teamId as number) || (firstWorkspace?.teamId as number),
      label: userSnippetWorkspace?.workspaceName || firstWorkspace?.workspaceName || '',
    };
  }, [userWorkspaces, userSnippet]);

  useSearchWorkspacesLazyQuery();

  const [selectedProject, setSelectedProject] = useState<ProjectOption | null>();

  const [selectedWorkspace, setSelectedWorkspace] = useState<WorkspaceOptionWithTeamId | null>(
    defaultSelectedWorkspace,
  );

  useEffect(() => {
    defaultSelectedWorkspace && setSelectedWorkspace(defaultSelectedWorkspace);
  }, [setSelectedWorkspace, defaultSelectedWorkspace]);

  const { createSnippetForExistingProject, createSnippetForExistingProjectLoading } =
    useCreateSnippet();

  const hasMultipleWorkspaces = userWorkspaces.length > 1;

  const handleSelectProject = useCallback<ProjectAutocompleteSelectHandler>(async (value) => {
    if (!value || (value && !('label' in value))) {
      throw new Error('Unexpected value');
    }
    setSelectedProject(value);
  }, []);

  return (
    <VStack align="stretch" spacing={8}>
      <HStack spacing={3}>
        <Icon as={LinkIcon} boxSize={5} color="fuchsia.900" />
        <Text fontSize="lg" fontWeight="600">
          Update Project Connection
        </Text>
      </HStack>

      {hasMultipleWorkspaces && (
        <VStack align="stretch" spacing={3}>
          <WorkspaceAutocomplete
            onWorkspaceSelect={setSelectedWorkspace}
            selectedWorkspace={selectedWorkspace}
            showLabel
          />
        </VStack>
      )}

      <VStack align="stretch" spacing={3}>
        <CreateNewProjectButton
          onCancel={onCancel}
          workspaceId={selectedWorkspace?.id}
          teamId={selectedWorkspace?.teamId}
        />

        <HStack align="center" spacing={4}>
          <Divider flex={1} />
          <Text fontSize="sm" color="gray.500">
            or
          </Text>
          <Divider flex={1} />
        </HStack>
        <ProjectAutocomplete
          onProjectSelect={handleSelectProject}
          selectedProjectId={selectedProject?.id}
          teamId={selectedWorkspace?.teamId}
          showLabel
        />
      </VStack>

      <HStack spacing={4}>
        <Button variant="ghost" onClick={onCancel} size="lg">
          Cancel
        </Button>
        <Button
          isDisabled={!selectedWorkspace && !selectedProject}
          bg="fuchsia.900"
          color="white"
          size="lg"
          flexGrow={1}
          _hover={{ bg: 'fuchsia.800' }}
          isLoading={createSnippetForExistingProjectLoading}
          onClick={async () => {
            if (!selectedProject) {
              throw new Error('Selected project not found');
            }
            await createSnippetForExistingProject({
              projectId: selectedProject.id,
              projectName: selectedProject.label,
            });
            await refetchMiruniUser();
            onCancel();
          }}
        >
          Save Connection
        </Button>
      </HStack>
    </VStack>
  );
};
