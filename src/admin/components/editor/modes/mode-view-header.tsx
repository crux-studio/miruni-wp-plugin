import { FC } from 'react';

import { Flex, Text, Icon, Tooltip, Button, useColorModeValue, As } from '@chakra-ui/react';

interface ModeViewHeaderProps {
  saveDisabled: boolean;
  accentColor: string;
  textColor: string;
  handleSave: () => void;
  icon: As;
  label: string;
}

export const ModeViewHeader: FC<ModeViewHeaderProps> = ({
  saveDisabled,
  accentColor,
  textColor,
  handleSave,
  icon,
  label,
}) => {
  const headerBg = useColorModeValue('gray.50', 'gray.700');

  return (
    <Flex
      align="center"
      justify="space-between"
      py={3}
      px={4}
      bg={headerBg}
      borderBottomWidth="1px"
      borderBottomColor="transparent"
    >
      <Flex align="center">
        <Icon as={icon} mr={2} color={accentColor} />
        <Text fontWeight="medium" color={textColor}>
          {label}
        </Text>
      </Flex>

      <Tooltip label={!saveDisabled ? 'Save changes' : 'No changes to save'}>
        <Button
          size="sm"
          color="fuchsia.900"
          variant="outline"
          borderColor="fuchsia.900"
          _hover={{
            bg: 'fuchsia.50',
          }}
          isDisabled={saveDisabled}
          onClick={handleSave}
        >
          Save
        </Button>
      </Tooltip>
    </Flex>
  );
};
