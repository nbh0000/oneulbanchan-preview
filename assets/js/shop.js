/* 정래윤의오늘반찬 · 쇼핑몰 화면 동작
   구성: 알림 · 서랍 메뉴 · 검색 · 가로 스크롤 표시 · 탭 · 장바구니 담기 · 상품 상세 · 장바구니 · 주문서 · 폼 도우미 */
(function () {
  'use strict';
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var won = function (n) { return Number(n).toLocaleString('ko-KR') + '원'; };

  /* ---------- 알림(토스트) ---------- */
  var toasts = $('#toasts');
  window.toast = function (msg, type, link) {
    if (!toasts || !msg) return;
    var t = document.createElement('div');
    t.className = 'toast' + (type === 'error' ? ' is-error' : '');
    t.textContent = msg;
    if (link) { var a = document.createElement('a'); a.href = link.href; a.textContent = link.text; t.appendChild(a); }
    toasts.appendChild(t);
    setTimeout(function () { t.classList.add('is-out'); setTimeout(function () { t.remove(); }, 300); }, link ? 4200 : 3000);
  };
  (window.__flash || []).forEach(function (f) { window.toast(f.message, f.type); });

  function post(url, body) {
    return fetch(url, {
      method: 'POST', credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json', 'X-CSRF-Token': window.__csrf },
      body: JSON.stringify(body)
    }).then(function (r) { return r.json().catch(function () { return { ok: false, message: '잠시 뒤 다시 시도해 주세요.' }; }); })
      .catch(function () { return { ok: false, message: '연결이 끊겼습니다. 인터넷 연결을 확인해 주세요.' }; });
  }
  function setCartCount(n) {
    $$('[data-cart-count]').forEach(function (el) { el.textContent = n; el.setAttribute('data-n', n); });
  }

  /* ---------- 사진이 깨지면 빈 접시 그림으로 ---------- */
  document.addEventListener('error', function (e) {
    var img = e.target;
    if (img.tagName === 'IMG' && !img.dataset.fallback) { img.dataset.fallback = '1'; img.src = '/oneulbanchan-preview/assets/img/empty-dish.svg'; }
  }, true);

  /* ---------- 서랍 메뉴 ---------- */
  var drawer = $('#drawer'), lastFocus = null;
  function openDrawer() {
    lastFocus = document.activeElement;
    drawer.classList.add('is-open'); drawer.setAttribute('aria-hidden', 'false');
    document.documentElement.style.overflow = 'hidden';
    $$('[data-drawer-open]').forEach(function (b) { b.setAttribute('aria-expanded', 'true'); });
    var c = $('[data-drawer-close].ibtn', drawer); if (c) c.focus();
  }
  function closeDrawer() {
    drawer.classList.remove('is-open'); drawer.setAttribute('aria-hidden', 'true');
    document.documentElement.style.overflow = '';
    $$('[data-drawer-open]').forEach(function (b) { b.setAttribute('aria-expanded', 'false'); });
    if (lastFocus) lastFocus.focus();
  }
  if (drawer) {
    $$('[data-drawer-open]').forEach(function (b) { b.addEventListener('click', openDrawer); });
    $$('[data-drawer-close]', drawer).forEach(function (b) { b.addEventListener('click', closeDrawer); });
    drawer.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') return closeDrawer();
      if (e.key !== 'Tab') return;   // 서랍 안에서만 초점이 돈다
      var f = $$('a[href],button,summary,input', drawer).filter(function (el) { return el.offsetParent !== null; });
      if (!f.length) return;
      if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
      else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
    });
    window.matchMedia('(min-width:1024px)').addEventListener('change', function (m) { if (m.matches && drawer.classList.contains('is-open')) closeDrawer(); });
  }

  /* ---------- 검색 줄 ---------- */
  var sbar = $('#sbar');
  $$('[data-search-toggle]').forEach(function (b) {
    b.addEventListener('click', function () {
      var open = sbar.hidden; sbar.hidden = !open; b.setAttribute('aria-expanded', String(open));
      if (open) $('input', sbar).focus();
    });
  });

  /* ---------- 가로 스크롤: 끝 페이드·진행 표시 ---------- */
  function watchScroll(wrap, scroller, bar) {
    function update() {
      var max = scroller.scrollWidth - scroller.clientWidth;
      wrap.classList.toggle('can-scroll', max > 4);
      wrap.classList.toggle('at-end', scroller.scrollLeft >= max - 4);
      if (bar && max > 4) {
        var ratio = scroller.clientWidth / scroller.scrollWidth;
        bar.style.width = (ratio * 100) + '%';
        bar.style.transform = 'translateX(' + ((scroller.scrollLeft / max) * (100 / ratio - 100)) + '%)';
      }
    }
    scroller.addEventListener('scroll', update, { passive: true });
    if (window.ResizeObserver) new ResizeObserver(update).observe(scroller);
    update();
  }
  $$('[data-scroll-fade]').forEach(function (w) { var s = w.firstElementChild; if (s) watchScroll(w, s); });
  $$('[data-hs]').forEach(function (w) { watchScroll(w, $('.hs', w), $('.hs-bar i', w)); });
  // 현재 메뉴가 화면 안에 오도록
  $$('.mnav [aria-current], .chips [aria-current], .my__nav [aria-current]').forEach(function (a) {
    var p = a.parentElement; if (p.scrollWidth > p.clientWidth) p.scrollLeft = a.offsetLeft - (p.clientWidth - a.offsetWidth) / 2;
  });

  /* ---------- 탭 (메인 추천) ---------- */
  $$('[role=tablist]').forEach(function (list) {
    var tabs = $$('[role=tab]', list);
    function select(t, focus) {
      tabs.forEach(function (x) {
        var on = x === t; x.setAttribute('aria-selected', String(on)); x.tabIndex = on ? 0 : -1;
        var p = document.getElementById(x.getAttribute('aria-controls')); if (p) p.hidden = !on;
      });
      if (focus) t.focus();
      t.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' });
    }
    tabs.forEach(function (t, i) {
      t.addEventListener('click', function () { select(t); });
      t.addEventListener('keydown', function (e) {
        var d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0; if (!d) return;
        e.preventDefault(); select(tabs[(i + d + tabs.length) % tabs.length], true);
      });
    });
  });

  /* ---------- 카드에서 바로 담기 ---------- */
  document.addEventListener('click', function (e) {
    var b = e.target.closest('[data-add]'); if (!b) return;
    e.preventDefault(); b.classList.add('is-busy');
    post('/oneulbanchan-preview/cart/add', { product_id: +b.dataset.add, qty: 1 }).then(function (r) {
      b.classList.remove('is-busy');
      if (r.ok) { setCartCount(r.count); window.toast(r.message, '', { href: '/oneulbanchan-preview/cart', text: '장바구니 보기' }); }
      else if (r.needOption && r.url) location.href = r.url;
      else window.toast(r.message, 'error');
    });
  });

  /* ---------- 수량 조절 ---------- */
  document.addEventListener('click', function (e) {
    var b = e.target.closest('[data-qty] [data-step]'); if (!b) return;
    var input = $('input', b.closest('[data-qty]'));
    var v = Math.max(+input.min || 1, Math.min(+input.max || 99, (+input.value || 1) + (+b.dataset.step)));
    if (v !== +input.value) { input.value = v; input.dispatchEvent(new Event('change', { bubbles: true })); }
  });

  /* ---------- 상품 상세 ---------- */
  var buy = $('#buyForm');
  if (buy) {
    var qtyIn = $('input[name=qty]', buy), opt = $('select[name=option_id]', buy);
    var recalc = function () {
      var add = opt && opt.selectedOptions[0] ? +(opt.selectedOptions[0].dataset.add || 0) : 0;
      var q = Math.max(1, Math.min(+qtyIn.max || 99, +qtyIn.value || 1)); qtyIn.value = q;
      var t = won((+buy.dataset.price + add) * q);
      ['#pdTotal', '#barTotal'].forEach(function (s) { var el = $(s); if (el) el.textContent = t; });
    };
    qtyIn.addEventListener('change', recalc); if (opt) opt.addEventListener('change', recalc);
    // 장바구니 담기는 화면을 옮기지 않는다
    document.addEventListener('click', function (e) {
      var b = e.target.closest('[data-cart-submit]'); if (!b) return;
      e.preventDefault();
      if (!buy.reportValidity()) { if (opt && !opt.value) opt.scrollIntoView({ block: 'center', behavior: 'smooth' }); return; }
      post('/oneulbanchan-preview/cart/add', { product_id: +buy.elements.product_id.value, qty: +qtyIn.value, option_id: opt ? +opt.value : 0 }).then(function (r) {
        if (r.ok) { setCartCount(r.count); window.toast(r.message, '', { href: '/oneulbanchan-preview/cart', text: '장바구니 보기' }); } else window.toast(r.message, 'error');
      });
    });
    // 하단 구매 바에서 누르면 옵션 선택 칸으로 안내
    buy.addEventListener('invalid', function () { buy.scrollIntoView({ block: 'center', behavior: 'smooth' }); }, true);
  }
  $$('[data-thumb]').forEach(function (b) {
    b.addEventListener('click', function () {
      $('#pdMain').src = b.dataset.thumb;
      $$('[data-thumb]').forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); });
    });
  });
  var more = $('[data-desc-more]'), desc = $('#pdDesc');
  if (more && desc) {
    var fit = function () { if (desc.scrollHeight <= 1450) { desc.classList.remove('is-clamped'); more.parentElement.hidden = true; } };
    window.addEventListener('load', fit); fit();
    more.addEventListener('click', function () { desc.classList.remove('is-clamped'); more.setAttribute('aria-expanded', 'true'); more.parentElement.hidden = true; });
  }
  // 상세 탭: 보고 있는 구역 표시
  var pdTabs = $$('.pd-tabs a');
  if (pdTabs.length && window.IntersectionObserver) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (en) {
        if (!en.isIntersecting) return;
        pdTabs.forEach(function (a) { if (a.getAttribute('href') === '#' + en.target.id) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
      });
    }, { rootMargin: '-30% 0px -60% 0px' });
    pdTabs.forEach(function (a) { var s = $(a.getAttribute('href')); if (s) io.observe(s); });
  }
  // 하단 고정 바·상담 버튼: 원래 구매 버튼이나 푸터가 보이면 숨긴다 (내용과 겹치지 않게)
  if (window.IntersectionObserver) {
    var bar = $('[data-buybar]'), fab = $('[data-fab]'), seen = {};
    var apply = function () {
      if (bar) bar.classList.toggle('is-hidden', !!(seen.cta || seen.ft));
      if (fab) fab.classList.toggle('is-hidden', !!seen.ft);
    };
    var o2 = new IntersectionObserver(function (es) { es.forEach(function (en) { seen[en.target.dataset.seenKey] = en.isIntersecting; }); apply(); });
    var cta = $('.pd__cta'), ft = $('.ft');
    if (cta && bar) { cta.dataset.seenKey = 'cta'; o2.observe(cta); }
    if (ft) { ft.dataset.seenKey = 'ft'; o2.observe(ft); }
  }

  /* ---------- 장바구니 ---------- */
  var cart = $('[data-cart]');
  if (cart) {
    var sums = function (r) {
      setCartCount(r.count);
      $('[data-sum-amount]').textContent = won(r.amount);
      $('[data-sum-fee]').textContent = r.fee ? '+' + won(r.fee) : '무료';
      $('[data-sum-total]').textContent = won(r.total);
      var fb = $('[data-freebar]');
      if (fb) fb.innerHTML = r.fee > 0 ? '<b class="num">' + won(+fb.dataset.min - r.amount) + '</b> 더 담으면 배송비가 무료입니다.' : (r.amount > 0 ? '<b>배송비 무료</b>로 받을 수 있습니다.' : '');
      var gb = $('[data-giftbar]');
      if (gb) gb.innerHTML = r.amount >= +gb.dataset.min ? '<b>서비스 반찬</b> ' + gb.dataset.text + '를 함께 보내 드려요.' : '<b class="num">' + won(+gb.dataset.min - r.amount) + '</b> 더 담으면 ' + gb.dataset.text + '를 함께 보내 드려요.';
      $('[data-checkout]').classList.toggle('is-disabled', r.amount <= 0);
      if (!$$('[data-line]', cart).length) location.reload();
    };
    cart.addEventListener('change', function (e) {
      var q = e.target.closest('[data-cart-qty]'); if (!q) return;
      var line = e.target.closest('[data-line]');
      post('/oneulbanchan-preview/cart/update', { cart_id: +line.dataset.line, qty: +e.target.value || 1 }).then(function (r) {
        if (!r.ok) return window.toast(r.message, 'error');
        e.target.value = r.qty; $('[data-line-amt]', line).textContent = won(+line.dataset.price * r.qty); sums(r);
      });
    });
    cart.addEventListener('click', function (e) {
      var b = e.target.closest('[data-cart-del]'); if (!b) return;
      var line = b.closest('[data-line]');
      post('/oneulbanchan-preview/cart/remove', { cart_id: [+line.dataset.line] }).then(function (r) { if (r.ok) { line.remove(); sums(r); } });
    });
  }

  /* ---------- 주문서 ---------- */
  var order = $('#orderForm');
  if (order) {
    var coupon = $('[data-coupon]', order);
    var cpList = $('[data-coupons]', order);
    var cpSum = function () {
      if (cpList) return Math.min(+order.dataset.amount, $$('input:checked', cpList).reduce(function (a, i) { return a + (+i.dataset.discount || 0); }, 0));
      return coupon && coupon.selectedOptions[0] ? +coupon.selectedOptions[0].dataset.discount : 0;
    };
    var ptIn = $('[data-points-in]', order);
    var ptMax = function (payable) { return Math.max(0, Math.min(+order.dataset.points || 0, payable - (+order.dataset.minPay || 0))); };
    var total = function () {
      var d = cpSum();
      var payable = Math.max(0, +order.dataset.amount + +order.dataset.fee - d);
      var p = 0;
      if (ptIn) {
        p = parseInt(ptIn.value.replace(/[^0-9]/g, ''), 10) || 0;
        var max = ptMax(payable);
        if (p > max) p = max;
        if (ptIn.value !== '' && String(p) !== ptIn.value) ptIn.value = p ? String(p) : '';
      }
      var t = payable - p;
      $('[data-discount-row]', order).hidden = d <= 0;
      $('[data-discount-sum]', order).textContent = '-' + won(d);
      var pr = $('[data-points-row]', order);
      if (pr) { pr.hidden = p <= 0; $('[data-points-sum]', order).textContent = '-' + won(p); }
      $('[data-total]', order).textContent = won(t); $('[data-total-btn]', order).textContent = won(t);
    };
    if (coupon) coupon.addEventListener('change', total);
    if (cpList) cpList.addEventListener('change', total);
    if (ptIn) {
      ptIn.addEventListener('input', total);
      var all = $('[data-points-all]', order);
      if (all) all.addEventListener('click', function () {
        var d = cpSum();
        var m = ptMax(Math.max(0, +order.dataset.amount + +order.dataset.fee - d));
        ptIn.value = m ? String(m) : ''; total();
        if (!m) window.toast('결제 금액이 적어 적립금을 쓸 수 없습니다.', 'error');
      });
    }
    total();
    var bankOnly = $('[data-bank-only]', order), autoOnly = $('[data-auto-only]', order);
    $$('[data-pay]', order).forEach(function (r) {
      r.addEventListener('change', function () {
        if (bankOnly) {
          bankOnly.hidden = r.value !== 'BANK';
          var dep = $('input[name=depositor]', bankOnly); if (dep) dep.required = r.value === 'BANK';
        }
        if (autoOnly) {
          autoOnly.hidden = r.value !== 'AUTO';
          var ag = $('input[name=agree_auto]', autoOnly); if (ag) ag.required = r.value === 'AUTO';
        }
      });
    });
    order.addEventListener('submit', function () { var b = $('[data-order-btn]', order); if (b) setTimeout(function () { b.disabled = true; }, 0); });
  }

  /* ---------- 주소 찾기 (다음 우편번호) ---------- */
  document.addEventListener('click', function (e) {
    var b = e.target.closest('[data-postcode]'); if (!b) return;
    var box = b.closest('[data-address]');
    if (!window.daum || !window.daum.Postcode) return window.toast('주소 찾기를 불러오는 중입니다. 잠시 뒤 다시 눌러 주세요.', 'error');
    new window.daum.Postcode({
      oncomplete: function (d) {
        $('[data-zip]', box).value = d.zonecode;
        $('[data-addr1]', box).value = (d.roadAddress || d.jibunAddress) + (d.buildingName ? ' (' + d.buildingName + ')' : '');
        $('[data-addr2]', box).focus();
      }
    }).open();
  });

  /* ---------- 폼 도우미 ---------- */
  // 휴대폰 번호 자동 하이픈
  document.addEventListener('input', function (e) {
    var el = e.target; if (el.type !== 'tel') return;
    var d = el.value.replace(/\D/g, '').slice(0, 11);
    el.value = d.length < 4 ? d : d.length < 8 ? d.slice(0, 3) + '-' + d.slice(3) : d.slice(0, 3) + '-' + d.slice(3, d.length - 4) + '-' + d.slice(-4);
  });
  // 비밀번호 보기
  document.addEventListener('click', function (e) {
    var b = e.target.closest('[data-pw-toggle]'); if (!b) return;
    var i = $('input', b.parentElement), show = i.type === 'password';
    i.type = show ? 'text' : 'password'; b.textContent = show ? '숨김' : '보기'; b.setAttribute('aria-label', show ? '비밀번호 숨기기' : '비밀번호 보기');
  });
  // 전체 동의
  $$('[data-agree]').forEach(function (box) {
    var all = $('[data-agree-all]', box), items = $$('input[type=checkbox]:not([data-agree-all])', box);
    all.addEventListener('change', function () { items.forEach(function (i) { i.checked = all.checked; }); });
    box.addEventListener('change', function (e) { if (e.target !== all) all.checked = items.every(function (i) { return i.checked; }); });
  });
  // 이메일 중복 확인
  $$('[data-email-check]').forEach(function (inp) {
    var msg = $('[data-email-msg]', inp.closest('.field'));
    inp.addEventListener('blur', function () {
      if (!inp.value || !msg) return;
      fetch('/register/email-check?email=' + encodeURIComponent(inp.value), { headers: { Accept: 'application/json' } }).then(function (r) { return r.json(); }).then(function (r) {
        msg.hidden = false;
        msg.textContent = !r.valid ? '이메일 형식을 확인해 주세요.' : r.available ? '쓸 수 있는 이메일입니다.' : '이미 가입된 이메일입니다. 로그인하거나 비밀번호를 재설정해 주세요.';
        msg.style.color = r.valid && r.available ? 'var(--green-700)' : 'var(--danger)';
      }).catch(function () {});
    });
  });
  // 확인이 필요한 동작
  document.addEventListener('submit', function (e) {
    var f = e.target; if (f.dataset.confirm && !window.confirm(f.dataset.confirm)) e.preventDefault();
  });
  $$('[data-auto-submit]').forEach(function (s) { s.addEventListener('change', function () { s.form.submit(); }); });
  // 자주 묻는 질문 종류 고르기
  $$('[data-faq-filter]').forEach(function (b) {
    b.addEventListener('click', function () {
      $$('[data-faq-filter]').forEach(function (x) { x.classList.toggle('is-on', x === b); });
      $$('.faq details').forEach(function (d) { d.hidden = b.dataset.faqFilter !== '' && d.dataset.cat !== b.dataset.faqFilter; });
    });
  });
  // 사진 크게 보기
  document.addEventListener('click', function (e) {
    var a = e.target.closest('[data-lightbox]'); if (!a) return;
    e.preventDefault();
    var box = document.createElement('div'); box.className = 'lightbox'; box.setAttribute('role', 'dialog'); box.setAttribute('aria-label', '사진 크게 보기');
    box.innerHTML = '<button type="button" aria-label="닫기"><svg class="icon" aria-hidden="true"><use href="#i-close"/></svg></button>';
    var img = document.createElement('img'); img.src = a.href; img.alt = ''; box.appendChild(img);
    var close = function () { box.remove(); document.removeEventListener('keydown', onKey); a.focus(); };
    var onKey = function (ev) { if (ev.key === 'Escape') close(); };
    box.addEventListener('click', close); document.addEventListener('keydown', onKey);
    document.body.appendChild(box); $('button', box).focus();
  });
})();

/* 넘겨 보는 배너([data-bn]): 화살표·자동 넘김·멈춤. 손으로 넘기는 것은 브라우저 스크롤 그대로 쓴다
   data-bn-ms = 자동 넘김 간격, data-bn-fit = 휴대폰에서 보이는 장 높이에 맞춤 */
(function () {
  var calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var narrow = window.matchMedia('(max-width: 767px)');
  Array.prototype.forEach.call(document.querySelectorAll('[data-bn]'), function (root) {
    var track = root.querySelector('.bn__track'), n = track.children.length;
    if (n < 2) return;
    var now = root.querySelector('[data-bn-now]'), pauseBtn = root.querySelector('[data-bn-pause]');
    var ms = parseInt(root.getAttribute('data-bn-ms'), 10) || 5000, fitOn = root.hasAttribute('data-bn-fit');
    var stopped = calm, hold = false, timer = null, last = -1;
    function idx() { return Math.max(0, Math.min(n - 1, Math.round(track.scrollLeft / track.clientWidth))); }
    function go(i) { track.scrollTo({ left: ((i + n) % n) * track.clientWidth, behavior: calm ? 'auto' : 'smooth' }); }
    function fit() { if (fitOn) track.style.height = narrow.matches ? track.children[idx()].offsetHeight + 'px' : ''; }
    function label() { if (!pauseBtn) return; pauseBtn.textContent = stopped ? '재생' : '멈춤'; pauseBtn.setAttribute('aria-pressed', stopped ? 'true' : 'false'); }
    // 배너 윗부분이 화면에 보일 때만 넘긴다 (아래를 읽는 중에 화면이 움직이지 않게)
    function onScreen() { var r = root.getBoundingClientRect(); return r.top > -160 && r.top < window.innerHeight * .7; }
    function tick() { clearInterval(timer); if (!stopped) timer = setInterval(function () { if (!hold && !document.hidden && onScreen()) go(idx() + 1); }, ms); }
    function sync() { var i = idx(); if (i === last) return; last = i; if (now) now.textContent = i + 1; fit(); }
    var prev = root.querySelector('[data-bn-prev]'), next = root.querySelector('[data-bn-next]');
    if (prev) prev.addEventListener('click', function () { go(idx() - 1); tick(); });
    if (next) next.addEventListener('click', function () { go(idx() + 1); tick(); });
    if (pauseBtn) pauseBtn.addEventListener('click', function () { stopped = !stopped; label(); tick(); });
    track.addEventListener('scroll', sync, { passive: true });
    ['mouseenter', 'focusin', 'touchstart'].forEach(function (e) { root.addEventListener(e, function () { hold = true; }, { passive: true }); });
    ['mouseleave', 'focusout', 'touchend'].forEach(function (e) { root.addEventListener(e, function () { hold = false; }, { passive: true }); });
    window.addEventListener('resize', function () { last = -1; sync(); });
    window.addEventListener('load', function () { last = -1; sync(); });
    label(); sync(); tick();
  });
})();
