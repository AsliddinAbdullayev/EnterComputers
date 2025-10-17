
(function () {
  'use strict';

  var root = document.documentElement;

  function setToggleIcon(btn) {
    if (!btn) return
    var t = root.getAttribute('data-theme') || 'light';
    btn.textContent = (t === 'dark') ? '☀️' : '🌙';
    btn.setAttribute('aria-label', (t === 'dark') ? 'Light mode' : 'Dark mode');
  }
 
  function initToggle() {
    var btn = document.getElementById('themeToggle');
    if (!btn) return;

    btn.addEventListener('click', function () {
      var cur = root.getAttribute('data-theme') || 'light';
      var next = (cur === 'dark') ? 'light' : 'dark';
      root.setAttribute('data-theme', next);
      localStorage.setItem('theme', next);
      setToggleIcon(btn);
    });

    setToggleIcon(btn);
  }

  function followOSIfNoSaved() {
    if (localStorage.getItem('theme')) return;  
    if (!window.matchMedia) return;

    var mq = window.matchMedia('(prefers-color-scheme: dark)');
    var onChange = function (e) {
      var next = e.matches ? 'dark' : 'light';
      root.setAttribute('data-theme', next);
      setToggleIcon(document.getElementById('themeToggle'));
    };
    if (mq.addEventListener) mq.addEventListener('change', onChange);
    else if (mq.addListener) mq.addListener(onChange);  
  }

  
  document.addEventListener('DOMContentLoaded', function () {
    initToggle();
    followOSIfNoSaved();
  });
})();
