import React, { useState, useEffect } from 'react';
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
  Textarea,
  Select,
  VStack,
  HStack,
  useToast,
} from '@chakra-ui/react';
import { Task, CreateTaskData, UpdateTaskData } from '../types';

interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: Task | undefined;
  existingTasks: Task[];
  onSubmit: (taskData: CreateTaskData | UpdateTaskData, taskId?: string) => Promise<void>;
}

const TaskModal: React.FC<TaskModalProps> = ({ isOpen, onClose, task, existingTasks, onSubmit }) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    status: 'pending' as Task['status'],
    priority: 'medium' as Task['priority'],
    dueDate: '',
    dueTime: '',
    tags: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const toast = useToast();

  // Reset form when modal opens/closes or task changes
  useEffect(() => {
    if (isOpen) {
      if (task) {
        // Edit mode - populate form with task data
        const taskDate = task.dueDate ? new Date(task.dueDate) : null;
        setFormData({
          title: task.title,
          description: task.description || '',
          status: task.status,
          priority: task.priority,
          dueDate: taskDate ? taskDate.toISOString().split('T')[0] : '',
          dueTime: taskDate ? taskDate.toTimeString().slice(0, 5) : '',
          tags: task.tags ? task.tags.join(', ') : ''
        });
      } else {
        // Create mode - reset form
        setFormData({
          title: '',
          description: '',
          status: 'pending',
          priority: 'medium',
          dueDate: '',
          dueTime: '',
          tags: ''
        });
      }
    }
  }, [isOpen, task]);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Task title is required',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    // Validate tags
    const tagArr = formData.tags
      .split(',')
      .map(t => t.trim())
      .filter(Boolean);
    const uniqueTags = Array.from(new Set(tagArr));
    if (tagArr.length !== uniqueTags.length) {
      toast({
        title: 'Validation Error',
        description: 'Duplicate tags are not allowed',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    // Simplified date/time handling
    let dueDateISO: string | undefined = undefined;
    if (formData.dueDate) {
      try {
        let dateString = formData.dueDate;
        
        // Add time if provided, otherwise use end of day
        if (formData.dueTime && formData.dueTime.trim()) {
          dateString += `T${formData.dueTime}:00`;
        } else {
          dateString += 'T23:59:59';
        }
        
        const combinedDate = new Date(dateString);
        
        // Basic validation
        if (isNaN(combinedDate.getTime())) {
          toast({
            title: 'Validation Error',
            description: 'Invalid date or time format',
            status: 'error',
            duration: 3000,
            isClosable: true,
          });
          return;
        }
        
        dueDateISO = combinedDate.toISOString();
      } catch (error) {
        console.error('Date parsing error:', error);
        toast({
          title: 'Validation Error',
          description: 'Invalid date or time format',
          status: 'error',
          duration: 3000,
          isClosable: true,
        });
        return;
      }
    }

    // Check for duplicate task names (case-insensitive)
    const trimmedTitle = formData.title.trim().toLowerCase();
    const isDuplicate = existingTasks.some(existingTask => {
      if (task && existingTask._id === task._id) {
        return false;
      }
      return existingTask.title.toLowerCase() === trimmedTitle;
    });

    if (isDuplicate) {
      toast({
        title: 'Duplicate Task Name',
        description: 'A task with this name already exists. Please choose a different name.',
        status: 'warning',
        duration: 4000,
        isClosable: true,
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const taskData: CreateTaskData | UpdateTaskData = {
        title: formData.title.trim(),
        description: formData.description.trim() || undefined,
        status: formData.status,
        priority: formData.priority,
        dueDate: dueDateISO,
        tags: uniqueTags.length > 0 ? uniqueTags : undefined,
      };

      if (task) {
        await onSubmit(taskData, task._id);
      } else {
        await onSubmit(taskData);
      }
      
    } catch (error) {
      console.error('Error during task operation:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    onClose();
    setFormData({
      title: '',
      description: '',
      status: 'pending',
      priority: 'medium',
      dueDate: '',
      dueTime: '',
      tags: ''
    });
  };

  return (
    <Modal isOpen={isOpen} onClose={handleCancel} size="lg">
      <ModalOverlay />
      <ModalContent>
        <form onSubmit={handleSubmit}>
          <ModalHeader>
            {task ? 'Edit Task' : 'Create New Task'}
          </ModalHeader>
          <ModalCloseButton />
          
          <ModalBody>
            <VStack spacing={4}>
              <FormControl isRequired>
                <FormLabel>Title</FormLabel>
                <Input
                  value={formData.title}
                  onChange={(e) => handleInputChange('title', e.target.value)}
                  placeholder="Enter task title"
                  maxLength={200}
                />
              </FormControl>

              <FormControl>
                <FormLabel>Description</FormLabel>
                <Textarea
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  placeholder="Enter task description (optional)"
                  rows={3}
                  maxLength={1000}
                />
              </FormControl>

              <HStack spacing={4} w="full">
                <FormControl>
                  <FormLabel>Status</FormLabel>
                  <Select
                    value={formData.status}
                    onChange={(e) => handleInputChange('status', e.target.value)}
                  >
                    <option value="pending">Pending</option>
                    <option value="in-progress">In Progress</option>
                    <option value="completed">Completed</option>
                  </Select>
                </FormControl>

                <FormControl>
                  <FormLabel>Priority</FormLabel>
                  <Select
                    value={formData.priority}
                    onChange={(e) => handleInputChange('priority', e.target.value)}
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </Select>
                </FormControl>
              </HStack>

              <HStack spacing={4} w="full">
                <FormControl>
                  <FormLabel>Due Date</FormLabel>
                  <Input
                    type="date"
                    value={formData.dueDate}
                    onChange={(e) => handleInputChange('dueDate', e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                  />
                </FormControl>

                <FormControl>
                  <FormLabel>Due Time</FormLabel>
                  <Input
                    type="time"
                    value={formData.dueTime}
                    onChange={(e) => handleInputChange('dueTime', e.target.value)}
                  />
                </FormControl>
              </HStack>

              <FormControl>
                <FormLabel>Tags</FormLabel>
                <Input
                  value={formData.tags}
                  onChange={(e) => handleInputChange('tags', e.target.value)}
                  placeholder="Enter tags separated by commas (optional)"
                />
              </FormControl>
            </VStack>
          </ModalBody>

          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={handleCancel}>
              Cancel
            </Button>
            <Button
              colorScheme="blue"
              type="submit"
              isLoading={isSubmitting}
              loadingText={task ? 'Updating...' : 'Creating...'}
            >
              {task ? 'Update Task' : 'Create Task'}
            </Button>
          </ModalFooter>
        </form>
      </ModalContent>
    </Modal>
  );
};

export default TaskModal;
