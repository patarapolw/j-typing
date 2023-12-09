import { diffChars } from 'diff';
import * as wanakana from 'wanakana';
import yaml from 'yaml';

import { JMdictGloss, JMdictKana } from '@scriptin/jmdict-simplified-types';

import { jTyping } from './export';
import { Elem } from './html';
import { getDiffSize } from './shared';

import type { BodyEl } from './loader';
import type { Dict, FreqEntry, VocEntry } from './dict';

export interface VocabResult {
  wordfreq?: FreqEntry;
  jmdict: VocEntry[];
}

export async function loadVocab(body: BodyEl, dict: Dict) {
  body.loadNext = () => loadVocab(body, dict);

  let entry0 = await jTyping?.filter?.vocab?.(dict);

  if (!entry0) {
    const sel = dict.voc;
    const jmdict = await sel
      .offset(Math.random() * (await sel.count()))
      .limit(1)
      .toArray();
    if (jmdict.length) {
      entry0 = { jmdict };
    }
  }

  body.stype = 'Vocabulary';
  body.qtype = 'Reading';
  body.result = '';

  if (!entry0) return;
  const entry = entry0;

  body.displayEl.apply((el) => {
    el.classList.remove('loading', 'kanji');
    el.classList.add('vocab');

    if (entry.wordfreq) {
      el.innerText = entry.wordfreq.id;
    } else {
      let kCommon = entry.jmdict.flatMap((et) => et.v);
      if (!kCommon.length) {
        kCommon = entry.jmdict.flatMap((et) => et.kana.map((k) => k.text));
      }

      el.innerText = kCommon[Math.floor(Math.random() * kCommon.length)];
    }
  });

  body.onsubmit = (ev, answers) => {
    const summary = vocabChecker(answers, entry, body);

    if ((body.result as string) !== 'retry') {
      body.resultEl.append(
        ...summary,
        new Elem('br'),
        new Elem('details').append(
          new Elem('summary')
            .attr({ style: 'cursor: pointer' })
            .innerText('Full entry'),
          new Elem('code', 'full-entry').append(
            new Elem('pre', 'no-scroll').innerText(
              yaml.stringify(
                {
                  ...entry,
                  jmdict: entry.jmdict.map(({ v, ...et }) => et),
                },
                (k, v) => {
                  if (Array.isArray(v)) {
                    if (!v.length) return;
                    if (v[0] === '*') return;
                  }
                  if (v === null) return;
                  return v;
                },
              ),
            ),
          ),
        ),
      );
    }
  };
}

interface VocabKey {
  el: Elem;
  kana?: JMdictKana;
  gloss?: JMdictGloss;
}

function vocabChecker(answers: string[], entry: VocabResult, body: BodyEl) {
  const summary: Elem[] = [];

  const isMulti = entry.jmdict.length > 1;
  const keys: VocabKey[] = [];

  entry.jmdict.map((et, i) => {
    if (body.qtype !== 'Reading' && i) {
      summary.push(new Elem('br'));
    }

    if (body.qtype === 'Reading' || isMulti) {
      const line = new Elem('div');
      summary.push(line);
      const subs: Elem[] = [];

      et.kana.map((kana) => {
        const el = new Elem('span');
        el.innerText(kana.text);
        keys.push({ el, kana });

        if (kana.common) {
          subs.push(el);
        }
      });

      const last = subs.pop();
      if (last) {
        subs.map((s) => {
          line.append(s, ', ');
        });
        line.append(last);
      }
    }

    if (body.qtype !== 'Reading') {
      et.sense.map((s, i) => {
        summary.push(
          new Elem('div').append(
            new Elem('b').innerText(i + 1 + '. '),
            new Elem('span').innerText(s.gloss.map((m) => m.text).join('; ')),
          ),
        );
      });
    }
  });

  if (!answers.length) {
    body.result = 'manual';
    return summary;
  }

  let totalMinDiff = -1;

  answers.map((ans, i) => {
    if (body.qtype === 'Reading') {
      ans = wanakana.toKatakana(ans);

      const keys = entry.jmdict.flatMap((et) => et.kana);
      const diffs = keys.map((r) =>
        diffChars(wanakana.toKatakana(r.text), ans),
      );
      const diffSizes = diffs.map((d) => getDiffSize(d));
      const minDiff = Math.min(...diffSizes);

      keys.map((r, i) => {
        if (diffSizes[i] === minDiff) {
        }
      });

      for (const r of entry.jmdict.flatMap((et) => et.kana)) {
        if (wanakana.toKatakana(r.text) === ans) {
          if (
            r.appliesToKanji[0] !== '*' &&
            !r.appliesToKanji.includes(body.displayEl.el.innerText)
          ) {
            return false;
          }

          if (!r.common) {
            body.result = 'manual';
            continue;
          }

          answers[i] = r.text;
          return true;
        }
      }
    } else {
      for (const r of entry.jmdict.flatMap((et) => et.sense)) {
        if (
          r.appliesToKanji[0] !== '*' &&
          !r.appliesToKanji.includes(body.displayEl.el.innerText)
        ) {
          continue;
        }
        for (const g of r.gloss) {
          if (g.text === ans) {
            return true;
          }
        }
      }
    }
  });

  if (
    answers.every((ans, i) => {
      if (body.qtype === 'Reading') {
        ans = wanakana.toKatakana(ans);
        for (const r of entry.jmdict.flatMap((et) => et.kana)) {
          if (wanakana.toKatakana(r.text) === ans) {
            if (
              r.appliesToKanji[0] !== '*' &&
              !r.appliesToKanji.includes(body.displayEl.el.innerText)
            ) {
              return false;
            }

            if (!r.common) {
              body.result = 'manual';
              continue;
            }

            answers[i] = r.text;
            return true;
          }
        }
      } else {
        for (const r of entry.jmdict.flatMap((et) => et.sense)) {
          if (
            r.appliesToKanji[0] !== '*' &&
            !r.appliesToKanji.includes(body.displayEl.el.innerText)
          ) {
            continue;
          }
          for (const g of r.gloss) {
            if (g.text === ans) {
              return true;
            }
          }
        }
      }
    })
  ) {
    body.result = 'correct';
  }

  return summary;
}
