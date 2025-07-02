import React, { useState } from 'react';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  Button,
  FormControl,
  FormLabel,
  Input,
  VStack,
  Text,
  useToast,
} from '@chakra-ui/react';
import { Task } from '../types';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: Task | undefined; // Change from Task | null to Task | undefined
  onShare: (taskId: string, email: string) => Promise<void>;
}

const ShareModal: React.FC<ShareModalProps> = ({ isOpen, onClose, task, onShare }) => {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const toast = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Email is required',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      toast({
        title: 'Validation Error',
        description: 'Please enter a valid email address',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    if (!task) return;

    setIsSubmitting(true);
    
    try {
      await onShare(task._id, email.trim());
      setEmail('');
    } catch (error) {
      // Error is handled by parent component
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    setEmail('');
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleCancel} size="md">
      <ModalOverlay />
      <ModalContent>
        <form onSubmit={handleSubmit}>
          <ModalHeader>Share Task</ModalHeader>
          <ModalCloseButton />
          
          <ModalBody>
            <VStack spacing={4} align="start">
              {task && (
                <Text fontSize="sm" color="gray.600">
                  Sharing task: <strong>"{task.title}"</strong>
                </Text>
              )}
              
              <FormControl isRequired>
                <FormLabel>Email Address</FormLabel>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter user's email address"
                />
              </FormControl>
              
              <Text fontSize="sm" color="gray.500">
                The user will be able to view and edit this task once shared.
              </Text>
            </VStack>
          </ModalBody>

          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={handleCancel}>
              Cancel
            </Button>
            <Button
              type="submit"
              colorScheme="brand"
              isLoading={isSubmitting}
              loadingText="Sharing..."
            >
              Share Task
            </Button>
          </ModalFooter>
        </form>
      </ModalContent>
    </Modal>
  );
};

export default ShareModal;
