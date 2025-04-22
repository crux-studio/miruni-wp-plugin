import { forwardRef, useEffect, useRef, useState } from 'react';

import {
  Box,
  Flex,
  IconButton,
  ButtonGroup,
  Tooltip,
  useColorModeValue,
  Text,
  Button,
} from '@chakra-ui/react';

import { LinkExternalIcon, ChevronLeftIcon, ChevronRightIcon } from '@miruni/eds/src/icons';

interface IframeNavigationState {
  currentIndex: number;
  urls: string[];
}

interface PreviewIframeProps {
  url: string | null;
  title: string;
  onLoad?: () => void;
  iframeRef?: React.RefObject<HTMLIFrameElement>;
}

export const PreviewIframe = forwardRef<HTMLIFrameElement, PreviewIframeProps>(
  ({ url, title, onLoad }, externalRef) => {
    // We're removing the header display since titles are now shown in the parent component
    const borderColor = useColorModeValue('gray.200', 'gray.600');
    // Create a local ref that will always be a RefObject
    const iframeRef = useRef<HTMLIFrameElement | null>(null);
    // Use useEffect to handle both types of refs
    useEffect(() => {
      if (!iframeRef.current) return;

      if (typeof externalRef === 'function') {
        externalRef(iframeRef.current);
      } else if (externalRef) {
        externalRef.current = iframeRef.current;
      }
    }, [externalRef, iframeRef?.current]);

    const [navState, setNavState] = useState<IframeNavigationState>({
      currentIndex: 0,
      urls: url ? [url] : [],
    });

    const [pageTitle, setPageTitle] = useState<string>('');

    const handleNavigation = (action: 'back' | 'forward' | 'refresh') => {
      if (!iframeRef.current || !url) return;

      switch (action) {
        case 'back':
          if (navState.currentIndex > 0) {
            const newIndex = navState.currentIndex - 1;
            setNavState((prev) => ({ ...prev, currentIndex: newIndex }));
            iframeRef.current.src = navState.urls[newIndex];
          }
          break;
        case 'forward':
          if (navState.currentIndex < navState.urls.length - 1) {
            const newIndex = navState.currentIndex + 1;
            setNavState((prev) => ({ ...prev, currentIndex: newIndex }));
            iframeRef.current.src = navState.urls[newIndex];
          }
          break;
        case 'refresh':
          iframeRef.current.src = url;
          setNavState({ currentIndex: 0, urls: [url] });
          break;
      }
    };

    const handleIframeLoad = () => {
      const iframe = iframeRef.current;
      if (!iframe?.contentWindow?.location.href) return;

      const currentUrl = iframe.contentWindow.location.href;
      if (navState.urls[navState.currentIndex] !== currentUrl) {
        setNavState((prev) => ({
          urls: [...prev.urls.slice(0, prev.currentIndex + 1), currentUrl],
          currentIndex: prev.currentIndex + 1,
        }));
      }

      // Extract and set the page title from the iframe content
      try {
        const iframeTitle = iframe.contentDocument?.title || '';
        setPageTitle(iframeTitle);
      } catch (error) {
        // Handle cross-origin restrictions
        // eslint-disable-next-line no-console
        console.warn('Could not access iframe title due to cross-origin restrictions');
      }

      onLoad?.();
    };

    return (
      <Box display="flex" flexDirection="column" flex="1" minH="300px">
        <Flex
          p={2}
          borderBottomWidth="1px"
          borderColor={borderColor}
          justify="space-between"
          align="center"
          bg={useColorModeValue('gray.50', 'gray.700')}
        >
          <Box w="33%">
            <ButtonGroup size="xs" variant="ghost" spacing={1} alignItems="center">
              <Tooltip label="Back">
                <IconButton
                  aria-label="Go back"
                  icon={<ChevronLeftIcon />}
                  onClick={() => handleNavigation('back')}
                  isDisabled={!url || navState.currentIndex === 0}
                />
              </Tooltip>
              <Tooltip label="Forward">
                <IconButton
                  aria-label="Go forward"
                  icon={<ChevronRightIcon />}
                  onClick={() => handleNavigation('forward')}
                  isDisabled={navState.currentIndex >= navState.urls.length - 1}
                />
              </Tooltip>
              <Tooltip label="Refresh">
                <Button
                  onClick={() => handleNavigation('refresh')}
                  bg="white"
                  borderColor="#E2E8F0"
                  fontWeight="normal"
                  variant="outline"
                  size="xs"
                  disabled={!url}
                  py={3}
                >
                  Reset Preview
                </Button>
              </Tooltip>
            </ButtonGroup>
          </Box>

          <Text
            fontSize="xs"
            fontWeight="medium"
            noOfLines={1}
            textAlign="center"
            flex="1"
            mx={2}
            maxW="33%"
            textOverflow="ellipsis"
            color={useColorModeValue('gray.700', 'gray.200')}
          >
            {pageTitle || title || 'Preview'}
          </Text>
          <Flex w="33%" justify="flex-end" align="center">
            {url && (
              <Tooltip label="Open in new tab">
                <IconButton
                  aria-label="Open in new tab"
                  icon={<LinkExternalIcon />}
                  size="xs"
                  variant="ghost"
                  onClick={() => window.open(url, '_blank')}
                />
              </Tooltip>
            )}
          </Flex>
        </Flex>

        {url ? (
          <iframe
            ref={iframeRef}
            src={url}
            style={{ width: '100%', height: '100%', border: 'none', minHeight: '300px', flex: '1' }}
            title={title}
            onLoad={handleIframeLoad}
          />
        ) : (
          <Box
            width="100%"
            height="100%"
            flex="1"
            bg="gray.100"
            display="flex"
            alignItems="center"
            justifyContent="center"
            minHeight="300px"
          >
            No URL provided
          </Box>
        )}
      </Box>
    );
  },
);
