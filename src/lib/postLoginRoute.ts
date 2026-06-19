export function getPostLoginRoute(profile: any): string {
  const role = String(profile?.role || "").toLowerCase();

  if (profile?.isSuperAdmin || role === "superadmin") {
    return "/super-admin";
  }

  if (role === "owner" || role === "admin") {
    return "/admin";
  }

  if (role === "barber" || role === "professional") {
    return "/barber-dashboard";
  }

  return "/client-home";
}
