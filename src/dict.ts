import type {
  JMdict,
  JMdictWord,
  Kanjidic2,
  Kanjidic2Character,
} from '@scriptin/jmdict-simplified-types';
import Dexie, { Table } from 'dexie';

export type KanEntry = Kanjidic2Character;

export type VocEntry = JMdictWord;

export class Dict extends Dexie {
  kan!: Table<KanEntry>;
  voc!: Table<VocEntry, string>;

  constructor() {
    super('Dict');
    this.version(2).stores({
      kan: '++id,literal,misc.grade,misc.jlptLevel,misc.frequency',
      voc: 'id',
    });
  }

  async load() {
    if ((await this.voc.count()) === 0) {
      await this.voc.bulkPut(
        (
          (await import('../assets/jmdict-eng-common-3.5.0.json'))
            .default as JMdict
        ).words,
      );
    }

    if ((await this.kan.count()) === 0) {
      await this.kan.bulkPut(
        (
          (await import('../assets/kanjidic2-en-3.5.0.json'))
            .default as Kanjidic2
        ).characters,
      );
    }
  }
}
