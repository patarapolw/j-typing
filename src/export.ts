import { Dict, KanEntry } from './dict';
import { VocabResult } from './vocab';

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
    vocab: async (dict: Dict): Promise<VocabResult | null> => {
      const sel = dict.jfreq.where('zipf').aboveOrEqual(5);
      const [wordfreq] = await sel
        .offset(Math.random() * (await sel.count()))
        .limit(1)
        .toArray();
      if (!wordfreq) return null;

      const jmdict = await dict.voc
        .where('v')
        .equals(wordfreq.id)
        .limit(1)
        .toArray();
      if (!jmdict.length) return null;

      return {
        wordfreq,
        jmdict,
      };
    },
  },
};

Object.assign(window, { jTyping });
