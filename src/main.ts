import './style.css';

import { Dict } from './dict.ts';
import { loadKanji } from './kanji.ts';
import { BodyEl } from './loader.ts';
import { loadVocab } from './vocab.ts';

const body = new BodyEl();

const dict = new Dict();
dict.load().then(async () => {
  body.changeMode = () => {
    if (body.mode === 'Kanji') {
      loadKanji(body, dict);
    } else {
      loadVocab(body, dict);
    }
  };
  body.changeMode();
});

document.querySelector<HTMLDivElement>('#app')!.append(body.el.el);
