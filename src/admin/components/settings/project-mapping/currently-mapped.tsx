import { FC } from 'react';

import { LinkIcon } from '@chakra-ui/icons';
import { VStack, Text, Button, HStack, Icon, Flex, Switch, Box } from '@chakra-ui/react';

import { useUpdateSnippetMutation } from '@miruni/graphql';

import { useMiruniUser } from '#/admin/hooks/use-miruni-user';
interface ProjectMappingExistsProps {
  projectName: string;
  onUpdateMapping: () => void;
  updateMappingSelected: boolean;
}

export const ProjectMappingExists: FC<ProjectMappingExistsProps> = ({
  projectName,
  onUpdateMapping,
}) => {
  const { userSnippet } = useMiruniUser();

  const snippetIsActive = true;

  const [updateSnippet] = useUpdateSnippetMutation({
    refetchQueries: ['GetUserSnippet'],
  });

  const onToggleActivated = async (enabled: boolean) => {
    await updateSnippet({
      variables: {
        id: userSnippet?.id as number,
        input: {
          enabled,
        },
      },
    });
  };
  return (
    <VStack align="stretch" spacing={6}>
      <HStack spacing={3}>
        <Icon as={LinkIcon} boxSize={5} color="fuchsia.900" />
        <Text fontSize="lg" fontWeight="600">
          Current Connection
        </Text>
      </HStack>

      <Flex
        bg={snippetIsActive ? 'fuchsia.50' : 'gray.50'}
        p={5}
        borderRadius="md"
        align="center"
        justify="space-between"
      >
        <Box>
          <Text fontSize="sm" color={snippetIsActive ? 'fuchsia.900' : 'gray.600'}>
            Connected to project:
          </Text>
          <Text
            fontSize="2xl"
            fontWeight="600"
            color={snippetIsActive ? 'fuchsia.900' : 'gray.600'}
          >
            {projectName}
          </Text>
        </Box>
        <Flex align="space-between" gap={2}>
          <Text color={snippetIsActive ? 'fuchsia.900' : 'gray.600'} fontSize="sm" fontWeight="600">
            {snippetIsActive ? 'deactivate' : 'activate'}
          </Text>
          <Switch
            colorScheme="fuchsia"
            size="lg"
            isChecked={snippetIsActive}
            onChange={(e) => onToggleActivated(e.target.checked)}
          />
        </Flex>
      </Flex>

      <Button
        variant="outline"
        onClick={onUpdateMapping}
        size="lg"
        leftIcon={<Icon as={LinkIcon} />}
        borderColor="fuchsia.900"
        color="fuchsia.900"
        _hover={{ bg: 'fuchsia.50' }}
        w="fit-content"
      >
        Change Connection
      </Button>
    </VStack>
  );
};
