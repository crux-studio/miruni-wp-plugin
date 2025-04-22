import { useEffect, useState } from 'react';

import { Container, VStack, Heading, Text, Button, Divider } from '@chakra-ui/react';

import { ColorMiruniLogo } from '@miruni/eds';
import { useProjectsListQuery } from '@miruni/graphql';

import {
  ProjectAutocomplete,
  ProjectOption,
} from '#/admin/components/shared/autocomplete/project-autocomplete';
import {
  WorkspaceAutocomplete,
  WorkspaceOptionWithTeamId,
} from '#/admin/components/shared/autocomplete/workspace-autocomplete';
import { CreateNewProjectButton } from '#/admin/components/shared/create-new-project-button';
import { useCreateSnippet } from '#/admin/hooks/use-create-snippet';
import { useMiruniUser } from '#/admin/hooks/use-miruni-user';

export const SnippetCreationPrompt = () => {
  const { userWorkspaces, refetchMiruniUser } = useMiruniUser();
  const [selectedProject, setSelectedProject] = useState<ProjectOption | null>(null);
  const [selectedWorkspace, setSelectedWorkspace] = useState<WorkspaceOptionWithTeamId | null>(
    null,
  );
  const { data: projectListData } = useProjectsListQuery({
    fetchPolicy: 'cache-first',
    variables: {
      first: 10,
      searchTerm: '',
      teamId: selectedWorkspace?.teamId as number,
    },
    skip: !selectedWorkspace,
  });

  const { createSnippetForExistingProject, createSnippetForExistingProjectLoading } =
    useCreateSnippet();

  useEffect(() => {
    if (userWorkspaces.length === 1) {
      setSelectedWorkspace({
        id: userWorkspaces[0].id,
        teamId: userWorkspaces[0].teamId,
        label: userWorkspaces[0].workspaceName || '',
      });
    }
  }, [userWorkspaces]);

  useEffect(() => {
    // poll every second to refresh the user and get the workspace if it's not there
    if (userWorkspaces.length === 0) {
      const interval = setInterval(() => {
        refetchMiruniUser();
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [userWorkspaces]);

  const hasProjects =
    projectListData?.projects?.totalCount && projectListData.projects.totalCount > 0;

  return (
    <Container maxW="xl" px={8} py={12} background="white" borderRadius="lg" boxShadow="lg">
      <VStack spacing={10} align="center">
        <ColorMiruniLogo boxSize={24} />

        <VStack spacing={10} width="full" maxW="md" mx="auto">
          <VStack spacing={4}>
            <Heading size="xl" fontWeight="500" textAlign="center">
              Let's get you set up
            </Heading>
            <Text fontSize="lg" color="gray.600" textAlign="center" lineHeight="tall">
              In order for you or other Miruni users to start creating edit requests, we need to
              associate your Wordpress website with a project in Miruni.
            </Text>
          </VStack>

          {userWorkspaces.length > 1 && (
            <VStack width="full" spacing={4} align="stretch">
              <Text fontSize="md" color="gray.600" textAlign="center">
                It looks like you have multiple workspaces. Where would you like to save your edit
                requests?
              </Text>
              <WorkspaceAutocomplete
                onWorkspaceSelect={setSelectedWorkspace}
                selectedWorkspace={selectedWorkspace}
              />
            </VStack>
          )}

          <VStack width="full" spacing={8}>
            <VStack width="full" spacing={4}>
              <Text fontSize="md" fontWeight="500" color="gray.700">
                Create a new project in one click
              </Text>
              <CreateNewProjectButton
                disabled={!selectedWorkspace}
                workspaceId={selectedWorkspace?.id}
                teamId={selectedWorkspace?.teamId}
                width="full"
                height="48px"
                fontSize="md"
              />
            </VStack>

            <Divider borderColor="gray.300" />

            {hasProjects && (
              <>
                <VStack width="full" spacing={4} align="stretch">
                  <Text fontSize="md" fontWeight="500" color="gray.700" textAlign="center">
                    Or save your edit requests to an existing project
                  </Text>
                  <ProjectAutocomplete
                    teamId={selectedWorkspace?.teamId}
                    onProjectSelect={setSelectedProject}
                    selectedProjectId={selectedProject?.id}
                  />
                </VStack>
                <Button
                  bg="fuchsia.900"
                  color="white"
                  _hover={{
                    bg: 'fuchsia.800',
                  }}
                  width="full"
                  height="48px"
                  fontSize="md"
                  mt={2}
                  isLoading={createSnippetForExistingProjectLoading}
                  onClick={async () => {
                    if (!selectedProject) {
                      throw new Error('Selected project not found');
                    }
                    await createSnippetForExistingProject({
                      projectId: selectedProject.id,
                      projectName: selectedProject.label,
                    });
                    refetchMiruniUser();
                  }}
                >
                  Save Settings
                </Button>
              </>
            )}
          </VStack>
        </VStack>
      </VStack>
    </Container>
  );
};
