import * as wanakana from 'wanakana';

import { SubjectType } from './dict';
import { Elem } from './html';

const MODES: SubjectType[] = ['Kanji', 'Vocabulary'];

export class BodyEl {
  el = new Elem('main');
  displayEl = new Elem('div', 'display', 'loading')
    .attr({ lang: 'ja' })
    .innerText('Loading...');
  formEl = new Elem(document.createElement('form'), 'typing');

  resultEl = new Elem('section', 'output');

  private labelEl = new Elem('div', 'prompt', 'prompt--meaning');
  private subjectTypeEl = new Elem('b');
  private quizTypeEl = new Elem('span');

  typingEl = new Elem(document.createElement('input'), 'result--').attr({
    type: 'text',
    lang: 'ja',
    autocomplete: 'off',
    autocorrect: 'off',
    autocapitalize: 'off',
    spellcheck: 'false',
  });

  onsubmit: (ev: SubmitEvent, answers: string[]) => void = () => null;
  loadNext: () => void = () => null;
  changeMode: () => void = () => null;

  mode = new URL(location.href).searchParams.get('mode') || MODES[0];

  private _stype: SubjectType = 'Kanji';
  private _qtype: 'Meaning' | 'Reading' = 'Reading';
  private _result: '' | 'correct' | 'incorrect' | 'retry' | 'manual' = '';

  constructor() {
    this.formEl = this.formEl.append(
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
      new Elem('div')
        .attr({
          style: 'font-size: 0.7em; text-align: center; margin-bottom: 1em',
        })
        .innerText('Multiple answers with / or ・'),
    );

    this.formEl.el.onsubmit = (ev) => {
      ev.preventDefault();

      if (this.result) {
        if (this.qtype === 'Reading') {
          this.qtype = 'Meaning';
        } else {
          this.loadNext();
        }
        this.typingEl.el.value = '';
        this.result = '';
        this.resultEl.empty();
        return;
      }

      const preAnswer = this.typingEl.el.value
        .toLocaleLowerCase()
        .replace(/\p{Z}+/gu, ' ')
        .trim();

      if (this.qtype === 'Reading') {
        if (/[^\p{sc=Katakana}\p{sc=Hiragana}・ー]/u.test(preAnswer)) {
          return;
        }
      }

      const answers = preAnswer
        ? preAnswer
            .split(/[/・]/g)
            .map((v) => v.trim())
            .filter((v) => v)
        : [];

      if (this.qtype === 'Reading' && answers.length) {
        const reText = wanakana
          .toKatakana(this.displayEl.el.innerText)
          .replace(/[^\p{sc=Katakana}・ー]+/gu, '.+');
        if (reText.includes('.')) {
          const re = new RegExp('^' + reText + '$');
          if (answers.some((a) => !re.test(wanakana.toKatakana(a)))) {
            return;
          }
        }
      }

      this.result = this.qtype === 'Reading' ? 'incorrect' : 'manual';
      this.onsubmit(ev, answers);

      if ((this.result as string) === 'correct') {
        this.typingEl.el.value = answers.join(
          this.qtype === 'Reading' ? '・' : ' / ',
        );
      }
    };

    this.el.append(
      new Elem('nav').append(
        new Elem('div').append(
          new Elem(document.createElement('button'))
            .innerText('Edit filter')
            .apply((el) => {
              el.onclick = () => {
                open(
                  'https://github.com/patarapolw/j-typing/blob/main/docs/filter.md',
                  '_blank',
                );
              };
            }),
        ),
        new Elem('div').attr({ style: 'flex-grow: 1' }),
        new Elem(document.createElement('fieldset')).append(
          new Elem('legend').innerText('Quiz mode'),
          ...MODES.map((v) =>
            new Elem('span').append(
              new Elem(document.createElement('input'))
                .attr({
                  type: 'radio',
                  name: 'mode',
                  id: v,
                  value: v,
                })
                .apply((el) => {
                  if (this.mode === v) {
                    el.checked = true;
                  }
                  el.oninput = () => {
                    if (el.checked) {
                      this.mode = v;

                      history.pushState(v, '', `?mode=${v}`);
                      this.typingEl.el.value = '';
                      this.resultEl.empty();
                      this.changeMode();
                    }
                  };
                }),
              new Elem('label').attr({ for: v }).innerText(v),
            ),
          ),
        ),
      ),
      new Elem('div', 'display-container').append(this.displayEl),
      this.formEl,
      this.resultEl,
    );
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
