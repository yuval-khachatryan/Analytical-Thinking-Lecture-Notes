/* navigation.js — one table of contents in the right sidebar.
   ---------------------------------------------------------------------------
   Ported from the Ramat Gan notes (games/shared/navigation.js), as a classic
   script so that it also runs from disk (file://).

   Quarto puts the chapter list in the right sidebar and the page's own TOC
   (toc-location: left = the sidebar side, which in RTL is the right) below it.
   This script merges them into one tree: chapters > sections > subsections.
   Every branch gets a disclosure arrow. The other chapters' TOCs come from
   #book-toc-data, written into each page by tools/build-navigation.mjs.

   Every branch starts folded, as in the Ramat Gan notes (Yuval, 2026-11-04);
   a link to a section (#hash) opens just the branches above it.
   OPEN_CURRENT = true would start the current chapter fully open instead.
   --------------------------------------------------------------------------- */
(function () {
  "use strict";
  var OPEN_CURRENT = false;

  function init() {
    var sidebar = document.getElementById("quarto-sidebar");
    if (!sidebar || sidebar.classList.contains("book-toc-ready")) return;
    var currentToc = document.getElementById("TOC");
    var data = document.getElementById("book-toc-data");
    var chapters = [];
    try { chapters = data ? JSON.parse(data.textContent) : []; } catch (e) { chapters = []; }
    var controls = [];

    function disclosure(container, list, label, chapter) {
      var id = "toc-branch-" + controls.length;
      list.id = list.id || id;
      var button = document.createElement("button");
      button.type = "button";
      button.className = chapter ? "toc-chapter-toggle" : "toc-branch-toggle";
      button.setAttribute("aria-controls", list.id);
      var arrow = document.createElement("span");
      arrow.className = "toc-disclosure-arrow";
      arrow.textContent = "◂";
      arrow.setAttribute("aria-hidden", "true");
      button.appendChild(arrow);
      function set(open) {
        container.classList.toggle("toc-open", open);
        button.setAttribute("aria-expanded", String(open));
        button.setAttribute("aria-label", (open ? "קיפול" : "פתיחה") + ": " + label);
      }
      button.addEventListener("click", function () {
        set(button.getAttribute("aria-expanded") !== "true");
      });
      set(false);
      controls.push({ list: list, set: set });
      return button;
    }

    var links = sidebar.querySelectorAll(".sidebar-menu-container a.sidebar-link");
    Array.prototype.forEach.call(links, function (link) {
      var url = new URL(link.href);
      var file = url.pathname.split("/").pop();
      var chapter = chapters.filter(function (c) { return c.file === file; })[0];
      var isCurrent = url.pathname === location.pathname;
      if (!chapter && !(isCurrent && currentToc)) return;
      var toc = isCurrent && currentToc ? currentToc : document.createElement("div");
      if (toc !== currentToc) {
        toc.innerHTML = chapter.html;
        toc.querySelectorAll("[id]").forEach(function (el) { el.removeAttribute("id"); });
        toc.querySelectorAll("a").forEach(function (a) {
          a.href = new URL(file + a.getAttribute("href"), location.href).href;
          a.removeAttribute("data-scroll-target");
          a.classList.remove("active");
        });
      }
      var title = toc.querySelector(":scope > h2");
      if (title) title.remove();
      toc.classList.add("toc-tree");
      toc.setAttribute("aria-label", link.textContent.trim());
      var item = link.closest("li"), row = link.parentElement;
      item.classList.add("toc-chapter");
      row.classList.add("toc-chapter-row");
      row.insertBefore(disclosure(item, toc, link.textContent.trim(), true), row.firstChild);
      item.appendChild(toc);
      toc.querySelectorAll("li").forEach(function (li) {
        var list = li.querySelector(":scope > ul"), a = li.querySelector(":scope > a");
        if (!list || !a) return;
        li.classList.add("toc-parent");
        li.insertBefore(disclosure(li, list, a.textContent.trim()), a);
      });
    });
    sidebar.classList.add("book-toc-ready");

    if (OPEN_CURRENT && currentToc) {
      controls.forEach(function (c) {
        if (c.list === currentToc || currentToc.contains(c.list)) c.set(true);
      });
    }
    function revealHash() {
      if (!location.hash || !currentToc) return;
      var target = Array.prototype.filter.call(currentToc.querySelectorAll("a[href]"), function (a) {
        return a.hash === location.hash;
      })[0];
      if (target) controls.forEach(function (c) { if (c.list.contains(target)) c.set(true); });
    }
    window.addEventListener("hashchange", revealHash);
    revealHash();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
