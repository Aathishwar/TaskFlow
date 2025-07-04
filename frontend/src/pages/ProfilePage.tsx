import React, { useState, useRef, useEffect } from 'react';
import {
  Box,
  Container,
  VStack,
  HStack,
  Text,
  Avatar,
  Button,
  Input,
  Textarea,
  FormControl,
  FormLabel,
  useToast,
  useColorModeValue,
  Card,
  CardBody,
  CardHeader,
  Heading,
  AlertDialog,
  AlertDialogBody,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogContent,
  AlertDialogOverlay,
  useDisclosure,
  Spinner,
  IconButton,
  Tooltip
} from '@chakra-ui/react';
import { EditIcon, DeleteIcon, ArrowBackIcon } from '@chakra-ui/icons';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import NotificationSettings from '../components/NotificationSettings';

const ProfilePage: React.FC = () => {
  const { user, logout, updateUser } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploadingPicture, setIsUploadingPicture] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [forceRefresh, setForceRefresh] = useState(0); // Add force refresh counter
  const [notificationsEnabled, setNotificationsEnabled] = useState<boolean>(
    localStorage.getItem('taskflow-notifications-enabled') === 'true' || false
  );
  const [formData, setFormData] = useState({
    displayName: user?.displayName || '',
    email: user?.email || '',
    bio: user?.bio || '',
    phone: user?.phone || '',
    location: user?.location || ''
  });
  
  const { isOpen, onOpen, onClose } = useDisclosure();
  const cancelRef = useRef<HTMLButtonElement>(null);
  
  const bg = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');
  const textColor = useColorModeValue('gray.600', 'gray.300');
  const inputTextColor = useColorModeValue('gray.900', 'white');
  const inputBg = useColorModeValue('white', 'gray.700');
  const readOnlyBg = useColorModeValue('gray.50', 'gray.600');
  const backButtonHoverBg = useColorModeValue('gray.100', 'gray.700');

  // Update form data when user changes
  useEffect(() => {
    if (user) {
      setFormData({
        displayName: user.displayName || '',
        email: user.email || '',
        bio: user.bio || '',
        phone: user.phone || '',
        location: user.location || ''
      });
    }
  }, [user]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleProfilePictureChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Invalid file type',
        description: 'Please select an image file',
        status: 'error',
        duration: 3000,
        isClosable: true
      });
      return;
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: 'File too large',
        description: 'Please select an image smaller than 5MB',
        status: 'error',
        duration: 3000,
        isClosable: true
      });
      return;
    }

    // Create and set preview immediately
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      setPreviewImage(result);
    };
    reader.readAsDataURL(file);

    setIsUploadingPicture(true);
    try {
      const formData = new FormData();
      formData.append('profilePicture', file);

      const response = await api.put('/auth/profile/picture', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      if (response.data.success) {
        // Update user context immediately with new profile picture
        const updatedUser = response.data.user;
        
        // Update the user context
        updateUser({
          profilePicture: updatedUser.profilePicture
        });
        
        // Force a component re-render to ensure UI updates
        setForceRefresh(prev => prev + 1);
        
        // Also update the form data to reflect the change
        // Note: formData doesn't have profilePicture field, but keeping for consistency
        
        toast({
          title: 'Success',
          description: 'Profile picture updated successfully',
          status: 'success',
          duration: 3000,
          isClosable: true
        });
        
        // Clear preview after successful update
        setPreviewImage(null);
        
        // Clear the file input
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    } catch (error: any) {
      console.error('Error updating profile picture:', error);
      // Clear preview on error
      setPreviewImage(null);
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to update profile picture',
        status: 'error',
        duration: 3000,
        isClosable: true
      });
    } finally {
      setIsUploadingPicture(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!formData.displayName.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Display name is required',
        status: 'error',
        duration: 3000,
        isClosable: true
      });
      return;
    }

    // Check if any changes were made
    const hasChanges = 
      formData.displayName.trim() !== (user?.displayName || '') ||
      formData.bio.trim() !== (user?.bio || '') ||
      formData.phone.trim() !== (user?.phone || '') ||
      formData.location.trim() !== (user?.location || '');

    if (!hasChanges) {
      toast({
        title: 'No Changes',
        description: 'No changes detected to save',
        status: 'info',
        duration: 3000,
        isClosable: true
      });
      setIsEditing(false);
      return;
    }

    setIsLoading(true);
    try {
      const response = await api.put('/auth/profile', {
        displayName: formData.displayName.trim(),
        bio: formData.bio.trim(),
        phone: formData.phone.trim(),
        location: formData.location.trim()
      });

      if (response.data.success) {
        // Update user context with new data immediately
        const updatedUser = response.data.user;
        updateUser({
          displayName: updatedUser.displayName,
          bio: updatedUser.bio,
          phone: updatedUser.phone,
          location: updatedUser.location
        });
        
        toast({
          title: 'Success',
          description: 'Profile updated successfully',
          status: 'success',
          duration: 3000,
          isClosable: true
        });
        
        setIsEditing(false);
      }
    } catch (error: any) {
      console.error('Error updating profile:', error);
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to update profile',
        status: 'error',
        duration: 3000,
        isClosable: true
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    setIsDeleting(true);
    try {
      const response = await api.delete('/auth/profile');
      
      if (response.data.success) {
        toast({
          title: 'Account Deleted',
          description: 'Your account and all associated data have been permanently deleted',
          status: 'info',
          duration: 5000,
          isClosable: true
        });
        
        // Logout and redirect to home
        await logout();
        navigate('/');
      }
    } catch (error: any) {
      console.error('Error deleting account:', error);
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to delete account',
        status: 'error',
        duration: 3000,
        isClosable: true
      });
    } finally {
      setIsDeleting(false);
      onClose();
    }
  };

  const handleCancel = () => {
    setFormData({
      displayName: user?.displayName || '',
      email: user?.email || '',
      bio: user?.bio || '',
      phone: user?.phone || '',
      location: user?.location || ''
    });
    setIsEditing(false);
  };

  const handleNotificationToggle = (enabled: boolean) => {
    setNotificationsEnabled(enabled);
    localStorage.setItem('taskflow-notifications-enabled', enabled.toString());
    
    toast({
      title: enabled ? 'Notifications Enabled' : 'Notifications Disabled',
      description: enabled 
        ? 'You will receive task due reminders' 
        : 'You will not receive task notifications',
      status: 'success',
      duration: 3000,
      isClosable: true
    });
  };

  if (!user) {
    return (
      <Container maxW="4xl" py={8}>
        <Box textAlign="center">
          <Spinner size="xl" />
          <Text mt={4}>Loading...</Text>
        </Box>
      </Container>
    );
  }

  return (
    <Container maxW="6xl" py={8}>
      <VStack spacing={8} align="stretch">
        {/* Header with Back Button on the left side */}
        <HStack spacing={6} align="flex-start" w="full">
          {/* Back Button - Outside main content column */}
          <Box pt={2}>
            <Tooltip label="Go back">
              <IconButton
                aria-label="Go back"
                icon={<ArrowBackIcon />}
                size="lg"
                variant="outline"
                borderRadius="full"
                onClick={() => navigate(-1)}
                bg={bg}
                borderColor={borderColor}
                _hover={{
                  bg: backButtonHoverBg,
                  transform: "translateY(-1px)",
                  boxShadow: "md"
                }}
                _active={{
                  transform: "translateY(0)"
                }}
                transition="all 0.2s"
              />
            </Tooltip>
          </Box>

          {/* Main Content Column */}
          <VStack spacing={6} align="stretch" flex={1} maxW="4xl">
            {/* Header */}
            <Box>
              <Heading size="lg" mb={2}>Profile Settings</Heading>
              <Text color={textColor}>
                Manage your account information and preferences
              </Text>
            </Box>

            {/* Profile Picture Section */}
            <Card bg={bg} borderColor={borderColor}>
              <CardHeader>
                <Heading size="md">Profile Picture</Heading>
              </CardHeader>
              <CardBody>
                <HStack spacing={6} align="center">
                  <Box position="relative">
                    <Avatar
                      key={`avatar-${forceRefresh}`} // Force re-render with key
                      size="2xl"
                      src={previewImage || user.profilePicture || undefined}
                      name={user.displayName}
                      bg={previewImage ? "transparent" : undefined}
                    />
                    {isUploadingPicture && (
                      <Box
                        position="absolute"
                        top="0"
                        left="0"
                        right="0"
                        bottom="0"
                        bg="blackAlpha.600"
                        borderRadius="full"
                        display="flex"
                        alignItems="center"
                        justifyContent="center"
                      >
                        <Spinner color="white" />
                      </Box>
                    )}
                    {previewImage && !isUploadingPicture && (
                      <Box
                        position="absolute"
                        top="-2"
                        right="-2"
                        bg="green.500"
                        color="white"
                        borderRadius="full"
                        w="6"
                        h="6"
                        display="flex"
                        alignItems="center"
                        justifyContent="center"
                        fontSize="xs"
                        fontWeight="bold"
                      >
                        ✓
                      </Box>
                    )}
                  </Box>
                  <VStack align="start" spacing={2}>
                    <Text fontWeight="medium">Update your profile picture</Text>
                    <Text fontSize="sm" color={textColor}>
                      Supported formats: JPG, PNG, GIF. Max size: 5MB
                    </Text>
                    {previewImage && !isUploadingPicture && (
                      <Text fontSize="sm" color="green.500" fontWeight="medium">
                        ✓ Image ready to upload!
                      </Text>
                    )}
                    <HStack spacing={2}>
                      <Button
                        size="sm"
                        colorScheme="brand"
                        onClick={() => fileInputRef.current?.click()}
                        isLoading={isUploadingPicture}
                        loadingText="Uploading..."
                        isDisabled={isUploadingPicture}
                      >
                        Choose File
                      </Button>
                      {previewImage && !isUploadingPicture && (
                        <Button
                          size="sm"
                          variant="outline"
                          colorScheme="gray"
                          onClick={() => {
                            setPreviewImage(null);
                            if (fileInputRef.current) {
                              fileInputRef.current.value = '';
                            }
                          }}
                        >
                          Cancel
                        </Button>
                      )}
                    </HStack>
                    <Input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleProfilePictureChange}
                      style={{ display: 'none' }}
                    />
                  </VStack>
                </HStack>
              </CardBody>
            </Card>

            {/* Personal Information */}
            <Card bg={bg} borderColor={borderColor}>
              <CardHeader>
                <HStack justify="space-between" align="center">
                  <Heading size="md">Personal Information</Heading>
                  {!isEditing && (
                    <Tooltip label="Edit profile">
                      <IconButton
                        aria-label="Edit profile"
                        icon={<EditIcon />}
                        size="sm"
                        variant="ghost"
                        onClick={() => setIsEditing(true)}
                        isDisabled={isUploadingPicture}
                      />
                    </Tooltip>
                  )}
                </HStack>
              </CardHeader>
              <CardBody>
                <VStack spacing={4} align="stretch">
                  <FormControl>
                    <FormLabel>Display Name</FormLabel>
                    <Input
                      name="displayName"
                      value={formData.displayName}
                      onChange={handleInputChange}
                      isReadOnly={!isEditing}
                      bg={isEditing ? inputBg : readOnlyBg}
                      color={inputTextColor}
                    />
                  </FormControl>
                  
                  <FormControl>
                    <FormLabel>Email Address</FormLabel>
                    <Input
                      name="email"
                      value={formData.email}
                      isReadOnly
                      bg={readOnlyBg}
                      color={inputTextColor}
                    />
                    <Text fontSize="sm" color={textColor} mt={1}>
                      Email cannot be changed
                    </Text>
                  </FormControl>

                  <FormControl>
                    <FormLabel>Bio</FormLabel>
                    <Textarea
                      name="bio"
                      value={formData.bio}
                      onChange={(e) => setFormData(prev => ({ ...prev, bio: e.target.value }))}
                      placeholder="Tell us about yourself..."
                      isReadOnly={!isEditing}
                      bg={isEditing ? inputBg : readOnlyBg}
                      color={inputTextColor}
                      rows={3}
                      maxLength={500}
                    />
                    <Text fontSize="sm" color={textColor} mt={1}>
                      {formData.bio.length}/500 characters
                    </Text>
                  </FormControl>

                  <FormControl>
                    <FormLabel>Phone Number</FormLabel>
                    <Input
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      placeholder="Enter your phone number"
                      isReadOnly={!isEditing}
                      bg={isEditing ? inputBg : readOnlyBg}
                      color={inputTextColor}
                    />
                  </FormControl>

                  <FormControl>
                    <FormLabel>Location</FormLabel>
                    <Input
                      name="location"
                      value={formData.location}
                      onChange={handleInputChange}
                      placeholder="Enter your location"
                      isReadOnly={!isEditing}
                      bg={isEditing ? inputBg : readOnlyBg}
                      color={inputTextColor}
                      maxLength={100}
                    />
                  </FormControl>
                  
                  {isEditing && (
                    <HStack spacing={3} pt={4}>
                      <Button
                        colorScheme="brand"
                        onClick={handleSaveProfile}
                        isLoading={isLoading}
                        loadingText="Saving..."
                        isDisabled={isUploadingPicture}
                      >
                        Save Changes
                      </Button>
                      <Button
                        variant="outline"
                        onClick={handleCancel}
                        isDisabled={isLoading || isUploadingPicture}
                      >
                        Cancel
                      </Button>
                    </HStack>
                  )}
                </VStack>
              </CardBody>
            </Card>

            {/* Notification Settings */}
            <NotificationSettings
              isEnabled={notificationsEnabled}
              onToggle={handleNotificationToggle}
            />

            {/* Danger Zone */}
            <Card bg={bg} borderColor="red.200">
              <CardHeader>
                <Heading size="md" color="red.600">Danger Zone</Heading>
              </CardHeader>
              <CardBody>
                <VStack spacing={4} align="stretch">
                  <Box>
                    <Text fontWeight="medium" color="red.600" mb={2}>
                      Delete Account
                    </Text>
                    <Text fontSize="sm" color={textColor} mb={4}>
                      Permanently delete your account and all associated data. This action cannot be undone.
                    </Text>
                    <Button
                      leftIcon={<DeleteIcon />}
                      colorScheme="red"
                      variant="outline"
                      size="sm"
                      onClick={onOpen}
                    >
                      Delete Account
                    </Button>
                  </Box>
                </VStack>
              </CardBody>
            </Card>
          </VStack>
        </HStack>
      </VStack>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        isOpen={isOpen}
        leastDestructiveRef={cancelRef}
        onClose={onClose}
      >
        <AlertDialogOverlay>
          <AlertDialogContent>
            <AlertDialogHeader fontSize="lg" fontWeight="bold">
              Delete Account
            </AlertDialogHeader>

            <AlertDialogBody>
              Are you sure you want to delete your account? This will permanently delete:
              <Box as="ul" mt={2} pl={4}>
                <Text as="li">Your profile and personal information</Text>
                <Text as="li">All your tasks and data</Text>
                <Text as="li">Your access to the application</Text>
              </Box>
              <Text mt={3} fontWeight="bold" color="red.600">
                This action cannot be undone.
              </Text>
            </AlertDialogBody>

            <AlertDialogFooter>
              <Button ref={cancelRef} onClick={onClose} isDisabled={isDeleting}>
                Cancel
              </Button>
              <Button
                colorScheme="red"
                onClick={handleDeleteAccount}
                ml={3}
                isLoading={isDeleting}
                loadingText="Deleting..."
              >
                Delete Account
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>
    </Container>
  );
};

export default ProfilePage;
