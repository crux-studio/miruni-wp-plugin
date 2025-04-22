import { FC, useEffect, useState } from 'react';

import { ChevronDownIcon, ChevronUpIcon, RepeatIcon } from '@chakra-ui/icons';
import {
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Button,
  Box,
  useToast,
  Badge,
  Code,
  Accordion,
  AccordionItem,
  AccordionButton,
  AccordionPanel,
  Spinner,
  Flex,
  Heading,
  Text,
  VStack,
  Icon,
} from '@chakra-ui/react';

import { MiruniRestClient } from '#/admin/services/miruni-rest';
import { WPClient } from '#/admin/services/wp-client';
import { TemplateQueryArgs } from '#/admin/types/query-args';
import { logError } from '#/admin/utils/logging';

export const c: FC = () => {
  const [themeFiles, setThemeFiles] = useState<string[]>([]);
  const [queries, setQueries] = useState<Record<string, TemplateQueryArgs | null>>({});
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const toast = useToast();

  const onGetFileContents = async (file: string) => {
    try {
      setLoading((prev) => ({ ...prev, [file]: true }));

      const contents = await WPClient.getTemplateFileContents(file);
      const referencedPosts = (await MiruniRestClient.getReferencedPosts(contents)) as {
        args?: TemplateQueryArgs;
      }[];
      const args = referencedPosts[0]?.args || null;

      setQueries((prev) => ({
        ...prev,
        [file]: args ? args : null,
      }));

      await WPClient.saveTemplatePostQueryArguments(file, args ? JSON.stringify(args) : null);

      toast({
        title: 'Success',
        description: `Updated query data for ${file}`,
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
    } catch (e) {
      logError(e as Error);
      toast({
        title: 'Error',
        description: 'Failed to load file contents',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setLoading((prev) => ({ ...prev, [file]: false }));
    }
  };

  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const [queriesData, filesData] = await Promise.all([
          WPClient.getTemplatePostQueryArguments(),
          WPClient.getTemplateFiles(),
        ]);

        if (queriesData) setQueries(queriesData);
        setThemeFiles(filesData);
      } catch (e) {
        logError(e as Error);
        toast({
          title: 'Error',
          description: 'Failed to load initial data',
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
      }
    };

    void loadInitialData();
  }, [toast]);

  // Format JSON for display
  const formatJSON = (json: object) => {
    try {
      if (!json) return null;

      // Create a formatted JSON string with syntax highlighting
      const jsonString = JSON.stringify(json, null, 2);

      // Return the formatted JSON
      return jsonString;
    } catch (e) {
      return String(json);
    }
  };

  return (
    <Box p={6} bg="white" borderRadius="sm">
      <VStack align="stretch" spacing={4}>
        <Box>
          <Heading size="md" mb={1} fontWeight="bold">
            Theme Template Files
          </Heading>
          <Text color="gray.600" fontSize="sm">
            Manage template files and their associated query arguments.
          </Text>
        </Box>

        {themeFiles.length === 0 ? (
          <Flex justify="center" align="center" height="200px">
            <Spinner mr={3} /> Loading template files...
          </Flex>
        ) : (
          <Box overflowX="auto" borderWidth="1px" borderRadius="md" borderColor="gray.200">
            <Table variant="simple" width="100%">
              <Thead bg="gray.50">
                <Tr>
                  <Th
                    width="30%"
                    maxWidth="300px"
                    minWidth="250px"
                    textTransform="uppercase"
                    fontSize="xs"
                    fontWeight="semibold"
                  >
                    Template File
                  </Th>
                  <Th
                    width="15%"
                    maxWidth="120px"
                    minWidth="120px"
                    textTransform="uppercase"
                    fontSize="xs"
                    fontWeight="semibold"
                  >
                    Status
                  </Th>
                  <Th
                    width="40%"
                    maxWidth="500px"
                    minWidth="400px"
                    textTransform="uppercase"
                    fontSize="xs"
                    fontWeight="semibold"
                  >
                    Query Arguments
                  </Th>
                  <Th
                    width="15%"
                    maxWidth="150px"
                    minWidth="120px"
                    textTransform="uppercase"
                    fontSize="xs"
                    fontWeight="semibold"
                  >
                    Actions
                  </Th>
                </Tr>
              </Thead>
              <Tbody>
                {themeFiles.map((file) => (
                  <Tr key={file} _hover={{ bg: 'gray.50' }}>
                    <Td
                      width="30%"
                      maxWidth="300px"
                      minWidth="250px"
                      py={4}
                      fontWeight="medium"
                      fontSize="sm"
                    >
                      {file}
                    </Td>
                    <Td width="15%" maxWidth="120px" minWidth="120px" py={4}>
                      {queries[file] ? (
                        <Badge
                          bg="green.100"
                          color="green.800"
                          px={3}
                          py={1}
                          borderRadius="full"
                          fontWeight="medium"
                          fontSize="xs"
                        >
                          HAS QUERY
                        </Badge>
                      ) : (
                        <Badge
                          bg="gray.100"
                          color="gray.700"
                          px={3}
                          py={1}
                          borderRadius="full"
                          fontWeight="medium"
                          fontSize="xs"
                        >
                          NO QUERY
                        </Badge>
                      )}
                    </Td>
                    <Td width="40%" maxWidth="500px" minWidth="400px" py={4}>
                      {queries[file] !== undefined ? (
                        <Accordion allowToggle width="100%">
                          <AccordionItem border="none">
                            {({ isExpanded }) => (
                              <>
                                <AccordionButton
                                  px={0}
                                  py={0}
                                  _hover={{ bg: 'transparent' }}
                                  _focus={{ boxShadow: 'none' }}
                                  justifyContent="space-between"
                                >
                                  <Text color="blue.700" fontWeight="medium" fontSize="md">
                                    View Query Details
                                  </Text>
                                  <Icon
                                    as={isExpanded ? ChevronUpIcon : ChevronDownIcon}
                                    color="blue.700"
                                  />
                                </AccordionButton>
                                <AccordionPanel pb={4} px={0} mt={3}>
                                  <Code
                                    display="block"
                                    whiteSpace="pre"
                                    overflowX="auto"
                                    p={4}
                                    borderRadius="md"
                                    fontSize="sm"
                                    bg="gray.50"
                                    borderWidth="1px"
                                    borderColor="gray.200"
                                    maxHeight="400px"
                                  >
                                    {queries[file] === null
                                      ? 'No posts referenced'
                                      : formatJSON(queries[file] as object)}
                                  </Code>
                                </AccordionPanel>
                              </>
                            )}
                          </AccordionItem>
                        </Accordion>
                      ) : (
                        <Text fontSize="md" color="gray.500">
                          No query arguments found
                        </Text>
                      )}
                    </Td>
                    <Td width="15%" maxWidth="150px" minWidth="120px" py={4}>
                      <Button
                        size="md"
                        colorScheme="blue"
                        onClick={() => onGetFileContents(file)}
                        isLoading={loading[file]}
                        leftIcon={<RepeatIcon />}
                        borderRadius="md"
                        fontWeight="medium"
                      >
                        Refetch
                      </Button>
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </Box>
        )}
      </VStack>
    </Box>
  );
};
