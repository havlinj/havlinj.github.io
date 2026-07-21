export type LayoutNavSection = 'profile' | 'writing' | 'contact';

export type LayoutNavItem = {
  href: string;
  label: string;
  section: LayoutNavSection;
};

export const LAYOUT_NAV_ITEMS: LayoutNavItem[] = [
  { href: '/profile', label: 'Profile', section: 'profile' },
  { href: '/writing', label: 'Writing', section: 'writing' },
  { href: '/contact', label: 'Contact', section: 'contact' },
];
