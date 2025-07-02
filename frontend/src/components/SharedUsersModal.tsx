import React, { useState } from 'react';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  Avatar,
  Text,
  VStack,
  HStack,
  IconButton,
} from '@chakra-ui/react';
import { CloseIcon } from '@chakra-ui/icons';

interface SharedUsersModalProps {
  isOpen: boolean;
  onClose: () => void;
  users: { id: string; name: string; avatarUrl: string }[];
  isOwner: boolean;
  onRemoveUser?: (userId: string) => void;
}

const SharedUsersModal: React.FC<SharedUsersModalProps> = ({ 
  isOpen, 
  onClose, 
  users, 
  isOwner, 
  onRemoveUser 
}) => {
  const [removingUserId, setRemovingUserId] = useState<string | null>(null);
  const [removedUsers, setRemovedUsers] = useState<Set<string>>(new Set());

  const handleRemoveClick = async (userId: string) => {
    setRemovingUserId(userId);
    
    // Start the animation immediately
    setTimeout(() => {
      // After animation completes, mark user as removed locally
      setRemovedUsers(prev => new Set([...prev, userId]));
      setRemovingUserId(null);
    }, 300); // Match the animation duration
  };

  const handleModalClose = async () => {
    // Apply all pending removals when modal closes
    if (onRemoveUser && removedUsers.size > 0) {
      try {
        // Remove all users that were marked for removal
        for (const userId of removedUsers) {
          await onRemoveUser(userId);
        }
      } catch (error) {
        console.error('Error removing users:', error);
      }
    }
    
    // Reset state when modal closes
    setRemovingUserId(null);
    setRemovedUsers(new Set());
    onClose();
  };

  // Filter out removed users from display
  const displayUsers = users.filter(user => !removedUsers.has(user.id));

  return (
    <Modal isOpen={isOpen} onClose={handleModalClose} isCentered>
      <ModalOverlay />
      <ModalContent
        style={{
          borderRadius: '12px',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
          transition: 'all 0.3s ease-in-out',
        }}
      >
        <ModalHeader>Shared With</ModalHeader>
        <ModalCloseButton />
        <ModalBody pb={6}>
          <VStack spacing={4} align="start">
            {displayUsers.length === 0 ? (
              <Text color="gray.500" fontSize="sm">
                {removedUsers.size > 0 ? 'All users have been removed.' : 'No users shared with this task.'}
              </Text>
            ) : (
              displayUsers.map((user) => (
                <HStack
                  key={user.id}
                  spacing={4}
                  justify="space-between"
                  width="100%"
                  style={{
                    opacity: removingUserId === user.id ? 0 : 1,
                    transform: removingUserId === user.id ? 'translateX(-20px)' : 'translateX(0)',
                    transition: 'opacity 0.3s ease-out, transform 0.3s ease-out',
                    pointerEvents: removingUserId === user.id ? 'none' : 'auto',
                  }}
                >
                  <HStack spacing={4}>
                    <Avatar src={user.avatarUrl} name={user.name} size="sm" />
                    <Text>{user.name}</Text>
                  </HStack>
                  {isOwner && onRemoveUser && (
                    <IconButton
                      aria-label={`Remove ${user.name}`}
                      icon={<CloseIcon />}
                      size="xs"
                      variant="ghost"
                      colorScheme="red"
                      onClick={() => handleRemoveClick(user.id)}
                      isDisabled={removingUserId === user.id}
                      isLoading={removingUserId === user.id}
                    />
                  )}
                </HStack>
              ))
            )}
          </VStack>
        </ModalBody>
      </ModalContent>
    </Modal>
  );
};

export default SharedUsersModal;
