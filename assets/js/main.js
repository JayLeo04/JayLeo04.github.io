(() => {
  'use strict';

  const root = document.documentElement;
  const themeButton = document.querySelector('[data-theme-toggle]');
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
    applyTheme(root.dataset.theme === 'dark' ? 'light' : 'dark', true);
  });

  document.querySelectorAll('[data-current-year]').forEach((node) => {
    node.textContent = String(new Date().getFullYear());
  });

  const post = document.querySelector('.post-shell');
  const progress = document.querySelector('[data-reading-progress]');
  if (post && progress) {
    let scheduled = false;
    const updateProgress = () => {
      const articleTop = post.offsetTop;
      const readable = Math.max(post.offsetHeight - window.innerHeight, 1);
      const value = Math.min(Math.max((window.scrollY - articleTop) / readable, 0), 1);
      progress.style.transform = `scaleX(${value})`;
      scheduled = false;
    };
    window.addEventListener('scroll', () => {
      if (!scheduled) {
        scheduled = true;
        window.requestAnimationFrame(updateProgress);
      }
    }, { passive: true });
    updateProgress();
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
