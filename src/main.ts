import './style.css';
import { Dict } from './dict.ts';
import { Elem } from './html.ts';
import yaml from 'yaml';

const mainEl = new Elem('main');

const displayEl = new Elem('div', 'display', 'loading')
  .attr({ lang: 'ja', style: 'align:center; flex-grow: 1' })
  .innerText('Loading...');

const typingEl = new Elem(document.createElement('input')).attr({
  type: 'text',
  lang: 'ja',
  autocomplete: 'off',
  autocorrect: 'off',
  autocapitalize: 'off',
  spellcheck: 'false',
});

const formEl = new Elem(document.createElement('form'))
  .attr({ style: 'width: 500px' })
  .append(
    new Elem('div', 'prompt', 'prompt--meaning').innerText('Meaning'),
    typingEl,
  );

const resultEl = new Elem('section', 'output');

mainEl.append(displayEl, formEl, resultEl);

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

  displayEl.apply((el) => {
    el.classList.remove('loading');
    el.lang = 'ja';
    el.style.fontSize = '10em';
    el.innerText = entry.literal;
  });

  formEl.apply((el) => {
    el.onsubmit = (ev) => {
      ev.preventDefault();
      const { value } = typingEl.el;
      if (value) {
        resultEl.append(
          new Elem('code').append(
            new Elem('pre').innerText(
              entry.readingMeaning
                ? yaml.stringify(
                    entry.readingMeaning.groups.map((g) => {
                      const readings: Record<string, string[]> = {};
                      for (const r of g.readings) {
                        const m = /^ja_(.+)$/.exec(r.type);
                        if (!m) continue;

                        const prev = readings[m[1]] || [];
                        prev.push(r.value);
                        readings[m[1]] = prev;
                      }

                      return {
                        ...g,
                        readings,
                        meanings: g.meanings.map((m) => m.value),
                      };
                    }),
                  )
                : '',
            ),
          ),
          new Elem('details').append(
            new Elem('summary')
              .attr({ style: 'cursor: pointer' })
              .innerText('Full entry'),
            new Elem('code').append(
              new Elem('pre').innerText(yaml.stringify(entry)),
            ),
          ),
        );
        typingEl.el.placeholder = value;
        typingEl.el.value = '';
      } else {
        loadKanji();
        typingEl.el.placeholder = '';
        resultEl.empty();
      }
    };
  });
}
