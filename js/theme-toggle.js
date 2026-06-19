/* Light/dark toggle for blackburn.
   The initial theme is set by an inline no-FOUC script in <head> (partials/head.html).
   This script (loaded in <head>) wires the sidebar button after the DOM is ready. */
(function () {
  function current() {
    return document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
  }

  function apply(theme) {
    document.documentElement.setAttribute('data-theme', theme);
  }

  function updateIcon(btn, theme) {
    if (!btn) return;
    var icon = btn.querySelector('i');
    if (icon) {
      // moon = "click to go dark" (shown in light mode); sun = "click to go light"
      icon.className = theme === 'dark' ? 'fas fa-sun fa-fw' : 'fas fa-moon fa-fw';
    }
    btn.setAttribute('aria-label', theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode');
  }

  document.addEventListener('DOMContentLoaded', function () {
    var btn = document.getElementById('theme-toggle');
    updateIcon(btn, current());
    if (!btn) return;
    btn.addEventListener('click', function (e) {
      e.preventDefault();
      var next = current() === 'dark' ? 'light' : 'dark';
      apply(next);
      try { localStorage.setItem('theme', next); } catch (err) {}
      updateIcon(btn, next);
    });
  });
})();
