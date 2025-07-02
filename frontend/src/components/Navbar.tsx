import {
  Box,
  Flex,
  HStack,
  Button,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  Avatar,
  Text,
  useColorModeValue,
} from '@chakra-ui/react';
import { ChevronDownIcon } from '@chakra-ui/icons';
import { useAuth } from '../contexts/AuthContext';

const Navbar = () => {
  const { user, logout } = useAuth();
  const bg = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');

  return (
    <Box bg={bg} borderBottom="1px" borderColor={borderColor} px={4} py={3}>
      <Flex maxW="6xl" mx="auto" justify="space-between" align="center">
        {/* Logo */}
        <Text
          fontSize="xl"
          fontWeight="bold"
          bgGradient="linear(to-r, brand.400, brand.600)"
          bgClip="text"
        >
          ⚡ TaskFlow
        </Text>

        {/* User Menu */}
        <HStack spacing={4}>
          <Menu>
            <MenuButton
              as={Button}
              variant="ghost"
              rightIcon={<ChevronDownIcon />}
              _hover={{ bg: 'brand.50' }}
              bg="transparent"
              color="brand.600"
            >
              <HStack spacing={2}>
                <Avatar
                  size="sm"
                  src={user?.profilePicture}
                  name={user?.displayName}
                />
                <Text fontWeight="medium">{user?.displayName}</Text>
              </HStack>
            </MenuButton>
            <MenuList
              bg="white"
              borderColor="brand.200"
              boxShadow="lg"
            >
              <MenuItem _hover={{ bg: 'brand.50' }}>
                <Box>
                  <Text fontWeight="medium" color="brand.700">{user?.displayName}</Text>
                  <Text fontSize="sm" color="brand.500">
                    {user?.email}
                  </Text>
                </Box>
              </MenuItem>
              <MenuItem 
                onClick={logout} 
                color="red.500"
                _hover={{ bg: 'red.50' }}
              >
                Sign Out
              </MenuItem>
            </MenuList>
          </Menu>
        </HStack>
      </Flex>
    </Box>
  );
};

export default Navbar;
