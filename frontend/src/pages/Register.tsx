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
  Text,
  Divider,
  useToast,
  IconButton,
  useColorModeValue,
  InputLeftElement,
  Progress,
} from '@chakra-ui/react';
import { ViewIcon, ViewOffIcon, AtSignIcon, LockIcon } from '@chakra-ui/icons';
import { FcGoogle } from 'react-icons/fc';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useAuth } from '../contexts/AuthContext';

interface RegisterFormData {
  email: string;
  password: string;
  confirmPassword: string;
}

const passwordStrength = (password: string) => {
  let score = 0;
  if (password.length >= 8) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[a-z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  return score;
};

const Register: React.FC = () => {
  const { register: registerUser, registerWithGoogle } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<RegisterFormData>();

  const passwordValue = watch('password', '');
  const strength = passwordStrength(passwordValue);

  const onSubmit = async (data: RegisterFormData) => {
    setIsLoading(true);
    try {
      await registerUser(data.email, data.password);
      toast({ title: 'Registration successful', status: 'success', duration: 2000, isClosable: true });
      navigate('/dashboard');
    } catch (error: any) {
      console.error('Registration failed:', error);
      // Don't auto-navigate on error
      toast({ 
        title: 'Registration failed', 
        description: error.message || 'Please try again later', 
        status: 'error', 
        duration: 5000, 
        isClosable: true 
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleRegister = async () => {
    setIsGoogleLoading(true);
    try {
      await registerWithGoogle();
      toast({ title: 'Registration successful', status: 'success', duration: 2000, isClosable: true });
      navigate('/dashboard');
    } catch (error: any) {
      console.error('Google registration failed:', error);
      // Don't auto-navigate on error
      toast({ 
        title: 'Google registration failed', 
        description: error.message || 'Please try again later', 
        status: 'error', 
        duration: 5000, 
        isClosable: true 
      });
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const cardBg = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.100', 'gray.700');

  return (
    <Flex minH="100vh" align="center" justify="center" bg={useColorModeValue('gray.50', 'gray.900')}>
      <Box w={{ base: 'full', sm: '400px' }} bg={cardBg} p={8} rounded="2xl" boxShadow="lg" borderWidth={1} borderColor={borderColor}>
        <VStack spacing={8} align="center" mb={8}>
          <Box textAlign="center">
            <Heading
              size="2xl"
              bgGradient="linear(to-r, brand.400, brand.600)"
              bgClip="text"
              mb={2}
            >
              ⚡ TaskFlow
            </Heading>
            <Text color={useColorModeValue('gray.600', 'gray.200')} fontSize="lg">
              Create your account
            </Text>
          </Box>
        </VStack>
        <form onSubmit={handleSubmit(onSubmit)}>
          <VStack spacing={5} align="stretch">
            <FormControl isInvalid={!!errors.email} isRequired>
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
            <FormControl isInvalid={!!errors.password} isRequired>
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
                    minLength: { value: 8, message: 'At least 8 characters' },
                    validate: (v) =>
                      /[A-Z]/.test(v) || 'At least one uppercase letter',
                  })}
                  autoComplete="new-password"
                />
                <InputRightElement h="full">
                  <IconButton
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    icon={showPassword ? <ViewOffIcon /> : <ViewIcon />}
                    variant="ghost"
                    onClick={() => setShowPassword((s) => !s)}
                    tabIndex={-1}
                  />
                </InputRightElement>
              </InputGroup>
              <Progress value={strength * 20} size="xs" colorScheme={strength >= 4 ? 'green' : 'orange'} mt={2} borderRadius="full" />
              <Text fontSize="xs" color={strength >= 4 ? 'green.500' : 'orange.400'} mt={1}>
                {strength === 0 && 'Password must be at least 8 characters.'}
                {strength > 0 && strength < 4 && 'Add uppercase, lowercase, number, and symbol.'}
                {strength >= 4 && 'Strong password!'}
              </Text>
              <FormErrorMessage>{errors.password && errors.password.message}</FormErrorMessage>
            </FormControl>
            <FormControl isInvalid={!!errors.confirmPassword} isRequired>
              <FormLabel>Confirm Password</FormLabel>
              <InputGroup>
                <InputLeftElement pointerEvents="none">
                  <LockIcon color="gray.400" />
                </InputLeftElement>
                <Input
                  type={showConfirm ? 'text' : 'password'}
                  placeholder="Confirm your password"
                  {...register('confirmPassword', {
                    required: 'Please confirm your password',
                    validate: (v) => v === passwordValue || 'Passwords do not match',
                  })}
                  autoComplete="new-password"
                />
                <InputRightElement h="full">
                  <IconButton
                    aria-label={showConfirm ? 'Hide password' : 'Show password'}
                    icon={showConfirm ? <ViewOffIcon /> : <ViewIcon />}
                    variant="ghost"
                    onClick={() => setShowConfirm((s) => !s)}
                    tabIndex={-1}
                  />
                </InputRightElement>
              </InputGroup>
              <FormErrorMessage>{errors.confirmPassword && errors.confirmPassword.message}</FormErrorMessage>
            </FormControl>
            <Button
              type="submit"
              colorScheme="blue"
              size="lg"
              rounded="xl"
              fontWeight="bold"
              isLoading={isLoading}
              loadingText="Signing up..."
              w="full"
              mt={2}
            >
              Sign up
            </Button>
          </VStack>
        </form>
        <Divider my={6} />
        <Text textAlign="center" color="gray.500" fontSize="sm" mt={-2} mb={6}>or</Text>
        <Button
          w="full"
          size="lg"
          variant="outline"
          leftIcon={<FcGoogle size={22} />}
          onClick={handleGoogleRegister}
          isLoading={isGoogleLoading}
          loadingText="Signing up..."
          rounded="xl"
          fontWeight="bold"
          _hover={{ bg: useColorModeValue('gray.100', 'gray.700') }}
          mb={2}
        >
          Continue with Google
        </Button>
        <Text textAlign="center" color="gray.500" mt={6}>
          Already have an account?{' '}
          <Button as={Link} to="/login" variant="link" colorScheme="blue" fontWeight="bold">
            Sign in
          </Button>
        </Text>
      </Box>
    </Flex>
  );
};

export default Register;