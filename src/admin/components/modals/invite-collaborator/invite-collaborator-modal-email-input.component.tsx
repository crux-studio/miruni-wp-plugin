import { FC, useState } from 'react';

import { CloseIcon } from '@chakra-ui/icons';
import { Flex, Input, Tag, TagLabel, TagRightIcon, useToast } from '@chakra-ui/react';

interface InviteCollaboratorEmailInputProps {
  emails: string[];
  setEmails: (emails: string[]) => void;
  placeholder?: string;
}

const delimiterChars = [',', ';', ' '];

export const InviteCollaboratorEmailInput: FC<InviteCollaboratorEmailInputProps> = ({
  emails = [],
  setEmails,
  placeholder,
}) => {
  const [emailInput, setEmailInput] = useState('');
  const toast = useToast();
  const onAddEmail = (newEmails: string[]) => {
    // regex check for valid email
    for (const email of newEmails) {
      const emailRegex = /^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-_.+-]+\.[a-zA-Z0-9-_.+-]+$/gi;
      if (!emailRegex.test(email)) {
        return toast({
          title: 'Invalid email',
          description: 'Please enter a valid email address',
          status: 'error',
          duration: 3000,
        });
      }
    }
    const existingEmails = new Set(emails);
    newEmails.forEach((e) => existingEmails.add(e.toLowerCase()));
    setEmails(Array.from(existingEmails));
    setEmailInput('');
  };

  const onRemoveEmail = (email: string) => () => {
    const existingEmails = new Set(emails);
    existingEmails.delete(email);
    setEmails(Array.from(existingEmails));
  };
  return (
    <Flex gap={1} rounded="lg" bg="white" p={1} wrap="wrap">
      {emails.length > 0 && (
        <Flex wrap="wrap" gap={1} w="full">
          {emails.map((email: string) => (
            <Tag
              size="md"
              minW="max-content"
              fontSize="xs"
              variant="solid"
              colorScheme="blackAlpha"
              key={email}
              mx={1}
            >
              <TagLabel w="max-content">{email}</TagLabel>
              <TagRightIcon
                as={CloseIcon}
                cursor="pointer"
                onClick={onRemoveEmail(email)}
              ></TagRightIcon>
            </Tag>
          ))}
        </Flex>
      )}
      <Flex w="full">
        <Input
          bg="unset"
          outline="unset"
          border="unset"
          placeholder={placeholder}
          _focus={{
            outline: 'unset',
            border: 'unset',
            ring: 'unset',
          }}
          px={1}
          value={emailInput}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              onAddEmail([emailInput]);
            }
          }}
          onChange={(e) => {
            if (delimiterChars.some((char) => e.target.value.includes(char))) {
              // split on delimiter chars
              const emails = e.target.value
                .split(new RegExp(`[${delimiterChars.join('')}]`, 'g'))
                .filter(Boolean);

              onAddEmail(emails);
              return;
            }
            setEmailInput(e.target.value);
          }}
          onBlur={() => {
            emailInput && onAddEmail([emailInput]);
          }}
          onMouseLeave={() => {
            if (emailInput) {
              onAddEmail([emailInput]);
            }
          }}
        />
      </Flex>
    </Flex>
  );
};
