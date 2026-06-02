import { createBrowserRouter, RouterProvider } from "react-router-dom";
import Login from "./pages/Login";
import SelectBarbershop from "./pages/SelectBarbershop";
import SelectBarber from "./pages/SelectBarber";
import Services from "./pages/Services";
import Booking from "./pages/Booking";
import Admin from "./pages/Admin";
import { Toaster } from "sonner";
import { AuthProvider } from "./contexts/AuthContext";

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
]);

function App() {
  return (
    <AuthProvider>
      <RouterProvider router={router} />
      <Toaster position="top-center" richColors />
    </AuthProvider>
  );
}

export default App;
