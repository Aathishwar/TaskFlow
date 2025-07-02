import { extendTheme } from '@chakra-ui/react';

const theme = extendTheme({
  config: {
    initialColorMode: 'light',
    useSystemColorMode: false,
  },
  colors: {
    brand: {
      50: '#EBF4FF',
      100: '#C3DAFE',
      200: '#A3BFFA',
      300: '#7F9CF5',
      400: '#667EEA',
      500: '#5A67D8',
      600: '#5865F2',
      700: '#4C51BF',
      800: '#434190',
      900: '#3C366B',
    },
    gray: {
      50: '#F7FAFC',
      100: '#EDF2F7',
      200: '#E2E8F0',
      300: '#CBD5E0',
      400: '#A0AEC0',
      500: '#718096',
      600: '#4A5568',
      700: '#2D3748',
      800: '#1A202C',
      900: '#171923',
    },
  },
  fonts: {
    heading: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif",
    body: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif",
  },
  fontSizes: {
    xs: '0.75rem',
    sm: '0.875rem',
    md: '1rem',
    lg: '1.125rem',
    xl: '1.25rem',
    '2xl': '1.5rem',
    '3xl': '1.875rem',
    '4xl': '2.25rem',
    '5xl': '3rem',
    '6xl': '3.75rem',
  },
  components: {
    Button: {
      defaultProps: {
        colorScheme: 'brand',
      },
      variants: {
        solid: {
          bg: 'brand.500',
          color: 'white',
          _hover: {
            bg: 'brand.600',
          },
          _active: {
            bg: 'brand.700',
          },
        },
        outline: {
          borderColor: 'brand.500',
          color: 'brand.500',
          _hover: {
            bg: 'brand.50',
          },
        },
        ghost: {
          color: 'brand.500',
          _hover: {
            bg: 'brand.50',
          },
        },
      },
    },
    Input: {
      defaultProps: {
        focusBorderColor: 'brand.500',
      },
    },
    Textarea: {
      defaultProps: {
        focusBorderColor: 'brand.500',
      },
    },
    Select: {
      defaultProps: {
        focusBorderColor: 'brand.500',
      },
      parts: ['field', 'icon'],
      baseStyle: {
        field: {
          bg: 'white',
          borderColor: 'brand.200',
          _hover: {
            borderColor: 'brand.300',
          },
          _focus: {
            borderColor: 'brand.500',
            boxShadow: '0 0 0 1px #5A67D8',
          },
          option: {
            bg: 'white',
            color: 'brand.700',
            _hover: {
              bg: 'brand.50',
              color: 'brand.800',
            },
            _selected: {
              bg: 'brand.500',
              color: 'white',
            },
          },
        },
      },
    },
    Card: {
      baseStyle: {
        container: {
          bg: 'white',
          boxShadow: 'sm',
          borderRadius: 'lg',
          border: '1px solid',
          borderColor: 'gray.200',
        },
      },
    },
    Menu: {
      parts: ['list', 'item'],
      baseStyle: {
        list: {
          bg: 'white',
          borderColor: 'brand.200',
          boxShadow: 'lg',
          borderRadius: 'md',
        },
        item: {
          color: 'brand.700',
          _hover: {
            bg: 'brand.50',
            color: 'brand.800',
          },
          _focus: {
            bg: 'brand.50',
            color: 'brand.800',
          },
        },
      },
    },
  },
  styles: {
    global: (props: any) => ({
      'html, body': {
        transition: 'background 0.3s, color 0.3s',
      },
      body: {
        bg: props.colorMode === 'dark' ? 'gray.900' : 'gray.50',
        color: props.colorMode === 'dark' ? 'white' : 'gray.800',
      },
    }),
  },
});

export default theme;
