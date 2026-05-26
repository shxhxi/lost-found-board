export const ITEM_CATEGORIES = [
  'Electronics',
  'Keys',
  'Wallet / ID',
  'Bag',
  'Clothing',
  'Jewelry',
  'Pets',
  'Documents',
  'Other',
] as const;

export const ITEM_TYPES = ['lost', 'found'] as const;

export const EAST_BAY_SERVICE_AREA = {
  Martinez: ['94553'],
  Concord: ['94518', '94519', '94520', '94521'],
  'Pleasant Hill': ['94523'],
  'Walnut Creek': ['94595', '94596', '94597', '94598'],
  Lafayette: ['94549'],
  Orinda: ['94563'],
  Clayton: ['94517'],
  Pittsburg: ['94565'],
  Antioch: ['94509', '94531'],
  Brentwood: ['94513'],
} as const;

export const EAST_BAY_CITIES = Object.keys(
  EAST_BAY_SERVICE_AREA
) as Array<keyof typeof EAST_BAY_SERVICE_AREA>;

export function getZipOptionsForCity(city: string) {
  if (!city || !(city in EAST_BAY_SERVICE_AREA)) {
    return [];
  }

  return [...EAST_BAY_SERVICE_AREA[city as keyof typeof EAST_BAY_SERVICE_AREA]];
}

export const MAX_IMAGE_SIZE = 2 * 1024 * 1024;

export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export const FIELD_CLASS =
  'w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100';