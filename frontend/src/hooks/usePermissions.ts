import { useAuthStore } from '../stores';

export function usePermissions() {
  const { user } = useAuthStore();

  const hasAccess = (permissions: string[]) => {
    if (!user) return false;
    if (user.role === 'super_admin') return true;
    if (!user.permissions) return false;
    return permissions.some((p) => user.permissions?.includes(p));
  };

  const hasPermission = (permission: string) => {
    if (!user) return false;
    if (user.role === 'super_admin') return true;
    if (!user.permissions) return false;
    return user.permissions.includes(permission);
  };

  return { hasAccess, hasPermission, user };
}
