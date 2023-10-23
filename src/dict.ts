import type {
  JMdict,
  JMdictWord,
  Kanjidic2,
  Kanjidic2Character,
} from '@scriptin/jmdict-simplified-types';
import Dexie, { Table } from 'dexie';

export type SubjectType = 'Kanji' | 'Vocabulary';

export type KanEntry = Kanjidic2Character;
export type VocEntry = JMdictWord & {
  v: string[];
};
export type FreqEntry = {
  id: string;
  zipf: number;
};

export class Dict extends Dexie {
  kan!: Table<KanEntry>;
  voc!: Table<VocEntry, string>;
  jfreq!: Table<FreqEntry, string>;

  constructor() {
    super('Dict');
    this.version(6)
      .stores({
        kan: '++id,literal,misc.grade,misc.jlptLevel,misc.frequency',
        voc: 'id,*v',
        jfreq: 'id,zipf',
      })
      .upgrade((tx) => {
        tx.table('voc')
          .toCollection()
          .modify((voc: VocEntry) => {
            if (voc.v) return;
            voc.v = voc.kanji.filter((k) => k.common).map((k) => k.text);
          });
        tx.table('jfreq')
          .toCollection()
          .modify((jfreq) => {
            if (!jfreq.f) return;
            if (!jfreq.zipf) {
              jfreq.zipf = jfreq.f;
            }
            delete jfreq.f;
          });
      });
  }

  async load() {
    if ((await this.voc.count()) === 0) {
      await this.voc.bulkPut(
        (
          (await fetch('./jmdict-eng-common-3.5.0.json').then((r) =>
            r.json(),
          )) as JMdict
        ).words.map((w) => ({
          ...w,
          v: w.kanji.filter((k) => k.common).map((k) => k.text),
        })),
      );
    }

    if ((await this.kan.count()) === 0) {
      await this.kan.bulkPut(
        (
          (await fetch('./kanjidic2-en-3.5.0.json').then((r) =>
            r.json(),
          )) as Kanjidic2
        ).characters,
      );
    }

    if ((await this.jfreq.count()) === 0) {
      await this.jfreq.bulkPut(
        Object.entries(
          (await import('../assets/ja_freq.json')).default.common,
        ).map(([id, zipf]) => ({ id, zipf })),
      );
    }
  }
}
