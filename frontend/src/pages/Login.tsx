import React, { useState } from 'react';
import {
  Box,
  Button,
  Flex,
  Heading,
  Input,
  InputGroup,
  InputRightElement,
  FormControl,
  FormLabel,
  FormErrorMessage,
  VStack,
  HStack,
  Text,
  Divider,
  useToast,
  IconButton,
  useColorModeValue,
  InputLeftElement,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  useDisclosure,
} from '@chakra-ui/react';
import { ViewIcon, ViewOffIcon, AtSignIcon, LockIcon } from '@chakra-ui/icons';
import { FcGoogle } from 'react-icons/fc';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useAuth } from '../contexts/AuthContext';

interface LoginFormData {
  email: string;
  password: string;
}

interface ForgotPasswordFormData {
  email: string;
}

const Login: React.FC = () => {
  const { login, registerWithGoogle, resetPassword, authInitialized, initializeAuthIfNeeded } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isResetLoading, setIsResetLoading] = useState(false);
  const { isOpen: isResetOpen, onOpen: onResetOpen, onClose: onResetClose } = useDisclosure();

  // Initialize auth when user reaches login page
  React.useEffect(() => {
    if (!authInitialized) {
      initializeAuthIfNeeded();
    }
  }, [authInitialized, initializeAuthIfNeeded]);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>();

  const {
    register: registerReset,
    handleSubmit: handleResetSubmit,
    formState: { errors: resetErrors },
    reset: resetForm,
  } = useForm<ForgotPasswordFormData>();

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true);
    try {
      await login(data.email, data.password);
      toast({ title: 'Login successful', status: 'success', duration: 2000, isClosable: true });
      navigate('/dashboard');
    } catch (error: any) {
      console.error('Login failed:', error);
      
      // Provide specific guidance for user-not-found errors
      if (error.code === 'auth/user-not-found') {
        toast({ 
          title: 'Account not found', 
          description: 'No account exists with this email. Would you like to create one?', 
          status: 'warning', 
          duration: 8000, 
          isClosable: true,
          render: ({ onClose }) => (
            <Box
              bg="orange.500"
              color="white"
              p={4}
              borderRadius="md"
              boxShadow="lg"
            >
              <VStack spacing={3} align="start">
                <Text fontWeight="bold">Account not found</Text>
                <Text fontSize="sm">
                  This email isn't registered yet. Would you like to create a new account?
                </Text>
                <HStack spacing={2}>
                  <Button
                    size="sm"
                    variant="solid"
                    bg="white"
                    color="orange.500"
                    _hover={{ bg: "gray.100" }}
                    onClick={() => {
                      navigate('/register');
                      onClose();
                    }}
                  >
                    Create Account
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    color="white"
                    _hover={{ bg: "whiteAlpha.200" }}
                    onClick={onClose}
                  >
                    Cancel
                  </Button>
                </HStack>
              </VStack>
            </Box>
          )
        });
      } else if (error.code === 'auth/invalid-credential') {
        // Handle invalid-credential with helpful guidance
        toast({ 
          title: 'Login failed', 
          description: 'Invalid email or password. Please check your credentials.', 
          status: 'error', 
          duration: 6000, 
          isClosable: true,
          render: ({ onClose }) => (
            <Box
              bg="red.500"
              color="white"
              p={4}
              borderRadius="md"
              boxShadow="lg"
            >
              <VStack spacing={3} align="start">
                <Text fontWeight="bold">Login failed</Text>
                <Text fontSize="sm">
                  Invalid email or password. Please check your credentials and try again.
                </Text>
                <Text fontSize="xs" opacity={0.8}>
                  New to TaskFlow? You might need to create an account first.
                </Text>
                <HStack spacing={2}>
                  <Button
                    size="sm"
                    variant="outline"
                    borderColor="white"
                    color="white"
                    _hover={{ bg: "whiteAlpha.200" }}
                    onClick={() => {
                      navigate('/register');
                      onClose();
                    }}
                  >
                    Create Account
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    color="white"
                    _hover={{ bg: "whiteAlpha.200" }}
                    onClick={onClose}
                  >
                    Try Again
                  </Button>
                </HStack>
              </VStack>
            </Box>
          )
        });
      } else {
        toast({ 
          title: 'Login failed', 
          description: error.message || 'Please check your credentials and try again', 
          status: 'error', 
          duration: 5000, 
          isClosable: true 
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setIsGoogleLoading(true);
    try {
      await registerWithGoogle();
      toast({ title: 'Login successful', status: 'success', duration: 2000, isClosable: true });
      navigate('/dashboard');
    } catch (error: any) {
      console.error('Google login failed:', error);
      // Don't auto-navigate on error
      toast({ 
        title: 'Google login failed', 
        description: error.message || 'Please try again later', 
        status: 'error', 
        duration: 5000, 
        isClosable: true 
      });
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handleForgotPassword = async (data: ForgotPasswordFormData) => {
    setIsResetLoading(true);
    try {
      await resetPassword(data.email);
      toast({ 
        title: 'Password reset email sent', 
        description: 'Check your email for password reset instructions', 
        status: 'success', 
        duration: 5000, 
        isClosable: true 
      });
      onResetClose();
      resetForm();
    } catch (error: any) {
      toast({ 
        title: 'Password reset failed', 
        description: error.message || 'Please try again', 
        status: 'error', 
        duration: 4000, 
        isClosable: true 
      });
    } finally {
      setIsResetLoading(false);
    }
  };

  const cardBg = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.100', 'gray.700');

  return (
    <>
      <Flex minH="100vh" align="center" justify="center" bg={useColorModeValue('gray.50', 'gray.900')}>
        <Box
          bg={cardBg}
          p={8}
          maxW="md"
          w="full"
          borderRadius="xl"
          boxShadow="xl"
          border="1px solid"
          borderColor={borderColor}
        >
          <VStack spacing={6}>
            <Box textAlign="center">
              <Heading size="lg" mb={2}>
                Welcome Back
              </Heading>
              <Text color="gray.600">
                Sign in to your account to continue
              </Text>
            </Box>

            <form onSubmit={handleSubmit(onSubmit)} style={{ width: '100%' }}>
              <VStack spacing={5} align="stretch">
                <FormControl isInvalid={!!errors.email}>
                  <FormLabel>Email address</FormLabel>
                  <InputGroup>
                    <InputLeftElement pointerEvents="none">
                      <AtSignIcon color="gray.400" />
                    </InputLeftElement>
                    <Input
                      type="email"
                      placeholder="Enter your email"
                      {...register('email', {
                        required: 'Email is required',
                        pattern: {
                          value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                          message: 'Invalid email address',
                        },
                      })}
                      autoComplete="email"
                    />
                  </InputGroup>
                  <FormErrorMessage>{errors.email && errors.email.message}</FormErrorMessage>
                </FormControl>

                <FormControl isInvalid={!!errors.password}>
                  <FormLabel>Password</FormLabel>
                  <InputGroup>
                    <InputLeftElement pointerEvents="none">
                      <LockIcon color="gray.400" />
                    </InputLeftElement>
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Enter your password"
                      {...register('password', {
                        required: 'Password is required',
                      })}
                      autoComplete="current-password"
                    />
                    <InputRightElement>
                      <IconButton
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                        icon={showPassword ? <ViewOffIcon /> : <ViewIcon />}
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowPassword(!showPassword)}
                      />
                    </InputRightElement>
                  </InputGroup>
                  <FormErrorMessage>{errors.password && errors.password.message}</FormErrorMessage>
                </FormControl>

                <Button
                  type="submit"
                  w="full"
                  size="lg"
                  colorScheme="brand"
                  isLoading={isLoading}
                  loadingText="Signing in..."
                  rounded="xl"
                  fontWeight="bold"
                  _hover={{
                    transform: "translateY(-2px)",
                    boxShadow: "xl",
                  }}
                  _active={{
                    transform: "translateY(0)",
                  }}
                  transition="all 0.2s ease"
                >
                  Sign In
                </Button>
              </VStack>
            </form>

            <Button
              variant="link"
              colorScheme="blue"
              size="sm"
              onClick={onResetOpen}
            >
              Forgot your password?
            </Button>

            <Divider />

            <Button
              w="full"
              size="lg"
              variant="outline"
              leftIcon={<FcGoogle size={22} />}
              onClick={handleGoogleLogin}
              isLoading={isGoogleLoading}
              loadingText="Signing in..."
              rounded="xl"
              fontWeight="bold"
              _hover={{ bg: useColorModeValue('gray.100', 'gray.700') }}
              mb={2}
            >
              Continue with Google
            </Button>
            <Text textAlign="center" color="gray.500" mt={6}>
              Don't have an account?{' '}
              <Button as={RouterLink} to="/register" variant="link" colorScheme="blue" fontWeight="bold">
                Sign up
              </Button>
            </Text>
          </VStack>
        </Box>
      </Flex>

      {/* Forgot Password Modal */}
      <Modal isOpen={isResetOpen} onClose={onResetClose}>
        <ModalOverlay />
        <ModalContent>
          <form onSubmit={handleResetSubmit(handleForgotPassword)}>
            <ModalHeader>Reset Password</ModalHeader>
            <ModalCloseButton />
            <ModalBody>
              <VStack spacing={4}>
                <Text color="gray.600">
                  Enter your email address and we'll send you a link to reset your password.
                </Text>
                <FormControl isInvalid={!!resetErrors.email}>
                  <FormLabel>Email address</FormLabel>
                  <Input
                    type="email"
                    placeholder="Enter your email"
                    {...registerReset('email', {
                      required: 'Email is required',
                      pattern: {
                        value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                        message: 'Invalid email address',
                      },
                    })}
                  />
                  <FormErrorMessage>{resetErrors.email && resetErrors.email.message}</FormErrorMessage>
                </FormControl>
              </VStack>
            </ModalBody>
            <ModalFooter>
              <Button variant="ghost" mr={3} onClick={onResetClose}>
                Cancel
              </Button>
              <Button
                type="submit"
                colorScheme="blue"
                isLoading={isResetLoading}
                loadingText="Sending..."
              >
                Send Reset Link
              </Button>
            </ModalFooter>
          </form>
        </ModalContent>
      </Modal>
    </>
  );
};

export default Login;