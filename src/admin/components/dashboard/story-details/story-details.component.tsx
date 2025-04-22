import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { gql } from '@apollo/client';
import {
  Box,
  Button,
  Flex,
  Heading,
  Link,
  Spacer,
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
  Text,
  Tooltip,
  useDisclosure,
} from '@chakra-ui/react';

import {
  ITagOption,
  Tag,
  LinkExternalIcon,
  theme,
  InspectResult,
  DESKTOP_BREAKPOINT,
  DetailsItem,
  StoryDetailsHeaderToolkitPortalEnter,
  Links,
  ILinksProps,
  StoryChangeLog,
} from '@miruni/eds';
import {
  ProcessedType,
  useAddStoryLinkMutation,
  useAddTagToStoryMutation,
  useDeleteStoryLinkMutation,
  useUpdateStoryAssigneeMutation,
  useUpdateStoryLinkMutation,
  useUpdateRecentlyViewedStoryRecordMutation,
  useTeamTagsLazyQuery,
  useCommentsByStoryIdLazyQuery,
  useStoryDetailsBodyByIdQuery,
  useStoriesTableByIdQuery,
} from '@miruni/graphql';
import { useStoryAttributes, useWindowDimensions } from '@miruni/hooks';
import { changeLogFiledMapperDefinitions, IInspectData } from '@miruni/models';
import { debounce, parseJSONStr } from '@miruni/utils';

import { useMiruniUser } from '#/admin/hooks/use-miruni-user';

import { StoryComments } from './story-comments.component';
import { StoryDetailsHeaderEditableDescription } from './story-details-description.component';
import { StoryDetailsMediaGallery } from './story-details-media-gallery';
import { StoryDetailsSubHeader } from './story-details-sub-header.component';
import { StoryEnvironmentDetails } from './story-environment-details.component';

interface IStoryDetails {
  storyId: number;
}

export const StoryDetails = ({ storyId }: IStoryDetails) => {
  const { t, i18n } = useTranslation();
  const { user } = useMiruniUser();
  const { width } = useWindowDimensions();
  const { data: storiesTableData } = useStoriesTableByIdQuery({
    variables: {
      id: storyId,
    },
    skip: !storyId,
  });
  const storyTableDetails = storiesTableData?.story;
  const { data: storyDetailsBodyData } = useStoryDetailsBodyByIdQuery({
    variables: {
      id: storyId,
    },
    skip: !storyId,
  });
  const storyBody = storyDetailsBodyData?.story;
  // const { setCursor } = useGlobalStyles();
  const { isOpen: isDevToolsTooltipOpen, onToggle: toggleDevToolsTooltip } = useDisclosure();

  // We should already have a lot of the story data in the cache from the story table
  // This hook finds that data and returns it and makes a network request if it can't find it

  const captures = useMemo(() => storyBody?.captures?.nodes || [], [storyBody?.captures?.nodes]);

  const attributes = storyBody?.storyAttributes?.nodes;
  const { inspectData } = useStoryAttributes(attributes);
  const parsedInspectData = parseJSONStr(inspectData) as IInspectData;

  const [updateRecentlyViewedStoryRecord] = useUpdateRecentlyViewedStoryRecordMutation();

  useEffect(() => {
    if (!storyTableDetails || storyTableDetails.id === 0 || !user?.id) {
      return;
    }

    updateRecentlyViewedStoryRecord({
      variables: {
        id: storyTableDetails.id,
        userId: user?.id as number,
      },
    }).catch(window.newrelic?.noticeError);
  }, [storyTableDetails, updateRecentlyViewedStoryRecord, user]);

  const [getStoryComments, { data: commentsByStory }] = useCommentsByStoryIdLazyQuery({
    fetchPolicy: 'cache-and-network',
  });

  const [getTeamTags, { data: teamTags }] = useTeamTagsLazyQuery({
    fetchPolicy: 'cache-first',
  });

  useEffect(() => {
    if (!storyTableDetails?.teamId) return;

    const variables = {
      teamId: storyTableDetails?.teamId,
    };
    getTeamTags({
      variables,
    }).catch(window.newrelic?.noticeError);
  }, [getTeamTags, storyTableDetails]);

  useEffect(() => {
    if (!storyTableDetails || !storyTableDetails.id) return;

    getStoryComments({
      variables: {
        storyId: storyTableDetails.id,
        size: 100,
        offset: 0,
      },
    }).catch(window.newrelic?.noticeError);
  }, [getStoryComments, storyTableDetails]);

  const getCaptureData = useCallback(
    (processedType: ProcessedType) => captures?.filter((el) => el.processedType === processedType),
    [captures],
  );

  const [addStoryLink] = useAddStoryLinkMutation();
  const [updateStoryLink] = useUpdateStoryLinkMutation();
  const [deleteStoryLink] = useDeleteStoryLinkMutation();
  const [updateStory] = useUpdateStoryAssigneeMutation({
    update: (cache, { data: _data }) => {
      const _story = _data?.updateStory?.story;
      if (!_story) return;
      cache.modify({
        id: cache.identify(_story),
        fields: {
          stories: () => {
            cache.writeFragment({
              data: _story,
              fragment: gql`
                fragment NewStory on Story {
                  ...TableViewStory
                  tags
                }
              `,
            });
          },
        },
      });
    },
  });
  const [addTagToStory] = useAddTagToStoryMutation({
    update: (cache, { data: _data }) => {
      // clear tags cache to force refetch
      cache.evict({ fieldName: 'tags' });
      cache.gc();

      _data?.addTagToStory?.stories?.forEach((story) => {
        cache.modify({
          id: cache.identify(story),
          fields: {
            tags: () => {
              return story?.tags || [];
            },
          },
        });
      });
    },
  });

  const devToolsUrl = '';

  const linksMemo = useMemo(() => {
    if (!storyBody || !storyBody.links) return [];
    const links =
      storyBody.links.nodes.map((item) => ({
        id: item.id,
        value: item.link,
        isUrlPathLink: false,
      })) ?? [];
    // If the story was created via capture, it will have a urlPath
    // We want to show this as a link as well so that people can easily navigate to the page
    // which is being referred to in the story
    if (storyBody.urlPath && storyBody.urlPath !== 'unknown') {
      links.unshift({ id: 0, value: storyBody.urlPath, isUrlPathLink: true });
    }
    return links;
  }, [storyBody]);

  const tagsValues = useMemo<ITagOption[]>(
    () =>
      storyBody && storyBody.tags
        ? storyBody.tags.map((t: { key: string | number; value: string; active: boolean }) => ({
            id: t.key,
            label: t.value,
            active: t?.active,
          }))
        : [],
    [storyBody],
  );

  const handleCreateStoryLink = useCallback<ILinksProps['handleCreate']>(
    async (link) => {
      if (!storyTableDetails) return;
      await addStoryLink({
        variables: {
          storyId: storyTableDetails.id,
          link: link.value,
        },
        update: (cache, { data: _data }) => {
          const _storyLink = _data?.createStoryLink?.storyLink;

          cache.modify({
            id: storyTableDetails.nodeId,
            fields: {
              storyLinks: (existingLinkRefs) => {
                const newLinkRef = cache.writeFragment({
                  data: _storyLink,
                  fragment: gql`
                    fragment NewStoryLink on StoryLink {
                      id
                      nodeId
                      link
                      storyId
                    }
                  `,
                });

                return { ...existingLinkRefs, nodes: [...existingLinkRefs.nodes, newLinkRef] };
              },
            },
          });
        },
      });
    },
    [addStoryLink, storyTableDetails],
  );

  const handleUpdateStoryLink = useCallback<ILinksProps['handleUpdate']>(
    async ({ id, value }) => {
      await updateStoryLink({
        variables: {
          id,
          link: value,
        },
      });
    },
    [updateStoryLink],
  );

  const handleDeleteStoryLink = useCallback(
    async (id: number) => {
      await deleteStoryLink({
        variables: {
          id,
        },
        update: (cache, response) => {
          const nodeId = response.data?.deleteStoryLink?.storyLink?.nodeId;
          if (!nodeId) return;
          cache.evict({ id: nodeId });
          cache.gc();
        },
      });
    },
    [deleteStoryLink],
  );

  const handleCreateTag: (val: Omit<ITagOption, 'id'>) => void = useCallback(
    (tag) => {
      if (!storyTableDetails) return;
      addTagToStory({
        variables: {
          id: storyTableDetails.id,
          tag: tag.label,
        },
      }).catch(window.newrelic?.noticeError);
    },
    [addTagToStory, storyTableDetails],
  );

  const handleAddTagToStory = useCallback(
    async (tag: ITagOption) => {
      if (!storyBody) return;
      const updatedTags = [...((storyBody.tags as []) || []), { key: tag.id, value: tag.label }];
      await updateStory({
        variables: {
          id: storyBody.id,
          input: {
            tags: updatedTags,
          },
        },
      });
    },
    [storyBody, updateStory],
  );

  const handleDeleteTag = useMemo(
    () =>
      debounce(async (tag: ITagOption) => {
        if (!storyBody) return;
        const tags =
          storyBody.tags?.filter((t: { key: string | number }) => t.key !== tag.id) || [];
        await updateStory({
          variables: {
            id: storyBody.id,
            input: {
              tags,
            },
          },
        });
      }, 1000),
    [storyBody, updateStory],
  );

  // only show dev tools button if story has network traffic or console logs
  const showDevToolsButton = useMemo(() => {
    const networkTraffic = getCaptureData(ProcessedType.NetworkTraffic);
    const consoleLogs = getCaptureData(ProcessedType.Console);

    const noNetworkTraffic = !networkTraffic || networkTraffic.length === 0;
    const noConsoleLogs = !consoleLogs || consoleLogs.length === 0;

    if (noNetworkTraffic && noConsoleLogs) {
      return false;
    }
    return true;
  }, [getCaptureData]);

  const isScreenMobileWidth = useCallback(() => {
    return width && width > 0 && width < parseInt(theme.breakpoints[DESKTOP_BREAKPOINT]);
  }, [width]);

  const [storyAssetsTabIndex, setStoryAssetsTabIndex] = useState(0);

  const renderStoryDetails = useMemo(
    () => (
      <>
        <DetailsItem text={t('storyView.storyAssets', 'Story assets')}>
          <Tabs
            w="full"
            display="flex"
            flexDir="column"
            isLazy
            index={storyAssetsTabIndex}
            onChange={setStoryAssetsTabIndex}
          >
            <TabList>
              <Tab fontWeight="500" fontSize="14px" lineHeight="18px" p="5px 8px 13px">
                {t('', 'Attachments')}
              </Tab>
              {parsedInspectData &&
                parsedInspectData.cssPath &&
                parsedInspectData.inspectAttributes && (
                  <Tab fontWeight="500" fontSize="14px" lineHeight="18px" p="5px 8px 13px">
                    {t('', 'Inspect data')}
                  </Tab>
                )}
              <Tab fontWeight="500" fontSize="14px" lineHeight="18px" p="5px 8px 13px">
                {t('', 'Environment data')}
              </Tab>
              <Spacer />
              {/* {storyAssetsTabIndex === 0 && (
                <AddAttachmentButton
                  onFileInputClick={onFileInputClick}
                  onFileInputChange={onFileInputChange}
                />
              )} */}
            </TabList>
            <TabPanels>
              <TabPanel>
                <StoryDetailsMediaGallery
                  storyNodeId={storyBody?.nodeId as string}
                  storyId={storyId}
                  teamId={storyTableDetails?.teamId}
                  devToolsUrl={devToolsUrl}
                  showDevToolsButton={showDevToolsButton}
                />
              </TabPanel>
              {parsedInspectData &&
                parsedInspectData.cssPath &&
                parsedInspectData.inspectAttributes && (
                  <TabPanel>
                    <InspectResult
                      cssPath={parsedInspectData.cssPath}
                      inspectAttributes={parsedInspectData.inspectAttributes}
                    />
                  </TabPanel>
                )}
              <TabPanel>
                {/* Wait until the story body has loaded so that the env details can be read from the cache */}
                {storyBody && <StoryEnvironmentDetails storyId={storyBody.id} />}
              </TabPanel>
            </TabPanels>
          </Tabs>
        </DetailsItem>
        <Flex flexDir="column" px={1}>
          <Heading
            as="h3"
            fontFamily="body"
            fontSize="14px"
            fontWeight="700"
            lineHeight="18px"
            mb={3}
          >
            {t('storyView.links', 'Links')}
          </Heading>
          <Links
            links={linksMemo}
            handleCreate={handleCreateStoryLink}
            handleUpdate={handleUpdateStoryLink}
            handleDelete={handleDeleteStoryLink}
            labels={{
              edit: t('common.edit', 'Edit'),
              delete: t('common.delete', 'Delete'),
              addLink: t('common.addLink', 'Add link'),
              cancel: t('common.cancel', 'Cancel'),
              save: t('common.save', 'Save'),
            }}
          />
        </Flex>

        {/* {storyBody && (
          <StoryDetailsIntegrations
            story={{
              ...storyBody,
              projectId: storyTableDetails?.projectId as number,
            }}
            px={1}
          />
        )} */}
        {showDevToolsButton && (
          <StoryDetailsHeaderToolkitPortalEnter>
            {isScreenMobileWidth() ? (
              <Tooltip
                label={t(
                  'storyView.noDevToolsMobile',
                  'Dev tools are not available on smaller screens.',
                )}
                fontSize="12px"
                placement="bottom-end"
                isOpen={isDevToolsTooltipOpen}
                bg="white"
                color="black"
              >
                <Button
                  rel="noopener noreferrer"
                  variant="primary"
                  leftIcon={<LinkExternalIcon boxSize="12px" />}
                  h="auto"
                  borderRadius="4px"
                  fontWeight="500"
                  fontSize="14px"
                  lineHeight="18px"
                  minW="80px"
                  p="5px 8px"
                  opacity="0.4"
                  onClick={toggleDevToolsTooltip}
                >
                  {t('storyView.devToolsBtn', 'Dev tools')}
                </Button>
              </Tooltip>
            ) : (
              <Button
                as={Link}
                target="_blank"
                href={devToolsUrl}
                rel="noopener noreferrer"
                variant="primary"
                display="flex"
                leftIcon={<LinkExternalIcon boxSize="12px" />}
                h="auto"
                borderRadius="4px"
                fontWeight="500"
                fontSize="14px"
                lineHeight="18px"
                minW="80px"
                p="5px 8px"
              >
                {t('storyView.devToolsBtn', 'Dev tools')}
              </Button>
            )}
          </StoryDetailsHeaderToolkitPortalEnter>
        )}
        <Flex flexDir="column" px={1}>
          <Heading
            as="h3"
            fontFamily="body"
            fontWeight="700"
            fontSize="14px"
            lineHeight="18px"
            mb={3}
          >
            {t('storyView.tags', 'Tags')}
          </Heading>
          <Tag
            t={t}
            label={t('common.addTag', 'Add tag')}
            values={tagsValues}
            tags={teamTags?.tags?.nodes.length ? teamTags?.tags?.nodes : []}
            onTagChange={handleAddTagToStory}
            onTagCreate={handleCreateTag}
            onTagDelete={handleDeleteTag}
          />
        </Flex>
      </>
    ),
    // With so many dependencies, do we gain anything from memoizing this?
    [
      devToolsUrl,
      handleAddTagToStory,
      handleCreateStoryLink,
      handleCreateTag,
      handleDeleteStoryLink,
      handleDeleteTag,
      handleUpdateStoryLink,
      isDevToolsTooltipOpen,
      isScreenMobileWidth,
      linksMemo,

      parsedInspectData,
      showDevToolsButton,
      storyAssetsTabIndex,
      storyBody,
      storyTableDetails?.projectId,
      storyTableDetails?.teamId,
      t,
      tagsValues,
      teamTags?.tags?.nodes,
      toggleDevToolsTooltip,
    ],
  );

  return (
    <Flex flexDir="column" w="full" overflow="auto" flexGrow="1" gap={4} rowGap={8} px={5} py={6}>
      <Box>
        {storyTableDetails && <StoryDetailsHeaderEditableDescription story={storyTableDetails} />}
      </Box>
      <StoryDetailsSubHeader story={storyTableDetails} />
      <Flex flexDir="column" flexGrow="1">
        <Flex flexDir="column" alignItems="stretch" flex="1" height="full">
          <Flex flexDir="column" w="full" gap="16px" my="16px">
            {renderStoryDetails}
          </Flex>
          <Flex flexDir="column">
            <Tabs h="full" display="flex" flexDir="column" isLazy>
              <TabList fontSize={{ base: '12px', [DESKTOP_BREAKPOINT]: '16px' }}>
                <Tab fontWeight="500" fontSize="14px" lineHeight="18px" p="5px 8px 13px">
                  <Text p="0">
                    {t('storyView.comments', {
                      count: commentsByStory?.comments?.totalCount || 0,
                      defaultValue: `Comments (${commentsByStory?.comments?.totalCount || 0})`,
                    })}
                  </Text>
                </Tab>
                <Tab fontWeight="500" fontSize="14px" lineHeight="18px" p="5px 8px 13px">
                  <Text p="0">{t('storyView.changeLogs', 'Change logs')}</Text>
                </Tab>
              </TabList>
              <TabPanels display="flex" h="full">
                <TabPanel p={0} flex="1" h="full" display="flex">
                  {storyTableDetails && (
                    <StoryComments
                      storyId={storyTableDetails.id}
                      comments={commentsByStory?.comments?.nodes || []}
                    />
                  )}
                </TabPanel>
                <TabPanel p={0} flex="1" h="full" display="flex">
                  {storyTableDetails && (
                    <StoryChangeLog
                      storyId={storyTableDetails.id}
                      i18nLanguage={i18n?.language || 'en'}
                      labels={{
                        commentAdded: t('storyView.storyChangeLogCommentAdded', 'Comment added'),
                        commentDeleted: t(
                          'storyView.storyChangeLogCommentDeleted',
                          'Comment deleted',
                        ),
                        commentEdited: t('storyView.storyChangeLogCommentEdited', 'Comment edited'),
                        storyChangeLogSet: t('storyChangeLogSet', 'Set'),
                        unassigned: t('common.unassigned', 'Unassigned'),
                        to: t('storyChangeLogTo', 'to'),
                        labels: changeLogFiledMapperDefinitions.reduce(
                          (acc, curr) => ({
                            ...acc,
                            [curr.fieldLabelTrKey]: t(curr.fieldLabelTrKey, curr.defaultFieldLabel),
                          }),
                          {},
                        ),
                      }}
                    />
                  )}
                </TabPanel>
              </TabPanels>
            </Tabs>
          </Flex>
        </Flex>
      </Flex>
    </Flex>
  );
};
