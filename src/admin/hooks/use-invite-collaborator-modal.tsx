import { useMemo } from 'react';

import { useModal } from '@miruni/eds';

import { InviteCollaboratorModal } from '#/admin/components/modals/invite-collaborator';

export const useInviteUserModal = () => {
  const { isOpen, onOpen, onClose } = useModal({
    content: ({ onClose }) => <InviteCollaboratorModal onClose={onClose} />,
    size: '2xl',
  });

  const contextData = useMemo(
    () => ({
      openInviteUserModal: onOpen,
      isOpenInviteUserModal: isOpen,
      closeInviteUserModal: onClose,
    }),
    [isOpen, onOpen, onClose],
  );
  return contextData;
};
