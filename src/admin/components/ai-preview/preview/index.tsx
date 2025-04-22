import { FC } from 'react';

import { Flex, Grid, Text, Box, useColorModeValue } from '@chakra-ui/react';

import { PreviewIframe } from '#/admin/components/shared/preview-iframe';

interface PreviewProps {
  originalUrl: string | null;
  previewUrl: string | null;
  previewIframeRef?: React.RefObject<HTMLIFrameElement>;
  originalIframeRef?: React.RefObject<HTMLIFrameElement>;
}

export const Preview: FC<PreviewProps> = ({
  originalUrl,
  previewUrl,
  originalIframeRef,
  previewIframeRef,
}) => {
  const borderColor = useColorModeValue('gray.200', 'gray.600');

  return (
    <Flex direction="column" gap={4} p={4} overflow="auto" flex="1">
      <Box py={2}>
        <Text fontSize="md">
          Compare the current published version with Smart Edit suggested changes
        </Text>
      </Box>

      <Grid
        templateColumns={{ base: '1fr', md: 'repeat(2, 1fr)' }}
        gap={4}
        minH={{ base: '500px', md: '600px' }}
        flex="1"
      >
        <Box
          borderWidth="1px"
          borderColor={borderColor}
          borderRadius="md"
          overflow="hidden"
          display="flex"
          flexDirection="column"
        >
          <Box p={2} bg="gray.50" borderBottomWidth="1px" borderColor={borderColor}>
            <Text fontWeight="bold" fontSize="sm">
              Current Published Version
            </Text>
          </Box>
          {originalUrl && (
            <PreviewIframe url={originalUrl} title="Current Version" ref={originalIframeRef} />
          )}
        </Box>

        <Box
          borderWidth="1px"
          borderColor={borderColor}
          borderRadius="md"
          overflow="hidden"
          position="relative"
          display="flex"
          h="100%"
          flexDirection="column"
        >
          <Box p={2} bg="gray.50" borderBottomWidth="1px" borderColor={borderColor}>
            <Text fontWeight="bold" fontSize="sm" color="fuchsia.900">
              Preview with Changes
            </Text>
          </Box>
          <PreviewIframe url={previewUrl} title="Preview Changes" ref={previewIframeRef} />
          {!previewUrl && (
            <Flex
              position="absolute"
              top="40px"
              left="0"
              right="0"
              bottom="0"
              bg="gray.100"
              justify="center"
              align="center"
            >
              <Text color="gray.500">Loading preview...</Text>
            </Flex>
          )}
        </Box>
      </Grid>
    </Flex>
  );
};
