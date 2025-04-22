import { useEffect } from 'react';

import { Box, VStack, Container, Heading } from '@chakra-ui/react';
import { useBoolean } from '@chakra-ui/react';

import { useMiruniUser } from '#/admin/hooks/use-miruni-user';
import { logError } from '#/admin/utils/logging';

import { ProjectMappingExists } from './currently-mapped';
import { UpdateProjectMapping } from './update-project-mapping';

export const ProjectMapping = () => {
  const { userSnippet, refetchMiruniUser } = useMiruniUser();

  const [displayEditSection, setDisplayEditSection] = useBoolean();

  const onCancelProjectMapping = () => {
    setDisplayEditSection.off();
    refetchMiruniUser().catch(logError);
  };

  useEffect(() => {
    if (!userSnippet) {
      setDisplayEditSection.on();
    } else {
      setDisplayEditSection.off();
    }
  }, [userSnippet, setDisplayEditSection]);

  return (
    <Container maxW="full" paddingInline={0}>
      <VStack align="stretch" p={6} spacing={6}>
        <Heading size="md" fontWeight="400" lineHeight="1.4" letterSpacing="-0.4px">
          Project Configuration
        </Heading>

        <Box bg="white" borderRadius="md" shadow="sm" p={6}>
          {/* If no mapping exists, show the mapping form immediately */}
          {!userSnippet && <UpdateProjectMapping onCancel={onCancelProjectMapping} />}

          {/* If the project mapping exists, show the current mapping */}
          {userSnippet && (
            <>
              {userSnippet && !displayEditSection ? (
                <ProjectMappingExists
                  onUpdateMapping={setDisplayEditSection.toggle}
                  projectName={userSnippet?.project?.projectName || 'Project name not found'}
                  updateMappingSelected={displayEditSection}
                />
              ) : (
                <UpdateProjectMapping onCancel={onCancelProjectMapping} />
              )}
            </>
          )}
        </Box>
      </VStack>
    </Container>
  );
};
