import './style.css';
import { Dict } from './dict.ts';
import { Elem } from './html.ts';
import yaml from 'yaml';
import * as wanakana from 'wanakana';

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
    const { value: answer } = form.typingEl.el;
    console.log(form.result);
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

    if (entry.readingMeaning) {
      if (form.qtype === 'Reading') {
        form.result = 'incorrect';
      }

      for (const g of entry.readingMeaning.groups) {
        if (form.qtype === 'Reading') {
          for (const r of g.readings) {
            if (r.type === 'ja_on') {
              const answerKata = wanakana.toKatakana(answer);
              if (r.value === answerKata) {
                form.result = 'correct';
                form.typingEl.el.value = answerKata;
              }
            } else if (r.type === 'ja_kun') {
              if (r.value.split('.')[0] === answer) {
                form.result = 'correct';
              }
            }
          }
        } else {
          for (const m of g.meanings) {
            if (m.value.toLocaleLowerCase() === answer) {
              form.result = 'correct';
            }
          }
        }
      }
    }

    if ((form.result as string) === 'retry') {
    } else {
      resultEl.append(
        ...(entry.readingMeaning
          ? entry.readingMeaning.groups
              .map((g, i) => {
                if (form.qtype === 'Reading') {
                  const out: Elem[] = [];

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
                              new Elem(
                                'span',
                                i % 2 ? 'okurigana' : '',
                              ).innerText(s),
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

                  return out;
                }

                return [
                  new Elem('b').innerText(i + 1 + '. '),
                  g.meanings.map((m) => m.value).join('; '),
                ];
              })
              .flatMap((r) => [...r, new Elem('br')])
          : [new Elem('br')]),
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
