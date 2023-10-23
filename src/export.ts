import type { Collection, IndexableType } from 'dexie';

import { Dict, JFreqEntry, KanEntry, VocEntry } from './dict';

export const jTyping = {
  filter: {
    kanji: async (dict: Dict): Promise<KanEntry | null> => {
      const sel = dict.kan.where('misc.grade').belowOrEqual(9);
      const [entry] = await sel
        .offset(Math.random() * (await sel.count()))
        .limit(1)
        .toArray();
      return entry;
    },
    vocab: async (
      dict: Dict,
    ): Promise<(VocEntry & { wordfreq?: JFreqEntry }) | null> => {
      const sel = dict.jfreq.where('f').aboveOrEqual(1);
      const [wordfreq] = await sel
        .offset(Math.random() * (await sel.count()))
        .limit(1)
        .toArray();
      if (!wordfreq) return null;

      const [entry] = await dict.voc
        .where('v')
        .equals(wordfreq.id)
        .limit(1)
        .toArray();

      return {
        ...entry,
        wordfreq,
      };
    },
  },
};

Object.assign(window, { jTyping });
