// Turkish labels for exercise categories and library tags stored in English
// (muscles and equipment go through utils/exerciseTaxonomy.ts).

const CATEGORY: Record<string, string> = {
  strength: 'Kuvvet',
  stretching: 'Esneme',
  plyometrics: 'Pliometrik',
  powerlifting: 'Powerlifting',
  'olympic weightlifting': 'Olimpik Halter',
  strongman: 'Strongman',
  cardio: 'Kardiyo',
  custom: 'Özel',
  general: 'Genel',
};

const TAG: Record<string, string> = {
  public: 'Ortak',
  family: 'Arkadaş',
  private: 'Özel',
  mine: 'Benim',
};

const lookup = (map: Record<string, string>, value?: string | null) =>
  value ? (map[value.trim().toLowerCase()] ?? value) : '';

export const categoryLabel = (value?: string | null) => lookup(CATEGORY, value);
export const tagLabel = (value?: string | null) => lookup(TAG, value);
