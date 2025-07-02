import React from 'react';
import { Link as RouterLink } from 'react-router-dom';
import {
  Box,
  Flex,
  Heading,
  Text,
  Button,
  VStack,
  HStack,
  SimpleGrid,
  Icon,
  useColorModeValue,
  Avatar,
  useBreakpointValue,
} from '@chakra-ui/react';
import { CheckCircleIcon, TimeIcon, AtSignIcon, StarIcon } from '@chakra-ui/icons';

const features = [
  {
    icon: CheckCircleIcon,
    title: 'Smart Task Management',
    description: 'Create, organize, and prioritize tasks with intelligent sorting and urgent item highlights.',
    color: 'blue.500',
  },
  {
    icon: TimeIcon,
    title: 'Due Date Tracking',
    description: 'Never miss a deadline with reminders and real-time updates.',
    color: 'green.500',
  },
  {
    icon: AtSignIcon,
    title: 'Team Collaboration',
    description: 'Assign tasks, share progress, and collaborate seamlessly with your team.',
    color: 'purple.500',
  },
  {
    icon: StarIcon,
    title: 'Productivity Analytics',
    description: 'Track your productivity with detailed analytics and performance insights.',
    color: 'orange.400',
  },
];

const productivityTips = [
  'Break big tasks into smaller steps for easier progress.',
  'Review your to-do list every morning and prioritize.',
  'Use deadlines to stay focused and avoid procrastination.',
  'Celebrate small wins to keep your motivation high.',
  'Share your goals with a friend for accountability.',
];

const testimonials = [
  {
    name: 'Priya Sharma',
    avatar: 'https://randomuser.me/api/portraits/women/68.jpg',
    text: 'This app transformed my workflow! I never miss a deadline now.',
  },
  {
    name: 'Rahul Verma',
    avatar: 'https://randomuser.me/api/portraits/men/32.jpg',
    text: 'The team features make collaboration so easy. Highly recommended!',
  },
  {
    name: 'Aisha Khan',
    avatar: 'https://randomuser.me/api/portraits/women/44.jpg',
    text: 'Beautiful UI, real-time updates, and dark mode. Love it!',
  },
];

const Home: React.FC = () => {
  const tip = productivityTips[new Date().getDate() % productivityTips.length];
  const bg = useColorModeValue('gray.50', 'gray.900');
  const cardBg = useColorModeValue('white', 'gray.800');
  const ctaGradient = 'linear(to-r, blue.500, purple.600)';
  const isMobile = useBreakpointValue({ base: true, md: false });

  return (
    <Box minH="100vh" bg={bg}>
      {/* Hero Section */}
      <Box bgGradient="linear(to-r, blue.500, purple.600)" py={{ base: 16, md: 24 }}>
        <Flex direction="column" align="center" justify="center" maxW="4xl" mx="auto" px={4}>
          <Box mb={8}>
            <Flex align="center" justify="center">
              <Box w={20} h={20} bg="whiteAlpha.300" rounded="2xl" display="flex" alignItems="center" justifyContent="center" boxShadow="lg">
                <Text fontSize="4xl" fontWeight="bold" color="white">T</Text>
              </Box>
            </Flex>
          </Box>
          <Heading as="h1" size="2xl" color="white" fontWeight="extrabold" textAlign="center" mb={4}>
            Organize. Focus. Achieve.
          </Heading>
          <Text color="blue.100" fontSize="xl" textAlign="center" mb={8}>
            The ultimate productivity app to help you stay organized, focused, and on track. Manage your tasks with ease and never miss a deadline again.
          </Text>
          <HStack spacing={4} flexDir={isMobile ? 'column' : 'row'}>
            <Button
              as={RouterLink}
              to="/register"
              size="lg"
              colorScheme="whiteAlpha"
              bg="white"
              color="blue.600"
              rounded="xl"
              px={8}
              py={6}
              fontWeight="bold"
              _hover={{ bg: 'gray.50' }}
              boxShadow="md"
            >
              Get Started Free
            </Button>
            <Button
              as={RouterLink}
              to="/login"
              size="lg"
              variant="outline"
              color="white"
              borderColor="white"
              rounded="xl"
              px={8}
              py={6}
              fontWeight="bold"
              _hover={{ bg: 'whiteAlpha.200' }}
              boxShadow="md"
            >
              Sign In
            </Button>
          </HStack>
        </Flex>
      </Box>

      {/* Features Section */}
      <Box py={20}>
        <VStack spacing={12} maxW="6xl" mx="auto" px={4}>
          <Heading as="h2" size="xl" textAlign="center">
            Everything you need to stay organized
          </Heading>
          <SimpleGrid columns={{ base: 1, md: 2, lg: 4 }} spacing={8} w="full">
            {features.map((feature) => (
              <Box key={feature.title} bg={cardBg} rounded="2xl" p={8} textAlign="center" boxShadow="md" borderWidth={1} borderColor={useColorModeValue('gray.100', 'gray.700')}>
                <Flex align="center" justify="center" mb={6}>
                  <Icon as={feature.icon} w={10} h={10} color={feature.color} />
                </Flex>
                <Text fontSize="xl" fontWeight="semibold" mb={2}>{feature.title}</Text>
                <Text color="gray.500">{feature.description}</Text>
              </Box>
            ))}
          </SimpleGrid>
        </VStack>
      </Box>

      {/* Productivity Tip Section */}
      <Box py={16} bg={useColorModeValue('blue.50', 'gray.800')}>
        <VStack spacing={6} maxW="3xl" mx="auto" px={4}>
          <Text fontSize="lg" color="blue.500" fontWeight="bold">
            💡 Productivity Tip of the Day
          </Text>
          <Text fontSize="2xl" fontWeight="semibold" textAlign="center">
            {tip}
          </Text>
        </VStack>
      </Box>

      {/* Testimonials Section */}
      <Box py={20}>
        <VStack spacing={10} maxW="4xl" mx="auto" px={4}>
          <Heading as="h3" size="lg" textAlign="center" mb={4}>
            What our users say
          </Heading>
          <SimpleGrid columns={{ base: 1, md: 3 }} spacing={8} w="full">
            {testimonials.map((t) => (
              <Box key={t.name} bg={cardBg} rounded="2xl" p={6} textAlign="center" boxShadow="md" borderWidth={1} borderColor={useColorModeValue('gray.100', 'gray.700')}>
                <Avatar src={t.avatar} name={t.name} size="lg" mb={4} mx="auto" />
                <Text fontSize="md" color="gray.600" mb={2}>
                  "{t.text}"
                </Text>
                <Text fontWeight="bold" color="blue.600">{t.name}</Text>
              </Box>
            ))}
          </SimpleGrid>
        </VStack>
      </Box>

      {/* CTA Section */}
      <Box py={16} bg={useColorModeValue('gray.100', 'gray.700')}>
        <VStack spacing={6} maxW="2xl" mx="auto" px={4} textAlign="center">
          <Heading as="h4" size="lg">
            Ready to get organized?
          </Heading>
          <Text fontSize="xl" color={useColorModeValue('gray.600', 'gray.300')}>
            Join thousands of users who have transformed their productivity with our app.
          </Text>
          <Button
            as={RouterLink}
            to="/register"
            size="lg"
            colorScheme="blue"
            bgGradient={ctaGradient}
            color="white"
            rounded="xl"
            px={10}
            py={6}
            fontWeight="bold"
            _hover={{ bgGradient: 'linear(to-r, blue.600, purple.700)' }}
            boxShadow="lg"
          >
            Start Your Free Trial
          </Button>
        </VStack>
      </Box>
    </Box>
  );
};

export default Home; 