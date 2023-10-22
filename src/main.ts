import './style.css';

import * as wanakana from 'wanakana';
import yaml from 'yaml';

import { Kanjidic2Character } from '@scriptin/jmdict-simplified-types';

import { Dict } from './dict.ts';
import { Elem } from './html.ts';

const mainEl = new Elem('main');

const displayEl = new Elem('div', 'display', 'loading')
  .attr({ lang: 'ja', style: 'align:center; flex-grow: 1' })
  .innerText('Loading...');

class Form {
  el: Elem<HTMLFormElement>;
  typingEl = new Elem(document.createElement('input'), 'result--').attr({
    type: 'text',
    lang: 'ja',
    autocomplete: 'off',
    autocorrect: 'off',
    autocapitalize: 'off',
    spellcheck: 'false',
  });

  onsubmit: (ev: SubmitEvent) => void = () => null;

  private _stype: 'Kanji' | 'Vocabulary' = 'Kanji';
  private _qtype: 'Meaning' | 'Reading' = 'Reading';
  private _result: '' | 'correct' | 'incorrect' | 'retry' | 'manual' = '';

  private labelEl = new Elem('div', 'prompt', 'prompt--meaning');
  private subjectTypeEl = new Elem('b');
  private quizTypeEl = new Elem('span');

  constructor() {
    this.el = new Elem(document.createElement('form'))
      .attr({ style: 'width: 500px' })
      .append(
        this.labelEl.append(this.subjectTypeEl, this.quizTypeEl),
        this.typingEl.apply((el) => {
          el.addEventListener('keydown', (ev) => {
            if (this.result) {
              if (ev.key !== 'Enter') {
                ev.preventDefault();
              }
            }
          });
        }),
      );

    this.el.el.onsubmit = (ev) => {
      ev.preventDefault();
      this.onsubmit(ev);
    };
  }
  get stype() {
    return this._stype;
  }

  set stype(stype) {
    this.setType(stype, this.qtype);
    this._stype = stype;
  }

  get qtype() {
    return this._qtype;
  }

  set qtype(qtype) {
    this.setType(this.stype, qtype);
    this._qtype = qtype;
  }

  private setType(stype: typeof this._stype, qType: typeof this._qtype) {
    this.labelEl.el.className = this.labelEl.el.className.replace(
      /(prompt--)[a-z]+/,
      `$1${qType.toLocaleLowerCase()}`,
    );
    this.subjectTypeEl.innerText(stype);
    this.quizTypeEl.innerText(' ' + qType);

    if (qType === 'Reading') {
      wanakana.bind(this.typingEl.el);
    } else {
      try {
        wanakana.unbind(this.typingEl.el);
      } catch (e) {}
    }
  }

  get result() {
    return this._result;
  }

  set result(r) {
    this._result = r;
    this.typingEl.el.className = this.typingEl.el.className.replace(
      /(result--)[a-z]*/g,
      `$1${r}`,
    );
  }
}

const form = new Form();

const resultEl = new Elem('section', 'output');

mainEl.append(displayEl, form.el, resultEl);

const dict = new Dict();
dict.load().then(async () => {
  await loadKanji();
});

document.querySelector<HTMLDivElement>('#app')!.append(mainEl.el);

async function loadKanji() {
  const sel = dict.kan.where('misc.grade').belowOrEqual(4);
  const [entry] = await sel
    .offset(Math.random() * (await sel.count()))
    .limit(1)
    .toArray();

  form.stype = 'Kanji';
  form.qtype = 'Reading';
  form.result = '';

  displayEl.apply((el) => {
    el.classList.remove('loading');
    el.lang = 'ja';
    el.style.fontSize = '10em';
    el.innerText = entry.literal;
  });

  form.onsubmit = (ev) => {
    ev.preventDefault();
    const preAnswer = form.typingEl.el.value
      .toLocaleLowerCase()
      .replace(/\p{Z}+/gu, ' ')
      .trim();
    const answers = preAnswer
      ? preAnswer.split(/[/・]/g).map((v) => v.trim())
      : null;

    if (form.result) {
      if (form.qtype === 'Reading') {
        form.qtype = 'Meaning';
      } else {
        loadKanji();
      }
      form.typingEl.el.value = '';
      form.result = '';
      resultEl.empty();
      return;
    }

    form.result = 'manual';

    if (answers && entry.readingMeaning) {
      if (form.qtype === 'Reading') {
        form.result = 'incorrect';
      }

      if (
        answers.every((ans, i) => {
          if (!entry.readingMeaning) return;

          for (const g of entry.readingMeaning.groups) {
            if (form.qtype === 'Reading') {
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

          if (form.qtype === 'Reading') {
            for (const r of entry.readingMeaning.nanori) {
              if (r === ans) {
                return true;
              }
            }
          }

          return false;
        })
      ) {
        form.result = 'correct';
        form.typingEl.el.value = answers.join(
          form.qtype === 'Reading' ? '・' : ' / ',
        );
      }
    }

    if ((form.result as string) === 'retry') {
    } else {
      resultEl.append(
        ...kanjiMakeSummary(entry),
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

function kanjiMakeSummary({ readingMeaning }: Kanjidic2Character) {
  if (!readingMeaning) {
    return [new Elem('br')];
  }
  const out: Elem[] = [];

  readingMeaning.groups.map((g, i) => {
    if (i) {
      out.push(new Elem('br'));
    }

    if (form.qtype === 'Reading') {
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

      for (const [k, rs] of Object.entries(readings)) {
        const rEl = new Elem('div')
          .attr({ style: 'flex-grow: 1' })
          .append(
            new Elem('b').innerText(
              `${k[0].toLocaleUpperCase() + k.slice(1)}: `,
            ),
          );
        let r = '';
        while ((r = rs.shift() || '')) {
          rEl.append(r);
          if (rs.length) {
            rEl.append(', ');
          }
        }
        out.push(rEl);
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

  if (form.qtype === 'Reading') {
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
