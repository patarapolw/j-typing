import type { Dict } from './dict';
import type { KanjiResult } from './kanji';
import type { VocabResult } from './vocab';

export const jTyping = {
  filter: {
    kanji: async (dict: Dict): Promise<KanjiResult | null> => {
      const sel = dict.kan.where('misc.grade').belowOrEqual(8);
      const [kanjidic] = await sel
        .offset(Math.random() * (await sel.count()))
        .limit(1)
        .toArray();
      return { kanjidic };
    },
    vocab: async (dict: Dict): Promise<VocabResult | null> => {
      const sel = dict.jfreq.where('zipf').aboveOrEqual(5);
      const [wordfreq] = await sel
        .offset(Math.random() * (await sel.count()))
        .limit(1)
        .toArray();
      if (!wordfreq) return null;

      const jmdict = await dict.voc.where('v').equals(wordfreq.id).toArray();
      if (!jmdict.length) return null;

      return {
        wordfreq,
        jmdict,
      };
    },
  },
};

Object.assign(window, { jTyping });
