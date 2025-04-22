import { FC, useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import TextareaAutosize from 'react-textarea-autosize';

import {
  Flex,
  Heading,
  Text,
  Textarea,
  FormControl,
  FormErrorMessage,
  useBoolean,
  HStack,
  VStack,
} from '@chakra-ui/react';

import { Form, DESKTOP_BREAKPOINT } from '@miruni/eds';
import {
  TableViewStoryFragment,
  TableViewStoryFragmentDoc,
  useUpdateStoryAssigneeMutation,
  useUserAccountByIdQuery,
} from '@miruni/graphql';
import { useLocaleDateFns } from '@miruni/hooks';
import { EDateFormat } from '@miruni/models';
import { SUMMARY_MAX_LENGTH } from '@miruni/utils';

interface IStorySummaryForm {
  summary: string;
}

interface StoryDetailsHeaderEditableDescriptionProps {
  story: TableViewStoryFragment | null;
}

export const StoryDetailsHeaderEditableDescription: FC<
  StoryDetailsHeaderEditableDescriptionProps
> = ({ story }) => {
  const { t } = useTranslation();

  const { data: reporterData } = useUserAccountByIdQuery({
    variables: {
      id: story?.reporterId as number,
    },
    skip: !story?.reporterId,
  });
  const { dateFormatDistance } = useLocaleDateFns('en-US');

  const { dateFormat } = useLocaleDateFns('en-US');
  const [updateStory, { loading }] = useUpdateStoryAssigneeMutation({
    update: (cache, { data }) => {
      if (!data?.updateStory?.story) return;
      cache.modify({
        id: story?.nodeId,
        fields: {
          stories: () => {
            cache.writeFragment({
              id: story?.nodeId,
              fragment: TableViewStoryFragmentDoc,
              data: data?.updateStory?.story,
            });
          },
        },
      });
    },
  });
  const [isEditable, editable] = useBoolean();

  const onBlurStorySummary = async (data: IStorySummaryForm) => {
    if (!story) return;
    if (data.summary !== story.description) {
      await updateStory({
        variables: {
          id: story.id,
          input: {
            description: data.summary,
          },
        },
      });
    }
    editable.off();
  };
  const {
    formState: { errors },
    setFocus,
    reset,
    control,
    handleSubmit,
  } = useForm<IStorySummaryForm>({
    mode: 'onBlur',
    defaultValues: {
      summary: story?.description ?? '',
    },
  });

  useEffect(() => {
    if (isEditable) {
      setFocus('summary');
    }
  }, [isEditable, setFocus]);

  useEffect(() => {
    reset({ summary: story?.description ?? '' });
  }, [reset, story?.description]);

  return (
    <VStack gap="12px" align="stretch" color="black60">
      {/* <HStack justify="space-between">
        <Link href={getProjectUrl(story?.projectId as number)}>
          <Text
            fontWeight={400}
            fontSize={12}
            _hover={{
              textDecoration: 'underline',
            }}
          >
            {projectName}
          </Text>
        </Link>
      </HStack> */}
      <Heading
        size="xs"
        tabIndex={2}
        cursor="pointer"
        onClick={editable.on}
        display="flex"
        alignItems="center"
        fontFamily="body"
        fontWeight="500"
        fontSize="18px"
        lineHeight="1.3em"
      >
        <Form w="full">
          {!isEditable ? (
            <Flex>
              <Text
                transition="max-height 0.8s ease-in-out"
                overflow="clip"
                fontSize={{ base: 'xs', [DESKTOP_BREAKPOINT]: 'md' }}
              >
                {story?.description}
              </Text>
            </Flex>
          ) : (
            <Controller
              name="summary"
              control={control}
              render={({ field }) => (
                <FormControl isInvalid={!!errors?.summary}>
                  <Textarea
                    as={TextareaAutosize}
                    maxLength={SUMMARY_MAX_LENGTH}
                    disabled={loading}
                    _active={{ borderColor: 'fuchsia.900' }}
                    _focusVisible={{ borderColor: 'fuchsia.900' }}
                    width="full"
                    {...field}
                    onBlur={handleSubmit(onBlurStorySummary)}
                    minH="42px"
                    // rows={1}
                    h="auto"
                    p="0"
                    fontWeight="inherit"
                  />
                  <FormErrorMessage>{errors.summary?.message}</FormErrorMessage>
                </FormControl>
              )}
            />
          )}
        </Form>
      </Heading>
      <HStack justify="space-between">
        <Text fontWeight={400} fontSize={12}>
          {t(
            'storyView.createdAt',
            `Created ${dateFormat(story?.createdAt, EDateFormat.STORY)} by ${
              reporterData?.user?.name
            }`,
            {
              dateString: dateFormat(story?.createdAt, EDateFormat.STORY),
              name: reporterData?.user?.name ?? '',
            },
          )}{' '}
          {'  ·  '}
          {t('storyView.updatedAt', `Updated ${dateFormatDistance(story?.updatedAt)}`, {
            dateString: story?.updatedAt ? dateFormatDistance(story?.updatedAt) : '',
          })}
        </Text>
      </HStack>
    </VStack>
  );
};
