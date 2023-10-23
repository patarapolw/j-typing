import * as wanakana from 'wanakana';
import yaml from 'yaml';

import { jTyping } from './export';
import { Elem } from './html';

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
    el.classList.remove('loading');
    el.lang = 'ja';
    el.style.fontSize = '6em';

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
    vocabChecker(answers, entry, body);

    if ((body.result as string) !== 'retry') {
      body.resultEl.append(
        ...vocabMakeSummary(body, entry),
        new Elem('br'),
        new Elem('details').append(
          new Elem('summary')
            .attr({ style: 'cursor: pointer' })
            .innerText('Full entry'),
          new Elem('code').append(
            new Elem('pre').innerText(
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

function vocabChecker(answers: string[], entry: VocabResult, body: BodyEl) {
  if (!answers.length) {
    body.result = 'manual';
    return;
  }

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
}

function vocabMakeSummary(body: BodyEl, entry: VocabResult) {
  const out: Elem[] = [];

  entry.jmdict.map((et, i) => {
    if (body.qtype === 'Reading') {
      out.push(
        new Elem('div').innerText(
          et.kana
            .filter((k) => k.common)
            .map((k) => k.text)
            .join(', '),
        ),
      );
    } else {
      if (i) out.push(new Elem('br'));

      et.sense.map((s, i) => {
        out.push(
          new Elem('div').append(
            new Elem('b').innerText(i + 1 + '. '),
            new Elem('span').innerText(s.gloss.map((m) => m.text).join('; ')),
          ),
        );
      });
    }
  });

  return out;
}
