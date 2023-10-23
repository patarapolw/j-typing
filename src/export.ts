import type { Collection, IndexableType } from 'dexie';

import { Dict, KanEntry, VocEntry } from './dict';

export const jTyping = {
  filter: {
    kanji: (dict: Dict): Collection<KanEntry, IndexableType> | null => {
      return dict.kan.where('misc.grade').belowOrEqual(9);
    },
    vocab: (dict: Dict): Collection<VocEntry, IndexableType> | null => {
      return dict.voc.toCollection();
    },
  },
};

Object.assign(window, { jTyping });
