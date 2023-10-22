import * as wanakana from 'wanakana';
import yaml from 'yaml';

import { Kanjidic2Character } from '@scriptin/jmdict-simplified-types';

import { Dict } from './dict';
import { Elem } from './html';
import { BodyEl } from './loader';

export async function loadKanji(body: BodyEl, dict: Dict) {
  body.loadNext = () => loadKanji(body, dict);

  const sel = dict.kan.where('misc.grade').belowOrEqual(9);
  const [entry] = await sel
    .offset(Math.random() * (await sel.count()))
    .limit(1)
    .toArray();

  body.stype = 'Kanji';
  body.qtype = 'Reading';
  body.result = '';

  body.displayEl.apply((el) => {
    el.classList.remove('loading');
    el.lang = 'ja';
    el.style.fontSize = '10em';
    el.innerText = entry.literal;
  });

  body.onsubmit = (ev, answers) => {
    kanjiChecker(answers, entry, body);

    if ((body.result as string) !== 'retry') {
      body.resultEl.append(
        ...kanjiMakeSummary(body, entry),
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

function kanjiChecker(
  answers: string[],
  { readingMeaning }: Kanjidic2Character,
  body: BodyEl,
) {
  if (!answers.length || !readingMeaning) {
    body.result = 'manual';
    return;
  }

  if (
    answers.every((ans, i) => {
      for (const g of readingMeaning.groups) {
        if (body.qtype === 'Reading') {
          for (const r of g.readings) {
            if (r.type === 'ja_on') {
              const answerKata = wanakana.toKatakana(ans);
              if (r.value === answerKata) {
                answers[i] = answerKata;
                return true;
              }
            } else if (r.type === 'ja_kun') {
              if (r.value.split('.')[0] === ans) {
                return true;
              } else if (r.value === ans) {
                body.result = 'manual';
              }
            }
          }
        } else {
          for (const m of g.meanings) {
            if (m.value.toLocaleLowerCase() === ans) {
              return true;
            }
          }
        }
      }

      if (body.qtype === 'Reading') {
        for (const r of readingMeaning.nanori) {
          if (r === ans) {
            return true;
          }
        }
      }

      return false;
    })
  ) {
    body.result = 'correct';
  }
}

function kanjiMakeSummary(
  body: BodyEl,
  { readingMeaning }: Kanjidic2Character,
) {
  if (!readingMeaning) {
    return [new Elem('br')];
  }
  const out: Elem[] = [];

  readingMeaning.groups.map((g, i) => {
    if (i) {
      out.push(new Elem('br'));
    }

    if (body.qtype === 'Reading') {
      const readings: Record<string, string[]> = {};
      for (const r of g.readings) {
        const prev = readings[r.type] || [];
        prev.push(r.value);
        readings[r.type] = prev;
      }

      {
        const k = 'ja_on';
        const rs = readings[k];
        if (rs) {
          const rEl = new Elem('div')
            .attr({ style: 'flex-grow: 1' })
            .append(new Elem('b').innerText('Onyomi: '));
          let r = '';
          while ((r = rs.shift() || '')) {
            rEl.append(r);
            if (rs.length) {
              rEl.append(', ');
            }
          }
          out.push(rEl);
          delete readings[k];
        }
      }

      {
        const k = 'ja_kun';
        const rs = readings[k];
        if (rs) {
          const rEl = new Elem('div')
            .attr({ style: 'flex-grow: 1' })
            .append(new Elem('b').innerText('Kunyomi: '));
          let r = '';
          while ((r = rs.shift() || '')) {
            rEl.append(
              ...r
                .split('.')
                .map((s, i) =>
                  new Elem('span', i % 2 ? 'okurigana' : '').innerText(s),
                ),
            );
            if (rs.length) {
              rEl.append(', ');
            }
          }
          out.push(rEl);
          delete readings[k];
        }
      }

      return;
    }

    out.push(
      new Elem('div').append(
        new Elem('b').innerText(i + 1 + '. '),
        new Elem('span').innerText(g.meanings.map((m) => m.value).join('; ')),
      ),
    );
  });

  if (body.qtype === 'Reading') {
    if (readingMeaning.nanori.length) {
      out.push(
        new Elem('div')
          .attr({ style: 'flex-grow: 1' })
          .append(
            new Elem('b').innerText('Nanori: '),
            new Elem('span').innerText(readingMeaning.nanori.join(', ')),
          ),
      );
    }
  }

  return out;
}
