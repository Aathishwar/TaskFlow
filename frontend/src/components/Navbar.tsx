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
import { ChevronDownIcon, SettingsIcon } from '@chakra-ui/icons';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import ConnectionStatus from './ConnectionStatus';

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
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
          <ConnectionStatus showMinimal />
          <Menu>
            <MenuButton
              as={Button}
              variant="ghost"
              rightIcon={<ChevronDownIcon />}
              bg={useColorModeValue('transparent', 'gray.700')}
              color={useColorModeValue('brand.600', 'white')}
              _hover={{ 
                bg: useColorModeValue('brand.50', 'brand.600'),
                color: useColorModeValue('brand.600', 'white')
              }}
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
              bg={useColorModeValue('white', 'gray.800')}
              borderColor={useColorModeValue('brand.200', 'gray.600')}
              boxShadow="lg"
            >
              <MenuItem 
                onClick={() => navigate('/profile')}
                bg={useColorModeValue('transparent', 'gray.700')}
                color={useColorModeValue('gray.700', 'white')}
                _hover={{ 
                  bg: useColorModeValue('brand.50', 'brand.600'),
                  color: useColorModeValue('brand.600', 'white')
                }}
              >
                <HStack spacing={2}>
                  <SettingsIcon />
                  <Text>Profile</Text>
                </HStack>
              </MenuItem>
              <MenuItem 
                onClick={logout} 
                bg={useColorModeValue('transparent', 'gray.700')}
                color={useColorModeValue('red.500', 'red.300')}
                _hover={{ 
                  bg: useColorModeValue('red.50', 'red.600'),
                  color: useColorModeValue('red.600', 'white')
                }}
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
