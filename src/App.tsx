import { useEffect } from "react";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { App as CapacitorApp } from '@capacitor/app';
import { supabase } from "@/integrations/supabase/client";
import Login from "./pages/Login";
import SelectBarbershop from "./pages/SelectBarbershop";
import SelectBarber from "./pages/SelectBarber";
import Services from "./pages/Services";
import Booking from "./pages/Booking";
import Admin from "./pages/Admin";
import SuperAdmin from "./pages/SuperAdmin";
import ClientHome from "./pages/ClientHome";
import BarberDashboard from "./pages/BarberDashboard";
import AuthCallback from "./pages/AuthCallback";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import { Toaster } from "sonner";
import { AuthProvider } from "./contexts/AuthContext";
import { PhoneGate } from "./components/PhoneGate";

const router = createBrowserRouter([
  {
    path: "/",
    element: <SelectBarbershop />,
  },
  {
    path: "/barbers",
    element: <SelectBarber />,
  },
  {
    path: "/services",
    element: <Services />,
  },
  {
    path: "/login",
    element: <Login />,
  },
  {
    path: "/booking/:id",
    element: <Booking />,
  },
  {
    path: "/admin",
    element: <Admin />,
  },
  {
    path: "/super-admin",
    element: <SuperAdmin />,
  },
  {
    path: "/client-home",
    element: <ClientHome />,
  },
  {
    path: "/barber-dashboard",
    element: <BarberDashboard />,
  },
  {
    path: "/auth/callback",
    element: <AuthCallback />,
  },
  {
    path: "/forgot-password",
    element: <ForgotPassword />,
  },
  {
    path: "/reset-password",
    element: <ResetPassword />,
  },
]);

function App() {
  useEffect(() => {
    let backHandler: any = null;
    let urlHandler: any = null;

    // Handling Android Back Button
    const setupBackButton = async () => {
      try {
        backHandler = await CapacitorApp.addListener('backButton', ({ canGoBack }) => {
          const protectedRoutes = [
            '/client-home',
            '/admin',
            '/barber-dashboard',
            '/super-admin',
            '/services',
            '/barbers',
            '/booking'
          ];

          const path = window.location.pathname;
          const isProtected = protectedRoutes.some(route =>
            path.startsWith(route)
          );

          if (isProtected || path === '/') {
            if (!canGoBack || path === '/client-home' || path === '/admin' || path === '/barber-dashboard' || path === '/super-admin') {
              return;
            }
          }

          if (canGoBack) {
            window.history.back();
          }
        });
      } catch (e) {
        console.log("Capacitor App plugin not available, skipping back button handler.");
      }
    };

    // Handling App Deep Links (OAuth Callback)
    const setupUrlListener = async () => {
      try {
        urlHandler = await CapacitorApp.addListener('appUrlOpen', async (data) => {
          console.log('App opened with URL:', data.url);
          
          if (data.url.includes('auth/callback')) {
            // Extract the tokens from the URL
            const url = new URL(data.url);
            const params = new URLSearchParams(url.hash.substring(1)); // OAuth tokens are usually in the fragment
            const accessToken = params.get('access_token');
            const refreshToken = params.get('refresh_token');

            if (accessToken && refreshToken) {
              const { error } = await supabase.auth.setSession({
                access_token: accessToken,
                refresh_token: refreshToken,
              });

              if (error) {
                console.error('Error setting session:', error);
              } else {
                // The AuthContext and AuthCallback page will handle the rest
                // We might need to manually trigger a navigation if we're not on the callback page
                if (!window.location.pathname.includes('/auth/callback')) {
                  window.location.href = '/auth/callback' + url.hash;
                }
              }
            }
          }
        });
      } catch (e) {
        console.log("Capacitor App plugin not available, skipping URL listener.");
      }
    };

    setupBackButton();
    setupUrlListener();

    return () => {
      if (backHandler) {
        backHandler.remove();
      }
      if (urlHandler) {
        urlHandler.remove();
      }
    };
  }, []);

  return (
    <AuthProvider>
      <PhoneGate>
        <RouterProvider router={router} />
      </PhoneGate>
      <Toaster position="top-center" richColors />
    </AuthProvider>
  );
}

export default App;
