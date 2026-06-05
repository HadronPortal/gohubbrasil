import { useEffect } from "react";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { App as CapacitorApp } from '@capacitor/app';
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
    let handler: any = null;

    // Handling Android Back Button
    const setupBackButton = async () => {
      try {
        handler = await CapacitorApp.addListener('backButton', ({ canGoBack }) => {
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

    setupBackButton();

    return () => {
      if (handler) {
        handler.remove();
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
