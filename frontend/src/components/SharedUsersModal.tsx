import React, { useState, useEffect } from 'react';
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

const SharedUsersModal: React.FC<SharedUsersModalProps> = ({ isOpen, onClose, users, isOwner, onRemoveUser }) => {
  const [removingUserId, setRemovingUserId] = useState<string | null>(null);
  const [displayedUsers, setDisplayedUsers] = useState(users); // Local state for displayed users

  // Update displayedUsers when the users prop changes, unless a removal animation is active
  useEffect(() => {
    console.log('SharedUsersModal useEffect [users]: users prop changed', users);
    if (removingUserId === null) {
      console.log('SharedUsersModal useEffect [users]: No removal animation, updating displayedUsers.');
      setDisplayedUsers(users);
    } else {
      console.log('SharedUsersModal useEffect [users]: Removal animation active, NOT immediately updating displayedUsers.');
      // If the user being removed is no longer in the incoming list, reset removingUserId
      // This handles the case where the parent state updates while animation is playing
       if (!users.some(user => user.id === removingUserId)) {
         console.log('SharedUsersModal useEffect [users]: User being removed is gone from prop, resetting removingUserId.');
         setRemovingUserId(null);
         // Also update displayedUsers after a short delay to allow animation to finish visually
         const animationDuration = 300; // Match CSS transition duration
         setTimeout(() => {
            console.log('SharedUsersModal useEffect [users]: Delayed update of displayedUsers after user removal from prop.');
            setDisplayedUsers(users);
         }, animationDuration);
      }
    }
  }, [users, removingUserId]); // Depend on users prop and removingUserId state

   // Reset displayedUsers when the modal opens with new users
   useEffect(() => {
       if (isOpen) {
           console.log('SharedUsersModal useEffect [isOpen]: Modal opened, resetting displayedUsers to initial users prop.', users);
           setDisplayedUsers(users);
           setRemovingUserId(null); // Ensure removing state is reset on open
       }
   }, [isOpen, users]); // Depend on isOpen and users prop

  const handleRemoveClick = (userId: string) => {
    console.log('Clicked remove button for user:', userId);
    setRemovingUserId(userId); // Start the removal animation
    // Call the parent handler immediately to trigger backend/socket update
    if (onRemoveUser) {
      console.log('Calling onRemoveUser immediately for user:', userId);
      onRemoveUser(userId);
    }
  };

  const handleTransitionEnd = (userId: string) => {
    // This is called when the slide-out/fade-out transition ends for a user item.
    // If the user is still marked for removal, it means the parent state hasn't updated yet.
    // We can optimistically remove the user from the displayed list here.
    if (removingUserId === userId) {
      console.log('Animation ended for user:', userId, '. Optimistically removing from displayedUsers.');
       setDisplayedUsers(prevUsers => prevUsers.filter(user => user.id !== userId));
       // removingUserId will be reset by the useEffect when the prop updates
    }
  };

  console.log('SharedUsersModal Render: isOwner:', isOwner, 'onRemoveUser:', !!onRemoveUser, 'Current displayedUsers count:', displayedUsers.length, 'removingUserId:', removingUserId); // Log the condition status
  return (
    <Modal isOpen={isOpen} onClose={onClose}>
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
        <ModalBody>
          <VStack spacing={4} align="start">
            {displayedUsers.map((user) => (
              <HStack
                key={user.id}
                spacing={4}
                justify="space-between"
                width="100%"
                // Apply transition styles
                style={{
                  opacity: removingUserId === user.id ? 0 : 1,
                  transform: removingUserId === user.id ? 'translateX(-20px)' : 'translateX(0)',
                  transition: 'opacity 0.3s ease-out, transform 0.3s ease-out',
                  pointerEvents: removingUserId === user.id ? 'none' : 'auto', // Disable clicks during animation
                }}
                onTransitionEnd={() => handleTransitionEnd(user.id)} // Handle transition end
              >
                <HStack spacing={4}>
                  <Avatar src={user.avatarUrl} name={user.name} size="sm" />
                  <Text>{user.name}</Text>
                </HStack>
                {isOwner && onRemoveUser && ( // Conditionally render remove button
                  <IconButton
                    aria-label={`Remove ${user.name}`}
                    icon={<CloseIcon />}
                    size="xs"
                    variant="ghost"
                    colorScheme="red"
                    onClick={() => handleRemoveClick(user.id)} // Use the new handler
                    isDisabled={removingUserId === user.id} // Disable button during animation
                  />
                )}
              </HStack>
            ))}
          </VStack>
        </ModalBody>
      </ModalContent>
    </Modal>
  );
};

export default SharedUsersModal;
