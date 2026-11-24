import type { Category } from '../data/types';

/** Turkum ranglari — to'q fonda yaxshi ko'rinadigan, bir-biridan oson ajraladigan ranglar */
export const CATEGORY_COLOR: Record<Category, string> = {
  historic: '#e2a63b', // oltin — tarixiy obida
  museum: '#b69cff', // binafsha — muzey
  religious: '#1fb5c4', // turkuaz — diniy ziyoratgoh
  nature: '#5fd38d', // yashil — tabiat
  modern: '#ff7eb6', // pushti — zamonaviy markaz
  city: '#6fa8ff', // osmon ko'k — shahar
};

export const CATEGORY_ICON: Record<Category, string> = {
  historic: 'M4 20h16M6 20V10M10 20V10M14 20V10M18 20V10M3 10l9-6 9 6z',
  museum: 'M3 21h18M4 10h16M12 3l9 5H3zM6 10v8M10 10v8M14 10v8M18 10v8',
  religious: 'M12 3a5 5 0 0 0 0 10 4 4 0 0 1 0-10zM6 21V13h12v8M4 21h16M12 13v-2',
  nature: 'M3 20l6-10 4 6 3-4 5 8z',
  modern: 'M9 21V5l3-2 3 2v16M5 21V11h4M15 21v-8h4v8M3 21h18',
  city: 'M3 21h18M5 21V8l5-3v16M10 21V10h9v11M13 13h3M13 16h3',
};
