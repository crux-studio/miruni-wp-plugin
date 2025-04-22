import { useState } from 'react';
import { SubmitHandler, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';

import { CheckCircleIcon, CopyIcon } from '@chakra-ui/icons';
import {
  Box,
  Button,
  Flex,
  ModalBody,
  ModalCloseButton,
  ModalFooter,
  ModalHeader,
  StyleProps,
  Text,
  useClipboard,
  useToast,
} from '@chakra-ui/react';

import { useInviteSnippetCollaboratorMutation } from '@miruni/graphql';

import { useMiruniUser } from '#/admin/hooks/use-miruni-user';

import { InviteCollaboratorEmailInput } from './invite-collaborator-modal-email-input.component';

export const InviteCollaboratorFields = {
  EMAIL: 'email',
} as const;

interface IInviteCollaboratorFieldsType {
  [InviteCollaboratorFields.EMAIL]: string[];
}

export interface InviteCollaboratorModalProps {
  onClose: () => void;
}

export const InviteCollaboratorModal = ({ onClose }: InviteCollaboratorModalProps) => {
  const { t } = useTranslation();
  const toast = useToast({
    containerStyle: { '> div': { bg: 'black90', color: 'white' } } as StyleProps,
  });
  const { userSnippet } = useMiruniUser();
  const [invitesSending, setInvitesSending] = useState(false);

  const getSnippetActivationUrl = ({
    webappBaseUrl,
    redirectUrl,
    snippetApiKey,
  }: {
    webappBaseUrl: string;
    redirectUrl: string;
    snippetApiKey: string;
  }) => {
    const endpoint = `/snippet-activation/${snippetApiKey}`;
    const url = new URL(webappBaseUrl);
    url.pathname = endpoint;
    url.searchParams.append('redirect', redirectUrl);

    return url.toString();
  };

  const snippetActivationUrl = getSnippetActivationUrl({
    webappBaseUrl: window.miruniData.miruniWebappUrl,
    redirectUrl: `${window.location.protocol}//${window.location.hostname}`,
    snippetApiKey: userSnippet?.key as string,
  });

  const { hasCopied, onCopy } = useClipboard(snippetActivationUrl);

  const { handleSubmit, formState, setValue, watch } = useForm<IInviteCollaboratorFieldsType>({
    mode: 'onSubmit',
    defaultValues: {
      [InviteCollaboratorFields.EMAIL]: [],
    },
  });

  const [inviteCollaborator] = useInviteSnippetCollaboratorMutation();

  const handleInviteCollaborator: SubmitHandler<IInviteCollaboratorFieldsType> = async (data) => {
    try {
      setInvitesSending(true);
      const promises = data.email.map((email) =>
        inviteCollaborator({
          variables: {
            input: {
              email,
              inviteUrl: snippetActivationUrl,
              projectId: userSnippet?.projectId as number,
              projectName: userSnippet?.project?.projectName as string,
            },
          },
        }),
      );
      await Promise.all(promises);
      toast({
        title: t('team.members.inviteSuccess', 'Collaborator invited'),
        description: t(
          'team.members.inviteSuccessDescription',
          "Invitation has been sent to the collaborator's email",
        ),
        status: 'success',
        duration: 5000,
        isClosable: true,
      });
    } catch (error) {
      toast({
        title: t('team.members.inviteError', 'Error inviting collaborator'),
        description: t(
          'team.members.inviteErrorDescription',
          'An error occurred while sending the invitation(s)',
        ),
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setInvitesSending(false);
      onClose();
    }
  };

  return (
    <>
      <ModalHeader>Request site feedback</ModalHeader>
      <ModalCloseButton />

      <ModalBody>
        <Flex direction="column" gap={6}>
          {/* Link sharing section */}
          <Box>
            <Text fontWeight="medium" mb={3}>
              Share invitation link
            </Text>
            <Button
              leftIcon={hasCopied ? <CheckCircleIcon /> : <CopyIcon />}
              onClick={onCopy}
              size="md"
              colorScheme={hasCopied ? 'green' : 'gray'}
              variant="outline"
              width="100%"
            >
              {hasCopied ? 'Link copied!' : 'Copy invitation link'}
            </Button>
          </Box>

          {/* Email invitation section */}
          <Box>
            <Text fontWeight="medium" mb={3}>
              Or invite via email
            </Text>
            <Flex
              direction="column"
              gap={4}
              border="1px solid"
              borderColor="gray.200"
              p={4}
              rounded="md"
            >
              <InviteCollaboratorEmailInput
                emails={watch('email')}
                setEmails={(emails: string[]) => {
                  setValue('email', emails);
                }}
                placeholder={t('team.inviteEmailPlaceholder', 'Enter emails, comma separated')}
              />
              <Button
                type="submit"
                variant="solid"
                bg="black"
                color={'white'}
                borderRadius="full"
                fontWeight="500"
                _hover={{ bg: 'gray.70', borderColor: 'black', color: 'white', borderWidth: '1px' }}
                isLoading={formState.isSubmitting || invitesSending}
                onClick={handleSubmit(handleInviteCollaborator)}
              >
                {t('team.members.sendInvite', 'Send Invite')}
              </Button>
            </Flex>
          </Box>
        </Flex>
      </ModalBody>

      <ModalFooter>
        <Button
          colorScheme="blackAlpha"
          variant="outline"
          borderRadius="full"
          fontWeight="500"
          onClick={onClose}
          isDisabled={formState.isSubmitting}
        >
          {t('common.cancel', 'Cancel')}
        </Button>
      </ModalFooter>
    </>
  );
};
