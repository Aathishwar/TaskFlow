import ReactDOM from 'react-dom/client'
import { ChakraProvider } from '@chakra-ui/react'
import { BrowserRouter } from 'react-router-dom'
import { ErrorBoundary } from 'react-error-boundary'
import App from './App'
import { AuthProvider } from './contexts/AuthContext'
import { SocketProvider } from './contexts/SocketContext'
import theme from './theme/theme'
import ErrorFallback from './components/ErrorFallback'
import 'react-toastify/dist/ReactToastify.css'
import './config/firebase'; // Import firebase config to ensure initialization

// Register service worker for PWA functionality and caching
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(() => {
        // Service worker registered successfully
      })
      .catch(() => {
        // Service worker registration failed
      });
  });
}

const rootElement = document.getElementById('root');

if (rootElement) {
  try {
    ReactDOM.createRoot(rootElement).render(
      <ErrorBoundary
        FallbackComponent={ErrorFallback}
        onError={(error, errorInfo) => {
          console.error('App crashed:', error, errorInfo);
        }}
      >
        <ChakraProvider theme={theme}>
          <BrowserRouter future={{ 
            v7_startTransition: true,
            v7_relativeSplatPath: true
          }}>
            <AuthProvider>
              <SocketProvider>
                <App />
              </SocketProvider>
            </AuthProvider>
          </BrowserRouter>
        </ChakraProvider>
      </ErrorBoundary>
      );
    } catch (error) {
      console.error('Failed to render React app:', error);
    }
  } else {
    console.error('Root element not found');
  }
