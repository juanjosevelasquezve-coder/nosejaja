(() => {
  const normalizePathname = (pathname) => {
    const normalized = String(pathname || '/').trim().replace(/\/+$/, '') || '/';
    const lowered = normalized.toLowerCase();
    if (normalized === '/index') return '/index.html';
    if (normalized === '/principal' || normalized === '/principal.html') return '/index.html';
    if (lowered === '/adaptadorsales') return '/AdaptadorSALES.html';
    if (lowered === '/adaptadorvisor') return '/AdaptadorVISOR.html';
    if (lowered === '/informeshacky') return '/InformesHACKY.html';
    if (lowered === '/buzoncontenidos') return '/BuzonContenidos.html';
    if (lowered === '/buzoncontenidos.html') return '/BuzonContenidos.html';
    if (lowered === '/enviarvideoshacky') return '/enviarvideosHACKY.html';
    if (lowered === '/autoactividad') return '/AutoActividad.html';
    if (lowered === '/plantillaspptx') return '/PlantillasPPTX.html';
    if (lowered === '/eventosbeta') return '/EventosBETA.html';
    if (lowered === '/eventosbeta.html') return '/EventosBETA.html';
    if (lowered === '/tablavs') return '/TablaVS.html';
    return normalized;
  };

  const syncMenuCurrent = (menu) => {
    const links = menu.querySelectorAll('a[href]');
    if (!links.length) {
      return;
    }
    const currentPath = normalizePathname(window.location.pathname);
    links.forEach((link) => {
      const href = link.getAttribute('href') || '';
      let linkPath = href;
      try {
        linkPath = new URL(href, window.location.origin).pathname;
      } catch (error) {
        linkPath = href;
      }
      const normalizedLinkPath = normalizePathname(linkPath);
      const isCurrent = normalizedLinkPath === currentPath;
      link.classList.toggle('is-current', isCurrent);
      if (isCurrent) {
        link.setAttribute('aria-current', 'page');
      } else {
        link.removeAttribute('aria-current');
      }
    });
  };

  const setupMenu = () => {
    const toggle = document.querySelector('[data-page-menu-toggle]');
    const menu = document.querySelector('[data-page-menu]');
    const backdrop = document.querySelector('[data-page-menu-backdrop]');
    if (!toggle || !menu) {
      return;
    }

    const isOpen = () => menu.classList.contains('open');
    const openMenu = () => {
      menu.classList.add('open');
      backdrop?.classList.add('open');
      toggle.setAttribute('aria-expanded', 'true');
      menu.removeAttribute('aria-hidden');
      const firstLink = menu.querySelector('a[href]');
      firstLink?.focus();
    };
    const closeMenu = () => {
      menu.classList.remove('open');
      backdrop?.classList.remove('open');
      toggle.setAttribute('aria-expanded', 'false');
      menu.setAttribute('aria-hidden', 'true');
    };
    const toggleMenu = () => {
      if (isOpen()) {
        closeMenu();
      } else {
        openMenu();
      }
    };

    toggle.addEventListener('click', (event) => {
      event.preventDefault();
      toggleMenu();
    });
    backdrop?.addEventListener('click', closeMenu);
    menu.addEventListener('click', (event) => {
      if (event.target.closest('a')) {
        closeMenu();
      }
    });
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && isOpen()) {
        closeMenu();
      }
    });

    syncMenuCurrent(menu);
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupMenu);
  } else {
    setupMenu();
  }
})();
