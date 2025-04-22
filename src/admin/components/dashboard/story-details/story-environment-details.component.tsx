import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { Box, Grid, Text } from '@chakra-ui/react';

import { Spinner } from '@miruni/eds';
import { useStoryWithDeviceDetectorEnvironmentFieldsQuery } from '@miruni/graphql';

export const StoryEnvironmentDetails = ({
  storyId,
  gridWidth = 2,
}: {
  storyId: number;
  gridWidth?: number;
}) => {
  const { t } = useTranslation();

  const { data } = useStoryWithDeviceDetectorEnvironmentFieldsQuery({
    fetchPolicy: 'cache-first',
    nextFetchPolicy: 'cache-only',
    variables: {
      storyId,
    },
    skip: !storyId,
  });
  const storyEnvDetails = data?.story?.storyEnvironmentDetails;
  const { deviceDetector } = storyEnvDetails || {};

  const renderEnvironmentTabContent = useMemo(() => {
    const envDetails = [
      {
        title: t('storyEnvironment.timeRecorded', 'Time recorded'),
        value: storyEnvDetails?.reportTime
          ? new Date(storyEnvDetails.reportTime).toLocaleString(undefined, {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              hour: 'numeric',
              minute: 'numeric',
              second: 'numeric',
              hour12: true,
              timeZoneName: 'short',
            })
          : undefined,
      },
      {
        title: t('osVersion', 'OS Version'),
        value: [deviceDetector?.os?.name, deviceDetector?.os?.version].filter(Boolean).join(' '),
      },
      {
        title: t('browser', 'Browser'),
        value: [deviceDetector?.client?.name, deviceDetector?.client?.version]
          .filter(Boolean)
          .join(' '),
      },
      {
        title: t('storyEnvironment.windowSize', 'Window size'),
        value: storyEnvDetails?.windowSize,
      },
      {
        title: t('storyEnvironment.screenSize', 'Screen size'),
        value: storyEnvDetails?.screenSize,
      },
      { title: t('storyEnvironment.language', 'Language'), value: storyEnvDetails?.languages },
      {
        title: t('storyEnvironment.cookies', 'Cookies enabled'),
        value:
          storyEnvDetails?.cookiesEnabled === true
            ? t('common.yes', 'Yes')
            : storyEnvDetails?.cookiesEnabled === false
            ? t('common.no', 'No')
            : t('common.unknown', 'Unknown'),
      },
      { title: t('storyEnvironment.timeZone', 'Time zone'), value: storyEnvDetails?.timezone },
      {
        title: t('storyEnvironment.deviceModel', 'Device Model'),
        value: deviceDetector?.device?.model,
      },
      {
        title: t('storyEnvironment.deviceType', 'Device Type'),
        value: deviceDetector?.device?.type,
      },
      { title: t('storyEnvironment.ipAddress', 'IP Address'), value: storyEnvDetails?.ipAddress },
    ] as { title: string; value?: string }[];
    return envDetails.map((item) => (
      <Box key={item.title} gap={2} h="full">
        <Box>
          <Text
            casing="uppercase"
            fontSize="12px"
            color="black40"
            fontWeight="600"
            lineHeight="16px"
          >
            {item.title}
          </Text>
          <Text fontSize="14px" color="gray.700" lineHeight="18px">
            {item.value ? String(item.value) : '---'}
          </Text>
        </Box>
      </Box>
    ));
  }, [storyEnvDetails, deviceDetector, t]);

  if (!data) {
    return <Spinner />;
  }

  return (
    <Grid
      templateColumns={`repeat(${gridWidth}, 1fr)`}
      gap={3}
      mt={2}
      mb={4}
      alignItems="center"
      justifyContent="center"
      width="100%"
    >
      {renderEnvironmentTabContent}
    </Grid>
  );
};
