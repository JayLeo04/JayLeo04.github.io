(() => {
  'use strict';

  const root = document.documentElement;
  const themeButton = document.querySelector('[data-theme-toggle]');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
  const pointerInteractionsAllowed = () => finePointer.matches && !reducedMotion.matches;
  const applyTheme = (theme, persist = false) => {
    root.dataset.theme = theme;
    if (themeButton) {
      const dark = theme === 'dark';
      themeButton.setAttribute('aria-pressed', String(dark));
      themeButton.setAttribute('aria-label', dark ? '切换至浅色主题' : '切换至深色主题');
    }
    if (persist) {
      try {
        localStorage.setItem('jl-theme', theme);
      } catch (_) {
        // The selected theme still applies for this page view.
      }
    }
  };

  applyTheme(root.dataset.theme || 'light');

  themeButton?.addEventListener('click', () => {
    const update = () => applyTheme(root.dataset.theme === 'dark' ? 'light' : 'dark', true);
    if (!reducedMotion.matches && typeof document.startViewTransition === 'function') {
      document.startViewTransition(update);
    } else {
      update();
    }
  });

  const header = document.querySelector('[data-site-header]');
  if (header && 'IntersectionObserver' in window) {
    const sentinel = document.createElement('span');
    sentinel.className = 'scroll-sentinel';
    sentinel.setAttribute('aria-hidden', 'true');
    document.body.prepend(sentinel);

    const observer = new IntersectionObserver(([entry]) => {
      header.classList.toggle('is-scrolled', !entry.isIntersecting);
    });
    observer.observe(sentinel);
  }

  const interactionResets = [];
  const schedulePointerFrame = (render) => {
    let frame = 0;
    let pointer = null;

    return {
      move(event) {
        pointer = event;
        if (frame) return;
        frame = window.requestAnimationFrame(() => {
          frame = 0;
          if (pointer) render(pointer);
        });
      },
      cancel() {
        pointer = null;
        if (frame) window.cancelAnimationFrame(frame);
        frame = 0;
      }
    };
  };

  document.querySelectorAll('.portrait-wrap').forEach((wrap) => {
    const portrait = wrap.querySelector('.portrait');
    const seal = wrap.querySelector('.seal');
    if (!portrait || !seal) return;

    let bounds = null;
    const pointerFrame = schedulePointerFrame((event) => {
      if (!bounds || !pointerInteractionsAllowed()) return;
      const x = Math.max(-1, Math.min(1, (event.clientX - bounds.left - bounds.width / 2) / (bounds.width / 2)));
      const y = Math.max(-1, Math.min(1, (event.clientY - bounds.top - bounds.height / 2) / (bounds.height / 2)));
      portrait.style.transform = `translate3d(${-x * 2.5}px, ${-y * 2.5}px, 0)`;
      seal.style.transform = `translate3d(${x * 6}px, ${y * 6}px, 0) rotate(7deg)`;
    });

    const reset = () => {
      bounds = null;
      pointerFrame.cancel();
      wrap.classList.remove('is-pointer-active');
      portrait.style.removeProperty('transform');
      seal.style.removeProperty('transform');
    };

    wrap.addEventListener('pointerenter', (event) => {
      if (!pointerInteractionsAllowed()) return;
      bounds = wrap.getBoundingClientRect();
      wrap.classList.add('is-pointer-active');
      pointerFrame.move(event);
    });
    wrap.addEventListener('pointermove', (event) => {
      if (pointerInteractionsAllowed()) pointerFrame.move(event);
    });
    wrap.addEventListener('pointerleave', reset);
    interactionResets.push(reset);
  });

  document.querySelectorAll('.stream-card').forEach((card) => {
    const spotlight = document.createElement('span');
    spotlight.className = 'card-spotlight';
    spotlight.setAttribute('aria-hidden', 'true');
    card.prepend(spotlight);

    let bounds = null;
    const pointerFrame = schedulePointerFrame((event) => {
      if (!bounds || !pointerInteractionsAllowed()) return;
      const x = event.clientX - bounds.left - 78;
      const y = event.clientY - bounds.top - 78;
      spotlight.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    });

    const reset = () => {
      bounds = null;
      pointerFrame.cancel();
      card.classList.remove('is-pointer-active');
    };

    card.addEventListener('pointerenter', (event) => {
      if (!pointerInteractionsAllowed()) return;
      bounds = card.getBoundingClientRect();
      card.classList.add('is-pointer-active');
      pointerFrame.move(event);
    });
    card.addEventListener('pointermove', (event) => {
      if (pointerInteractionsAllowed()) pointerFrame.move(event);
    });
    card.addEventListener('pointerleave', reset);
    interactionResets.push(reset);
  });

  const resetPointerInteractions = () => {
    if (!pointerInteractionsAllowed()) interactionResets.forEach((reset) => reset());
  };
  reducedMotion.addEventListener?.('change', resetPointerInteractions);
  finePointer.addEventListener?.('change', resetPointerInteractions);

  document.querySelectorAll('[data-current-year]').forEach((node) => {
    node.textContent = String(new Date().getFullYear());
  });

  const post = document.querySelector('.post-shell');
  const progress = document.querySelector('[data-reading-progress]');
  if (post && progress) {
    let articleTop = 0;
    let readable = 1;
    let scheduled = false;
    const updateProgress = () => {
      const value = Math.min(Math.max((window.scrollY - articleTop) / readable, 0), 1);
      progress.style.transform = `scaleX(${value})`;
      scheduled = false;
    };
    const scheduleProgress = () => {
      if (!scheduled) {
        scheduled = true;
        window.requestAnimationFrame(updateProgress);
      }
    };
    const measureProgress = () => {
      const bounds = post.getBoundingClientRect();
      articleTop = window.scrollY + bounds.top;
      readable = Math.max(post.offsetHeight - window.innerHeight, 1);
      scheduleProgress();
    };

    window.addEventListener('scroll', scheduleProgress, { passive: true });
    window.addEventListener('resize', measureProgress, { passive: true });
    if ('ResizeObserver' in window) new ResizeObserver(measureProgress).observe(post);
    measureProgress();
  }

  const prose = document.querySelector('[data-prose]');
  const toc = document.querySelector('[data-toc]');
  const tocList = document.querySelector('[data-toc-list]');
  if (prose && toc && tocList) {
    const headings = Array.from(prose.querySelectorAll('h2, h3'));
    if (headings.length >= 2) {
      headings.forEach((heading, index) => {
        if (!heading.id) heading.id = `section-${index + 1}`;
        const item = document.createElement('li');
        item.dataset.level = heading.tagName.slice(1);
        const link = document.createElement('a');
        link.href = `#${heading.id}`;
        link.textContent = heading.textContent || `第 ${index + 1} 节`;
        item.append(link);
        tocList.append(item);
      });
      toc.hidden = false;
    }
  }

  document.querySelectorAll('.prose pre').forEach((pre) => {
    const block = pre.closest('.highlight') || pre;
    if (block.parentElement?.classList.contains('code-shell')) return;

    const shell = document.createElement('div');
    shell.className = 'code-shell';
    block.parentNode?.insertBefore(shell, block);
    shell.append(block);

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'copy-code';
    button.textContent = '复制';
    button.setAttribute('aria-label', '复制代码');
    button.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(pre.innerText);
        button.textContent = '已复制';
        button.setAttribute('aria-label', '代码已复制');
        window.setTimeout(() => {
          button.textContent = '复制';
          button.setAttribute('aria-label', '复制代码');
        }, 1600);
      } catch (_) {
        button.textContent = '复制失败';
      }
    });
    shell.append(button);
  });
})();
