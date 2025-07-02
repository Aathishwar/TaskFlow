import React from 'react';
import { IconButton, useColorMode, useColorModeValue, Box, ScaleFade, Tooltip } from '@chakra-ui/react';
import { SunIcon, MoonIcon } from '@chakra-ui/icons';

const ModeChanger: React.FC = () => {
  const { colorMode, toggleColorMode } = useColorMode();
  const iconColor = useColorModeValue('blue.500', 'yellow.300');
  const bg = useColorModeValue('white', 'gray.800');
  const shadow = useColorModeValue('lg', 'dark-lg');

  return (
    <Box
      position="fixed"
      bottom={{ base: 6, md: 10 }}
      right={{ base: 6, md: 10 }}
      zIndex={9999}
      borderRadius="full"
      boxShadow={shadow}
      bg={bg}
      p={2}
      transition="box-shadow 0.2s"
      _hover={{ boxShadow: '2xl' }}
    >
      <ScaleFade initialScale={0.8} in={true}>
        <Tooltip label={colorMode === 'light' ? 'Switch to dark mode' : 'Switch to light mode'} hasArrow placement="left">
          <IconButton
            aria-label="Toggle color mode"
            icon={colorMode === 'light' ? <MoonIcon boxSize={6} /> : <SunIcon boxSize={6} />}
            onClick={toggleColorMode}
            size="lg"
            variant="ghost"
            color={iconColor}
            bg={bg}
            borderRadius="full"
            _focus={{ boxShadow: 'outline' }}
            _active={{ bg: useColorModeValue('gray.100', 'gray.700') }}
            _hover={{ bg: useColorModeValue('gray.100', 'gray.700'), transform: 'scale(1.1)' }}
            transition="all 0.2s cubic-bezier(0.4, 0, 0.2, 1)"
          />
        </Tooltip>
      </ScaleFade>
    </Box>
  );
};

export default ModeChanger; 