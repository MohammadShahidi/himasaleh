/** A user has one account and may hold several of these roles (process doc §1). */
export const ROLES = ['personal', 'contractor', 'driver', 'supplier', 'staff'] as const;
export type Role = (typeof ROLES)[number];

/** Roles a user may pick on the public sign-in screen; staff are invited by an admin. */
export const SELF_SIGNUP_ROLES = ['personal', 'contractor', 'driver', 'supplier'] as const satisfies readonly Role[];
export type SelfSignupRole = (typeof SELF_SIGNUP_ROLES)[number];

export const ROLE_LABELS: Record<Role, string> = {
  personal: 'شخصی',
  contractor: 'پیمانکار',
  driver: 'راننده',
  supplier: 'مصالح‌فروش',
  staff: 'مدیریت',
};
