/* 元知己 · 移动端导航菜单：小屏时以「菜单」按钮展开全屏导航覆盖层。 */
(function () {
  'use strict';

  const nav = document.querySelector('header nav');
  if (!nav) return;

  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.className = 'nav-toggle';
  toggle.textContent = '菜单';
  toggle.setAttribute('aria-label', '打开导航菜单');
  nav.parentElement.appendChild(toggle);

  let menu = null;

  function closeMenu() {
    if (!menu) return;
    menu.remove();
    menu = null;
    document.body.style.overflow = '';
    document.removeEventListener('keydown', onKeydown);
  }

  function onKeydown(event) {
    if (event.key === 'Escape') closeMenu();
  }

  function openMenu() {
    if (menu) return;
    menu = document.createElement('div');
    menu.className = 'mobile-menu';

    const closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.className = 'menu-close';
    closeBtn.textContent = '×';
    closeBtn.setAttribute('aria-label', '关闭导航菜单');
    closeBtn.addEventListener('click', closeMenu);
    menu.appendChild(closeBtn);

    nav.querySelectorAll('a').forEach((link) => {
      const item = document.createElement('a');
      item.href = link.getAttribute('href');
      item.textContent = link.textContent;
      if (link.classList.contains('active')) item.classList.add('active');
      item.addEventListener('click', closeMenu);
      menu.appendChild(item);
    });

    document.body.appendChild(menu);
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', onKeydown);
  }

  toggle.addEventListener('click', () => (menu ? closeMenu() : openMenu()));
})();
