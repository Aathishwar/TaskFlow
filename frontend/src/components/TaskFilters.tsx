import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Box,
  HStack,
  VStack,
  Input,
  InputGroup,
  InputLeftElement,
  InputRightElement,
  Text,
  Badge,
  Spinner,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  Button,
  useColorModeValue,
} from '@chakra-ui/react';
import { SearchIcon, ChevronDownIcon } from '@chakra-ui/icons';
import { TaskFilters as TaskFiltersType, Task } from '../types';

interface TaskFiltersProps {
  filters: TaskFiltersType;
  onFiltersChange: (filters: TaskFiltersType) => void;
  tasks: Task[];
  isDeletionInProgress?: boolean;
}

const TaskFilters: React.FC<TaskFiltersProps> = ({ filters, onFiltersChange, tasks, isDeletionInProgress = false }) => {
  const [searchValue, setSearchValue] = useState(filters.search || '');
  const [isSearching, setIsSearching] = useState(false);
  const [lastSearchTerm, setLastSearchTerm] = useState(filters.search || '');
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Cancel any pending search
  const cancelPendingSearch = useCallback(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
      searchTimeoutRef.current = null;
    }
  }, []);

  // Smart search handler with timeout management
  const performSearch = useCallback((searchTerm: string, delay: number = 400) => {
    // Cancel any existing timeout
    cancelPendingSearch();
    
    // Don't make API call if search term hasn't actually changed
    if (searchTerm === lastSearchTerm) {
      console.log('Search skipped - term unchanged:', searchTerm);
      setIsSearching(false);
      return;
    }

    console.log('Scheduling search for:', searchTerm, 'with delay:', delay);
    searchTimeoutRef.current = setTimeout(() => {
      try {
        const newFilters = { ...filters };
        
        if (searchTerm === '') {
          delete newFilters.search;
        } else {
          newFilters.search = searchTerm;
        }
        
        setLastSearchTerm(searchTerm);
        console.log('Executing search with filters:', newFilters);
        onFiltersChange(newFilters);
        setIsSearching(false);
        searchTimeoutRef.current = null;
      } catch (error) {
        console.error('Error in search execution:', error);
        setIsSearching(false);
        searchTimeoutRef.current = null;
      }
    }, delay);
  }, [filters, onFiltersChange, lastSearchTerm, cancelPendingSearch]);

  // Update search value and trigger appropriate search
  const handleSearchChange = (value: string) => {
    try {
      const previousLength = searchValue.length;
      const isDeleting = value.length < previousLength;
      const isDeletingMultiple = previousLength - value.length > 1; // Detect bulk deletions (ctrl+backspace, select+delete)
      
      console.log('Search change:', { value, previousLength, isDeleting, isDeletingMultiple });
      setSearchValue(value);
      
      // Don't trigger search if deletion is in progress
      if (isDeletionInProgress) {
        console.log('Search blocked - deletion in progress');
        return;
      }
      
      // If clearing search completely, apply immediately without debounce
      if (value === '') {
        cancelPendingSearch();
        setIsSearching(false);
        const newFilters = { ...filters };
        delete newFilters.search;
        setLastSearchTerm('');
        console.log('Search cleared immediately');
        onFiltersChange(newFilters);
        return;
      }
      
      // If bulk deletion (like ctrl+backspace or select+delete), apply immediately
      if (isDeletingMultiple) {
        cancelPendingSearch();
        setIsSearching(false);
        const newFilters = { ...filters };
        newFilters.search = value;
        setLastSearchTerm(value);
        console.log('Bulk deletion search applied immediately:', value);
        onFiltersChange(newFilters);
        return;
      }
      
      // For character-by-character deletion, use longer delay to prevent excessive API calls
      if (isDeleting) {
        setIsSearching(true);
        console.log('Character deletion search with delay:', value);
        performSearch(value, 800); // Much longer delay for deletions
      } else {
        // For typing, use normal delay
        setIsSearching(true);
        console.log('Typing search with delay:', value);
        performSearch(value, 400);
      }
    } catch (error) {
      console.error('Error in handleSearchChange:', error);
      setIsSearching(false);
    }
  };

  // Sync local search state with external filters
  useEffect(() => {
    setSearchValue(filters.search || '');
    setLastSearchTerm(filters.search || '');
  }, [filters.search]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      cancelPendingSearch();
    };
  }, [cancelPendingSearch]);

  const handleFilterChange = (field: string, value: string) => {
    const newFilters = { ...filters };
    
    if (value === '') {
      delete newFilters[field as keyof TaskFiltersType];
    } else {
      (newFilters as any)[field] = value;
    }
    
    onFiltersChange(newFilters);
  };

  const getActiveFiltersCount = () => {
    return Object.keys(filters).length;
  };

  const getInProgressCount = () => {
    return tasks.filter(task => task.status === 'in-progress').length;
  };

  // Color mode values
  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');
  const textColor = useColorModeValue('gray.700', 'gray.200');
  const mutedTextColor = useColorModeValue('gray.600', 'gray.400');
  const inputBg = useColorModeValue('white', 'gray.700');
  const inputBorderColor = useColorModeValue('blue.200', 'blue.600');
  const inputFocusBorderColor = useColorModeValue('blue.400', 'blue.400');
  const menuBg = useColorModeValue('white', 'gray.800');
  const menuItemHoverBg = useColorModeValue('#DBEAFE', 'blue.900');
  const menuItemHoverColor = useColorModeValue('#1E40AF', 'blue.200');

  return (
    <Box 
      bg={bgColor} 
      p={4} 
      borderRadius="lg" 
      border="1px solid" 
      borderColor={borderColor}
      position="relative"
      zIndex={100}
      boxShadow="sm"
    >
      <VStack spacing={4} align="stretch">
        <HStack justify="space-between" align="center">
          <Text fontWeight="medium" color={textColor}>
            Filters
          </Text>
          <HStack spacing={3}>
            {/* Active Tasks Counter */}
            <Badge colorScheme="blue" variant="subtle" fontSize="sm">
              {getInProgressCount()} active
            </Badge>
            {/* Active Filters Counter */}
            {getActiveFiltersCount() > 0 && (
              <Badge colorScheme="brand" variant="subtle">
                {getActiveFiltersCount()} filter{getActiveFiltersCount() > 1 ? 's' : ''}
              </Badge>
            )}
          </HStack>
        </HStack>

        <HStack spacing={4} align="end" wrap="wrap">
          {/* Search */}
          <Box minW="200px">
            <Text fontSize="sm" color={mutedTextColor} mb={1}>
              Search
            </Text>
            <InputGroup>
              <InputLeftElement pointerEvents="none">
                <SearchIcon color="blue.400" />
              </InputLeftElement>
              <Input
                placeholder="Search tasks..."
                value={searchValue}
                onChange={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleSearchChange(e.target.value);
                }}
                onKeyDown={(e) => {
                  // Prevent ALL form-related key events
                  if (e.key === 'Enter' || e.key === 'Escape') {
                    e.preventDefault();
                    e.stopPropagation();
                    return false;
                  }
                }}
                onKeyPress={(e) => {
                  // Prevent any key press from triggering form submission
                  e.stopPropagation();
                }}
                onKeyUp={(e) => {
                  // Prevent any key up from triggering form submission
                  e.stopPropagation();
                }}
                onSubmit={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  return false;
                }}
                isDisabled={isDeletionInProgress}
                bg={inputBg}
                borderColor={inputBorderColor}
                focusBorderColor={inputFocusBorderColor}
                _hover={{
                  borderColor: useColorModeValue('blue.300', 'blue.500')
                }}
                _focus={{
                  borderColor: inputFocusBorderColor,
                  boxShadow: '0 0 0 1px #60A5FA'
                }}
              />
              {isSearching && (
                <InputRightElement>
                  <Spinner size="sm" color="gray.400" />
                </InputRightElement>
              )}
            </InputGroup>
          </Box>

          {/* Status Filter */}
          <Box minW="150px" position="relative" zIndex={200}>
            <Text fontSize="sm" color={mutedTextColor} mb={1}>
              Status
            </Text>
            <Menu>
              <MenuButton
                as={Button}
                rightIcon={<ChevronDownIcon />}
                w="100%"
                textAlign="left"
                fontWeight="normal"
                bg={inputBg}
                border="1px solid"
                borderColor={inputBorderColor}
                color={textColor}
                _hover={{
                  borderColor: useColorModeValue('blue.300', 'blue.500'),
                  bg: useColorModeValue('blue.50', 'blue.900')
                }}
                _focus={{
                  borderColor: inputFocusBorderColor,
                  boxShadow: '0 0 0 1px #60A5FA',
                  bg: useColorModeValue('blue.50', 'blue.900')
                }}
                _active={{
                  bg: useColorModeValue('blue.50', 'blue.900')
                }}
              >
                {filters.status ? 
                  filters.status === 'in-progress' ? 'In Progress' : 
                  filters.status.charAt(0).toUpperCase() + filters.status.slice(1)
                  : 'All Status'
                }
              </MenuButton>
              <MenuList
                bg={menuBg}
                border="1px solid"
                borderColor={inputBorderColor}
                boxShadow="lg"
                minW="150px"
              >
                <MenuItem
                  onClick={() => handleFilterChange('status', '')}
                  bg={menuBg}
                  _hover={{
                    bg: menuItemHoverBg,
                    color: menuItemHoverColor
                  }}
                  _focus={{
                    bg: menuItemHoverBg,
                    color: menuItemHoverColor
                  }}
                  fontWeight="400"
                  color={mutedTextColor}
                >
                  All Status
                </MenuItem>
                <MenuItem
                  onClick={() => handleFilterChange('status', 'pending')}
                  bg={menuBg}
                  _hover={{
                    bg: menuItemHoverBg,
                    color: menuItemHoverColor
                  }}
                  _focus={{
                    bg: menuItemHoverBg,
                    color: menuItemHoverColor
                  }}
                  fontWeight="400"
                  color={mutedTextColor}
                >
                  Pending
                </MenuItem>
                <MenuItem
                  onClick={() => handleFilterChange('status', 'in-progress')}
                  bg={menuBg}
                  _hover={{
                    bg: menuItemHoverBg,
                    color: menuItemHoverColor
                  }}
                  _focus={{
                    bg: menuItemHoverBg,
                    color: menuItemHoverColor
                  }}
                  fontWeight="400"
                  color={mutedTextColor}
                >
                  In Progress
                </MenuItem>
                <MenuItem
                  onClick={() => handleFilterChange('status', 'completed')}
                  bg={menuBg}
                  _hover={{
                    bg: menuItemHoverBg,
                    color: menuItemHoverColor
                  }}
                  _focus={{
                    bg: menuItemHoverBg,
                    color: menuItemHoverColor
                  }}
                  fontWeight="400"
                  color={mutedTextColor}
                >
                  Completed
                </MenuItem>
              </MenuList>
            </Menu>
          </Box>

          {/* Priority Filter */}
          <Box minW="150px" position="relative" zIndex={200}>
            <Text fontSize="sm" color={mutedTextColor} mb={1}>
              Priority
            </Text>
            <Menu>
              <MenuButton
                as={Button}
                rightIcon={<ChevronDownIcon />}
                w="100%"
                textAlign="left"
                fontWeight="normal"
                bg={inputBg}
                border="1px solid"
                borderColor={inputBorderColor}
                color={textColor}
                _hover={{
                  borderColor: useColorModeValue('blue.300', 'blue.500'),
                  bg: useColorModeValue('blue.50', 'blue.900')
                }}
                _focus={{
                  borderColor: inputFocusBorderColor,
                  boxShadow: '0 0 0 1px #60A5FA',
                  bg: useColorModeValue('blue.50', 'blue.900')
                }}
                _active={{
                  bg: useColorModeValue('blue.50', 'blue.900')
                }}
              >
                {filters.priority ? 
                  filters.priority.charAt(0).toUpperCase() + filters.priority.slice(1)
                  : 'All Priority'
                }
              </MenuButton>
              <MenuList
                bg={menuBg}
                border="1px solid"
                borderColor={inputBorderColor}
                boxShadow="lg"
                minW="150px"
              >
                <MenuItem
                  onClick={() => handleFilterChange('priority', '')}
                  bg={menuBg}
                  _hover={{
                    bg: menuItemHoverBg,
                    color: menuItemHoverColor
                  }}
                  _focus={{
                    bg: menuItemHoverBg,
                    color: menuItemHoverColor
                  }}
                  fontWeight="400"
                  color={mutedTextColor}
                >
                  All Priority
                </MenuItem>
                <MenuItem
                  onClick={() => handleFilterChange('priority', 'low')}
                  bg={menuBg}
                  _hover={{
                    bg: menuItemHoverBg,
                    color: menuItemHoverColor
                  }}
                  _focus={{
                    bg: menuItemHoverBg,
                    color: menuItemHoverColor
                  }}
                  fontWeight="400"
                  color={mutedTextColor}
                >
                  Low
                </MenuItem>
                <MenuItem
                  onClick={() => handleFilterChange('priority', 'medium')}
                  bg={menuBg}
                  _hover={{
                    bg: menuItemHoverBg,
                    color: menuItemHoverColor
                  }}
                  _focus={{
                    bg: menuItemHoverBg,
                    color: menuItemHoverColor
                  }}
                  fontWeight="400"
                  color={mutedTextColor}
                >
                  Medium
                </MenuItem>
                <MenuItem
                  onClick={() => handleFilterChange('priority', 'high')}
                  bg={menuBg}
                  _hover={{
                    bg: menuItemHoverBg,
                    color: menuItemHoverColor
                  }}
                  _focus={{
                    bg: menuItemHoverBg,
                    color: menuItemHoverColor
                  }}
                  fontWeight="400"
                  color={mutedTextColor}
                >
                  High
                </MenuItem>
              </MenuList>
            </Menu>
          </Box>
        </HStack>
      </VStack>
    </Box>
  );
};

export default React.memo(TaskFilters);
