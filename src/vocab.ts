import * as wanakana from 'wanakana';
import yaml from 'yaml';

import { JMdictWord } from '@scriptin/jmdict-simplified-types';

import { Dict } from './dict';
import { jTyping } from './export';
import { Elem } from './html';
import { BodyEl } from './loader';

export async function loadVocab(body: BodyEl, dict: Dict) {
  body.loadNext = () => loadVocab(body, dict);

  const sel = jTyping?.filter?.vocab?.(dict) || dict.voc;

  const [entry] = await sel
    .offset(Math.random() * (await sel.count()))
    .limit(1)
    .toArray();

  body.stype = 'Vocabulary';
  body.qtype = 'Reading';
  body.result = '';

  body.displayEl.apply((el) => {
    el.classList.remove('loading');
    el.lang = 'ja';
    el.style.fontSize = '6em';

    let kCommon = entry.kanji.filter((k) => k.common);
    if (!kCommon.length) {
      kCommon = entry.kana.filter((k) => k.common);
    }

    el.innerText = kCommon[Math.floor(Math.random() * kCommon.length)].text;
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
            new Elem('pre').innerText(yaml.stringify(entry)),
          ),
        ),
      );
    }
  };
}

function vocabChecker(answers: string[], entry: JMdictWord, body: BodyEl) {
  if (!answers.length) {
    body.result = 'manual';
    return;
  }

  if (
    answers.every((ans, i) => {
      if (body.qtype === 'Reading') {
        ans = wanakana.toKatakana(ans);
        for (const r of entry.kana) {
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
        for (const r of entry.sense) {
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

function vocabMakeSummary(body: BodyEl, entry: JMdictWord) {
  const out: Elem[] = [];

  if (body.qtype === 'Reading') {
    out.push(
      new Elem('div').innerText(
        entry.kana
          .filter((k) => k.common)
          .map((k) => k.text)
          .join(', '),
      ),
    );
  } else {
    entry.sense.map((s, i) => {
      out.push(
        new Elem('div').append(
          new Elem('b').innerText(i + 1 + '. '),
          new Elem('span').innerText(s.gloss.map((m) => m.text).join('; ')),
        ),
      );
    });
  }

  return out;
}
