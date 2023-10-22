export class Elem<T extends HTMLElement = HTMLElement> {
  el: T;

  constructor(tag: string | T, ...classList: string[]) {
    if (typeof tag !== 'string') {
      this.el = tag;
      this.el.classList.add(...classList);
    } else if (tag[0] === '<') {
      const div = document.createElement('div');
      div.innerHTML = tag;
      this.el = (div.firstChild || document.createElement('div')) as T;
    } else {
      this.el = document.createElement(tag) as T;
    }

    const { className } = this.el;
    if (className) {
      this.el.className = className + ' ' + classList.join(' ');
    } else {
      this.el.className = classList.join(' ');
    }
  }

  apply(fn: (el: typeof this.el) => void) {
    fn(this.el);
    return this;
  }

  attr(map: Record<string, string>) {
    Object.entries(map).map(([k, v]) => {
      this.el.setAttribute(k, v);
    });
    return this;
  }

  append(...nodes: (Elem | string)[]) {
    this.el.append(
      ...nodes.filter((n) => n).map((n) => (n instanceof Elem ? n.el : n)),
    );
    return this;
  }

  prepend(...nodes: (Elem | string)[]) {
    this.el.prepend(
      ...nodes.filter((n) => n).map((n) => (n instanceof Elem ? n.el : n)),
    );
    return this;
  }

  innerHTML(html: string) {
    this.el.innerHTML = html;
    return this;
  }

  innerText(text: string) {
    this.el.innerText = text;
    return this;
  }

  empty() {
    this.el.textContent = '';
  }
}
