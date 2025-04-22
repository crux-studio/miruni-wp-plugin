import { Box, Skeleton, Tab, TabList, Tabs } from '@chakra-ui/react';

export const TabsLoadingSkeleton = () => {
  return (
    <Box p={1}>
      <Tabs variant="line" colorScheme="fuchsia">
        <TabList>
          <Tab>
            <Skeleton height="20px" width="120px" />
          </Tab>
          <Tab>
            <Skeleton height="20px" width="100px" />
          </Tab>
        </TabList>
        <Box p={4}>
          <Skeleton height="24px" width="70%" mb={4} />
          <Skeleton height="16px" width="90%" mb={3} />
        </Box>
      </Tabs>
    </Box>
  );
};
