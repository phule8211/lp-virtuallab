/* ============================================================
   ⚛️ LP.VirtualLab - PHÒNG THÍ NGHIỆM VẬT LÝ ẢO TƯƠNG TÁC
   Đơn vị: Trường Đại học Công nghệ – Đại học Quốc gia Hà Nội (VNU-UET)
   Tác giả: Lê Ngọc Phú
   Số điện thoại: 0853257289
   Email học thuật: 25020994@vnu.edu.vn
   ============================================================ */

// ============ UTILITY ============
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

function showToast(msg) {
    const t = $('#toast');
    if (!t) return;
    t.textContent = msg;
    t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), 2500);
}

// ============ KATEX MATH RENDERING ============
function renderFormulas() {
    if (typeof renderMathInElement === 'function') {
        try {
            renderMathInElement(document.body, {
                delimiters: [
                    { left: '$$', right: '$$', display: true },
                    { left: '$', right: '$', display: false }
                ],
                throwOnError: false
            });
        } catch (e) {
            console.warn('KaTeX render error:', e);
        }
    }
}

// Gọi render khi trang tải xong
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', renderFormulas);
} else {
    renderFormulas();
}
window.addEventListener('load', () => {
    renderFormulas();
    setTimeout(renderFormulas, 250);
});

// ============ PHET SIMULATION CONTROLLER (Quản lý Thời gian & Dock Điều Khiển) ============
window.SimEngines = {}; // Map of canvasId -> engine object

const SimManager = (function() {
    const states = new Map();

    function getOrCreateState(canvasId) {
        if (!states.has(canvasId)) {
            states.set(canvasId, {
                canvasId: canvasId,
                isRunning: true,
                speed: 1.0
            });
        }
        return states.get(canvasId);
    }

    return {
        getState(canvasId) {
            return getOrCreateState(canvasId);
        },
        setActiveCanvas(canvasId) {
            this.syncDockUI(canvasId);
        },
        togglePlayPause(canvasId) {
            const state = getOrCreateState(canvasId);
            const engine = window.SimEngines[canvasId];
            
            if (engine && typeof engine.toggle === 'function') {
                state.isRunning = engine.toggle();
            } else if (engine && typeof engine.start === 'function' && typeof engine.pause === 'function') {
                if (state.isRunning) {
                    engine.pause();
                    state.isRunning = false;
                } else {
                    engine.start();
                    state.isRunning = true;
                }
            } else {
                // Fallback: Tìm nút nội bộ của thí nghiệm
                const canvasEl = document.getElementById(canvasId);
                const section = canvasEl ? canvasEl.closest('.section') : null;
                if (section) {
                    const localPause = section.querySelector('[id$="-pause"]');
                    const localFire = section.querySelector('[id$="-fire"], [id$="-start"]');
                    if (!state.isRunning && localFire) {
                        localFire.click();
                        state.isRunning = true;
                    } else if (localPause) {
                        localPause.click();
                        state.isRunning = !state.isRunning;
                    } else {
                        state.isRunning = !state.isRunning;
                    }
                } else {
                    state.isRunning = !state.isRunning;
                }
            }

            this.syncDockUI(canvasId);
            this.syncLocalPauseButtons(canvasId, state.isRunning);
        },
        setPlayPause(canvasId, isRunning) {
            const state = getOrCreateState(canvasId);
            state.isRunning = isRunning;
            const engine = window.SimEngines[canvasId];
            if (engine) {
                if (isRunning && typeof engine.start === 'function') engine.start();
                if (!isRunning && typeof engine.pause === 'function') engine.pause();
            }
            this.syncDockUI(canvasId);
            this.syncLocalPauseButtons(canvasId, state.isRunning);
        },
        step(canvasId, dt = 0.02) {
            const state = getOrCreateState(canvasId);
            state.isRunning = false;
            const engine = window.SimEngines[canvasId];
            if (engine && typeof engine.step === 'function') {
                engine.step(dt);
            }
            this.syncDockUI(canvasId);
            this.syncLocalPauseButtons(canvasId, false);
        },
        setSpeed(canvasId, speed) {
            const state = getOrCreateState(canvasId);
            state.speed = typeof speed === 'number' ? speed : 1.0;
            const engine = window.SimEngines[canvasId];
            if (engine && typeof engine.setSpeed === 'function') {
                engine.setSpeed(state.speed);
            }
            this.syncDockUI(canvasId);
        },
        reset(canvasId) {
            const state = getOrCreateState(canvasId);
            state.isRunning = false;
            state.speed = 1.0;

            const engine = window.SimEngines[canvasId];
            if (engine && typeof engine.reset === 'function') {
                engine.reset();
            }

            // Tìm section chứa canvas này để reset inputs
            const canvasEl = document.getElementById(canvasId);
            const section = canvasEl ? canvasEl.closest('.section') : null;
            if (section) {
                const localReset = section.querySelector('[id$="-reset"]');
                if (localReset) {
                    try { localReset.click(); } catch (err) {}
                }

                const panel = section.querySelector('.controls-panel');
                if (panel) {
                    panel.querySelectorAll('input').forEach(input => {
                        if (input.type === 'range') {
                            input.value = input.defaultValue || ((parseFloat(input.min) + parseFloat(input.max)) / 2);
                            input.dispatchEvent(new Event('input', { bubbles: true }));
                            input.dispatchEvent(new Event('change', { bubbles: true }));
                        } else if (input.type === 'radio' || input.type === 'checkbox') {
                            input.checked = input.defaultChecked;
                            input.dispatchEvent(new Event('change', { bubbles: true }));
                        }
                    });
                    panel.querySelectorAll('select').forEach(sel => {
                        const defOpt = Array.from(sel.options).find(o => o.defaultSelected);
                        if (defOpt) sel.value = defOpt.value;
                        sel.dispatchEvent(new Event('change', { bubbles: true }));
                    });
                }
            }

            this.syncDockUI(canvasId);
            this.syncLocalPauseButtons(canvasId, false);
            showToast('🔄 Đã đặt lại trạng thái ban đầu của thí nghiệm');
        },
        syncDockUI(canvasId) {
            const dock = document.querySelector(`.primary-action-dock[data-target="${canvasId}"], .sim-control-dock[data-target="${canvasId}"]`);
            if (!dock) return;

            const state = getOrCreateState(canvasId);
            const engine = window.SimEngines[canvasId];
            if (engine && typeof engine.isRunning === 'function') {
                state.isRunning = engine.isRunning();
            }

            const playBtn = dock.querySelector('.btn-play-pause, .dock-play-pause-btn, .sim-btn-play');
            const stepBtn = dock.querySelector('.btn-step, .dock-step-btn, .sim-btn-step');
            const speedOpts = dock.querySelectorAll('.speed-opt, .dock-speed-pill, .sim-speed-btn');
            const badge = dock.querySelector('.dock-status-badge, .canvas-status-badge');

            if (playBtn) {
                if (state.isRunning) {
                    playBtn.classList.add('is-running');
                    playBtn.classList.remove('is-paused', 'paused');
                    const icon = playBtn.querySelector('.play-icon, .btn-icon, .sim-icon');
                    const label = playBtn.querySelector('.btn-label, .dock-label, .dock-text');
                    if (icon) icon.textContent = '⏸';
                    if (label) label.textContent = 'Tạm dừng';
                } else {
                    playBtn.classList.remove('is-running');
                    playBtn.classList.add('is-paused', 'paused');
                    const icon = playBtn.querySelector('.play-icon, .btn-icon, .sim-icon');
                    const label = playBtn.querySelector('.btn-label, .dock-label, .dock-text');
                    if (icon) icon.textContent = '▶';
                    if (label) label.textContent = 'Bắt đầu';
                }
            }

            if (stepBtn) {
                stepBtn.disabled = state.isRunning;
            }

            if (speedOpts.length) {
                speedOpts.forEach(btn => {
                    const sp = parseFloat(btn.dataset.speed);
                    if (Math.abs(sp - state.speed) < 0.05) {
                        btn.classList.add('active');
                        btn.setAttribute('aria-pressed', 'true');
                    } else {
                        btn.classList.remove('active');
                        btn.removeAttribute('aria-pressed');
                    }
                });
            }

            if (badge) {
                if (state.isRunning) {
                    badge.classList.remove('paused');
                    badge.textContent = state.speed === 1.0 ? '🟢 Đang chạy' : `🟢 Đang chạy (${state.speed}x)`;
                } else {
                    badge.classList.add('paused');
                    badge.textContent = '⏸ Đã tạm dừng';
                }
            }
        },
        syncLocalPauseButtons(canvasId, isRunning) {
            const canvasEl = document.getElementById(canvasId);
            const section = canvasEl ? canvasEl.closest('.section') : null;
            if (!section) return;
            const localPause = section.querySelector('[id$="-pause"]');
            if (localPause) {
                localPause.textContent = isRunning ? '⏸️ Tạm dừng' : '▶️ Tiếp tục';
            }
        }
    };
})();
window.SimManager = SimManager;

// ============ KHỞI TẠO THANH ĐIỀU KHIỂN PHET (ACTION DOCKS) ============
function initPrimaryActionDocks() {
    const docks = $$('.primary-action-dock, .sim-control-dock');
    docks.forEach(dock => {
        const canvasId = dock.dataset.target || (dock.previousElementSibling && dock.previousElementSibling.id);
        if (!canvasId) return;

        // 1. Nút Reset
        const resetBtn = dock.querySelector('.btn-reset, .dock-reset-btn, .sim-btn-reset');
        if (resetBtn && !resetBtn.dataset.wired) {
            resetBtn.dataset.wired = 'true';
            resetBtn.addEventListener('click', (e) => {
                e.preventDefault();
                SimManager.reset(canvasId);
            });
        }

        // 2. Nút Play / Pause
        const playBtn = dock.querySelector('.btn-play-pause, .dock-play-pause-btn, .sim-btn-play');
        if (playBtn && !playBtn.dataset.wired) {
            playBtn.dataset.wired = 'true';
            playBtn.addEventListener('click', (e) => {
                e.preventDefault();
                SimManager.togglePlayPause(canvasId);
            });
        }

        // 3. Nút Step (Bước tiếp)
        const stepBtn = dock.querySelector('.btn-step, .dock-step-btn, .sim-btn-step');
        if (stepBtn && !stepBtn.dataset.wired) {
            stepBtn.dataset.wired = 'true';
            stepBtn.addEventListener('click', (e) => {
                e.preventDefault();
                SimManager.step(canvasId, 0.02);
            });
        }

        // 4. Các nút Tốc độ (Speed Pills: 0.5x, 1x, 2x)
        const speedOpts = dock.querySelectorAll('.speed-opt, .dock-speed-pill, .sim-speed-btn');
        speedOpts.forEach(btn => {
            if (!btn.dataset.wired) {
                btn.dataset.wired = 'true';
                btn.addEventListener('click', (e) => {
                    e.preventDefault();
                    const sp = parseFloat(btn.dataset.speed) || 1.0;
                    SimManager.setSpeed(canvasId, sp);
                });
            }
        });

        // Đồng bộ giao diện ban đầu của dock
        SimManager.syncDockUI(canvasId);
    });

    // Lắng nghe phím tắt bàn phím chuẩn PhET
    if (!window._phetKeysBound) {
        window._phetKeysBound = true;
        window.addEventListener('keydown', (e) => {
            // Không bắt phím khi người dùng đang nhập text vào ô input
            if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) {
                return;
            }

            const activeSection = $('.section.active');
            if (!activeSection) return;
            const canvas = activeSection.querySelector('canvas:not(#bg-particles)');
            if (!canvas) return;

            if (e.code === 'Space') {
                e.preventDefault();
                SimManager.togglePlayPause(canvas.id);
            } else if (e.key === 'r' || e.key === 'R') {
                e.preventDefault();
                SimManager.reset(canvas.id);
            } else if (e.key === '.' || e.code === 'ArrowRight') {
                e.preventDefault();
                SimManager.step(canvas.id, 0.02);
            }
        });
    }
}
// ============ TỐI ƯU HÓA CANVAS RESPONSIVE & RETINA HIDPI ============
function setupResponsiveCanvases() {
    const containers = $$('.canvas-container, .canvas-viewport, .canvas-master-card');
    
    // Áp dụng ResizeObserver để cập nhật kích thước chuẩn tỷ lệ 700:460
    if (typeof ResizeObserver !== 'undefined') {
        const observer = new ResizeObserver((entries) => {
            for (const entry of entries) {
                const container = entry.target;
                const canvas = container.querySelector('canvas:not(#bg-particles)');
                if (canvas) {
                    canvas.style.aspectRatio = '700 / 460';
                    canvas.style.width = '100%';
                    canvas.style.height = 'auto';
                    canvas.style.maxWidth = '100%';
                }
            }
        });
        containers.forEach(c => observer.observe(c));
    }

    // Đảm bảo mọi canvas có thuộc tính CSS phù hợp
    $$('canvas:not(#bg-particles)').forEach(cv => {
        cv.style.aspectRatio = '700 / 460';
        cv.style.width = '100%';
        cv.style.height = 'auto';
        cv.style.maxWidth = '100%';
    });
}

// Khởi chạy khi DOM sẵn sàng
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        initPrimaryActionDocks();
        setupResponsiveCanvases();
    });
} else {
    initPrimaryActionDocks();
    setupResponsiveCanvases();
}

// ============ NAVIGATION & CHUYỂN TAB THÍ NGHIỆM ============
function activateSection(sectionId) {
    // Ẩn tất cả section và hiện section mục tiêu
    $$('.section').forEach(s => s.classList.remove('active'));
    const targetSection = $(`#${sectionId}`);
    if (targetSection) {
        targetSection.classList.add('active');
        window.scrollTo({ top: 0, behavior: 'smooth' });
        // Render công thức toán khi chuyển tab
        setTimeout(renderFormulas, 30);
    }

    // Cập nhật trạng thái active của nav-link
    $$('.nav-link').forEach(l => l.classList.remove('active'));
    const activeLink = $(`.nav-link[data-section="${sectionId}"]`);
    if (activeLink) {
        activeLink.classList.add('active');
        // Tự động mở nhóm accordion cha nếu là sublink
        const parentCategory = activeLink.closest('.nav-category');
        if (parentCategory) {
            parentCategory.classList.add('open');
        }
    }

    // Đóng sidebar drawer trên thiết bị di động
    const sidebar = $('#sidebar');
    const overlay = $('#sidebarOverlay');
    if (sidebar && sidebar.classList.contains('open')) {
        sidebar.classList.remove('open');
        if (overlay) overlay.classList.remove('active');
    }

    // 1. Phát Custom Event theo yêu cầu đặc tả:
    window.dispatchEvent(new CustomEvent('section-activated', { detail: { sectionId } }));

    // 2. Tự động phát sự kiện resize và redraw để Canvas vẽ ngay lập tức mà không cần bấm nút
    window.dispatchEvent(new Event('resize'));
    requestAnimationFrame(() => {
        if (targetSection) {
            const canvas = targetSection.querySelector('canvas:not(#bg-particles)');
            if (canvas) {
                SimManager.setActiveCanvas(canvas.id);
                window.dispatchEvent(new CustomEvent('simulation-redraw', { detail: { canvasId: canvas.id, sectionId } }));

                // Giả lập kích hoạt input trên slider đầu tiên để kích hoạt hàm sync và redraw cảnh ban đầu
                const firstSlider = targetSection.querySelector('.controls-panel input[type="range"]');
                if (firstSlider) {
                    firstSlider.dispatchEvent(new Event('input', { bubbles: true }));
                }
            }
        }
    });
}
window.activateSection = activateSection;

// ============ MỞ / THU GỌN ACCORDION & ĐIỀU HƯỚNG ============
function toggleCategory(catElement) {
    if (!catElement) return;
    catElement.classList.toggle('open');
}

// Bắt sự kiện click toàn cục (Event Delegation)
document.addEventListener('click', (e) => {
    // 1. Bấm vào tiêu đề chuyên mục để mở ra / thu vào (Accordion Toggle)
    const header = e.target.closest('.category-header');
    if (header) {
        e.preventDefault();
        e.stopPropagation();
        const cat = header.closest('.nav-category');
        toggleCategory(cat);
        return;
    }

    // 2. Bấm vào link thí nghiệm trong sidebar
    const link = e.target.closest('.nav-link');
    if (link && link.dataset.section) {
        e.preventDefault();
        activateSection(link.dataset.section);
        return;
    }

    // 3. Bấm vào card thí nghiệm trên trang chủ
    const card = e.target.closest('.exp-card');
    if (card && card.dataset.target) {
        activateSection(card.dataset.target);
        const title = card.querySelector('h3') ? card.querySelector('h3').textContent : 'thí nghiệm';
        showToast(`🧪 Đang mở thí nghiệm: ${title}`);
        return;
    }

    // 4. Bấm vào logo / thương hiệu về trang chủ
    const brand = e.target.closest('.nav-brand, .mobile-brand');
    if (brand) {
        activateSection('home');
        return;
    }
});

// ============ TÌM KIẾM NHANH (INSTANT SEARCH) ============
function initSearch() {
    const searchInput = document.getElementById('sidebarSearchInput');
    if (!searchInput) return;

    searchInput.addEventListener('input', () => {
        const query = searchInput.value.trim().toLowerCase();
        const cards = $$('.exp-card');
        const navLinks = $$('.nav-sublink');
        const categories = $$('.nav-category');

        // Lọc card trên trang chủ
        cards.forEach(card => {
            const text = card.textContent.toLowerCase();
            card.style.display = (!query || text.includes(query)) ? '' : 'none';
        });

        // Lọc danh sách trong sidebar
        if (!query) {
            // Khôi phục mặc định: hiện lại toàn bộ chuyên mục và bài thí nghiệm
            categories.forEach(cat => { cat.style.display = ''; });
            navLinks.forEach(link => { link.style.display = ''; });
        } else {
            // Khi có từ khóa tìm kiếm:
            categories.forEach(cat => {
                let hasMatch = false;
                const linksInCat = cat.querySelectorAll('.nav-sublink');
                linksInCat.forEach(link => {
                    const text = link.textContent.toLowerCase();
                    if (text.includes(query)) {
                        link.style.display = 'flex';
                        hasMatch = true;
                    } else {
                        link.style.display = 'none';
                    }
                });
                if (hasMatch) {
                    cat.style.display = '';
                    cat.classList.add('open'); // Tự động mở chuyên mục chứa kết quả
                } else {
                    cat.style.display = 'none'; // Ẩn chuyên mục không có kết quả để thanh menu gọn gàng
                }
            });
        }
    });
}
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initSearch);
} else {
    initSearch();
}

// ============ MOBILE SIDEBAR TOGGLE ============
const menuToggle = $('#menuToggle');
const sidebar = $('#sidebar');
const sidebarOverlay = $('#sidebarOverlay');

if (menuToggle && sidebar && sidebarOverlay) {
    menuToggle.addEventListener('click', () => {
        sidebar.classList.toggle('open');
        sidebarOverlay.classList.toggle('active');
    });

    sidebarOverlay.addEventListener('click', () => {
        sidebar.classList.remove('open');
        sidebarOverlay.classList.remove('active');
    });
}

// ============ THEME TOGGLE ============
function toggleTheme() {
    document.body.classList.toggle('light-theme');
    const isLight = document.body.classList.contains('light-theme');
    
    const toggleBtn = $('#themeToggle');
    if (toggleBtn) {
        const icon = toggleBtn.querySelector('.theme-icon');
        const label = toggleBtn.querySelector('.theme-label');
        if (icon) icon.textContent = isLight ? '☀️' : '🌙';
        if (label) label.textContent = isLight ? 'Giao diện sáng' : 'Giao diện tối';
    }
    
    const toggleMobile = $('#themeToggleMobile');
    if (toggleMobile) {
        toggleMobile.textContent = isLight ? '☀️' : '🌙';
    }
}

if ($('#themeToggle')) $('#themeToggle').addEventListener('click', toggleTheme);
if ($('#themeToggleMobile')) $('#themeToggleMobile').addEventListener('click', toggleTheme);

// ============ ANIMATED BACKGROUND PARTICLES (Retina HiDPI Support) ============
(function initParticles() {
    const canvas = $('#bg-particles');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let width, height;
    let particles = [];
    const count = 45;

    function resize() {
        const dpr = window.devicePixelRatio || 1;
        width = window.innerWidth;
        height = window.innerHeight;
        canvas.width = width * dpr;
        canvas.height = height * dpr;
        canvas.style.width = width + 'px';
        canvas.style.height = height + 'px';
        ctx.scale(dpr, dpr);
    }
    window.addEventListener('resize', resize);
    resize();

    class Particle {
        constructor() {
            this.x = Math.random() * width;
            this.y = Math.random() * height;
            this.vx = (Math.random() - 0.5) * 0.4;
            this.vy = (Math.random() - 0.5) * 0.4;
            this.r = Math.random() * 2 + 1;
        }
        update() {
            this.x += this.vx;
            this.y += this.vy;
            if (this.x < 0) this.x = width;
            if (this.x > width) this.x = 0;
            if (this.y < 0) this.y = height;
            if (this.y > height) this.y = 0;
        }
        draw() {
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(56, 189, 248, 0.25)';
            ctx.fill();
        }
    }

    for (let i = 0; i < count; i++) {
        particles.push(new Particle());
    }

    function animate() {
        ctx.clearRect(0, 0, width, height);
        particles.forEach(p => {
            p.update();
            p.draw();
        });

        // Kết nối các hạt ở gần
        for (let i = 0; i < count; i++) {
            for (let j = i + 1; j < count; j++) {
                const dx = particles[i].x - particles[j].x;
                const dy = particles[i].y - particles[j].y;
                const dist = Math.hypot(dx, dy);
                if (dist < 100) {
                    ctx.strokeStyle = `rgba(56, 189, 248, ${0.15 * (1 - dist / 100)})`;
                    ctx.lineWidth = 0.8;
                    ctx.beginPath();
                    ctx.moveTo(particles[i].x, particles[i].y);
                    ctx.lineTo(particles[j].x, particles[j].y);
                    ctx.stroke();
                }
            }
        }
        requestAnimationFrame(animate);
    }
    animate();
})();

/* ============================================================
   📦 ALL SIMULATIONS BUNDLED (Zero 404 Guarantee)
   ============================================================ */


/* --- BUNDLED: simulations/mechanics.js --- */
/* ============================================================
   ⚙️ LP.VirtualLab - CHUYÊN ĐỀ 1: CƠ HỌC (Mechanics)
   Bao gồm 7 bài mô phỏng chuẩn mực Vật lý Đại cương 1:
   1. Chuyển động ném xiên và ném ngang (Projectile Motion)
   2. Định luật Newton & Ma sát trên mặt phẳng nghiêng (Forces & Friction)
   3. Chuyển động tròn đều & Lực hướng tâm (Circular Motion & Centripetal)
   4. Va chạm & Bảo toàn động lượng (Collision & Momentum Conservation)
   5. Bảo toàn cơ năng - Đường trượt Skate Park (Energy Conservation)
   6. Cân bằng vật rắn & Momen lực - Đòn bẩy (Balancing Act & Torque)
   7. Chuyển động quay & Momen quán tính (Rotational Inertia & Angular Momentum)
   + Lực hấp dẫn & Quỹ đạo Kepler (Gravitational Orbits)
   Tác giả: Lê Ngọc Phú - SĐT: 0853257289
   ============================================================ */

// ─────────────────────────────────────────────────────────────
// 1. CHUYỂN ĐỘNG NÉM XIÊN VÀ NÉM NGANG (Projectile & Horizontal Launch)
// ─────────────────────────────────────────────────────────────
(function initProjectile() {
    const canvas = document.getElementById('projectileCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    let x = 50, y = 390;
    let vx = 0, vy = 0;
    let time = 0;
    let running = false;
    let paused = false;
    let speedMult = 1.0;
    let trajectory = [];
    let idealTrajectory = [];
    let particles = [];
    let maxHeight = 0;
    let maxDistance = 0;
    let totalFlightTime = 0;
    let theoreticalMaxH = 0;
    let theoreticalRange = 0;
    let theoreticalPeakX = 0;
    let theoreticalPeakY = 0;
    let hasLanded = false;

    function getParams() {
        const angleEl = document.getElementById('proj-angle');
        const v0El = document.getElementById('proj-v0');
        const h0El = document.getElementById('proj-h0');
        const gEl = document.getElementById('proj-g');
        const dragEl = document.getElementById('proj-drag');
        const modeEl = document.querySelector('input[name="proj-mode"]:checked');

        const mode = modeEl ? modeEl.value : 'oblique'; // oblique or horizontal
        const angleDeg = mode === 'horizontal' ? 0 : (angleEl ? parseFloat(angleEl.value) : 45);
        const v0 = v0El ? parseFloat(v0El.value) : 25;
        const h0 = h0El ? parseFloat(h0El.value) : (mode === 'horizontal' ? 20 : 0);
        const g = gEl ? parseFloat(gEl.value) : 9.8;
        const drag = dragEl ? parseFloat(dragEl.value) : 0;

        return { mode, angleDeg, v0, h0, g, drag };
    }

    function syncValueLabels() {
        const p = getParams();
        const aVal = document.getElementById('proj-angle-val');
        const vVal = document.getElementById('proj-v0-val');
        const hVal = document.getElementById('proj-h0-val');
        const gVal = document.getElementById('proj-g-val');
        const dVal = document.getElementById('proj-drag-val');
        if (aVal) aVal.textContent = p.angleDeg.toFixed(0);
        if (vVal) vVal.textContent = p.v0.toFixed(1);
        if (hVal) hVal.textContent = p.h0.toFixed(1);
        if (gVal) gVal.textContent = p.g.toFixed(1);
        if (dVal) dVal.textContent = p.drag > 0 ? (p.drag * 100).toFixed(1) + '%' : 'Không (Lý tưởng)';
    }

    function computeIdealTrajectory(p) {
        idealTrajectory = [];
        const rad = (p.angleDeg * Math.PI) / 180;
        const v0x = p.v0 * Math.cos(rad);
        const v0y = p.v0 * Math.sin(rad);
        const groundY = canvas.height - 70;
        const pxStep = 4; // 4px per meter

        // Thời gian lên đỉnh và độ cao cực đại lý thuyết
        const tPeak = v0y > 0 ? v0y / p.g : 0;
        theoreticalMaxH = p.h0 + (v0y > 0 ? (v0y * v0y) / (2 * p.g) : 0);
        theoreticalPeakX = 50 + (v0x * tPeak) * pxStep;
        theoreticalPeakY = groundY - theoreticalMaxH * pxStep;

        // Thời gian chạm đất lý thuyết: h0 + v0y*t - 0.5*g*t^2 = 0
        const discr = v0y * v0y + 2 * p.g * p.h0;
        const tGround = (v0y + Math.sqrt(Math.max(0, discr))) / p.g;
        theoreticalRange = v0x * tGround;

        const dt = 0.02;
        let t = 0;
        while (t <= tGround + 0.02) {
            const curX = v0x * t;
            const curY = p.h0 + v0y * t - 0.5 * p.g * t * t;
            if (curY < 0 && t > 0) {
                idealTrajectory.push({ x: 50 + theoreticalRange * pxStep, y: groundY });
                break;
            }
            idealTrajectory.push({ x: 50 + curX * pxStep, y: groundY - curY * pxStep });
            t += dt;
        }
    }

    function resetSimulation() {
        running = false;
        paused = false;
        hasLanded = false;
        time = 0;
        trajectory = [];
        particles = [];
        const p = getParams();
        const groundY = canvas.height - 70;
        const startYPx = groundY - p.h0 * 4;
        const rad = (p.angleDeg * Math.PI) / 180;
        const barrelLen = 52;
        x = 50 + Math.cos(rad) * barrelLen;
        y = startYPx - Math.sin(rad) * barrelLen;
        vx = 0;
        vy = 0;
        maxHeight = p.h0;
        maxDistance = 0;
        totalFlightTime = 0;

        computeIdealTrajectory(p);
        updateDataPanel(p.h0, 0, p.v0, theoreticalMaxH, 0);
        draw();

        if (window.SimManager) {
            window.SimManager.syncDockUI('projectileCanvas');
        }
    }

    function fire() {
        resetSimulation();
        const p = getParams();
        const rad = (p.angleDeg * Math.PI) / 180;
        const barrelLen = 52;
        const groundY = canvas.height - 70;
        const startYPx = groundY - p.h0 * 4;

        x = 50 + Math.cos(rad) * barrelLen;
        y = startYPx - Math.sin(rad) * barrelLen;
        vx = p.v0 * Math.cos(rad);
        vy = -p.v0 * Math.sin(rad); // Trục y hướng xuống
        running = true;
        paused = false;
        hasLanded = false;

        // Tạo chùm khói bắn pháo (muzzle flash)
        for (let i = 0; i < 20; i++) {
            particles.push({
                x: x + (Math.random() - 0.5) * 8,
                y: y + (Math.random() - 0.5) * 8,
                vx: (Math.random() * 2 + 1) * Math.cos(rad + (Math.random() - 0.5) * 0.5) * 15,
                vy: -(Math.random() * 2 + 1) * Math.sin(rad + (Math.random() - 0.5) * 0.5) * 15,
                life: 1.0,
                color: Math.random() > 0.4 ? '#f59e0b' : '#ef4444',
                radius: Math.random() * 5 + 3
            });
        }

        computeIdealTrajectory(p);

        if (window.SimManager) {
            window.SimManager.syncDockUI('projectileCanvas');
        }
    }

    function update(dt) {
        // Cập nhật hạt khói/bụi dù đang dừng hay bay
        for (let i = particles.length - 1; i >= 0; i--) {
            const pt = particles[i];
            pt.x += pt.vx * dt;
            pt.y += pt.vy * dt;
            pt.life -= dt * 1.8;
            if (pt.life <= 0) particles.splice(i, 1);
        }

        if (!running || paused) return;
        const p = getParams();

        // Lực cản không khí bậc 2: F_d = -0.5 * rho * Cd * A * v^2
        const speed = Math.hypot(vx, vy);
        const dragFactor = p.drag * 0.08;
        const ax = -dragFactor * speed * vx;
        const ay = p.g + (-dragFactor * speed * vy);

        vx += ax * dt;
        vy += ay * dt;

        const groundY = canvas.height - 70;
        const pxStep = 4; // 1 mét = 4 pixel

        x += vx * dt * pxStep;
        y += vy * dt * pxStep;
        time += dt;

        // Lưu vết khói bay phía sau viên đạn
        if (Math.random() > 0.3) {
            particles.push({
                x: x,
                y: y,
                vx: -vx * 0.15 + (Math.random() - 0.5) * 5,
                vy: -vy * 0.15 + (Math.random() - 0.5) * 5,
                life: 0.6,
                color: 'rgba(226, 232, 240, 0.6)',
                radius: Math.random() * 3 + 2
            });
        }

        const currentAltitude = Math.max(0, (groundY - y) / pxStep);
        const currentRange = (x - 50) / pxStep;

        if (currentAltitude > maxHeight) maxHeight = currentAltitude;
        maxDistance = Math.max(0, currentRange);
        totalFlightTime = time;

        trajectory.push({ x, y });

        // Kiểm tra chạm đất
        if (y >= groundY) {
            y = groundY;
            running = false;
            hasLanded = true;

            // Bụi va chạm mặt đất
            for (let i = 0; i < 25; i++) {
                particles.push({
                    x: x + (Math.random() - 0.5) * 10,
                    y: groundY - 2,
                    vx: (Math.random() - 0.5) * 40,
                    vy: -(Math.random() * 25 + 5),
                    life: 0.8,
                    color: Math.random() > 0.5 ? '#22c55e' : '#cbd5e1',
                    radius: Math.random() * 4 + 2
                });
            }

            if (window.SimManager) {
                window.SimManager.syncDockUI('projectileCanvas');
            }
        }

        updateDataPanel(currentAltitude, currentRange, Math.hypot(vx, vy), maxHeight, totalFlightTime);
    }

    function updateDataPanel(alt, range, curV, maxH, tFlight) {
        const hEl = document.getElementById('proj-height');
        const rEl = document.getElementById('proj-range');
        const vEl = document.getElementById('proj-vel');
        const maxHEl = document.getElementById('proj-max-h');
        const tEl = document.getElementById('proj-flight-time');
        if (hEl) hEl.textContent = Math.max(0, alt).toFixed(2) + ' m';
        if (rEl) rEl.textContent = Math.max(0, range).toFixed(2) + ' m';
        if (vEl) vEl.textContent = curV.toFixed(2) + ' m/s';
        if (maxHEl) maxHEl.textContent = maxH.toFixed(2) + ' m';
        if (tEl) tEl.textContent = tFlight.toFixed(2) + ' s';
    }

    function draw() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        const groundY = canvas.height - 70;
        const p = getParams();
        const rad = (p.angleDeg * Math.PI) / 180;
        const barrelLen = 52;
        const startY = groundY - p.h0 * 4;

        // 1. Bầu trời sâu thẳm & lưới tọa độ khoa học
        const skyGrad = ctx.createLinearGradient(0, 0, 0, groundY);
        skyGrad.addColorStop(0, '#040d1a');
        skyGrad.addColorStop(0.6, '#071b34');
        skyGrad.addColorStop(1, '#0c2e55');
        ctx.fillStyle = skyGrad;
        ctx.fillRect(0, 0, canvas.width, groundY);

        // Lưới tọa độ nhẹ
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
        ctx.lineWidth = 1;
        for (let gx = 50; gx < canvas.width; gx += 40) {
            ctx.beginPath();
            ctx.moveTo(gx, 0);
            ctx.lineTo(gx, groundY);
            ctx.stroke();
        }
        for (let gy = groundY; gy > 0; gy -= 40) {
            ctx.beginPath();
            ctx.moveTo(0, gy);
            ctx.lineTo(canvas.width, gy);
            ctx.stroke();
        }

        // 2. Thước đo mặt đất & Thảm cỏ sắc nét
        // Đất bên dưới
        const dirtGrad = ctx.createLinearGradient(0, groundY, 0, canvas.height);
        dirtGrad.addColorStop(0, '#0f291e');
        dirtGrad.addColorStop(1, '#06150f');
        ctx.fillStyle = dirtGrad;
        ctx.fillRect(0, groundY, canvas.width, 70);

        // Mặt cỏ viền phát sáng
        ctx.strokeStyle = '#22c55e';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(0, groundY);
        ctx.lineTo(canvas.width, groundY);
        ctx.stroke();

        // Vạch chia thước đo mét với số to rõ ràng
        ctx.fillStyle = '#cbd5e1';
        ctx.font = 'bold 11.5px "Space Grotesk", -apple-system, sans-serif';
        for (let m = 0; m <= 200; m += 10) {
            const rx = 50 + m * 4;
            if (rx < canvas.width) {
                const isMajor = m % 20 === 0;
                ctx.strokeStyle = isMajor ? '#38bdf8' : 'rgba(203, 213, 225, 0.4)';
                ctx.lineWidth = isMajor ? 1.5 : 1;
                ctx.beginPath();
                ctx.moveTo(rx, groundY);
                ctx.lineTo(rx, groundY + (isMajor ? 10 : 5));
                ctx.stroke();

                if (isMajor) {
                    ctx.fillStyle = '#e2e8f0';
                    ctx.fillText(m + 'm', rx - 10, groundY + 24);
                }
            }
        }

        // 3. Hồng tâm đích đến (Bullseye Target) tại vị trí lý thuyết
        const targetX = 50 + theoreticalRange * 4;
        if (targetX < canvas.width + 50) {
            // Đĩa hồng tâm tròn
            ctx.save();
            ctx.translate(targetX, groundY);
            
            // Bóng đổ
            ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
            ctx.beginPath();
            ctx.ellipse(0, 2, 20, 6, 0, 0, Math.PI * 2);
            ctx.fill();

            // Vòng ngoài màu đỏ
            ctx.fillStyle = '#ef4444';
            ctx.beginPath();
            ctx.ellipse(0, 0, 18, 5, 0, 0, Math.PI * 2);
            ctx.fill();

            // Vòng trắng
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.ellipse(0, 0, 12, 3.5, 0, 0, Math.PI * 2);
            ctx.fill();

            // Tâm đỏ
            ctx.fillStyle = '#ef4444';
            ctx.beginPath();
            ctx.ellipse(0, 0, 6, 2, 0, 0, Math.PI * 2);
            ctx.fill();

            // Cột cờ đích
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(0, -38);
            ctx.stroke();

            // Lá cờ đỏ
            ctx.fillStyle = '#ef4444';
            ctx.beginPath();
            ctx.moveTo(0, -38);
            ctx.lineTo(22, -30);
            ctx.lineTo(0, -22);
            ctx.closePath();
            ctx.fill();

            // Nhãn cờ đích
            ctx.fillStyle = '#fbbf24';
            ctx.font = 'bold 11px "Space Grotesk", -apple-system, sans-serif';
            ctx.fillText(`🎯 L = ${theoreticalRange.toFixed(1)}m`, -25, -42);
            ctx.restore();
        }

        // 4. Quỹ đạo lý thuyết (Nét đứt màu vàng nổi bật với đỉnh H_max)
        if (idealTrajectory.length > 1) {
            ctx.save();
            ctx.setLineDash([6, 5]);
            ctx.strokeStyle = '#fbbf24';
            ctx.lineWidth = 2;
            ctx.beginPath();
            idealTrajectory.forEach((pt, i) => {
                if (i === 0) ctx.moveTo(pt.x, pt.y);
                else ctx.lineTo(pt.x, pt.y);
            });
            ctx.stroke();
            ctx.restore();

            // Đánh dấu đỉnh cao nhất H_max
            if (theoreticalMaxH > 0 && theoreticalPeakX < canvas.width && theoreticalPeakY > 0) {
                ctx.save();
                // Đường gióng đứt nét xuống đất
                ctx.setLineDash([3, 3]);
                ctx.strokeStyle = 'rgba(251, 191, 36, 0.4)';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(theoreticalPeakX, theoreticalPeakY);
                ctx.lineTo(theoreticalPeakX, groundY);
                ctx.stroke();
                ctx.restore();

                // Điểm đỉnh
                ctx.fillStyle = '#fbbf24';
                ctx.beginPath();
                ctx.arc(theoreticalPeakX, theoreticalPeakY, 4.5, 0, Math.PI * 2);
                ctx.fill();
                ctx.strokeStyle = '#ffffff';
                ctx.lineWidth = 1.5;
                ctx.stroke();

                // Nhãn H_max
                ctx.fillStyle = '#fbbf24';
                ctx.font = 'bold 11.5px "Space Grotesk", -apple-system, sans-serif';
                ctx.fillText(`⭐ H_max = ${theoreticalMaxH.toFixed(1)}m`, theoreticalPeakX - 35, theoreticalPeakY - 10);
            }
        }

        // 5. Quỹ đạo thực tế đã bay (Nét liền màu xanh dương Cyan rực rỡ)
        if (trajectory.length > 1) {
            ctx.save();
            ctx.strokeStyle = '#38bdf8';
            ctx.lineWidth = 3;
            ctx.shadowColor = '#38bdf8';
            ctx.shadowBlur = 8;
            ctx.beginPath();
            trajectory.forEach((pt, i) => {
                if (i === 0) ctx.moveTo(pt.x, pt.y);
                else ctx.lineTo(pt.x, pt.y);
            });
            ctx.stroke();
            ctx.restore();
        }

        // 6. Vẽ các hạt khói / lửa (Particles)
        particles.forEach(pt => {
            ctx.save();
            ctx.fillStyle = pt.color;
            ctx.globalAlpha = Math.max(0, pt.life);
            ctx.beginPath();
            ctx.arc(pt.x, pt.y, pt.radius, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        });

        // 7. Bệ phóng & Khẩu pháo chuẩn PhET (Pháo kim loại hoành tráng)
        // Nếu có độ cao h0: Vẽ trụ đỡ bê tông
        if (p.h0 > 0) {
            const towerW = 28;
            const towerH = p.h0 * 4;
            const twGrad = ctx.createLinearGradient(50 - towerW/2, startY, 50 + towerW/2, groundY);
            twGrad.addColorStop(0, '#475569');
            twGrad.addColorStop(0.5, '#334155');
            twGrad.addColorStop(1, '#1e293b');
            ctx.fillStyle = twGrad;
            ctx.fillRect(50 - towerW/2, startY, towerW, towerH);
            ctx.strokeStyle = '#64748b';
            ctx.lineWidth = 1.5;
            ctx.strokeRect(50 - towerW/2, startY, towerW, towerH);

            // Nhãn độ cao h0
            ctx.fillStyle = '#38bdf8';
            ctx.font = 'bold 11px "Space Grotesk", -apple-system, sans-serif';
            ctx.fillText(`h₀ = ${p.h0}m`, 50 + towerW/2 + 5, startY + towerH/2);
        }

        // Vẽ bệ pháo xoay (Pivot Mount & Wheel)
        ctx.save();
        ctx.translate(50, startY);

        // Vòng cung đo góc bắn (Protractor Sector)
        ctx.strokeStyle = 'rgba(251, 191, 36, 0.45)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(0, 0, 42, -Math.PI / 2, 0);
        ctx.stroke();

        ctx.strokeStyle = '#fbbf24';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, 42, -rad, 0);
        ctx.stroke();

        // Nhãn góc θ
        ctx.fillStyle = '#fbbf24';
        ctx.font = 'bold 12px "Space Grotesk", -apple-system, sans-serif';
        const labelRad = -rad / 2;
        ctx.fillText(`${p.angleDeg}°`, 48 * Math.cos(labelRad) + 4, 48 * Math.sin(labelRad) + 3);

        // Nòng pháo kim loại xoay
        ctx.rotate(-rad);

        // Thân nòng pháo (Gradient xanh thép)
        const barrelGrad = ctx.createLinearGradient(0, -9, 0, 9);
        barrelGrad.addColorStop(0, '#0369a1');
        barrelGrad.addColorStop(0.4, '#38bdf8');
        barrelGrad.addColorStop(0.8, '#0284c7');
        barrelGrad.addColorStop(1, '#075985');
        ctx.fillStyle = barrelGrad;
        ctx.fillRect(0, -9, barrelLen, 18);
        ctx.strokeStyle = '#bae6fd';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(0, -9, barrelLen, 18);

        // Vành miệng nòng pháo (Muzzle Ring)
        ctx.fillStyle = '#fbbf24';
        ctx.fillRect(barrelLen - 4, -11, 6, 22);
        ctx.strokeStyle = '#d97706';
        ctx.lineWidth = 1;
        ctx.strokeRect(barrelLen - 4, -11, 6, 22);

        // Đuôi nòng pháo bo tròn
        ctx.fillStyle = '#0c4a6e';
        ctx.beginPath();
        ctx.arc(0, 0, 11, Math.PI / 2, -Math.PI / 2);
        ctx.fill();
        ctx.stroke();

        ctx.restore();

        // Bánh xe pháo (Cannon Carriage Wheel)
        ctx.save();
        ctx.translate(50, startY);
        // Vành bánh xe
        ctx.fillStyle = '#1e293b';
        ctx.beginPath();
        ctx.arc(0, 6, 18, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#fbbf24';
        ctx.lineWidth = 2.5;
        ctx.stroke();

        // 6 nan hoa bánh xe
        ctx.strokeStyle = '#94a3b8';
        ctx.lineWidth = 1.5;
        for (let a = 0; a < 6; a++) {
            const spRad = (a * Math.PI) / 3;
            ctx.beginPath();
            ctx.moveTo(0, 6);
            ctx.lineTo(17 * Math.cos(spRad), 6 + 17 * Math.sin(spRad));
            ctx.stroke();
        }

        // Trục bánh xe vàng
        ctx.fillStyle = '#f59e0b';
        ctx.beginPath();
        ctx.arc(0, 6, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.restore();

        // 8. Viên đạn pháo (Projectile Ball)
        const curX = running ? x : (hasLanded ? x : 50 + Math.cos(rad) * barrelLen);
        const curY = running ? y : (hasLanded ? y : startY - Math.sin(rad) * barrelLen);

        ctx.save();
        // Ánh sáng hào quang của viên đạn
        const glow = ctx.createRadialGradient(curX, curY, 2, curX, curY, 14);
        glow.addColorStop(0, 'rgba(249, 115, 22, 1)');
        glow.addColorStop(0.6, 'rgba(249, 115, 22, 0.4)');
        glow.addColorStop(1, 'rgba(249, 115, 22, 0)');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(curX, curY, 14, 0, Math.PI * 2);
        ctx.fill();

        // Khối cầu viên đạn
        const ballGrad = ctx.createRadialGradient(curX - 2, curY - 2, 1, curX, curY, 8);
        ballGrad.addColorStop(0, '#ffffff');
        ballGrad.addColorStop(0.4, '#fb923c');
        ballGrad.addColorStop(1, '#ea580c');
        ctx.fillStyle = ballGrad;
        ctx.beginPath();
        ctx.arc(curX, curY, 7.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.restore();

        // 9. Vector vận tốc v(t) với các thành phần vx và vy
        if (running && (vx !== 0 || vy !== 0)) {
            const vScale = 1.6;
            const endVx = curX + vx * vScale;
            const endVy = curY + vy * vScale;

            // Thành phần nằm ngang vx (màu xanh cyan)
            ctx.strokeStyle = 'rgba(56, 189, 248, 0.6)';
            ctx.lineWidth = 1.5;
            ctx.setLineDash([3, 3]);
            ctx.beginPath();
            ctx.moveTo(curX, curY);
            ctx.lineTo(endVx, curY);
            ctx.stroke();

            // Thành phần thẳng đứng vy (màu vàng)
            ctx.strokeStyle = 'rgba(251, 191, 36, 0.6)';
            ctx.beginPath();
            ctx.moveTo(endVx, curY);
            ctx.lineTo(endVx, endVy);
            ctx.stroke();
            ctx.setLineDash([]);

            // Vector tổng v (màu đỏ tươi)
            ctx.strokeStyle = '#ef4444';
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            ctx.moveTo(curX, curY);
            ctx.lineTo(endVx, endVy);
            ctx.stroke();

            // Mũi tên vector
            const arrowAngle = Math.atan2(vy, vx);
            const headlen = 9;
            ctx.fillStyle = '#ef4444';
            ctx.beginPath();
            ctx.moveTo(endVx, endVy);
            ctx.lineTo(
                endVx - headlen * Math.cos(arrowAngle - Math.PI / 6),
                endVy - headlen * Math.sin(arrowAngle - Math.PI / 6)
            );
            ctx.lineTo(
                endVx - headlen * Math.cos(arrowAngle + Math.PI / 6),
                endVy - headlen * Math.sin(arrowAngle + Math.PI / 6)
            );
            ctx.fill();

            ctx.fillStyle = '#ef4444';
            ctx.font = 'bold 12px "Space Grotesk", -apple-system, sans-serif';
            ctx.fillText(`v = ${Math.hypot(vx, vy).toFixed(1)} m/s`, endVx + 6, endVy - 4);
        }

        // 10. Chú thích trên màn hình Canvas (Scientific Legend)
        ctx.fillStyle = 'rgba(15, 23, 42, 0.75)';
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.2)';
        ctx.lineWidth = 1;
        ctx.fillRect(15, 12, 260, 68);
        ctx.strokeRect(15, 12, 260, 68);

        ctx.font = '12px "Space Grotesk", -apple-system, sans-serif';
        ctx.fillStyle = '#38bdf8';
        ctx.fillText('—  Quỹ đạo thực tế (vận tốc & lực cản)', 25, 30);
        ctx.fillStyle = '#fbbf24';
        ctx.fillText('- -  Quỹ đạo lý tưởng không cản khí', 25, 48);
        ctx.fillStyle = '#ef4444';
        ctx.fillText('→  Vector vận tốc v(t) & thành phần vx, vy', 25, 66);

        // 11. Call-to-action Banner / Trạng thái trực quan
        ctx.save();
        if (!running && !hasLanded) {
            // Banner mời bấm bắt đầu
            const bannerText = '👉 Bấm [BẮN] hoặc [BẮT ĐẦU] để phóng đạn!';
            ctx.font = 'bold 13.5px "Space Grotesk", -apple-system, sans-serif';
            const tw = ctx.measureText(bannerText).width;
            const bx = canvas.width - tw - 36;
            const by = 18;

            ctx.fillStyle = 'rgba(2, 132, 199, 0.85)';
            ctx.strokeStyle = '#38bdf8';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.roundRect(bx, by, tw + 32, 32, 16);
            ctx.fill();
            ctx.stroke();

            ctx.fillStyle = '#ffffff';
            ctx.fillText(bannerText, bx + 16, by + 21);
        } else if (running) {
            // Đang bay
            const flightText = `🚀 Đạn đang bay: t = ${time.toFixed(2)}s | x = ${maxDistance.toFixed(1)}m | v = ${Math.hypot(vx, vy).toFixed(1)}m/s`;
            ctx.font = 'bold 13px "Space Grotesk", -apple-system, sans-serif';
            const tw = ctx.measureText(flightText).width;
            const bx = canvas.width - tw - 36;
            const by = 18;

            ctx.fillStyle = 'rgba(16, 185, 129, 0.85)';
            ctx.strokeStyle = '#34d399';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.roundRect(bx, by, tw + 32, 32, 16);
            ctx.fill();
            ctx.stroke();

            ctx.fillStyle = '#ffffff';
            ctx.fillText(flightText, bx + 16, by + 21);
        } else if (hasLanded) {
            // Đã chạm đích
            const landedText = `🎯 Chạm đất: Tầm xa L = ${maxDistance.toFixed(2)}m | Thời gian t = ${totalFlightTime.toFixed(2)}s`;
            ctx.font = 'bold 13px "Space Grotesk", -apple-system, sans-serif';
            const tw = ctx.measureText(landedText).width;
            const bx = canvas.width - tw - 36;
            const by = 18;

            ctx.fillStyle = 'rgba(234, 88, 12, 0.9)';
            ctx.strokeStyle = '#fbbf24';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.roundRect(bx, by, tw + 32, 32, 16);
            ctx.fill();
            ctx.stroke();

            ctx.fillStyle = '#ffffff';
            ctx.fillText(landedText, bx + 16, by + 21);
        }
        ctx.restore();
    }

    // Vòng lặp animation chuẩn PhET
    let lastTime = performance.now();
    function loop(now) {
        const dtReal = Math.min((now - lastTime) / 1000, 0.05);
        lastTime = now;
        update(dtReal * speedMult);
        draw();
        requestAnimationFrame(loop);
    }
    requestAnimationFrame(loop);

    // ============ ĐĂNG KÝ VỚI SIMENGINE TOÀN CỤC ============
    window.SimEngines['projectileCanvas'] = {
        start: () => {
            if (!running && !hasLanded) fire();
            else if (hasLanded) fire();
            else paused = false;
        },
        pause: () => { paused = true; },
        toggle: () => {
            if (!running) {
                fire();
                return true;
            } else {
                paused = !paused;
                return !paused;
            }
        },
        reset: () => {
            resetSimulation();
        },
        step: (dt = 0.02) => {
            if (!running && !hasLanded) fire();
            paused = true;
            update(dt);
            draw();
        },
        setSpeed: (sp) => {
            speedMult = typeof sp === 'number' ? sp : 1.0;
        },
        isRunning: () => running && !paused
    };

    // Lắng nghe sự kiện điều khiển
    ['proj-angle', 'proj-v0', 'proj-h0', 'proj-g', 'proj-drag'].forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener('input', () => {
                syncValueLabels();
                if (!running) {
                    resetSimulation();
                } else {
                    const p = getParams();
                    computeIdealTrajectory(p);
                }
            });
        }
    });

    document.querySelectorAll('input[name="proj-mode"]').forEach(radio => {
        radio.addEventListener('change', () => {
            const p = getParams();
            const angleGroup = document.getElementById('proj-angle-group');
            if (angleGroup) {
                angleGroup.style.display = p.mode === 'horizontal' ? 'none' : 'block';
            }
            syncValueLabels();
            resetSimulation();
        });
    });

    const fireBtn = document.getElementById('proj-fire');
    if (fireBtn) {
        fireBtn.addEventListener('click', fire);
    }

    const resetBtn = document.getElementById('proj-reset');
    if (resetBtn) {
        resetBtn.addEventListener('click', resetSimulation);
    }

    const pauseBtn = document.getElementById('proj-pause');
    if (pauseBtn) {
        pauseBtn.addEventListener('click', () => {
            if (!running) {
                fire();
            } else {
                paused = !paused;
            }
            pauseBtn.textContent = paused ? '▶️ Tiếp tục' : '⏸️ Tạm dừng';
            if (window.SimManager) {
                window.SimManager.syncDockUI('projectileCanvas');
            }
        });
    }

    window.addEventListener('simulation-redraw', (e) => {
        if (e.detail && e.detail.canvasId === 'projectileCanvas') {
            draw();
        }
    });

    syncValueLabels();
    resetSimulation();
})();

// ─────────────────────────────────────────────────────────────
// 2. ĐỊNH LUẬT NEWTON VÀ MA SÁT TRÊN MẶT PHẲNG NGHIÊNG (Newton & Friction)
// ─────────────────────────────────────────────────────────────
(function initNewtonFriction() {
    const canvas = document.getElementById('newtonFrictionCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    let x = 80; // Tọa độ vật trên mặt phẳng nghiêng (pixel)
    let v = 0;
    let running = false;
    let paused = false;

    function getParams() {
        const mEl = document.getElementById('nf-mass');
        const alphaEl = document.getElementById('nf-alpha');
        const muSEl = document.getElementById('nf-mus');
        const muKEl = document.getElementById('nf-muk');
        const fPullEl = document.getElementById('nf-fpull');
        const gEl = document.getElementById('nf-g');

        return {
            m: mEl ? parseFloat(mEl.value) : 5,
            alphaDeg: alphaEl ? parseFloat(alphaEl.value) : 25,
            muS: muSEl ? parseFloat(muSEl.value) : 0.4,
            muK: muKEl ? parseFloat(muKEl.value) : 0.25,
            fPull: fPullEl ? parseFloat(fPullEl.value) : 10,
            g: gEl ? parseFloat(gEl.value) : 9.8
        };
    }

    function syncLabels() {
        const p = getParams();
        const mVal = document.getElementById('nf-mass-val');
        const aVal = document.getElementById('nf-alpha-val');
        const sVal = document.getElementById('nf-mus-val');
        const kVal = document.getElementById('nf-muk-val');
        const fVal = document.getElementById('nf-fpull-val');
        const gVal = document.getElementById('nf-g-val');
        if (mVal) mVal.textContent = p.m.toFixed(1);
        if (aVal) aVal.textContent = p.alphaDeg.toFixed(0);
        if (sVal) sVal.textContent = p.muS.toFixed(2);
        if (kVal) kVal.textContent = p.muK.toFixed(2);
        if (fVal) fVal.textContent = p.fPull.toFixed(1);
        if (gVal) gVal.textContent = p.g.toFixed(1);
    }

    function resetSimulation() {
        x = 80;
        v = 0;
        running = true;
    }

    function update(dt) {
        if (!running || paused) return;
        const p = getParams();
        const alphaRad = (p.alphaDeg * Math.PI) / 180;

        // Phân tích lực theo hệ quy chiếu mặt nghiêng:
        // Trọng lực: P_parallel = m*g*sin(alpha), P_perp = m*g*cos(alpha)
        // Phản lực pháp tuyến: N = P_perp = m*g*cos(alpha)
        const N = p.m * p.g * Math.cos(alphaRad);
        const P_par = p.m * p.g * Math.sin(alphaRad); // Hướng trượt xuống dốc
        const fMaxStatic = p.muS * N;

        // Tổng ngoại lực song song mặt phẳng không tính ma sát: (F_kéo hướng lên dốc, P_par hướng xuống)
        // Chiều dương quy ước: Hướng lên dốc
        const F_net_no_friction = p.fPull - P_par;

        let a = 0;
        let frictionForce = 0;
        let stateText = 'Đang đứng yên (Ma sát nghỉ)';

        if (Math.abs(v) < 0.001) {
            // Đang đứng yên -> kiểm tra xem có vượt quá ma sát nghỉ cực đại không
            if (Math.abs(F_net_no_friction) <= fMaxStatic) {
                // Đứng yên
                frictionForce = -F_net_no_friction; // Cân bằng hoàn hảo
                a = 0;
                v = 0;
                stateText = 'Đứng yên cân bằng (F_ms nghỉ = ' + Math.abs(frictionForce).toFixed(1) + ' N)';
            } else {
                // Bắt đầu trượt!
                const sign = Math.sign(F_net_no_friction);
                frictionForce = -sign * p.muK * N;
                a = (F_net_no_friction + frictionForce) / p.m;
                stateText = sign > 0 ? 'Trượt lên dốc gia tốc a > 0' : 'Trượt xuống dốc gia tốc a < 0';
            }
        } else {
            // Đang chuyển động -> chịu ma sát trượt ngược chiều vận tốc
            const sign = Math.sign(v);
            frictionForce = -sign * p.muK * N;
            a = (F_net_no_friction + frictionForce) / p.m;
            stateText = v > 0 ? 'Đang trượt lên dốc' : 'Đang trượt xuống dốc';
        }

        v += a * dt;
        x += v * dt * 30; // Scale pixel

        // Giới hạn biên mặt nghiêng (chiều dài dốc khoảng 450 px)
        if (x < 40) {
            x = 40;
            v = 0;
            stateText = 'Chạm chân dốc';
        } else if (x > 500) {
            x = 500;
            v = 0;
            stateText = 'Chạm đỉnh dốc';
        }

        // Cập nhật số liệu
        const aEl = document.getElementById('nf-accel');
        const vEl = document.getElementById('nf-velocity');
        const nEl = document.getElementById('nf-norm-force');
        const fmsEl = document.getElementById('nf-friction-force');
        const stEl = document.getElementById('nf-state-desc');

        if (aEl) aEl.textContent = a.toFixed(2) + ' m/s²';
        if (vEl) vEl.textContent = v.toFixed(2) + ' m/s';
        if (nEl) nEl.textContent = N.toFixed(1) + ' N';
        if (fmsEl) fmsEl.textContent = Math.abs(frictionForce).toFixed(1) + ' N';
        if (stEl) stEl.textContent = stateText;
    }

    function draw() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        const bgGrad = ctx.createLinearGradient(0, 0, 0, canvas.height);
        bgGrad.addColorStop(0, '#040d1a');
        bgGrad.addColorStop(1, '#091e38');
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        const p = getParams();
        const alphaRad = (p.alphaDeg * Math.PI) / 180;

        // Tọa độ gốc chân dốc
        const baseX = 80;
        const baseY = canvas.height - 60;
        const rampLength = 520;
        const topX = baseX + rampLength * Math.cos(alphaRad);
        const topY = baseY - rampLength * Math.sin(alphaRad);

        // 1. Vẽ nêm mặt phẳng nghiêng
        ctx.fillStyle = '#1e293b';
        ctx.beginPath();
        ctx.moveTo(baseX, baseY);
        ctx.lineTo(topX, topY);
        ctx.lineTo(topX, baseY);
        ctx.closePath();
        ctx.fill();

        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 3;
        ctx.stroke();

        // Đánh dấu cung góc nghiêng alpha
        ctx.strokeStyle = '#fbbf24';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(baseX, baseY, 50, -alphaRad, 0);
        ctx.stroke();
        ctx.fillStyle = '#fbbf24';
        ctx.font = '13px "Space Grotesk", -apple-system, sans-serif';
        ctx.fillText(`α = ${p.alphaDeg}°`, baseX + 60, baseY - 12);

        // 2. Vị trí khối hộp trên dốc
        const boxDist = x;
        const boxSize = 36 + p.m * 2;
        const cx = baseX + boxDist * Math.cos(alphaRad);
        const cy = baseY - boxDist * Math.sin(alphaRad);

        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(-alphaRad);

        // Vẽ khối hộp
        ctx.fillStyle = '#0284c7';
        ctx.fillRect(-boxSize / 2, -boxSize, boxSize, boxSize);
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.strokeRect(-boxSize / 2, -boxSize, boxSize, boxSize);

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 12px "Space Grotesk", -apple-system, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`m = ${p.m}kg`, 0, -boxSize / 2 + 4);

        // 3. Vẽ các vector lực từ tâm vật (tọa độ local: 0, -boxSize/2)
        const ox = 0, oy = -boxSize / 2;
        const scale = 2.0;

        // Phản lực N (hướng lên trên vuông góc dốc: local -y)
        const N = p.m * p.g * Math.cos(alphaRad);
        drawVector(ctx, ox, oy, 0, -N * scale, '#10b981', `N = ${N.toFixed(1)}N`);

        // Lực kéo F_kéo (hướng theo chiều dốc: local +x)
        if (p.fPull > 0) {
            drawVector(ctx, ox, oy, p.fPull * scale, 0, '#f59e0b', `F_kéo = ${p.fPull}N`);
        }

        ctx.restore();

        // Trọng lực P = mg (hướng thẳng đứng xuống dưới: global +y)
        const P = p.m * p.g;
        drawVector(ctx, cx, cy - boxSize / 2, 0, P * scale, '#ef4444', `P = ${P.toFixed(1)}N`);
    }

    function drawVector(ctx, fromX, fromY, dx, dy, color, label) {
        const toX = fromX + dx;
        const toY = fromY + dy;
        const angle = Math.atan2(dy, dx);
        const headlen = 8;

        ctx.strokeStyle = color;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(fromX, fromY);
        ctx.lineTo(toX, toY);
        ctx.stroke();

        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.moveTo(toX, toY);
        ctx.lineTo(toX - headlen * Math.cos(angle - Math.PI / 6), toY - headlen * Math.sin(angle - Math.PI / 6));
        ctx.lineTo(toX - headlen * Math.cos(angle + Math.PI / 6), toY - headlen * Math.sin(angle + Math.PI / 6));
        ctx.fill();

        if (label) {
            ctx.fillStyle = color;
            ctx.font = '11px "Space Grotesk", -apple-system, sans-serif';
            ctx.fillText(label, toX + 6, toY + 4);
        }
    }

    let lastTime = performance.now();
    function loop(now) {
        const dt = Math.min((now - lastTime) / 1000, 0.05);
        lastTime = now;
        update(dt);
        draw();
        requestAnimationFrame(loop);
    }
    requestAnimationFrame(loop);

    ['nf-mass', 'nf-alpha', 'nf-mus', 'nf-muk', 'nf-fpull', 'nf-g'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('input', () => { syncLabels(); resetSimulation(); });
    });

    const resetBtn = document.getElementById('nf-reset');
    if (resetBtn) resetBtn.addEventListener('click', resetSimulation);

    const pauseBtn = document.getElementById('nf-pause');
    if (pauseBtn) {
        pauseBtn.addEventListener('click', () => {
            paused = !paused;
            pauseBtn.textContent = paused ? '▶️ Tiếp tục' : '⏸️ Tạm dừng';
        });
    }

    syncLabels();
    resetSimulation();
})();

// ─────────────────────────────────────────────────────────────
// 3. CHUYỂN ĐỘNG TRÒN ĐỀU VÀ LỰC HƯỚNG TÂM (Circular Motion)
// ─────────────────────────────────────────────────────────────
(function initCircularMotion() {
    const canvas = document.getElementById('circularMotionCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    let theta = 0;
    let stringBroken = false;
    let ballX = 0, ballY = 0;
    let flyVx = 0, flyVy = 0;
    let trail = [];
    let paused = false;

    function getParams() {
        const rEl = document.getElementById('cm-radius');
        const omegaEl = document.getElementById('cm-omega');
        const mEl = document.getElementById('cm-mass');

        return {
            r: rEl ? parseFloat(rEl.value) : 140, // pixel
            omega: omegaEl ? parseFloat(omegaEl.value) : 2.5, // rad/s
            m: mEl ? parseFloat(mEl.value) : 1.5 // kg
        };
    }

    function syncLabels() {
        const p = getParams();
        const rVal = document.getElementById('cm-radius-val');
        const wVal = document.getElementById('cm-omega-val');
        const mVal = document.getElementById('cm-mass-val');
        if (rVal) rVal.textContent = (p.r / 50).toFixed(2) + ' m';
        if (wVal) wVal.textContent = p.omega.toFixed(1) + ' rad/s';
        if (mVal) mVal.textContent = p.m.toFixed(1) + ' kg';
    }

    function resetSimulation() {
        theta = 0;
        stringBroken = false;
        trail = [];
    }

    function cutString() {
        if (stringBroken) return;
        const p = getParams();
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        ballX = centerX + p.r * Math.cos(theta);
        ballY = centerY + p.r * Math.sin(theta);

        // Vận tốc tiếp tuyến v = omega * r
        const v = p.omega * (p.r / 50); // m/s
        const vPix = p.omega * p.r; // px/s
        flyVx = -vPix * Math.sin(theta);
        flyVy = vPix * Math.cos(theta);
        stringBroken = true;
    }

    function update(dt) {
        if (paused) return;
        const p = getParams();
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;

        if (!stringBroken) {
            theta += p.omega * dt;
            ballX = centerX + p.r * Math.cos(theta);
            ballY = centerY + p.r * Math.sin(theta);
        } else {
            // Chuyển động thẳng đều theo quán tính (tiếp tuyến)
            ballX += flyVx * dt;
            ballY += flyVy * dt;
        }

        trail.push({ x: ballX, y: ballY });
        if (trail.length > 50) trail.shift();

        // Tính toán các đại lượng vật lý
        const realR = p.r / 50; // mét
        const vLinear = p.omega * realR;
        const aCentripetal = stringBroken ? 0 : (vLinear * vLinear) / realR;
        const fCentripetal = stringBroken ? 0 : p.m * aCentripetal;
        const period = p.omega > 0 ? (2 * Math.PI) / p.omega : 0;

        const vEl = document.getElementById('cm-linear-v');
        const acpEl = document.getElementById('cm-acp');
        const fcpEl = document.getElementById('cm-fcp');
        const tEl = document.getElementById('cm-period');

        if (vEl) vEl.textContent = vLinear.toFixed(2) + ' m/s';
        if (acpEl) acpEl.textContent = aCentripetal.toFixed(2) + ' m/s²';
        if (fcpEl) fcpEl.textContent = fCentripetal.toFixed(2) + ' N';
        if (tEl) tEl.textContent = period.toFixed(2) + ' s';
    }

    function draw() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        const bgGrad = ctx.createLinearGradient(0, 0, 0, canvas.height);
        bgGrad.addColorStop(0, '#040d1a');
        bgGrad.addColorStop(1, '#091e38');
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        const p = getParams();
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;

        // 1. Quỹ đạo tròn (nét đứt)
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.3)';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.arc(centerX, centerY, p.r, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);

        // 2. Vệt quỹ đạo
        if (trail.length > 1) {
            ctx.strokeStyle = stringBroken ? 'rgba(239, 68, 68, 0.4)' : 'rgba(56, 189, 248, 0.4)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            trail.forEach((pt, i) => {
                if (i === 0) ctx.moveTo(pt.x, pt.y);
                else ctx.lineTo(pt.x, pt.y);
            });
            ctx.stroke();
        }

        // 3. Tâm quay & Sợi dây
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(centerX, centerY, 5, 0, Math.PI * 2);
        ctx.fill();

        if (!stringBroken) {
            ctx.strokeStyle = '#94a3b8';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(centerX, centerY);
            ctx.lineTo(ballX, ballY);
            ctx.stroke();
        }

        // 4. Quả nặng
        ctx.fillStyle = '#0284c7';
        ctx.beginPath();
        ctx.arc(ballX, ballY, 12, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.stroke();

        // 5. Các vector khi chưa đứt dây
        if (!stringBroken) {
            // Vector tiếp tuyến v (màu xanh lá)
            const vScale = 15;
            const vx = -Math.sin(theta) * vScale;
            const vy = Math.cos(theta) * vScale;
            drawArrow(ctx, ballX, ballY, ballX + vx, ballY + vy, '#22c55e', 'v (tiếp tuyến)');

            // Vector gia tốc hướng tâm a_ht / lực F_ht (màu đỏ hướng về tâm)
            const aScale = 25;
            const ax = -Math.cos(theta) * aScale;
            const ay = -Math.sin(theta) * aScale;
            drawArrow(ctx, ballX, ballY, ballX + ax, ballY + ay, '#ef4444', 'F_ht (hướng tâm)');
        } else {
            // Sau khi đứt dây: bay theo tiếp tuyến
            const speed = Math.hypot(flyVx, flyVy);
            if (speed > 0) {
                const vx = (flyVx / speed) * 30;
                const vy = (flyVy / speed) * 30;
                drawArrow(ctx, ballX, ballY, ballX + vx, ballY + vy, '#22c55e', 'v (quán tính)');
            }
        }
    }

    function drawArrow(ctx, fromX, fromY, toX, toY, color, label) {
        const headlen = 8;
        const angle = Math.atan2(toY - fromY, toX - fromX);
        ctx.strokeStyle = color;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(fromX, fromY);
        ctx.lineTo(toX, toY);
        ctx.stroke();

        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.moveTo(toX, toY);
        ctx.lineTo(toX - headlen * Math.cos(angle - Math.PI / 6), toY - headlen * Math.sin(angle - Math.PI / 6));
        ctx.lineTo(toX - headlen * Math.cos(angle + Math.PI / 6), toY - headlen * Math.sin(angle + Math.PI / 6));
        ctx.fill();

        ctx.font = '11px "Space Grotesk", -apple-system, sans-serif';
        ctx.fillText(label, toX + 5, toY + 4);
    }

    let lastTime = performance.now();
    function loop(now) {
        const dt = Math.min((now - lastTime) / 1000, 0.05);
        lastTime = now;
        update(dt);
        draw();
        requestAnimationFrame(loop);
    }
    requestAnimationFrame(loop);

    ['cm-radius', 'cm-omega', 'cm-mass'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('input', () => { syncLabels(); resetSimulation(); });
    });

    const cutBtn = document.getElementById('cm-cut-string');
    if (cutBtn) cutBtn.addEventListener('click', cutString);

    const resetBtn = document.getElementById('cm-reset');
    if (resetBtn) resetBtn.addEventListener('click', resetSimulation);

    syncLabels();
    resetSimulation();
})();

// ─────────────────────────────────────────────────────────────
// 4. VA CHẠM VÀ BẢO TOÀN ĐỘNG LƯỢNG (Collisions Lab)
// ─────────────────────────────────────────────────────────────
(function initCollisionLab() {
    const canvas = document.getElementById('collisionCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    let b1 = { x: 120, y: 220, vx: 4, m: 2, r: 24, color: '#38bdf8' };
    let b2 = { x: 480, y: 220, vx: -2, m: 3, r: 30, color: '#f59e0b' };
    let running = true;
    let restitution = 1.0; // 1 = Đàn hồi, 0 = Va chạm mềm

    function getParams() {
        const m1El = document.getElementById('col-m1');
        const v1El = document.getElementById('col-v1');
        const m2El = document.getElementById('col-m2');
        const v2El = document.getElementById('col-v2');
        const eEl = document.getElementById('col-restitution');

        return {
            m1: m1El ? parseFloat(m1El.value) : 2,
            v1: v1El ? parseFloat(v1El.value) : 4,
            m2: m2El ? parseFloat(m2El.value) : 3,
            v2: v2El ? parseFloat(v2El.value) : -2,
            e: eEl ? parseFloat(eEl.value) : 1.0
        };
    }

    function syncLabels() {
        const p = getParams();
        const m1Val = document.getElementById('col-m1-val');
        const v1Val = document.getElementById('col-v1-val');
        const m2Val = document.getElementById('col-m2-val');
        const v2Val = document.getElementById('col-v2-val');
        const eVal = document.getElementById('col-restitution-val');
        if (m1Val) m1Val.textContent = p.m1.toFixed(1);
        if (v1Val) v1Val.textContent = p.v1.toFixed(1);
        if (m2Val) m2Val.textContent = p.m2.toFixed(1);
        if (v2Val) v2Val.textContent = p.v2.toFixed(1);
        if (eVal) eVal.textContent = p.e === 1 ? '1.0 (Đàn hồi tuyệt đối)' : (p.e === 0 ? '0.0 (Va chạm mềm)' : p.e.toFixed(2));
    }

    function resetSimulation() {
        const p = getParams();
        b1.m = p.m1;
        b1.r = 18 + p.m1 * 3;
        b1.vx = p.v1;
        b1.x = 100;

        b2.m = p.m2;
        b2.r = 18 + p.m2 * 3;
        b2.vx = p.v2;
        b2.x = canvas.width - 120;

        restitution = p.e;
        running = true;
    }

    function update(dt) {
        if (!running) return;

        b1.x += b1.vx * dt * 40;
        b2.x += b2.vx * dt * 40;

        // Va chạm giữa 2 quả cầu
        const dist = Math.abs(b2.x - b1.x);
        const minDist = b1.r + b2.r;

        if (dist <= minDist && (b1.vx - b2.vx) > 0) {
            // Công thức va chạm tổng quát với hệ số hồi phục e:
            // v1' = [m1*v1 + m2*v2 - m2*e*(v1 - v2)] / (m1 + m2)
            // v2' = [m1*v1 + m2*v2 + m1*e*(v1 - v2)] / (m1 + m2)
            const m1 = b1.m, m2 = b2.m;
            const u1 = b1.vx, u2 = b2.vx;
            const e = restitution;

            const v1Prime = (m1 * u1 + m2 * u2 - m2 * e * (u1 - u2)) / (m1 + m2);
            const v2Prime = (m1 * u1 + m2 * u2 + m1 * e * (u1 - u2)) / (m1 + m2);

            b1.vx = v1Prime;
            b2.vx = v2Prime;

            // Chống dính
            const overlap = minDist - dist;
            b1.x -= overlap / 2;
            b2.x += overlap / 2;
        }

        // Va chạm đàn hồi với 2 thành biên
        if (b1.x - b1.r < 20) { b1.x = 20 + b1.r; b1.vx = -b1.vx; }
        if (b2.x + b2.r > canvas.width - 20) { b2.x = canvas.width - 20 - b2.r; b2.vx = -b2.vx; }

        // Tính động lượng & động năng
        const p1 = b1.m * b1.vx;
        const p2 = b2.m * b2.vx;
        const pTotal = p1 + p2;
        const ke1 = 0.5 * b1.m * b1.vx * b1.vx;
        const ke2 = 0.5 * b2.m * b2.vx * b2.vx;
        const keTotal = ke1 + ke2;

        const pEl = document.getElementById('col-total-p');
        const keEl = document.getElementById('col-total-ke');
        const v1El = document.getElementById('col-res-v1');
        const v2El = document.getElementById('col-res-v2');

        if (pEl) pEl.textContent = pTotal.toFixed(2) + ' kg·m/s';
        if (keEl) keEl.textContent = keTotal.toFixed(2) + ' J';
        if (v1El) v1El.textContent = b1.vx.toFixed(2) + ' m/s';
        if (v2El) v2El.textContent = b2.vx.toFixed(2) + ' m/s';
    }

    function draw() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        const bgGrad = ctx.createLinearGradient(0, 0, 0, canvas.height);
        bgGrad.addColorStop(0, '#040d1a');
        bgGrad.addColorStop(1, '#091e38');
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Băng truyền / sàn không ma sát
        const trackY = 220;
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(15, trackY + 35, canvas.width - 30, 20);
        ctx.strokeStyle = '#475569';
        ctx.lineWidth = 2;
        ctx.strokeRect(15, trackY + 35, canvas.width - 30, 20);

        // Hai bức tường biên
        ctx.fillStyle = '#334155';
        ctx.fillRect(0, trackY - 60, 20, 115);
        ctx.fillRect(canvas.width - 20, trackY - 60, 20, 115);

        // Quả bóng 1
        ctx.beginPath();
        ctx.arc(b1.x, trackY + 35 - b1.r, b1.r, 0, Math.PI * 2);
        ctx.fillStyle = b1.color;
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 12px "Space Grotesk", -apple-system, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`m₁=${b1.m}kg`, b1.x, trackY + 35 - b1.r + 4);

        // Quả bóng 2
        ctx.beginPath();
        ctx.arc(b2.x, trackY + 35 - b2.r, b2.r, 0, Math.PI * 2);
        ctx.fillStyle = b2.color;
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.fillText(`m₂=${b2.m}kg`, b2.x, trackY + 35 - b2.r + 4);

        // Vector vận tốc v1 và v2
        drawVector(ctx, b1.x, trackY + 35 - b1.r - b1.r - 10, b1.vx * 8, '#38bdf8', `v₁ = ${b1.vx.toFixed(1)}`);
        drawVector(ctx, b2.x, trackY + 35 - b2.r - b2.r - 10, b2.vx * 8, '#f59e0b', `v₂ = ${b2.vx.toFixed(1)}`);
    }

    function drawVector(ctx, x, y, dx, color, label) {
        if (Math.abs(dx) < 1) return;
        const headlen = 6;
        const sign = Math.sign(dx);
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + dx, y);
        ctx.stroke();

        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.moveTo(x + dx, y);
        ctx.lineTo(x + dx - sign * headlen, y - 4);
        ctx.lineTo(x + dx - sign * headlen, y + 4);
        ctx.fill();

        ctx.font = '11px "Space Grotesk", -apple-system, sans-serif';
        ctx.fillText(label, x + dx / 2, y - 8);
    }

    let lastTime = performance.now();
    function loop(now) {
        const dt = Math.min((now - lastTime) / 1000, 0.05);
        lastTime = now;
        update(dt);
        draw();
        requestAnimationFrame(loop);
    }
    requestAnimationFrame(loop);

    ['col-m1', 'col-v1', 'col-m2', 'col-v2', 'col-restitution'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('input', () => { syncLabels(); resetSimulation(); });
    });

    const resetBtn = document.getElementById('col-reset');
    if (resetBtn) resetBtn.addEventListener('click', resetSimulation);

    syncLabels();
    resetSimulation();
})();

// ─────────────────────────────────────────────────────────────
// 5. BẢO TOÀN CƠ NĂNG - ĐƯỜNG TRƯỢT SKATE PARK (Energy Conservation)
// ─────────────────────────────────────────────────────────────
(function initEnergySkate() {
    const canvas = document.getElementById('energySkateCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    // Đường trượt hình chữ U dạng parabol: y(x) = A*(x - x0)^2 + y0
    const x0 = canvas.width / 2;
    const y0 = 360; // Đáy lòng máng
    const kCurve = 0.0022; // Độ uốn cong của máng

    let sX = x0 - 150; // Vị trí x của người trượt
    let vS = 0; // Vận tốc tiếp tuyến dọc đường trượt
    let paused = false;
    let thermalEnergy = 0;

    function getParams() {
        const mEl = document.getElementById('skate-mass');
        const fEl = document.getElementById('skate-friction');
        const gEl = document.getElementById('skate-g');

        return {
            m: mEl ? parseFloat(mEl.value) : 60,
            friction: fEl ? parseFloat(fEl.value) : 0.001,
            g: gEl ? parseFloat(gEl.value) : 9.8
        };
    }

    function syncLabels() {
        const p = getParams();
        const mVal = document.getElementById('skate-mass-val');
        const fVal = document.getElementById('skate-friction-val');
        const gVal = document.getElementById('skate-g-val');
        if (mVal) mVal.textContent = p.m.toFixed(0);
        if (fVal) fVal.textContent = p.friction === 0 ? 'Không (Bảo toàn 100%)' : (p.friction * 1000).toFixed(1);
        if (gVal) gVal.textContent = p.g.toFixed(1);
    }

    function getY(x) {
        return y0 - kCurve * Math.pow(x - x0, 2) * -1; // Đỉnh ở trên, lòng máng ở dưới
    }

    function getSlopeAngle(x) {
        // dy/dx = 2 * kCurve * (x - x0)
        const slope = 2 * kCurve * (x - x0);
        return Math.atan(slope);
    }

    function update(dt) {
        if (paused) return;
        const p = getParams();

        const angle = getSlopeAngle(sX);
        // Gia tốc dọc theo tiếp tuyến mặt trượt: a = -g * sin(angle) - friction * v
        const aTangent = -p.g * Math.sin(angle) * 30 - p.friction * 40 * vS;

        vS += aTangent * dt;
        sX += vS * Math.cos(angle) * dt * 8;

        // Giới hạn biên máng trượt
        if (sX < 80) { sX = 80; vS = -vS * 0.9; }
        if (sX > canvas.width - 80) { sX = canvas.width - 80; vS = -vS * 0.9; }

        // Tính năng lượng:
        // Đáy máng y0 là mốc thế năng 0
        const curY = getY(sX);
        const heightMeters = Math.max(0, (y0 - curY) / 30);
        const speedReal = Math.abs(vS) / 8;

        const Ep = p.m * p.g * heightMeters;
        const Ek = 0.5 * p.m * speedReal * speedReal;
        if (p.friction > 0) {
            thermalEnergy += p.friction * Ek * dt * 5;
        }
        const Etotal = Ep + Ek + thermalEnergy;

        const epEl = document.getElementById('skate-ep');
        const ekEl = document.getElementById('skate-ek');
        const ethEl = document.getElementById('skate-eth');
        const etotEl = document.getElementById('skate-etot');
        const spEl = document.getElementById('skate-speed');

        if (epEl) epEl.textContent = Ep.toFixed(1) + ' J';
        if (ekEl) ekEl.textContent = Ek.toFixed(1) + ' J';
        if (ethEl) ethEl.textContent = thermalEnergy.toFixed(1) + ' J';
        if (etotEl) etotEl.textContent = Etotal.toFixed(1) + ' J';
        if (spEl) spEl.textContent = speedReal.toFixed(2) + ' m/s';
    }

    function draw() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        const bgGrad = ctx.createLinearGradient(0, 0, 0, canvas.height);
        bgGrad.addColorStop(0, '#040d1a');
        bgGrad.addColorStop(1, '#091e38');
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        const p = getParams();

        // 1. Vẽ đường cong máng trượt
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 6;
        ctx.beginPath();
        for (let x = 60; x <= canvas.width - 60; x += 5) {
            const y = getY(x);
            if (x === 60) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.stroke();

        // Chân đế đường trượt
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.2)';
        ctx.lineWidth = 2;
        for (let x = 100; x <= canvas.width - 100; x += 40) {
            ctx.beginPath();
            ctx.moveTo(x, getY(x));
            ctx.lineTo(x, canvas.height - 20);
            ctx.stroke();
        }

        // 2. Vị trí người trượt ván
        const curY = getY(sX);
        const angle = getSlopeAngle(sX);

        ctx.save();
        ctx.translate(sX, curY);
        ctx.rotate(angle);

        // Ván trượt
        ctx.fillStyle = '#f59e0b';
        ctx.fillRect(-20, -5, 40, 6);
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(-14, 3, 3, 0, Math.PI * 2);
        ctx.arc(14, 3, 3, 0, Math.PI * 2);
        ctx.fill();

        // Người trượt (hình nộm cơ bản)
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(0, -5);
        ctx.lineTo(0, -28); // Thân
        ctx.lineTo(-8, -15); // Chân sau
        ctx.moveTo(0, -28);
        ctx.lineTo(8, -15); // Chân trước
        ctx.moveTo(0, -22);
        ctx.lineTo(-12, -26); // Tay trái
        ctx.moveTo(0, -22);
        ctx.lineTo(12, -26); // Tay phải
        ctx.stroke();

        // Đầu
        ctx.fillStyle = '#38bdf8';
        ctx.beginPath();
        ctx.arc(0, -34, 6, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();

        // 3. Thanh năng lượng động (Energy Bar Chart) ở góc phải
        drawEnergyBars(ctx);
    }

    function drawEnergyBars(ctx) {
        const epEl = document.getElementById('skate-ep');
        const ekEl = document.getElementById('skate-ek');
        const ethEl = document.getElementById('skate-eth');

        const ep = epEl ? parseFloat(epEl.textContent) : 0;
        const ek = ekEl ? parseFloat(ekEl.textContent) : 0;
        const eth = ethEl ? parseFloat(ethEl.textContent) : 0;
        const maxE = Math.max(ep + ek + eth, 100);

        const bx = canvas.width - 140;
        const by = 40;
        const barW = 20;
        const barMaxH = 100;

        ctx.fillStyle = 'rgba(15, 23, 42, 0.7)';
        ctx.fillRect(bx - 15, by - 15, 130, 140);
        ctx.strokeStyle = '#475569';
        ctx.strokeRect(bx - 15, by - 15, 130, 140);

        // Ek (Động năng - Xanh lá)
        const hEk = (ek / maxE) * barMaxH;
        ctx.fillStyle = '#22c55e';
        ctx.fillRect(bx, by + barMaxH - hEk, barW, hEk);

        // Ep (Thế năng - Xanh dương)
        const hEp = (ep / maxE) * barMaxH;
        ctx.fillStyle = '#0284c7';
        ctx.fillRect(bx + 30, by + barMaxH - hEp, barW, hEp);

        // Ethermal (Nhiệt - Đỏ)
        const hEth = (eth / maxE) * barMaxH;
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(bx + 60, by + barMaxH - hEth, barW, hEth);

        ctx.fillStyle = '#ffffff';
        ctx.font = '10px "Space Grotesk", -apple-system, sans-serif';
        ctx.fillText('Động năng', bx - 5, by + barMaxH + 15);
        ctx.fillText('Thế năng', bx + 28, by + barMaxH + 15);
        ctx.fillText('Nhiệt', bx + 62, by + barMaxH + 15);
    }

    let lastTime = performance.now();
    function loop(now) {
        const dt = Math.min((now - lastTime) / 1000, 0.05);
        lastTime = now;
        update(dt);
        draw();
        requestAnimationFrame(loop);
    }
    requestAnimationFrame(loop);

    ['skate-mass', 'skate-friction', 'skate-g'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('input', () => { syncLabels(); });
    });

    const resetBtn = document.getElementById('skate-reset');
    if (resetBtn) {
        resetBtn.addEventListener('click', () => {
            sX = x0 - 150;
            vS = 0;
            thermalEnergy = 0;
        });
    }

    syncLabels();
})();

// ─────────────────────────────────────────────────────────────
// 6. CÂN BẰNG VẬT RẮN VÀ MOMEN LỰC - ĐÒN BẨY (Balancing Act & Torque)
// ─────────────────────────────────────────────────────────────
(function initBalancingAct() {
    const canvas = document.getElementById('balancingActCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    // Thanh bập bênh: chiều dài 500 px, các khấc cách nhau 25px (-10 đến +10)
    let weights = [
        { mass: 5, pos: -6 }, // 5kg ở khấc -6 (bên trái)
        { mass: 10, pos: 3 }  // 10kg ở khấc +3 (bên phải) => 5*6 = 30 = 10*3 => CÂN BẰNG!
    ];
    let tiltAngle = 0;
    let targetAngle = 0;
    let locked = false;

    function getParams() {
        const mLeftEl = document.getElementById('lever-m1');
        const posLeftEl = document.getElementById('lever-d1');
        const mRightEl = document.getElementById('lever-m2');
        const posRightEl = document.getElementById('lever-d2');

        return {
            m1: mLeftEl ? parseFloat(mLeftEl.value) : 5,
            d1: posLeftEl ? parseFloat(posLeftEl.value) : 6,
            m2: mRightEl ? parseFloat(mRightEl.value) : 10,
            d2: posRightEl ? parseFloat(posRightEl.value) : 3
        };
    }

    function syncLabels() {
        const p = getParams();
        const m1Val = document.getElementById('lever-m1-val');
        const d1Val = document.getElementById('lever-d1-val');
        const m2Val = document.getElementById('lever-m2-val');
        const d2Val = document.getElementById('lever-d2-val');
        if (m1Val) m1Val.textContent = p.m1.toFixed(1);
        if (d1Val) d1Val.textContent = p.d1.toFixed(0);
        if (m2Val) m2Val.textContent = p.m2.toFixed(1);
        if (d2Val) d2Val.textContent = p.d2.toFixed(0);
    }

    function update() {
        const p = getParams();
        weights = [
            { mass: p.m1, pos: -p.d1 },
            { mass: p.m2, pos: p.d2 }
        ];

        // Momen quay ngược chiều kim đồng hồ: M1 = m1 * d1
        // Momen quay thuận chiều kim đồng hồ: M2 = m2 * d2
        const torqueCCW = p.m1 * p.d1 * 9.8;
        const torqueCW = p.m2 * p.d2 * 9.8;
        const netTorque = torqueCW - torqueCCW;

        if (locked) {
            targetAngle = 0;
        } else {
            if (Math.abs(netTorque) < 0.1) {
                targetAngle = 0; // Cân bằng
            } else {
                targetAngle = Math.sign(netTorque) * 0.22; // Nghiêng sang bên nặng hơn
            }
        }

        // Chuyển động xoay mượt mà
        tiltAngle += (targetAngle - tiltAngle) * 0.1;

        const tccwEl = document.getElementById('lever-t-ccw');
        const tcwEl = document.getElementById('lever-t-cw');
        const tnetEl = document.getElementById('lever-t-net');
        const stEl = document.getElementById('lever-status');

        if (tccwEl) tccwEl.textContent = torqueCCW.toFixed(1) + ' N·m';
        if (tcwEl) tcwEl.textContent = torqueCW.toFixed(1) + ' N·m';
        if (tnetEl) tnetEl.textContent = Math.abs(netTorque).toFixed(1) + ' N·m';
        if (stEl) {
            if (Math.abs(netTorque) < 0.1) {
                stEl.textContent = '⚖️ Cân Bằng Tuyệt Đối (Σ M = 0)';
                stEl.style.color = '#10b981';
            } else if (netTorque > 0) {
                stEl.textContent = '➡️ Nghiêng sang Phải (M₂ > M₁)';
                stEl.style.color = '#f59e0b';
            } else {
                stEl.textContent = '⬅️ Nghiêng sang Trái (M₁ > M₂)';
                stEl.style.color = '#f59e0b';
            }
        }
    }

    function draw() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        const bgGrad = ctx.createLinearGradient(0, 0, 0, canvas.height);
        bgGrad.addColorStop(0, '#040d1a');
        bgGrad.addColorStop(1, '#091e38');
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        const cx = canvas.width / 2;
        const cy = 250;
        const beamLen = 460;
        const stepPx = 20;

        // 1. Trụ đỡ tam giác (Fulcrum)
        ctx.fillStyle = '#475569';
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx - 30, cy + 60);
        ctx.lineTo(cx + 30, cy + 60);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#94a3b8';
        ctx.lineWidth = 2;
        ctx.stroke();

        // 2. Chốt khóa an toàn (nếu có)
        if (locked) {
            ctx.fillStyle = '#ef4444';
            ctx.fillRect(cx - 150, cy + 30, 20, 30);
            ctx.fillRect(cx + 130, cy + 30, 20, 30);
        }

        // 3. Vẽ thanh đòn bẩy xoay theo góc tiltAngle
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(tiltAngle);

        // Thân thanh đòn
        ctx.fillStyle = '#0284c7';
        ctx.fillRect(-beamLen / 2, -8, beamLen, 16);
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 2;
        ctx.strokeRect(-beamLen / 2, -8, beamLen, 16);

        // Vạch chia khoảng cách trên thanh
        ctx.fillStyle = '#ffffff';
        ctx.font = '10px "Space Grotesk", -apple-system, sans-serif';
        ctx.textAlign = 'center';
        for (let i = -10; i <= 10; i++) {
            const vx = i * stepPx;
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = i === 0 ? 2 : 1;
            ctx.beginPath();
            ctx.moveTo(vx, -8);
            ctx.lineTo(vx, 8);
            ctx.stroke();

            if (i !== 0 && i % 2 === 0) {
                ctx.fillText(Math.abs(i), vx, 22);
            }
        }

        // 4. Vẽ các quả nặng trên thanh
        weights.forEach((w, idx) => {
            const wx = w.pos * stepPx;
            const wSize = 20 + w.mass * 1.5;
            ctx.fillStyle = idx === 0 ? '#38bdf8' : '#f59e0b';
            ctx.fillRect(wx - wSize / 2, -8 - wSize, wSize, wSize);
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 1.5;
            ctx.strokeRect(wx - wSize / 2, -8 - wSize, wSize, wSize);

            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 11px "Space Grotesk", -apple-system, sans-serif';
            ctx.fillText(`${w.mass}kg`, wx, -8 - wSize / 2 + 4);
        });

        ctx.restore();
    }

    function loop() {
        update();
        draw();
        requestAnimationFrame(loop);
    }
    requestAnimationFrame(loop);

    ['lever-m1', 'lever-d1', 'lever-m2', 'lever-d2'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('input', () => { syncLabels(); });
    });

    const lockBtn = document.getElementById('lever-lock');
    if (lockBtn) {
        lockBtn.addEventListener('click', () => {
            locked = !locked;
            lockBtn.textContent = locked ? '🔓 Mở khóa chốt' : '🔒 Khóa chốt đòn bẩy';
        });
    }

    syncLabels();
})();

// ─────────────────────────────────────────────────────────────
// 7. CHUYỂN ĐỘNG QUAY VÀ MOMEN QUÁN TÍNH (Rotational Inertia)
// ─────────────────────────────────────────────────────────────
(function initRotationalInertia() {
    const canvas = document.getElementById('rotationalInertiaCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    let angle = 0;
    let omega = 3.0; // rad/s
    let radius = 100; // Khoảng cách quả nặng tới trục quay (px)

    function getParams() {
        const rEl = document.getElementById('rot-radius');
        const mEl = document.getElementById('rot-mass');

        return {
            r: rEl ? parseFloat(rEl.value) : 100, // pixel
            m: mEl ? parseFloat(mEl.value) : 5 // kg
        };
    }

    function syncLabels() {
        const p = getParams();
        const rVal = document.getElementById('rot-radius-val');
        const mVal = document.getElementById('rot-mass-val');
        if (rVal) rVal.textContent = (p.r / 50).toFixed(2) + ' m';
        if (mVal) mVal.textContent = p.m.toFixed(1) + ' kg';
    }

    function update(dt) {
        const p = getParams();
        const newR = p.r;

        // Định luật bảo toàn mômen động lượng: L = I * omega = const
        // I = m * r^2
        // Khi thay đổi bán kính từ r_old sang r_new: omega_new = omega_old * (r_old / r_new)^2
        if (Math.abs(newR - radius) > 0.5) {
            const I_old = p.m * Math.pow(radius / 50, 2);
            const I_new = p.m * Math.pow(newR / 50, 2);
            omega = omega * (I_old / I_new);
            radius = newR;
        }

        angle += omega * dt;

        const realR = radius / 50;
        const I = p.m * realR * realR;
        const L = I * omega;
        const Erot = 0.5 * I * omega * omega;

        const iEl = document.getElementById('rot-inertia');
        const wEl = document.getElementById('rot-omega');
        const lEl = document.getElementById('rot-angular-l');
        const eEl = document.getElementById('rot-energy');

        if (iEl) iEl.textContent = I.toFixed(3) + ' kg·m²';
        if (wEl) wEl.textContent = omega.toFixed(2) + ' rad/s';
        if (lEl) lEl.textContent = L.toFixed(2) + ' J·s (const)';
        if (eEl) eEl.textContent = Erot.toFixed(1) + ' J';
    }

    function draw() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        const bgGrad = ctx.createLinearGradient(0, 0, 0, canvas.height);
        bgGrad.addColorStop(0, '#040d1a');
        bgGrad.addColorStop(1, '#091e38');
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        const cx = canvas.width / 2;
        const cy = canvas.height / 2;

        // Trục quay ở tâm
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(cx, cy, 6, 0, Math.PI * 2);
        ctx.fill();

        // Đĩa quay / thanh quay
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(angle);

        // Thanh ngang đỡ 2 quả nặng
        ctx.strokeStyle = '#475569';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(-radius, 0);
        ctx.lineTo(radius, 0);
        ctx.stroke();

        // 2 Quả nặng di động
        ctx.fillStyle = '#38bdf8';
        ctx.beginPath();
        ctx.arc(-radius, 0, 16, 0, Math.PI * 2);
        ctx.arc(radius, 0, 16, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.restore();

        // Vòng tròn đường chạy của 2 quả nặng
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.2)';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);

        // Chú thích
        ctx.fillStyle = '#94a3b8';
        ctx.font = '12px "Space Grotesk", -apple-system, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('💡 Thu hẹp bán kính r → Momen quán tính I giảm → Tốc độ quay ω tăng vọt!', cx, canvas.height - 25);
    }

    let lastTime = performance.now();
    function loop(now) {
        const dt = Math.min((now - lastTime) / 1000, 0.05);
        lastTime = now;
        update(dt);
        draw();
        requestAnimationFrame(loop);
    }
    requestAnimationFrame(loop);

    ['rot-radius', 'rot-mass'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('input', () => { syncLabels(); });
    });

    syncLabels();
})();



/* --- BUNDLED: simulations/thermo.js --- */
/* ============================================================
   🔥 LP.VirtualLab - CHUYÊN ĐỀ 2: NHIỆT HỌC & VẬT LÝ THỐNG KÊ (Thermodynamics)
   Bao gồm 3 bài mô phỏng chuẩn mực:
   8. Phương trình trạng thái khí lý tưởng P-V-T (Ideal Gas Laws: Boyle, Charles, Gay-Lussac)
   9. Thuyết động học phân tử & Phân bố Maxwell-Boltzmann (Molecular Kinetics & Speed Distribution)
   10. Các quá trình nhiệt động & Chu trình Carnot (Thermodynamic Processes & Carnot Engine)
   Tác giả: Lê Ngọc Phú - SĐT: 0853257289
   ============================================================ */

// ─────────────────────────────────────────────────────────────
// 8. PHƯƠNG TRÌNH TRẠNG THÁI KHÍ LÝ TƯỞNG (P-V-T Gas Chamber)
// ─────────────────────────────────────────────────────────────
(function initGasProperties() {
    const canvas = document.getElementById('gasPropertiesCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    let particles = [];
    let pistonX = 420; // Vị trí piston xác định thể tích V
    let draggingPiston = false;
    let collisionsThisSec = 0;
    let pressureReading = 1.0; // atm
    let lastCollisionReset = performance.now();

    function getParams() {
        const tEl = document.getElementById('gp-temp');
        const nEl = document.getElementById('gp-particles');
        const lawEl = document.querySelector('input[name="gp-law"]:checked');

        return {
            tempK: tEl ? parseFloat(tEl.value) : 300,
            particleCount: nEl ? parseInt(nEl.value) : 100,
            lockedLaw: lawEl ? lawEl.value : 'none' // 'none', 'boyle' (T const), 'charles' (P const), 'gay-lussac' (V const)
        };
    }

    function syncLabels() {
        const p = getParams();
        const tVal = document.getElementById('gp-temp-val');
        const nVal = document.getElementById('gp-particles-val');
        const vVal = document.getElementById('gp-volume-val');
        if (tVal) tVal.textContent = p.tempK.toFixed(0) + ' K';
        if (nVal) nVal.textContent = p.particleCount;
        if (vVal) {
            const volLiters = ((pistonX - 80) / 20).toFixed(1);
            vVal.textContent = volLiters + ' L';
        }
    }

    function resetParticles() {
        const p = getParams();
        particles = [];
        const chamberW = pistonX - 80;
        const chamberH = 260;
        const speed = Math.sqrt(p.tempK / 300) * 4;

        for (let i = 0; i < p.particleCount; i++) {
            const angle = Math.random() * Math.PI * 2;
            particles.push({
                x: 85 + Math.random() * (chamberW - 10),
                y: 75 + Math.random() * (chamberH - 10),
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                r: 3.5,
                color: '#38bdf8'
            });
        }
    }

    // Kéo piston bằng chuột
    canvas.addEventListener('mousedown', (e) => {
        const rect = canvas.getBoundingClientRect();
        const mx = (e.clientX - rect.left) * (canvas.width / rect.width);
        const my = (e.clientY - rect.top) * (canvas.height / rect.height);
        if (Math.abs(mx - pistonX) < 18 && my >= 60 && my <= 340) {
            const p = getParams();
            if (p.lockedLaw !== 'gay-lussac') {
                draggingPiston = true;
            }
        }
    });

    window.addEventListener('mousemove', (e) => {
        if (!draggingPiston) return;
        const rect = canvas.getBoundingClientRect();
        const mx = (e.clientX - rect.left) * (canvas.width / rect.width);
        pistonX = Math.max(160, Math.min(canvas.width - 60, mx));
        syncLabels();
    });

    window.addEventListener('mouseup', () => { draggingPiston = false; });

    function update(dt) {
        const p = getParams();
        const now = performance.now();
        if (now - lastCollisionReset > 500) {
            // Tính áp suất dựa trên xung lượng va chạm và định luật Clapeyron-Mendeleev: P = n R T / V
            const volLiters = (pistonX - 80) / 20;
            pressureReading = (p.particleCount * 0.00831 * p.tempK) / volLiters;
            collisionsThisSec = 0;
            lastCollisionReset = now;

            const pEl = document.getElementById('gp-pressure-val');
            if (pEl) pEl.textContent = pressureReading.toFixed(2) + ' atm';
        }

        const left = 80;
        const right = pistonX;
        const top = 70;
        const bottom = 330;
        const targetSpeed = Math.sqrt(p.tempK / 300) * 4;

        particles.forEach(pt => {
            pt.x += pt.vx * dt * 40;
            pt.y += pt.vy * dt * 40;

            // Va chạm thành xilanh
            if (pt.x - pt.r < left) {
                pt.x = left + pt.r;
                pt.vx = Math.abs(pt.vx);
                collisionsThisSec++;
            }
            if (pt.x + pt.r > right) {
                pt.x = right - pt.r;
                pt.vx = -Math.abs(pt.vx);
                collisionsThisSec++;
            }
            if (pt.y - pt.r < top) {
                pt.y = top + pt.r;
                pt.vy = Math.abs(pt.vy);
                collisionsThisSec++;
            }
            if (pt.y + pt.r > bottom) {
                pt.y = bottom - pt.r;
                pt.vy = -Math.abs(pt.vy);
                collisionsThisSec++;
            }

            // Điều chỉnh tốc độ theo nhiệt độ
            const curSpeed = Math.hypot(pt.vx, pt.vy);
            if (curSpeed > 0) {
                pt.vx = (pt.vx / curSpeed) * targetSpeed;
                pt.vy = (pt.vy / curSpeed) * targetSpeed;
            }
        });
    }

    function draw() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        const bgGrad = ctx.createLinearGradient(0, 0, 0, canvas.height);
        bgGrad.addColorStop(0, '#040d1a');
        bgGrad.addColorStop(1, '#091e38');
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        const p = getParams();

        const left = 80;
        const right = pistonX;
        const top = 70;
        const bottom = 330;

        // 1. Thân buồng kín (Xilanh)
        ctx.fillStyle = '#0b192c';
        ctx.fillRect(left, top, right - left, bottom - top);

        ctx.strokeStyle = '#475569';
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.moveTo(canvas.width - 40, top);
        ctx.lineTo(left, top);
        ctx.lineTo(left, bottom);
        ctx.lineTo(canvas.width - 40, bottom);
        ctx.stroke();

        // 2. Các phân tử khí
        particles.forEach(pt => {
            ctx.beginPath();
            ctx.arc(pt.x, pt.y, pt.r, 0, Math.PI * 2);
            ctx.fillStyle = p.tempK > 400 ? '#f87171' : (p.tempK < 200 ? '#60a5fa' : '#38bdf8');
            ctx.fill();
        });

        // 3. Piston di động
        ctx.fillStyle = '#334155';
        ctx.fillRect(right - 6, top, 14, bottom - top);
        ctx.strokeStyle = '#94a3b8';
        ctx.lineWidth = 2;
        ctx.strokeRect(right - 6, top, 14, bottom - top);

        // Tay đẩy piston
        ctx.fillStyle = '#64748b';
        ctx.fillRect(right + 8, top + (bottom - top) / 2 - 8, canvas.width - right - 20, 16);

        // 4. Đồng hồ đo áp suất (Pressure Gauge) gắn trên nóc xilanh
        const gaugeX = left + 80;
        const gaugeY = top - 25;
        drawGauge(ctx, gaugeX, gaugeY, pressureReading, 'P (atm)');

        // 5. Ngọn lửa đèn cồn / Băng làm mát phía dưới đáy xilanh
        drawHeatSource(ctx, left + (right - left) / 2, bottom + 15, p.tempK);
    }

    function drawGauge(ctx, x, y, val, label) {
        ctx.fillStyle = '#1e293b';
        ctx.beginPath();
        ctx.arc(x, y, 22, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Kim chỉ
        const angle = -Math.PI * 0.75 + (val / 3.0) * Math.PI * 1.5;
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + Math.cos(angle) * 16, y + Math.sin(angle) * 16);
        ctx.stroke();

        ctx.fillStyle = '#ffffff';
        ctx.font = '10px "Space Grotesk", -apple-system, sans-serif';
        ctx.fillText(label, x - 16, y + 34);
    }

    function drawHeatSource(ctx, x, y, temp) {
        if (temp > 300) {
            // Ngọn lửa
            ctx.fillStyle = '#f97316';
            ctx.beginPath();
            ctx.moveTo(x - 20, y + 10);
            ctx.quadraticCurveTo(x, y - 10, x + 20, y + 10);
            ctx.closePath();
            ctx.fill();
        } else if (temp < 250) {
            // Khối băng
            ctx.fillStyle = '#7dd3fc';
            ctx.fillRect(x - 25, y, 50, 12);
        }
    }

    let lastTime = performance.now();
    function loop(now) {
        const dt = Math.min((now - lastTime) / 1000, 0.05);
        lastTime = now;
        update(dt);
        draw();
        requestAnimationFrame(loop);
    }
    requestAnimationFrame(loop);

    ['gp-temp', 'gp-particles'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('input', () => { syncLabels(); resetParticles(); });
    });

    syncLabels();
    resetParticles();
})();

// ─────────────────────────────────────────────────────────────
// 9. THUYẾT ĐỘNG HỌC PHÂN TỬ & PHÂN BỐ MAXWELL-BOLTZMANN
// ─────────────────────────────────────────────────────────────
(function initMaxwellBoltzmann() {
    const canvas = document.getElementById('maxwellBoltzmannCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    let particles = [];
    const numParticles = 180;

    function getParams() {
        const tEl = document.getElementById('mb-temp');
        const gasEl = document.getElementById('mb-gas-type');

        const tempK = tEl ? parseFloat(tEl.value) : 300;
        const molarMass = gasEl ? parseFloat(gasEl.value) : 28; // g/mol (N2 = 28, He = 4, Ar = 40, Xe = 131)

        return { tempK, molarMass };
    }

    function syncLabels() {
        const p = getParams();
        const tVal = document.getElementById('mb-temp-val');
        if (tVal) tVal.textContent = p.tempK.toFixed(0) + ' K';
    }

    function resetSimulation() {
        const p = getParams();
        particles = [];
        // Hằng số khí R = 8.314 J/(mol K). Tốc độ tỷ lệ sqrt(3RT / M)
        const baseSpeed = Math.sqrt((3 * 8.314 * p.tempK) / (p.molarMass * 0.001)) * 0.12;

        for (let i = 0; i < numParticles; i++) {
            // Phân bố vận tốc ban đầu Gaussian
            const u1 = Math.random();
            const u2 = Math.random();
            const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
            const speed = Math.max(1, baseSpeed * (0.6 + 0.4 * Math.abs(z)));
            const angle = Math.random() * Math.PI * 2;

            particles.push({
                x: 30 + Math.random() * 260,
                y: 50 + Math.random() * 320,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                r: p.molarMass > 30 ? 4.5 : 3,
                color: p.molarMass === 4 ? '#38bdf8' : (p.molarMass === 28 ? '#10b981' : '#f59e0b')
            });
        }
    }

    function update(dt) {
        const chamberW = 300;
        const chamberH = 380;

        particles.forEach(pt => {
            pt.x += pt.vx * dt * 30;
            pt.y += pt.vy * dt * 30;

            if (pt.x < 20 + pt.r) { pt.x = 20 + pt.r; pt.vx = -pt.vx; }
            if (pt.x > chamberW - pt.r) { pt.x = chamberW - pt.r; pt.vx = -pt.vx; }
            if (pt.y < 30 + pt.r) { pt.y = 30 + pt.r; pt.vy = -pt.vy; }
            if (pt.y > chamberH - pt.r) { pt.y = chamberH - pt.r; pt.vy = -pt.vy; }
        });

        // Va chạm đàn hồi giữa các phân tử (để duy trì trạng thái cân bằng nhiệt thống kê)
        for (let i = 0; i < particles.length; i++) {
            for (let j = i + 1; j < particles.length; j++) {
                const p1 = particles[i];
                const p2 = particles[j];
                const dx = p2.x - p1.x;
                const dy = p2.y - p1.y;
                const dist = Math.hypot(dx, dy);
                if (dist < p1.r + p2.r && dist > 0) {
                    // Trao đổi xung lượng 2D
                    const nx = dx / dist;
                    const ny = dy / dist;
                    const kx = p1.vx - p2.vx;
                    const ky = p1.vy - p2.vy;
                    const p = 2 * (nx * kx + ny * ky) / 2;
                    p1.vx -= p * nx;
                    p1.vy -= p * ny;
                    p2.vx += p * nx;
                    p2.vy += p * ny;
                }
            }
        }

        // Tính các vận tốc đặc trưng lý thuyết:
        // v_xs = sqrt(2RT/M), v_tb = sqrt(8RT / pi M), v_rms = sqrt(3RT/M)
        const p = getParams();
        const M_kg = p.molarMass * 0.001;
        const R = 8.314;
        const v_mp = Math.sqrt((2 * R * p.tempK) / M_kg);
        const v_avg = Math.sqrt((8 * R * p.tempK) / (Math.PI * M_kg));
        const v_rms = Math.sqrt((3 * R * p.tempK) / M_kg);

        const vmpEl = document.getElementById('mb-v-mp');
        const vavgEl = document.getElementById('mb-v-avg');
        const vrmsEl = document.getElementById('mb-v-rms');

        if (vmpEl) vmpEl.textContent = v_mp.toFixed(0) + ' m/s';
        if (vavgEl) vavgEl.textContent = v_avg.toFixed(0) + ' m/s';
        if (vrmsEl) vrmsEl.textContent = v_rms.toFixed(0) + ' m/s';
    }

    function draw() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        const bgGrad = ctx.createLinearGradient(0, 0, 0, canvas.height);
        bgGrad.addColorStop(0, '#040d1a');
        bgGrad.addColorStop(1, '#091e38');
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // 1. Bình chứa phân tử bên trái
        const chamberW = 300;
        const chamberH = 380;
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(20, 30, chamberW - 20, chamberH - 30);
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 3;
        ctx.strokeRect(20, 30, chamberW - 20, chamberH - 30);

        particles.forEach(pt => {
            ctx.beginPath();
            ctx.arc(pt.x, pt.y, pt.r, 0, Math.PI * 2);
            ctx.fillStyle = pt.color;
            ctx.fill();
        });

        // 2. Biểu đồ phân bố Maxwell-Boltzmann bên phải
        drawDistributionChart(ctx, 340, 30, canvas.width - 360, chamberH - 30);
    }

    function drawDistributionChart(ctx, ox, oy, chartW, chartH) {
        const p = getParams();
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(ox, oy, chartW, chartH);
        ctx.strokeStyle = '#475569';
        ctx.lineWidth = 1;
        ctx.strokeRect(ox, oy, chartW, chartH);

        // Trục tọa độ
        const originX = ox + 40;
        const originY = oy + chartH - 40;
        const axisW = chartW - 60;
        const axisH = chartH - 60;

        ctx.strokeStyle = '#94a3b8';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(originX, originY);
        ctx.lineTo(originX + axisW, originY); // Trục v
        ctx.moveTo(originX, originY);
        ctx.lineTo(originX, originY - axisH); // Trục f(v)
        ctx.stroke();

        ctx.fillStyle = '#ffffff';
        ctx.font = '11px "Space Grotesk", -apple-system, sans-serif';
        ctx.fillText('Vận tốc v (m/s)', originX + axisW - 50, originY + 25);
        ctx.fillText('f(v)', originX - 30, originY - axisH + 10);

        // Thu thập histogram vận tốc thực tế của các hạt trong bình
        const bins = new Array(20).fill(0);
        const maxV = 2000; // m/s
        const speedScale = Math.sqrt((3 * 8.314 * p.tempK) / (p.molarMass * 0.001)) / 15;

        particles.forEach(pt => {
            const speed = Math.hypot(pt.vx, pt.vy) * speedScale;
            const binIdx = Math.min(19, Math.floor((speed / maxV) * 20));
            bins[binIdx]++;
        });

        // Vẽ histogram cột mờ
        const binW = axisW / 20;
        ctx.fillStyle = 'rgba(56, 189, 248, 0.25)';
        bins.forEach((cnt, idx) => {
            const barH = (cnt / (numParticles * 0.25)) * axisH;
            ctx.fillRect(originX + idx * binW, originY - barH, binW - 2, barH);
        });

        // Vẽ đường cong phân bố lý thuyết Maxwell-Boltzmann
        // f(v) = 4*pi * (m / (2*pi*k*T))^(3/2) * v^2 * exp(-m*v^2 / (2*k*T))
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        const M_kg = p.molarMass * 0.001;
        const R = 8.314;
        const A = 4 * Math.PI * Math.pow(M_kg / (2 * Math.PI * R * p.tempK), 1.5);

        for (let vx = 0; vx <= maxV; vx += 20) {
            const v = vx;
            const fv = A * v * v * Math.exp((-M_kg * v * v) / (2 * R * p.tempK));
            const px = originX + (v / maxV) * axisW;
            const py = originY - fv * 650000 * axisH;
            if (vx === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
        }
        ctx.stroke();

        ctx.fillStyle = '#f59e0b';
        ctx.fillText('— Đường cong lý thuyết Maxwell-Boltzmann', ox + 30, oy + 25);
    }

    let lastTime = performance.now();
    function loop(now) {
        const dt = Math.min((now - lastTime) / 1000, 0.05);
        lastTime = now;
        update(dt);
        draw();
        requestAnimationFrame(loop);
    }
    requestAnimationFrame(loop);

    const tempSlider = document.getElementById('mb-temp');
    if (tempSlider) tempSlider.addEventListener('input', () => { syncLabels(); resetSimulation(); });

    const gasSelect = document.getElementById('mb-gas-type');
    if (gasSelect) gasSelect.addEventListener('change', () => { syncLabels(); resetSimulation(); });

    syncLabels();
    resetSimulation();
})();

// ─────────────────────────────────────────────────────────────
// 10. CÁC QUÁ TRÌNH NHIỆT ĐỘNG & CHU TRÌNH CARNOT (Carnot Cycle)
// ─────────────────────────────────────────────────────────────
(function initCarnotCycle() {
    const canvas = document.getElementById('carnotCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    let currentStep = 0; // 0: Đẳng nhiệt TH, 1: Đoạn nhiệt giãn, 2: Đẳng nhiệt TC, 3: Đoạn nhiệt nén
    let progress = 0; // 0.0 -> 1.0 trong mỗi quá trình
    let running = true;
    let paused = false;

    function getParams() {
        const thEl = document.getElementById('carnot-th');
        const tcEl = document.getElementById('carnot-tc');

        const Th = thEl ? parseFloat(thEl.value) : 600; // K
        const Tc = tcEl ? parseFloat(tcEl.value) : 300; // K

        return { Th, Tc };
    }

    function syncLabels() {
        const p = getParams();
        const thVal = document.getElementById('carnot-th-val');
        const tcVal = document.getElementById('carnot-tc-val');
        if (thVal) thVal.textContent = p.Th.toFixed(0) + ' K';
        if (tcVal) tcVal.textContent = p.Tc.toFixed(0) + ' K';

        // Hiệu suất Carnot lý thuyết: eta = 1 - Tc / Th
        const eta = (1 - p.Tc / p.Th) * 100;
        const etaEl = document.getElementById('carnot-eta');
        if (etaEl) etaEl.textContent = eta.toFixed(1) + ' %';
    }

    function update(dt) {
        if (!running || paused) return;

        progress += dt * 0.4;
        if (progress >= 1.0) {
            progress = 0;
            currentStep = (currentStep + 1) % 4;
        }

        const stepNames = [
            '1-2: Giãn đẳng nhiệt ở Th (Thu nhiệt Q_H)',
            '2-3: Giãn đoạn nhiệt (Q=0, Nhiệt độ giảm Th → Tc)',
            '3-4: Nén đẳng nhiệt ở Tc (Nhả nhiệt Q_C)',
            '4-1: Nén đoạn nhiệt (Q=0, Nhiệt độ tăng Tc → Th)'
        ];

        const stEl = document.getElementById('carnot-step-name');
        if (stEl) stEl.textContent = stepNames[currentStep];
    }

    function draw() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        const bgGrad = ctx.createLinearGradient(0, 0, 0, canvas.height);
        bgGrad.addColorStop(0, '#040d1a');
        bgGrad.addColorStop(1, '#091e38');
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        const p = getParams();

        // 1. Đồ thị P-V bên trái
        drawPVDigram(ctx, 30, 30, 340, 340, p);

        // 2. Mô hình động cơ piston xilanh bên phải
        drawEngineCylinder(ctx, 410, 40, canvas.width - 440, 320, p);
    }

    function drawPVDigram(ctx, ox, oy, w, h, p) {
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(ox, oy, w, h);
        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 1;
        ctx.strokeRect(ox, oy, w, h);

        const xBase = ox + 45;
        const yBase = oy + h - 35;
        const dw = w - 65;
        const dh = h - 65;

        // Trục V và P
        ctx.strokeStyle = '#94a3b8';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(xBase, yBase);
        ctx.lineTo(xBase + dw, yBase);
        ctx.moveTo(xBase, yBase);
        ctx.lineTo(xBase, yBase - dh);
        ctx.stroke();

        ctx.fillStyle = '#ffffff';
        ctx.font = '11px "Space Grotesk", -apple-system, sans-serif';
        ctx.fillText('Thể tích V', xBase + dw - 50, yBase + 25);
        ctx.fillText('Áp suất P', xBase - 40, yBase - dh + 10);

        // 4 điểm trạng thái Carnot:
        // Điểm 1: (V1, P1)
        // Điểm 2: (V2, P2) đẳng nhiệt Th
        // Điểm 3: (V3, P3) đoạn nhiệt
        // Điểm 4: (V4, P4) đẳng nhiệt Tc
        const pt1 = { x: xBase + 40, y: yBase - dh * 0.85 };
        const pt2 = { x: xBase + 120, y: yBase - dh * 0.55 };
        const pt3 = { x: xBase + 220, y: yBase - dh * 0.25 };
        const pt4 = { x: xBase + 110, y: yBase - dh * 0.38 };

        // Tô màu diện tích chu trình (Công có ích W sinh ra)
        ctx.fillStyle = 'rgba(56, 189, 248, 0.2)';
        ctx.beginPath();
        ctx.moveTo(pt1.x, pt1.y);
        ctx.quadraticCurveTo((pt1.x + pt2.x) / 2, (pt1.y + pt2.y) / 2 + 8, pt2.x, pt2.y);
        ctx.quadraticCurveTo((pt2.x + pt3.x) / 2, (pt2.y + pt3.y) / 2 + 10, pt3.x, pt3.y);
        ctx.quadraticCurveTo((pt3.x + pt4.x) / 2, (pt3.y + pt4.y) / 2 - 8, pt4.x, pt4.y);
        ctx.quadraticCurveTo((pt4.x + pt1.x) / 2, (pt4.y + pt1.y) / 2 - 10, pt1.x, pt1.y);
        ctx.fill();

        // Vẽ 4 đường cong quá trình
        ctx.lineWidth = 2.5;

        // 1->2 Đẳng nhiệt Th (Màu đỏ)
        ctx.strokeStyle = '#ef4444';
        ctx.beginPath();
        ctx.moveTo(pt1.x, pt1.y);
        ctx.quadraticCurveTo((pt1.x + pt2.x) / 2, (pt1.y + pt2.y) / 2 + 8, pt2.x, pt2.y);
        ctx.stroke();

        // 2->3 Đoạn nhiệt giãn (Màu cam)
        ctx.strokeStyle = '#f59e0b';
        ctx.beginPath();
        ctx.moveTo(pt2.x, pt2.y);
        ctx.quadraticCurveTo((pt2.x + pt3.x) / 2, (pt2.y + pt3.y) / 2 + 10, pt3.x, pt3.y);
        ctx.stroke();

        // 3->4 Đẳng nhiệt Tc (Màu xanh dương)
        ctx.strokeStyle = '#38bdf8';
        ctx.beginPath();
        ctx.moveTo(pt3.x, pt3.y);
        ctx.quadraticCurveTo((pt3.x + pt4.x) / 2, (pt3.y + pt4.y) / 2 - 8, pt4.x, pt4.y);
        ctx.stroke();

        // 4->1 Đoạn nhiệt nén (Màu tím)
        ctx.strokeStyle = '#a855f7';
        ctx.beginPath();
        ctx.moveTo(pt4.x, pt4.y);
        ctx.quadraticCurveTo((pt4.x + pt1.x) / 2, (pt4.y + pt1.y) / 2 - 10, pt1.x, pt1.y);
        ctx.stroke();

        // Đánh dấu các đỉnh 1, 2, 3, 4
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 12px "Space Grotesk", -apple-system, sans-serif';
        ctx.fillText('1', pt1.x - 12, pt1.y);
        ctx.fillText('2', pt2.x + 6, pt2.y - 4);
        ctx.fillText('3', pt3.x + 6, pt3.y);
        ctx.fillText('4', pt4.x - 12, pt4.y + 10);

        // Điểm trạng thái động hiện tại
        let curPoint = { x: pt1.x, y: pt1.y };
        if (currentStep === 0) {
            curPoint.x = pt1.x + (pt2.x - pt1.x) * progress;
            curPoint.y = pt1.y + (pt2.y - pt1.y) * progress;
        } else if (currentStep === 1) {
            curPoint.x = pt2.x + (pt3.x - pt2.x) * progress;
            curPoint.y = pt2.y + (pt3.y - pt2.y) * progress;
        } else if (currentStep === 2) {
            curPoint.x = pt3.x + (pt4.x - pt3.x) * progress;
            curPoint.y = pt3.y + (pt4.y - pt3.y) * progress;
        } else {
            curPoint.x = pt4.x + (pt1.x - pt4.x) * progress;
            curPoint.y = pt4.y + (pt1.y - pt4.y) * progress;
        }

        ctx.fillStyle = '#22c55e';
        ctx.beginPath();
        ctx.arc(curPoint.x, curPoint.y, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.stroke();
    }

    function drawEngineCylinder(ctx, ox, oy, w, h, p) {
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(ox, oy, w, h);
        ctx.strokeStyle = '#475569';
        ctx.lineWidth = 1;
        ctx.strokeRect(ox, oy, w, h);

        ctx.fillStyle = '#ffffff';
        ctx.font = '13px "Space Grotesk", -apple-system, sans-serif';
        ctx.fillText('⚙️ Xilanh Piston Động Cơ Nhiệt', ox + 20, oy + 25);

        // Vị trí piston tương ứng theo chu trình:
        // Bước 0 & 1: Piston di chuyển sang phải (giãn nở)
        // Bước 2 & 3: Piston di chuyển sang trái (nén)
        let pistonDisplacement = 0;
        if (currentStep === 0) pistonDisplacement = 40 + progress * 40;
        else if (currentStep === 1) pistonDisplacement = 80 + progress * 50;
        else if (currentStep === 2) pistonDisplacement = 130 - progress * 55;
        else pistonDisplacement = 75 - progress * 35;

        const cylX = ox + 30;
        const cylY = oy + 60;
        const cylW = w - 60;
        const cylH = 120;

        // Vỏ xilanh
        ctx.strokeStyle = '#94a3b8';
        ctx.lineWidth = 4;
        ctx.strokeRect(cylX, cylY, cylW, cylH);

        // Khí bên trong xilanh
        ctx.fillStyle = (currentStep === 0 || currentStep === 3) ? 'rgba(239, 68, 68, 0.3)' : 'rgba(56, 189, 248, 0.3)';
        ctx.fillRect(cylX, cylY, pistonDisplacement, cylH);

        // Piston
        ctx.fillStyle = '#475569';
        ctx.fillRect(cylX + pistonDisplacement - 10, cylY, 15, cylH);
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.strokeRect(cylX + pistonDisplacement - 10, cylY, 15, cylH);

        // Thanh truyền
        ctx.fillStyle = '#64748b';
        ctx.fillRect(cylX + pistonDisplacement + 5, cylY + cylH / 2 - 8, cylW - pistonDisplacement, 16);

        // Nguồn nhiệt tiếp xúc đáy xilanh
        ctx.fillStyle = currentStep === 0 ? '#ef4444' : (currentStep === 2 ? '#38bdf8' : '#334155');
        ctx.fillRect(cylX - 15, cylY + 20, 12, cylH - 40);

        ctx.fillStyle = '#ffffff';
        ctx.font = '11px "Space Grotesk", -apple-system, sans-serif';
        const sourceLabel = currentStep === 0 ? `🔥 Nguồn nóng T_H (${p.Th}K)` : (currentStep === 2 ? `❄️ Nguồn lạnh T_C (${p.Tc}K)` : '🛡️ Cách nhiệt (Q = 0)');
        ctx.fillText(sourceLabel, ox + 30, oy + 220);
    }

    let lastTime = performance.now();
    function loop(now) {
        const dt = Math.min((now - lastTime) / 1000, 0.05);
        lastTime = now;
        update(dt);
        draw();
        requestAnimationFrame(loop);
    }
    requestAnimationFrame(loop);

    ['carnot-th', 'carnot-tc'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('input', () => { syncLabels(); });
    });

    syncLabels();
})();



/* --- BUNDLED: simulations/waves.js --- */
/* ============================================================
   🌊 LP.VirtualLab - CHUYÊN ĐỀ 3: DAO ĐỘNG & SÓNG CƠ (Oscillations & Waves)
   Bao gồm 3 bài mô phỏng chuẩn mực:
   11. Dao động điều hòa: Con lắc lò xo & Con lắc đơn (Harmonic Oscillators)
   12. Dao động tắt dần và Hiện tượng Cộng hưởng (Damped & Forced Resonance)
   13. Sóng cơ học, Giao thoa sóng & Sóng dừng trên dây (Mechanical Waves & Standing Waves)
   Tác giả: Lê Ngọc Phú - SĐT: 0853257289
   ============================================================ */

// ─────────────────────────────────────────────────────────────
// 11. DAO ĐỘNG ĐIỀU HÒA (Harmonic Motion: Spring & Pendulum)
// ─────────────────────────────────────────────────────────────
(function initHarmonicMotion() {
    const canvas = document.getElementById('harmonicCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    let mode = 'spring'; // 'spring' or 'pendulum'
    let t = 0;
    let paused = false;
    let waveHistory = [];

    function getParams() {
        const mEl = document.getElementById('hm-mass');
        const kEl = document.getElementById('hm-k');
        const lEl = document.getElementById('hm-len');
        const gEl = document.getElementById('hm-g');
        const ampEl = document.getElementById('hm-amp');

        return {
            m: mEl ? parseFloat(mEl.value) : 2.0, // kg
            k: kEl ? parseFloat(kEl.value) : 50,  // N/m
            L: lEl ? parseFloat(lEl.value) : 1.5, // m
            g: gEl ? parseFloat(gEl.value) : 9.8, // m/s2
            A: ampEl ? parseFloat(ampEl.value) : 0.4 // m
        };
    }

    function syncLabels() {
        const p = getParams();
        const mVal = document.getElementById('hm-mass-val');
        const kVal = document.getElementById('hm-k-val');
        const lVal = document.getElementById('hm-len-val');
        const gVal = document.getElementById('hm-g-val');
        const aVal = document.getElementById('hm-amp-val');

        if (mVal) mVal.textContent = p.m.toFixed(1) + ' kg';
        if (kVal) kVal.textContent = p.k.toFixed(0) + ' N/m';
        if (lVal) lVal.textContent = p.L.toFixed(2) + ' m';
        if (gVal) gVal.textContent = p.g.toFixed(1) + ' m/s²';
        if (aVal) aVal.textContent = p.A.toFixed(2) + ' m';

        // Chu kỳ T và tần số f
        let omega = 0, T = 0, f = 0;
        if (mode === 'spring') {
            omega = Math.sqrt(p.k / p.m);
        } else {
            omega = Math.sqrt(p.g / p.L);
        }
        T = (2 * Math.PI) / omega;
        f = 1 / T;

        const tEl = document.getElementById('hm-period');
        const fEl = document.getElementById('hm-freq');
        const wEl = document.getElementById('hm-omega');

        if (tEl) tEl.textContent = T.toFixed(2) + ' s';
        if (fEl) fEl.textContent = f.toFixed(2) + ' Hz';
        if (wEl) wEl.textContent = omega.toFixed(2) + ' rad/s';
    }

    function update(dt) {
        if (paused) return;
        const p = getParams();

        let omega = 0;
        if (mode === 'spring') {
            omega = Math.sqrt(p.k / p.m);
        } else {
            omega = Math.sqrt(p.g / p.L);
        }

        t += dt;
        const x = p.A * Math.cos(omega * t);
        const v = -p.A * omega * Math.sin(omega * t);
        const a = -omega * omega * x;

        waveHistory.push(x);
        if (waveHistory.length > 200) waveHistory.shift();

        const xEl = document.getElementById('hm-disp');
        const vEl = document.getElementById('hm-vel');
        const aEl = document.getElementById('hm-acc');

        if (xEl) xEl.textContent = x.toFixed(3) + ' m';
        if (vEl) vEl.textContent = v.toFixed(3) + ' m/s';
        if (aEl) aEl.textContent = a.toFixed(3) + ' m/s²';
    }

    function draw() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        const bgGrad = ctx.createLinearGradient(0, 0, 0, canvas.height);
        bgGrad.addColorStop(0, '#040d1a');
        bgGrad.addColorStop(1, '#091e38');
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        const p = getParams();

        // 1. Phía bên trái: Mô phỏng vật lý (Lò xo hoặc Con lắc đơn)
        const simW = 280;
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(15, 20, simW, canvas.height - 40);
        ctx.strokeStyle = '#334155';
        ctx.strokeRect(15, 20, simW, canvas.height - 40);

        let omega = mode === 'spring' ? Math.sqrt(p.k / p.m) : Math.sqrt(p.g / p.L);
        const x = p.A * Math.cos(omega * t);

        if (mode === 'spring') {
            // Con lắc lò xo thẳng đứng
            const topX = 155;
            const topY = 40;
            const restLen = 140;
            const currentLen = restLen + x * 100;

            // Giá treo
            ctx.fillStyle = '#475569';
            ctx.fillRect(topX - 40, topY - 10, 80, 10);

            // Các vòng xoắn lò xo
            ctx.strokeStyle = '#38bdf8';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(topX, topY);
            const coils = 12;
            const dy = currentLen / coils;
            for (let i = 1; i <= coils; i++) {
                const cx = topX + (i % 2 === 0 ? 15 : -15);
                const cy = topY + (i - 0.5) * dy;
                ctx.lineTo(cx, cy);
            }
            ctx.lineTo(topX, topY + currentLen);
            ctx.stroke();

            // Quả nặng lò xo
            const bSize = 30 + p.m * 3;
            ctx.fillStyle = '#0284c7';
            ctx.fillRect(topX - bSize / 2, topY + currentLen, bSize, bSize);
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 2;
            ctx.strokeRect(topX - bSize / 2, topY + currentLen, bSize, bSize);

            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 12px "Space Grotesk", -apple-system, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(`${p.m}kg`, topX, topY + currentLen + bSize / 2 + 4);

        } else {
            // Con lắc đơn
            const pivotX = 155;
            const pivotY = 50;
            const lenPx = 80 + p.L * 70;
            const theta = (p.A / p.L) * Math.cos(omega * t); // Radian

            const bobX = pivotX + lenPx * Math.sin(theta);
            const bobY = pivotY + lenPx * Math.cos(theta);

            // Giá treo
            ctx.fillStyle = '#475569';
            ctx.fillRect(pivotX - 30, pivotY - 8, 60, 8);

            // Dây treo
            ctx.strokeStyle = '#94a3b8';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(pivotX, pivotY);
            ctx.lineTo(bobX, bobY);
            ctx.stroke();

            // Quả cầu nặng
            ctx.fillStyle = '#f59e0b';
            ctx.beginPath();
            ctx.arc(bobX, bobY, 16, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 2;
            ctx.stroke();
        }

        // 2. Phía bên phải: Đồ thị li độ x(t) thời gian thực
        const graphX = 320;
        const graphY = 20;
        const graphW = canvas.width - 340;
        const graphH = canvas.height - 40;

        ctx.fillStyle = '#1e293b';
        ctx.fillRect(graphX, graphY, graphW, graphH);
        ctx.strokeStyle = '#475569';
        ctx.strokeRect(graphX, graphY, graphW, graphH);

        // Trục thời gian t và li độ x
        const midY = graphY + graphH / 2;
        ctx.strokeStyle = '#64748b';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(graphX, midY);
        ctx.lineTo(graphX + graphW, midY);
        ctx.stroke();

        ctx.fillStyle = '#ffffff';
        ctx.font = '11px "Space Grotesk", -apple-system, sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText('+A', graphX + 10, midY - 60);
        ctx.fillText('0 (VTCB)', graphX + 10, midY - 6);
        ctx.fillText('-A', graphX + 10, midY + 70);
        ctx.fillText('Đồ thị li độ x(t)', graphX + 15, graphY + 25);

        // Vẽ sóng dao động
        if (waveHistory.length > 1) {
            ctx.strokeStyle = '#38bdf8';
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            const stepX = graphW / 200;
            waveHistory.forEach((val, i) => {
                const px = graphX + graphW - (waveHistory.length - i) * stepX;
                const py = midY - (val / p.A) * 60;
                if (i === 0) ctx.moveTo(px, py);
                else ctx.lineTo(px, py);
            });
            ctx.stroke();
        }
    }

    let lastTime = performance.now();
    function loop(now) {
        const dt = Math.min((now - lastTime) / 1000, 0.05);
        lastTime = now;
        update(dt);
        draw();
        requestAnimationFrame(loop);
    }
    requestAnimationFrame(loop);

    ['hm-mass', 'hm-k', 'hm-len', 'hm-g', 'hm-amp'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('input', () => { syncLabels(); });
    });

    document.querySelectorAll('input[name="hm-mode"]').forEach(radio => {
        radio.addEventListener('change', () => {
            mode = radio.value;
            const springControls = document.getElementById('hm-spring-controls');
            const pendulumControls = document.getElementById('hm-pendulum-controls');
            if (springControls) springControls.style.display = mode === 'spring' ? 'block' : 'none';
            if (pendulumControls) pendulumControls.style.display = mode === 'pendulum' ? 'block' : 'none';
            syncLabels();
        });
    });

    syncLabels();
})();

// ─────────────────────────────────────────────────────────────
// 12. DAO ĐỘNG TẮT DẦN VÀ HIỆN TƯỢNG CỘNG HƯỞNG (Resonance)
// ─────────────────────────────────────────────────────────────
(function initResonanceDamping() {
    const canvas = document.getElementById('resonanceCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    let t = 0;
    let paused = false;

    function getParams() {
        const omega0El = document.getElementById('res-omega0');
        const gammaEl = document.getElementById('res-gamma');
        const driveOmegaEl = document.getElementById('res-drive-omega');
        const f0El = document.getElementById('res-f0');

        return {
            omega0: omega0El ? parseFloat(omega0El.value) : 5.0, // rad/s
            gamma: gammaEl ? parseFloat(gammaEl.value) : 0.3,    // Hệ số tắt dần
            driveOmega: driveOmegaEl ? parseFloat(driveOmegaEl.value) : 5.0, // Tần số cưỡng bức Omega
            F0: f0El ? parseFloat(f0El.value) : 10.0 // Biên độ ngoại lực
        };
    }

    function syncLabels() {
        const p = getParams();
        const w0Val = document.getElementById('res-omega0-val');
        const gamVal = document.getElementById('res-gamma-val');
        const dwVal = document.getElementById('res-drive-omega-val');
        const f0Val = document.getElementById('res-f0-val');

        if (w0Val) w0Val.textContent = p.omega0.toFixed(1) + ' rad/s';
        if (gamVal) gamVal.textContent = p.gamma.toFixed(2);
        if (dwVal) dwVal.textContent = p.driveOmega.toFixed(1) + ' rad/s';
        if (f0Val) f0Val.textContent = p.F0.toFixed(1) + ' N';

        // Biên độ cộng hưởng lý thuyết xác lập:
        // A(Omega) = (F0/m) / sqrt((omega0^2 - Omega^2)^2 + 4 * gamma^2 * Omega^2)
        const denom = Math.sqrt(Math.pow(p.omega0 * p.omega0 - p.driveOmega * p.driveOmega, 2) + 4 * p.gamma * p.gamma * p.driveOmega * p.driveOmega);
        const amp = denom > 0 ? (p.F0 / denom) : 0;

        const ampEl = document.getElementById('res-amplitude');
        const stEl = document.getElementById('res-status');

        if (ampEl) ampEl.textContent = amp.toFixed(2) + ' cm';
        if (stEl) {
            const diff = Math.abs(p.driveOmega - p.omega0);
            if (diff < 0.2) {
                stEl.textContent = '🔥 CỘNG HƯỞNG CỰC ĐẠI (Ω ≈ ω₀)!';
                stEl.style.color = '#ef4444';
            } else {
                stEl.textContent = 'Dao động điều hòa xác lập biên độ thường';
                stEl.style.color = '#10b981';
            }
        }
    }

    function draw() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        const bgGrad = ctx.createLinearGradient(0, 0, 0, canvas.height);
        bgGrad.addColorStop(0, '#040d1a');
        bgGrad.addColorStop(1, '#091e38');
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        const p = getParams();

        // 1. Bên trái: Dao động của vật dưới tác dụng của ngoại lực tuần hoàn
        const simW = 260;
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(15, 20, simW, canvas.height - 40);
        ctx.strokeStyle = '#334155';
        ctx.strokeRect(15, 20, simW, canvas.height - 40);

        const denom = Math.sqrt(Math.pow(p.omega0 * p.omega0 - p.driveOmega * p.driveOmega, 2) + 4 * p.gamma * p.gamma * p.driveOmega * p.driveOmega);
        const amp = Math.min(90, (p.F0 / denom) * 15); // Pixel
        const delta = Math.atan2(2 * p.gamma * p.driveOmega, p.omega0 * p.omega0 - p.driveOmega * p.driveOmega);

        const currentDisp = amp * Math.cos(p.driveOmega * t - delta);

        const midX = 145;
        const midY = canvas.height / 2;

        // Lò xo
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(35, midY);
        const springLen = 100 + currentDisp;
        const coils = 10;
        const dx = springLen / coils;
        for (let i = 1; i <= coils; i++) {
            const sx = 35 + (i - 0.5) * dx;
            const sy = midY + (i % 2 === 0 ? 14 : -14);
            ctx.lineTo(sx, sy);
        }
        ctx.lineTo(35 + springLen, midY);
        ctx.stroke();

        // Khối hộp
        ctx.fillStyle = Math.abs(p.driveOmega - p.omega0) < 0.2 ? '#ef4444' : '#0284c7';
        ctx.fillRect(35 + springLen, midY - 25, 45, 50);
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.strokeRect(35 + springLen, midY - 25, 45, 50);

        // Ngoại lực cưỡng bức (mũi tên đập tuần hoàn)
        const fArrow = Math.cos(p.driveOmega * t) * 30;
        drawArrow(ctx, 35 + springLen + 50, midY, 35 + springLen + 50 + fArrow, midY, '#f59e0b', 'F(t)');

        // 2. Bên phải: Đồ thị đường cong cộng hưởng A(Omega)
        const chartX = 300;
        const chartY = 30;
        const chartW = canvas.width - 325;
        const chartH = canvas.height - 60;

        drawResonanceCurve(ctx, chartX, chartY, chartW, chartH, p);
    }

    function drawResonanceCurve(ctx, ox, oy, w, h, p) {
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(ox, oy, w, h);
        ctx.strokeStyle = '#475569';
        ctx.strokeRect(ox, oy, w, h);

        const xBase = ox + 45;
        const yBase = oy + h - 35;
        const dw = w - 65;
        const dh = h - 65;

        // Trục tọa độ
        ctx.strokeStyle = '#94a3b8';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(xBase, yBase);
        ctx.lineTo(xBase + dw, yBase); // Trục tần số cưỡng bức Omega
        ctx.moveTo(xBase, yBase);
        ctx.lineTo(xBase, yBase - dh); // Trục biên độ A
        ctx.stroke();

        ctx.fillStyle = '#ffffff';
        ctx.font = '11px "Space Grotesk", -apple-system, sans-serif';
        ctx.fillText('Tần số ngoại lực Ω (rad/s)', xBase + dw - 90, yBase + 25);
        ctx.fillText('Biên độ A', xBase - 40, yBase - dh + 10);

        // Vẽ đường cong biên độ A theo tần số Omega (từ 0 đến 12 rad/s)
        const maxOmega = 12.0;
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 2.5;
        ctx.beginPath();

        let peakX = 0, peakY = 0;

        for (let wTest = 0.1; wTest <= maxOmega; wTest += 0.1) {
            const d = Math.sqrt(Math.pow(p.omega0 * p.omega0 - wTest * wTest, 2) + 4 * p.gamma * p.gamma * wTest * wTest);
            const a = (p.F0 / d);
            const px = xBase + (wTest / maxOmega) * dw;
            const py = yBase - Math.min(dh - 10, a * 12);

            if (wTest === 0.1) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);

            if (Math.abs(wTest - p.omega0) < 0.1) {
                peakX = px;
                peakY = py;
            }
        }
        ctx.stroke();

        // Đánh dấu đỉnh cộng hưởng omega0
        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.arc(peakX, peakY, 5, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = '#ef4444';
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(peakX, peakY);
        ctx.lineTo(peakX, yBase);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillText('ω₀', peakX - 6, yBase + 16);

        // Đánh dấu vị trí tần số cưỡng bức hiện tại
        const curPx = xBase + (p.driveOmega / maxOmega) * dw;
        ctx.fillStyle = '#f59e0b';
        ctx.beginPath();
        ctx.arc(curPx, yBase, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillText('Ω hiện tại', curPx - 18, yBase + 30);
    }

    function drawArrow(ctx, fromX, fromY, toX, toY, color, label) {
        if (Math.abs(toX - fromX) < 2) return;
        const headlen = 6;
        const sign = Math.sign(toX - fromX);
        ctx.strokeStyle = color;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(fromX, fromY);
        ctx.lineTo(toX, toY);
        ctx.stroke();

        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.moveTo(toX, toY);
        ctx.lineTo(toX - sign * headlen, toY - 4);
        ctx.lineTo(toX - sign * headlen, toY + 4);
        ctx.fill();

        ctx.font = '11px "Space Grotesk", -apple-system, sans-serif';
        ctx.fillText(label, fromX, fromY - 8);
    }

    let lastTime = performance.now();
    function loop(now) {
        const dt = Math.min((now - lastTime) / 1000, 0.05);
        lastTime = now;
        if (!paused) t += dt;
        draw();
        requestAnimationFrame(loop);
    }
    requestAnimationFrame(loop);

    ['res-omega0', 'res-gamma', 'res-drive-omega', 'res-f0'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('input', () => { syncLabels(); });
    });

    syncLabels();
})();

// ─────────────────────────────────────────────────────────────
// 13. SÓNG CƠ, GIAO THOA VÀ SÓNG DỪNG (Waves & Interference & Standing)
// ─────────────────────────────────────────────────────────────
(function initWavesInterferenceStanding() {
    const canvas = document.getElementById('wavesInterferenceCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    let mode = 'standing'; // 'standing' or 'interference' or 'traveling'
    let t = 0;
    let paused = false;

    function getParams() {
        const harmEl = document.getElementById('wave-harmonics');
        const freqEl = document.getElementById('wave-freq');
        const ampEl = document.getElementById('wave-amp');

        return {
            harmonicN: harmEl ? parseInt(harmEl.value) : 3, // Bậc họa ba sóng dừng n = 1, 2, 3, 4, 5
            freq: freqEl ? parseFloat(freqEl.value) : 2.0,   // Hz
            amplitude: ampEl ? parseFloat(ampEl.value) : 40  // px
        };
    }

    function syncLabels() {
        const p = getParams();
        const nVal = document.getElementById('wave-harmonics-val');
        const fVal = document.getElementById('wave-freq-val');
        const aVal = document.getElementById('wave-amp-val');

        if (nVal) nVal.textContent = p.harmonicN;
        if (fVal) fVal.textContent = p.freq.toFixed(1) + ' Hz';
        if (aVal) aVal.textContent = p.amplitude.toFixed(0) + ' mm';

        // Sóng dừng 2 đầu cố định: Số nút = n + 1, Số bụng = n
        const nodeEl = document.getElementById('wave-nodes-count');
        const antinodeEl = document.getElementById('wave-antinodes-count');
        const lambdaEl = document.getElementById('wave-lambda-val');

        if (nodeEl) nodeEl.textContent = p.harmonicN + 1;
        if (antinodeEl) antinodeEl.textContent = p.harmonicN;
        if (lambdaEl) {
            const L = 1.2; // mét
            const lambda = (2 * L) / p.harmonicN;
            lambdaEl.textContent = lambda.toFixed(2) + ' m';
        }
    }

    function draw() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        const bgGrad = ctx.createLinearGradient(0, 0, 0, canvas.height);
        bgGrad.addColorStop(0, '#040d1a');
        bgGrad.addColorStop(1, '#091e38');
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        const p = getParams();

        if (mode === 'standing') {
            drawStandingWave(ctx, p);
        } else if (mode === 'interference') {
            drawInterferencePattern(ctx, p);
        } else {
            drawTravelingWave(ctx, p);
        }
    }

    function drawStandingWave(ctx, p) {
        const startX = 60;
        const endX = canvas.width - 60;
        const len = endX - startX;
        const midY = canvas.height / 2;

        // Hai điểm đầu cố định
        ctx.fillStyle = '#475569';
        ctx.fillRect(startX - 15, midY - 60, 15, 120);
        ctx.fillRect(endX, midY - 60, 15, 120);

        // Trục trung tâm (nét đứt)
        ctx.strokeStyle = '#334155';
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(startX, midY);
        ctx.lineTo(endX, midY);
        ctx.stroke();
        ctx.setLineDash([]);

        // Sóng dừng: u(x, t) = 2A * sin(2*pi*x / lambda) * cos(omega * t)
        // Với 2 đầu cố định: lambda = 2L / n
        const omega = 2 * Math.PI * p.freq;
        const timeFactor = Math.cos(omega * t);

        // Vẽ bóng mờ biên độ bao bọc (Envelop)
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.25)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        for (let x = 0; x <= len; x += 3) {
            const kx = (p.harmonicN * Math.PI * x) / len;
            const envY = midY - p.amplitude * Math.sin(kx);
            if (x === 0) ctx.moveTo(startX + x, envY);
            else ctx.lineTo(startX + x, envY);
        }
        for (let x = len; x >= 0; x -= 3) {
            const kx = (p.harmonicN * Math.PI * x) / len;
            const envY = midY + p.amplitude * Math.sin(kx);
            ctx.lineTo(startX + x, envY);
        }
        ctx.stroke();

        // Vẽ sợi dây sóng tức thời
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 4;
        ctx.beginPath();
        for (let x = 0; x <= len; x += 2) {
            const kx = (p.harmonicN * Math.PI * x) / len;
            const curY = midY - p.amplitude * Math.sin(kx) * timeFactor;
            if (x === 0) ctx.moveTo(startX + x, curY);
            else ctx.lineTo(startX + x, curY);
        }
        ctx.stroke();

        // Đánh dấu các Nút sóng (màu đỏ đứng yên) và Bụng sóng (màu vàng dao động)
        for (let i = 0; i <= p.harmonicN; i++) {
            const nx = startX + (i / p.harmonicN) * len;
            ctx.fillStyle = '#ef4444';
            ctx.beginPath();
            ctx.arc(nx, midY, 6, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 1.5;
            ctx.stroke();
        }

        // Chú thích
        ctx.fillStyle = '#ffffff';
        ctx.font = '12px "Space Grotesk", -apple-system, sans-serif';
        ctx.fillText(`Bậc họa ba: n = ${p.harmonicN} (Số bụng: ${p.harmonicN}, Số nút: ${p.harmonicN + 1})`, startX, 40);
        ctx.fillStyle = '#ef4444';
        ctx.fillText('● Nút sóng (Biên độ = 0)', startX, 65);
        ctx.fillStyle = '#f59e0b';
        ctx.fillText('▲ Bụng sóng (Biên độ cực đại 2A)', startX + 160, 65);
    }

    function drawInterferencePattern(ctx, p) {
        // Giao thoa 2 nguồn sóng trên mặt nước
        const s1 = { x: canvas.width / 2 - 80, y: canvas.height / 2 };
        const s2 = { x: canvas.width / 2 + 80, y: canvas.height / 2 };
        const lambda = 35; // pixel
        const omega = 2 * Math.PI * p.freq;

        // Vẽ các vòng tròn sóng đồng tâm lan tỏa
        ctx.lineWidth = 1.5;
        for (let r = 10; r < 280; r += lambda) {
            const currentR = (r + t * 40) % 280;
            ctx.strokeStyle = 'rgba(56, 189, 248, 0.4)';
            ctx.beginPath();
            ctx.arc(s1.x, s1.y, currentR, 0, Math.PI * 2);
            ctx.stroke();

            ctx.beginPath();
            ctx.arc(s2.x, s2.y, currentR, 0, Math.PI * 2);
            ctx.stroke();
        }

        // Hai nguồn sóng
        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.arc(s1.x, s1.y, 6, 0, Math.PI * 2);
        ctx.arc(s2.x, s2.y, 6, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 12px "Space Grotesk", -apple-system, sans-serif';
        ctx.fillText('S₁', s1.x - 8, s1.y - 12);
        ctx.fillText('S₂', s2.x - 8, s2.y - 12);
        ctx.fillText('Giao thoa sóng nước 2 nguồn kết hợp đồng pha (d₂ - d₁ = kλ)', 40, 30);
    }

    function drawTravelingWave(ctx, p) {
        // Sóng ngang truyền lan truyền
        const midY = canvas.height / 2;
        const lambda = 120;
        const omega = 2 * Math.PI * p.freq;

        ctx.strokeStyle = '#22c55e';
        ctx.lineWidth = 3;
        ctx.beginPath();
        for (let x = 40; x <= canvas.width - 40; x += 2) {
            const y = midY - p.amplitude * Math.sin((2 * Math.PI * x) / lambda - omega * t);
            if (x === 40) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.stroke();

        ctx.fillStyle = '#ffffff';
        ctx.font = '12px "Space Grotesk", -apple-system, sans-serif';
        ctx.fillText('Sóng cơ truyền theo trục Ox: u(x,t) = A·cos(ωt - 2πx/λ)', 50, 40);
    }

    let lastTime = performance.now();
    function loop(now) {
        const dt = Math.min((now - lastTime) / 1000, 0.05);
        lastTime = now;
        if (!paused) t += dt;
        draw();
        requestAnimationFrame(loop);
    }
    requestAnimationFrame(loop);

    ['wave-harmonics', 'wave-freq', 'wave-amp'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('input', () => { syncLabels(); });
    });

    document.querySelectorAll('input[name="wave-type"]').forEach(radio => {
        radio.addEventListener('change', () => {
            mode = radio.value;
            syncLabels();
        });
    });

    syncLabels();
})();



/* --- BUNDLED: simulations/electromagnetism.js --- */
/* ============================================================
   ⚡ LP.VirtualLab - CHUYÊN ĐỀ 4 & 5: ĐIỆN TỪ HỌC (Electromagnetism)
   Bao gồm 6 bài mô phỏng chuẩn mực Vật lý Đại cương 2:
   14. Định luật Coulomb & Điện trường tĩnh (Charges & Electric Field)
   15. Tụ điện phẳng & Hằng số điện môi (Capacitor & Dielectrics)
   16. Mạch điện một chiều D.C. & Các định luật Kirchhoff (DC Circuits & Kirchhoff)
   17. Từ trường & Lực Lorentz (Magnetic Field & Lorentz Force)
   18. Hiện tượng Cảm ứng điện từ Faraday & Lenz (Electromagnetic Induction)
   19. Mạch điện xoay chiều A.C. RLC nối tiếp (AC RLC Circuits & Resonance)
   Tác giả: Lê Ngọc Phú - SĐT: 0853257289
   ============================================================ */

// ─────────────────────────────────────────────────────────────
// 14. ĐỊNH LUẬT COULOMB & ĐIỆN TRƯỜNG TĨNH (Charges & Fields)
// ─────────────────────────────────────────────────────────────
(function initCoulombField() {
    const canvas = document.getElementById('coulombCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    let charges = [
        { x: 220, y: 220, q: 2 }, // +2 nC
        { x: 440, y: 220, q: -2 } // -2 nC
    ];
    let draggedCharge = null;
    let sensorPos = { x: 330, y: 150 };
    let draggingSensor = false;

    function getParams() {
        const q1El = document.getElementById('coulomb-q1');
        const q2El = document.getElementById('coulomb-q2');
        return {
            q1: q1El ? parseFloat(q1El.value) : 2,
            q2: q2El ? parseFloat(q2El.value) : -2
        };
    }

    function syncLabels() {
        const p = getParams();
        const q1Val = document.getElementById('coulomb-q1-val');
        const q2Val = document.getElementById('coulomb-q2-val');
        if (q1Val) q1Val.textContent = (p.q1 > 0 ? '+' : '') + p.q1.toFixed(1) + ' nC';
        if (q2Val) q2Val.textContent = (p.q2 > 0 ? '+' : '') + p.q2.toFixed(1) + ' nC';

        if (charges.length >= 2) {
            charges[0].q = p.q1;
            charges[1].q = p.q2;
        }

        // Tính lực Coulomb tương tác giữa 2 điện tích: F = k * |q1 * q2| / r^2
        const k = 8.99e9;
        const dx = (charges[1].x - charges[0].x) / 100; // 100px = 1 mét
        const dy = (charges[1].y - charges[0].y) / 100;
        const r = Math.max(0.1, Math.hypot(dx, dy));
        const F = (k * Math.abs(charges[0].q * 1e-9 * charges[1].q * 1e-9)) / (r * r);

        const fEl = document.getElementById('coulomb-force');
        const rEl = document.getElementById('coulomb-dist');
        if (fEl) fEl.textContent = (F * 1e6).toFixed(2) + ' μN';
        if (rEl) rEl.textContent = r.toFixed(2) + ' m';
    }

    // Tương tác kéo thả điện tích và cảm biến
    canvas.addEventListener('mousedown', (e) => {
        const rect = canvas.getBoundingClientRect();
        const mx = (e.clientX - rect.left) * (canvas.width / rect.width);
        const my = (e.clientY - rect.top) * (canvas.height / rect.height);

        // Kiểm tra cảm biến
        if (Math.hypot(mx - sensorPos.x, my - sensorPos.y) < 16) {
            draggingSensor = true;
            return;
        }

        // Kiểm tra các điện tích
        charges.forEach(ch => {
            if (Math.hypot(mx - ch.x, my - ch.y) < 20) {
                draggedCharge = ch;
            }
        });
    });

    window.addEventListener('mousemove', (e) => {
        const rect = canvas.getBoundingClientRect();
        const mx = (e.clientX - rect.left) * (canvas.width / rect.width);
        const my = (e.clientY - rect.top) * (canvas.height / rect.height);

        if (draggingSensor) {
            sensorPos.x = mx;
            sensorPos.y = my;
        } else if (draggedCharge) {
            draggedCharge.x = mx;
            draggedCharge.y = my;
            syncLabels();
        }
    });

    window.addEventListener('mouseup', () => {
        draggedCharge = null;
        draggingSensor = false;
    });

    function draw() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        const scaleX = canvas.width / 700;
        const scaleY = canvas.height / 460;
        ctx.save();
        ctx.scale(scaleX, scaleY);

        // Nền không gian điện trường sâu thẳm
        const bgGrad = ctx.createLinearGradient(0, 0, 0, 460);
        bgGrad.addColorStop(0, '#040d1a');
        bgGrad.addColorStop(0.5, '#07172b');
        bgGrad.addColorStop(1, '#0a223f');
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, 700, 460);

        // Lưới tọa độ phòng thí nghiệm
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.04)';
        ctx.lineWidth = 1;
        for (let x = 20; x < 700; x += 35) {
            ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 460); ctx.stroke();
        }
        for (let y = 20; y < 460; y += 35) {
            ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(700, y); ctx.stroke();
        }

        // 1. Vẽ các đường đẳng thế (Equipotential Contours) mờ ảo xung quanh các điện tích
        charges.forEach(ch => {
            for (let r = 35; r <= 140; r += 28) {
                ctx.save();
                ctx.strokeStyle = ch.q > 0 ? 'rgba(239, 68, 68, 0.08)' : 'rgba(59, 130, 246, 0.08)';
                ctx.lineWidth = 1.2;
                ctx.setLineDash([4, 4]);
                ctx.beginPath();
                ctx.arc(ch.x, ch.y, r, 0, Math.PI * 2);
                ctx.stroke();
                ctx.restore();
            }
        });

        // 2. Lưới vector cường độ điện trường E có mũi tên
        drawElectricFieldGrid(ctx);

        // 3. Các khối cầu điện tích 3D siêu thực
        charges.forEach(ch => {
            // Hào quang phát sáng
            const auraGrad = ctx.createRadialGradient(ch.x, ch.y, 10, ch.x, ch.y, 42);
            auraGrad.addColorStop(0, ch.q > 0 ? 'rgba(239, 68, 68, 0.5)' : 'rgba(59, 130, 246, 0.5)');
            auraGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
            ctx.fillStyle = auraGrad;
            ctx.beginPath();
            ctx.arc(ch.x, ch.y, 42, 0, Math.PI * 2);
            ctx.fill();

            // Khối cầu 3D với điểm sáng phản xạ
            const sphereGrad = ctx.createRadialGradient(ch.x - 5, ch.y - 5, 2, ch.x, ch.y, 18);
            if (ch.q > 0) {
                sphereGrad.addColorStop(0, '#fef2f2');
                sphereGrad.addColorStop(0.3, '#ef4444');
                sphereGrad.addColorStop(0.8, '#b91c1c');
                sphereGrad.addColorStop(1, '#450a0a');
            } else {
                sphereGrad.addColorStop(0, '#eff6ff');
                sphereGrad.addColorStop(0.3, '#3b82f6');
                sphereGrad.addColorStop(0.8, '#1d4ed8');
                sphereGrad.addColorStop(1, '#172554');
            }
            ctx.fillStyle = sphereGrad;
            ctx.beginPath();
            ctx.arc(ch.x, ch.y, 18, 0, Math.PI * 2);
            ctx.fill();

            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 2;
            ctx.stroke();

            // Ký hiệu điện tích (+ / -) và giá trị nC
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 16px "Space Grotesk", sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(ch.q > 0 ? '+' : '−', ch.x, ch.y);

            // Nhãn giá trị điện tích
            ctx.fillStyle = ch.q > 0 ? '#fca5a5' : '#93c5fd';
            ctx.font = 'bold 11px "Space Grotesk", sans-serif';
            ctx.fillText(`${(ch.q > 0 ? '+' : '') + ch.q.toFixed(1)} nC`, ch.x, ch.y + 28);
        });

        // 4. Cảm biến đo điện thế V & cường độ điện trường E
        drawSensor(ctx, sensorPos.x, sensorPos.y);

        // Chú thích hướng dẫn kéo thả
        ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.font = '11.5px "Space Grotesk", sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText('🖱️ Kéo thả các điện tích hoặc cảm biến màu vàng để khảo sát không gian điện trường!', 16, 442);

        ctx.restore();
    }

    function drawElectricFieldGrid(ctx) {
        const k = 8.99e9;
        const step = 28;

        for (let x = 25; x < 700; x += step) {
            for (let y = 25; y < 460; y += step) {
                let Ex = 0, Ey = 0;
                let tooClose = false;

                charges.forEach(ch => {
                    const dx = (x - ch.x) / 100;
                    const dy = (y - ch.y) / 100;
                    const r = Math.hypot(dx, dy);
                    if (r < 0.22) tooClose = true;
                    if (r > 0.1) {
                        const E = (k * ch.q * 1e-9) / (r * r);
                        Ex += E * (dx / r);
                        Ey += E * (dy / r);
                    }
                });

                if (tooClose) continue;

                const Emag = Math.hypot(Ex, Ey);
                if (Emag > 0.1) {
                    const angle = Math.atan2(Ey, Ex);
                    const len = Math.min(18, Math.max(8, Math.log10(Emag + 1) * 4.5));
                    const alpha = Math.min(0.9, Math.max(0.2, Emag / 400));

                    ctx.save();
                    ctx.translate(x, y);
                    ctx.rotate(angle);

                    // Thân mũi tên
                    ctx.strokeStyle = `rgba(56, 189, 248, ${alpha})`;
                    ctx.lineWidth = 1.5;
                    ctx.beginPath();
                    ctx.moveTo(-len / 2, 0);
                    ctx.lineTo(len / 2, 0);
                    ctx.stroke();

                    // Đầu mũi tên nhọn rõ ràng
                    ctx.fillStyle = `rgba(56, 189, 248, ${alpha})`;
                    ctx.beginPath();
                    ctx.moveTo(len / 2, 0);
                    ctx.lineTo(len / 2 - 4.5, -2.5);
                    ctx.lineTo(len / 2 - 4.5, 2.5);
                    ctx.closePath();
                    ctx.fill();

                    ctx.restore();
                }
            }
        }
    }

    function drawSensor(ctx, sx, sy) {
        const k = 8.99e9;
        let V = 0;
        let Ex = 0, Ey = 0;

        charges.forEach(ch => {
            const dx = (sx - ch.x) / 100;
            const dy = (sy - ch.y) / 100;
            const r = Math.max(0.1, Math.hypot(dx, dy));
            V += (k * ch.q * 1e-9) / r;
            const E = (k * ch.q * 1e-9) / (r * r);
            Ex += E * (dx / r);
            Ey += E * (dy / r);
        });

        const Emag = Math.hypot(Ex, Ey);
        const vEl = document.getElementById('coulomb-voltage');
        const eEl = document.getElementById('coulomb-efield');
        if (vEl) vEl.textContent = V.toFixed(1) + ' V';
        if (eEl) eEl.textContent = Emag.toFixed(1) + ' V/m';

        // Đầu đo cảm biến màu vàng phát sáng
        ctx.save();
        ctx.fillStyle = '#f59e0b';
        ctx.shadowColor = '#f59e0b';
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(sx, sy, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Vector E tại cảm biến
        if (Emag > 0.1) {
            const angle = Math.atan2(Ey, Ex);
            const vLen = Math.min(45, Math.max(16, Emag * 1.5));
            ctx.strokeStyle = '#fbbf24';
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            ctx.moveTo(sx, sy);
            ctx.lineTo(sx + Math.cos(angle) * vLen, sy + Math.sin(angle) * vLen);
            ctx.stroke();

            // Mũi tên
            const arrowX = sx + Math.cos(angle) * vLen;
            const arrowY = sy + Math.sin(angle) * vLen;
            ctx.fillStyle = '#fbbf24';
            ctx.beginPath();
            ctx.arc(arrowX, arrowY, 3.5, 0, Math.PI * 2);
            ctx.fill();
        }

        // Hộp hiển thị kỹ thuật số của đồng hồ đo (Digital Multimeter Box)
        const boxW = 120;
        const boxH = 46;
        const boxX = sx + 14;
        const boxY = sy - 23;

        ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.roundRect(boxX, boxY, boxW, boxH, 6);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#fef08a';
        ctx.font = 'bold 11px monospace';
        ctx.textAlign = 'left';
        ctx.fillText(`V: ${V.toFixed(1)} V`, boxX + 8, boxY + 18);
        ctx.fillStyle = '#38bdf8';
        ctx.fillText(`E: ${Emag.toFixed(1)} V/m`, boxX + 8, boxY + 36);
        ctx.restore();
    }

    function loop() {
        draw();
        requestAnimationFrame(loop);
    }
    requestAnimationFrame(loop);

    ['coulomb-q1', 'coulomb-q2'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('input', () => { syncLabels(); });
    });

    syncLabels();
})();

// ─────────────────────────────────────────────────────────────
// 15. TỤ ĐIỆN VÀ ĐIỆN MÔI (Capacitor & Dielectrics)
// ─────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────
// 15. TỤ ĐIỆN VÀ ĐIỆN MÔI (Capacitor & Dielectrics - PhET Standard)
// ─────────────────────────────────────────────────────────────
(function initCapacitorDielectric() {
    const canvas = document.getElementById('capacitorCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    let isConnectedToBattery = true;
    let bulbGlow = 0;
    let animTime = 0;

    function getParams() {
        const areaEl = document.getElementById('cap-area');
        const distEl = document.getElementById('cap-dist');
        const dielEl = document.getElementById('cap-dielectric');
        const voltEl = document.getElementById('cap-voltage');

        return {
            area: areaEl ? parseFloat(areaEl.value) : 200, // mm2
            dist: distEl ? parseFloat(distEl.value) : 6,   // mm
            dielectricConst: dielEl ? parseFloat(dielEl.value) : 1.0,
            voltage: voltEl ? parseFloat(voltEl.value) : 1.5
        };
    }

    function syncLabels() {
        const p = getParams();
        const aVal = document.getElementById('cap-area-val');
        const dVal = document.getElementById('cap-dist-val');
        const vVal = document.getElementById('cap-voltage-val');

        if (aVal) aVal.textContent = p.area.toFixed(0) + ' mm²';
        if (dVal) dVal.textContent = p.dist.toFixed(1) + ' mm';
        if (vVal) vVal.textContent = p.voltage.toFixed(1) + ' V';

        const eps0 = 8.854e-12;
        const S = p.area * 1e-6; // m2
        const d = p.dist * 1e-3; // m
        const C = (p.dielectricConst * eps0 * S) / d; // Farad
        const Q = C * p.voltage; // Coulomb
        const W = 0.5 * C * p.voltage * p.voltage; // Joule
        const E = p.voltage / d; // V/m

        const cEl = document.getElementById('cap-capacitance');
        const qEl = document.getElementById('cap-charge');
        const wEl = document.getElementById('cap-energy');

        if (cEl) cEl.textContent = (C * 1e12).toFixed(2) + ' pF';
        if (qEl) qEl.textContent = (Q * 1e12).toFixed(2) + ' pC';
        if (wEl) wEl.textContent = (W * 1e12).toFixed(2) + ' pJ';
    }

    function draw() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // HiDPI Canvas Scaling Support
        const scaleX = canvas.width / 700;
        const scaleY = canvas.height / 460;
        ctx.save();
        ctx.scale(scaleX, scaleY);

        // 1. Phông nền phòng thí nghiệm hiện đại & lưới khoa học
        const bgGrad = ctx.createLinearGradient(0, 0, 0, 460);
        bgGrad.addColorStop(0, '#040d1a');
        bgGrad.addColorStop(0.5, '#07172b');
        bgGrad.addColorStop(1, '#0a223f');
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, 700, 460);

        // Lưới tọa độ tinh xảo
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.04)';
        ctx.lineWidth = 1;
        for (let x = 30; x < 700; x += 35) {
            ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 460); ctx.stroke();
        }
        for (let y = 30; y < 460; y += 35) {
            ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(700, y); ctx.stroke();
        }

        const p = getParams();
        const eps0 = 8.854e-12;
        const S = p.area * 1e-6;
        const dMeters = p.dist * 1e-3;
        const C = (p.dielectricConst * eps0 * S) / dMeters;
        const Q = C * p.voltage;
        const EField = p.voltage / dMeters;
        const W = 0.5 * C * p.voltage * p.voltage;

        // Kích thước hình học bản tụ
        const plateW = 160 + (p.area / 400) * 140; // 160 -> 300px
        const plateH = 14;
        const gap = 38 + p.dist * 11; // 45 -> 150px
        const cx = 390;
        const topY = 195 - gap / 2;
        const bottomY = 195 + gap / 2;

        // 2. TẤM ĐIỆN MÔI CHÈN VÀO GIỮA (3D Translucent Dielectric Slab)
        if (p.dielectricConst > 1.05) {
            const slabW = plateW - 24;
            const slabH = gap - plateH;
            const slabX = cx - slabW / 2;
            const slabY = topY + plateH;

            ctx.save();
            // Khối điện môi 3D
            const slabGrad = ctx.createLinearGradient(slabX, slabY, slabX + slabW, slabY + slabH);
            if (p.dielectricConst >= 4.5) {
                // Thủy tinh / Mica (Cyan kính mờ trong suốt)
                slabGrad.addColorStop(0, 'rgba(34, 211, 238, 0.35)');
                slabGrad.addColorStop(0.5, 'rgba(6, 182, 212, 0.22)');
                slabGrad.addColorStop(1, 'rgba(8, 145, 178, 0.40)');
            } else {
                // Teflon / Giấy (Hổ phách vàng trong suốt)
                slabGrad.addColorStop(0, 'rgba(251, 191, 36, 0.35)');
                slabGrad.addColorStop(0.5, 'rgba(245, 158, 11, 0.22)');
                slabGrad.addColorStop(1, 'rgba(217, 119, 6, 0.40)');
            }
            ctx.fillStyle = slabGrad;
            ctx.fillRect(slabX, slabY, slabW, slabH);

            // Viền phát sáng tấm điện môi
            ctx.strokeStyle = p.dielectricConst >= 4.5 ? '#38bdf8' : '#fbbf24';
            ctx.lineWidth = 2;
            ctx.strokeRect(slabX, slabY, slabW, slabH);

            // Các cặp điện tích phân cực cảm ứng bên trong điện môi (+ -)
            const numPairs = Math.min(8, Math.floor(slabW / 36));
            for (let i = 0; i < numPairs; i++) {
                const px = slabX + 22 + i * (slabW - 44) / Math.max(1, numPairs - 1);
                // Cực âm cảm ứng gần bản dương phía trên
                ctx.fillStyle = '#60a5fa';
                ctx.font = 'bold 11px monospace';
                ctx.textAlign = 'center';
                ctx.fillText('⊖', px, slabY + 16);
                // Cực dương cảm ứng gần bản âm phía dưới
                ctx.fillStyle = '#f87171';
                ctx.fillText('⊕', px, slabY + slabH - 6);
            }

            // Nhãn tên vật liệu & hằng số điện môi
            const matName = p.dielectricConst >= 5.0 ? 'Thủy tinh' : (p.dielectricConst >= 2.0 ? 'Teflon' : 'Điện môi');
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 12px "Space Grotesk", sans-serif';
            ctx.textAlign = 'center';
            ctx.shadowColor = 'rgba(0,0,0,0.8)';
            ctx.shadowBlur = 4;
            ctx.fillText(`${matName} (ε = ${p.dielectricConst.toFixed(1)})`, cx, 195 + 4);
            ctx.restore();
        }

        // 3. ĐƯỜNG SỨC ĐIỆN TRƯỜNG ĐỀU E (Glowing Vector Field Lines)
        const numLines = Math.min(14, Math.floor(plateW / 24));
        ctx.save();
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 2;
        ctx.shadowColor = '#38bdf8';
        ctx.shadowBlur = 8;

        for (let i = 0; i < numLines; i++) {
            const lx = cx - plateW / 2 + 18 + i * (plateW - 36) / Math.max(1, numLines - 1);
            const startY = topY + plateH + 2;
            const endY = bottomY - 2;

            // Đường vector nối
            ctx.beginPath();
            ctx.moveTo(lx, startY);
            ctx.lineTo(lx, endY);
            ctx.stroke();

            // Mũi tên hướng xuống bản âm
            const arrLen = 7;
            ctx.fillStyle = '#38bdf8';
            ctx.beginPath();
            ctx.moveTo(lx, endY);
            ctx.lineTo(lx - arrLen * 0.6, endY - arrLen);
            ctx.lineTo(lx + arrLen * 0.6, endY - arrLen);
            ctx.closePath();
            ctx.fill();
        }
        ctx.restore();

        // 4. HAI BẢN TỤ KIM LOẠI 3D (Metallic Capacitor Plates with 3D Bevel)
        // Bản cực trên (+Q)
        drawMetallicPlate(ctx, cx - plateW / 2, topY, plateW, plateH, '#ef4444', '+');
        // Bản cực dưới (-Q)
        drawMetallicPlate(ctx, cx - plateW / 2, bottomY, plateW, plateH, '#3b82f6', '−');

        // 5. THƯỚC ĐO KHOẢNG CÁCH d & DIỆN TÍCH A (Scientific Dimensions)
        // Kích thước d giữa 2 bản cực (ở bên phải bản tụ)
        const dimX = cx + plateW / 2 + 22;
        ctx.save();
        ctx.strokeStyle = '#fbbf24';
        ctx.lineWidth = 1.5;
        // Đường gióng ngang
        ctx.beginPath();
        ctx.moveTo(cx + plateW / 2 + 8, topY + plateH);
        ctx.lineTo(dimX + 8, topY + plateH);
        ctx.moveTo(cx + plateW / 2 + 8, bottomY);
        ctx.lineTo(dimX + 8, bottomY);
        // Đường đo dọc
        ctx.moveTo(dimX, topY + plateH);
        ctx.lineTo(dimX, bottomY);
        ctx.stroke();

        // Mũi tên 2 đầu
        drawArrowHead(ctx, dimX, topY + plateH, -Math.PI / 2, '#fbbf24');
        drawArrowHead(ctx, dimX, bottomY, Math.PI / 2, '#fbbf24');

        // Nhãn khoảng cách d
        ctx.fillStyle = '#fbbf24';
        ctx.font = 'bold 12px "Space Grotesk", sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(`d = ${p.dist.toFixed(1)} mm`, dimX + 14, 195 + 4);
        ctx.restore();

        // Kích thước diện tích A bản tụ (ở trên bản tụ)
        ctx.save();
        ctx.fillStyle = '#cbd5e1';
        ctx.font = 'bold 12px "Space Grotesk", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`Diện tích bản tụ: A = ${p.area.toFixed(0)} mm²`, cx, topY - 14);
        ctx.restore();

        // 6. MẠCH NGOÀI: NGUỒN PIN PHET HOẶC BÓNG ĐÈN PHÓNG ĐIỆN
        drawExternalCircuitPhET(ctx, cx, topY, bottomY, plateW, p);

        // 7. BẢNG THÔNG SỐ HUD TRỰC TIẾP TRÊN CANVAS (Pristine HUD Card)
        drawCapacitorHUD(ctx, 18, 16, C, Q, EField, W);

        ctx.restore();
    }

    function drawMetallicPlate(ctx, x, y, w, h, auraColor, sign) {
        ctx.save();
        // Ánh kim loại chải xước (Brushed Metal Gradient)
        const plateGrad = ctx.createLinearGradient(x, y, x, y + h);
        plateGrad.addColorStop(0, '#94a3b8');
        plateGrad.addColorStop(0.3, '#f1f5f9');
        plateGrad.addColorStop(0.7, '#64748b');
        plateGrad.addColorStop(1, '#334155');

        ctx.fillStyle = plateGrad;
        ctx.beginPath();
        ctx.roundRect(x, y, w, h, 4);
        ctx.fill();

        // Viền kim loại nổi
        ctx.strokeStyle = '#e2e8f0';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Ánh sáng viền điện thế
        ctx.strokeStyle = auraColor;
        ctx.lineWidth = 2;
        ctx.shadowColor = auraColor;
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.roundRect(x - 1, y - 1, w + 2, h + 2, 5);
        ctx.stroke();
        ctx.restore();

        // Vẽ các viên ion điện tích nổi 3D dọc theo bản cực
        const count = Math.min(12, Math.floor(w / 22));
        for (let i = 0; i < count; i++) {
            const bx = x + 16 + i * (w - 32) / Math.max(1, count - 1);
            const by = y + h / 2;
            
            ctx.save();
            ctx.beginPath();
            ctx.arc(bx, by, 7, 0, Math.PI * 2);
            ctx.fillStyle = sign === '+' ? '#ef4444' : '#3b82f6';
            ctx.shadowColor = sign === '+' ? '#ef4444' : '#3b82f6';
            ctx.shadowBlur = 6;
            ctx.fill();

            // Ký hiệu + hoặc -
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 11px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(sign, bx, by);
            ctx.restore();
        }
    }

    function drawExternalCircuitPhET(ctx, cx, topY, bottomY, plateW, p) {
        const wireLeft = 140;
        const topWireY = topY + 7;
        const botWireY = bottomY + 7;

        // Dây đồng dày có bọc cách điện
        ctx.save();
        ctx.strokeStyle = '#0284c7';
        ctx.lineWidth = 4;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        // Dây nối bản trên
        ctx.beginPath();
        ctx.moveTo(cx - plateW / 4, topWireY);
        ctx.lineTo(wireLeft, topWireY);
        ctx.lineTo(wireLeft, 195 - 45);
        ctx.stroke();

        // Kẹp cá sấu nối bản trên
        drawAlligatorClip(ctx, cx - plateW / 4, topWireY, '#ef4444');

        // Dây nối bản dưới
        ctx.beginPath();
        ctx.moveTo(cx - plateW / 4, botWireY);
        ctx.lineTo(wireLeft, botWireY);
        ctx.lineTo(wireLeft, 195 + 45);
        ctx.stroke();

        // Kẹp cá sấu nối bản dưới
        drawAlligatorClip(ctx, cx - plateW / 4, botWireY, '#3b82f6');
        ctx.restore();

        if (isConnectedToBattery) {
            // NGUỒN PIN 3D CHUẨN PhET (Cylindrical D-Cell Battery)
            const batX = wireLeft;
            const batY = 195;
            const batW = 46;
            const batH = 90;

            ctx.save();
            ctx.translate(batX, batY);

            // Bóng đổ của pin
            ctx.fillStyle = 'rgba(0,0,0,0.45)';
            ctx.beginPath();
            ctx.ellipse(0, batH/2 + 4, batW/2 + 6, 8, 0, 0, Math.PI * 2);
            ctx.fill();

            // Thân pin kim loại (Gradient vàng đồng & xanh đậm)
            const bodyGrad = ctx.createLinearGradient(-batW/2, 0, batW/2, 0);
            bodyGrad.addColorStop(0, '#1e3a5f');
            bodyGrad.addColorStop(0.3, '#38bdf8');
            bodyGrad.addColorStop(0.6, '#0284c7');
            bodyGrad.addColorStop(1, '#0c4a6e');
            ctx.fillStyle = bodyGrad;
            ctx.fillRect(-batW/2, -batH/2 + 10, batW, batH - 20);

            // Viền kim loại trên và dưới
            const metalGrad = ctx.createLinearGradient(-batW/2, 0, batW/2, 0);
            metalGrad.addColorStop(0, '#94a3b8');
            metalGrad.addColorStop(0.4, '#f8fafc');
            metalGrad.addColorStop(0.8, '#64748b');
            metalGrad.addColorStop(1, '#334155');

            ctx.fillStyle = metalGrad;
            ctx.fillRect(-batW/2, -batH/2, batW, 10); // Cực trên
            ctx.fillRect(-batW/2, batH/2 - 10, batW, 10); // Cực dưới

            // Núm đồng cực dương (+) ở đỉnh
            const nubGrad = ctx.createLinearGradient(-7, 0, 7, 0);
            nubGrad.addColorStop(0, '#d97706');
            nubGrad.addColorStop(0.5, '#fef08a');
            nubGrad.addColorStop(1, '#92400e');
            ctx.fillStyle = nubGrad;
            ctx.beginPath();
            ctx.roundRect(-8, -batH/2 - 7, 16, 7, [4, 4, 0, 0]);
            ctx.fill();

            // Nhãn điện áp và cực tính
            ctx.fillStyle = '#ef4444';
            ctx.font = 'bold 15px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('+', 0, -batH/2 + 25);

            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 13px "Space Grotesk", sans-serif';
            ctx.fillText(`${p.voltage.toFixed(1)}V`, 0, 4);

            ctx.fillStyle = '#60a5fa';
            ctx.font = 'bold 16px sans-serif';
            ctx.fillText('−', 0, batH/2 - 16);

            ctx.restore();
        } else {
            // BÓNG ĐÈN PHÓNG ĐIỆN PHÁT SÁNG (Incandescent Light Bulb)
            const bulbX = wireLeft;
            const bulbY = 195;

            ctx.save();
            ctx.translate(bulbX, bulbY);

            // Vầng sáng hào quang tỏa ra từ bóng đèn
            if (bulbGlow > 0.05) {
                const glowGrad = ctx.createRadialGradient(0, 0, 8, 0, 0, 75 * bulbGlow);
                glowGrad.addColorStop(0, `rgba(254, 240, 138, ${bulbGlow * 0.95})`);
                glowGrad.addColorStop(0.4, `rgba(245, 158, 11, ${bulbGlow * 0.55})`);
                glowGrad.addColorStop(1, 'rgba(245, 158, 11, 0)');
                ctx.fillStyle = glowGrad;
                ctx.beginPath();
                ctx.arc(0, 0, 75 * bulbGlow, 0, Math.PI * 2);
                ctx.fill();
            }

            // Vỏ bóng thủy tinh
            ctx.fillStyle = bulbGlow > 0.05 ? `rgba(254, 243, 199, ${0.3 + bulbGlow * 0.5})` : 'rgba(148, 163, 184, 0.2)';
            ctx.beginPath();
            ctx.arc(0, -6, 24, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = bulbGlow > 0.05 ? '#fbbf24' : '#64748b';
            ctx.lineWidth = 2;
            ctx.stroke();

            // Dây tóc vonfram phát sáng rực rỡ
            ctx.strokeStyle = bulbGlow > 0.05 ? '#ffffff' : '#94a3b8';
            ctx.lineWidth = bulbGlow > 0.05 ? 3 : 1.5;
            ctx.beginPath();
            ctx.moveTo(-6, 2);
            ctx.lineTo(-4, -12);
            ctx.lineTo(0, -16);
            ctx.lineTo(4, -12);
            ctx.lineTo(6, 2);
            ctx.stroke();

            // Đui đèn kim loại
            ctx.fillStyle = '#475569';
            ctx.fillRect(-10, 18, 20, 14);
            ctx.strokeStyle = '#94a3b8';
            ctx.lineWidth = 1.5;
            ctx.strokeRect(-10, 18, 20, 14);

            ctx.restore();
        }
    }

    function drawAlligatorClip(ctx, x, y, color) {
        ctx.save();
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.roundRect(x - 14, y - 6, 14, 12, 3);
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.restore();
    }

    function drawArrowHead(ctx, x, y, angle, color) {
        const len = 7;
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(angle);
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(-len, -len * 0.5);
        ctx.lineTo(-len, len * 0.5);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
    }

    function drawCapacitorHUD(ctx, x, y, C, Q, E, W) {
        ctx.save();
        // Hộp thông số kính mờ Frosted Glass
        const w = 220;
        const h = 100;
        ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.4)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.roundRect(x, y, w, h, 10);
        ctx.fill();
        ctx.stroke();

        ctx.font = 'bold 12px "Space Grotesk", sans-serif';
        ctx.fillStyle = '#38bdf8';
        ctx.fillText('📊 THÔNG SỐ VẬT LÝ TỤ ĐIỆN', x + 12, y + 20);

        ctx.font = '12px "Space Grotesk", monospace';
        ctx.fillStyle = '#e2e8f0';
        ctx.fillText(`Điện dung C:  ${(C * 1e12).toFixed(2)} pF`, x + 12, y + 42);
        ctx.fillText(`Điện tích Q:  ${(Q * 1e12).toFixed(2)} pC`, x + 12, y + 60);
        ctx.fillText(`Điện trường E: ${(E / 1000).toFixed(2)} kV/m`, x + 12, y + 78);
        ctx.fillText(`Năng lượng W:  ${(W * 1e12).toFixed(2)} pJ`, x + 12, y + 96);
        ctx.restore();
    }

    function loop() {
        if (!isConnectedToBattery && bulbGlow > 0.01) {
            bulbGlow *= 0.96;
        }
        draw();
        requestAnimationFrame(loop);
    }
    requestAnimationFrame(loop);

    ['cap-area', 'cap-dist', 'cap-voltage'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('input', () => { syncLabels(); });
    });

    const dielSelect = document.getElementById('cap-dielectric');
    if (dielSelect) dielSelect.addEventListener('change', () => { syncLabels(); });

    const dischargeBtn = document.getElementById('cap-discharge');
    if (dischargeBtn) {
        dischargeBtn.addEventListener('click', () => {
            isConnectedToBattery = false;
            bulbGlow = 1.0;
            setTimeout(() => { isConnectedToBattery = true; }, 3000);
        });
    }

    syncLabels();
})();

// ─────────────────────────────────────────────────────────────
// 16. MẠCH ĐIỆN D.C. & CÁC ĐỊNH LUẬT KIRCHHOFF (DC Circuit Lab)
// ─────────────────────────────────────────────────────────────
(function initCircuitDC() {
    const canvas = document.getElementById('circuitCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    let circuitType = 'series'; // 'series' or 'parallel'
    let electronOffset = 0;

    function getParams() {
        const vEl = document.getElementById('dc-voltage');
        const r1El = document.getElementById('dc-r1');
        const r2El = document.getElementById('dc-r2');

        return {
            E: vEl ? parseFloat(vEl.value) : 12, // V
            R1: r1El ? parseFloat(r1El.value) : 10, // Ohm
            R2: r2El ? parseFloat(r2El.value) : 20  // Ohm
        };
    }

    function syncLabels() {
        const p = getParams();
        const vVal = document.getElementById('dc-voltage-val');
        const r1Val = document.getElementById('dc-r1-val');
        const r2Val = document.getElementById('dc-r2-val');

        if (vVal) vVal.textContent = p.E.toFixed(1) + ' V';
        if (r1Val) r1Val.textContent = p.R1.toFixed(0) + ' Ω';
        if (r2Val) r2Val.textContent = p.R2.toFixed(0) + ' Ω';

        let R_eq = 0, I_total = 0, I1 = 0, I2 = 0, U1 = 0, U2 = 0;

        if (circuitType === 'series') {
            R_eq = p.R1 + p.R2;
            I_total = p.E / R_eq;
            I1 = I_total;
            I2 = I_total;
            U1 = I1 * p.R1;
            U2 = I2 * p.R2;
        } else {
            R_eq = (p.R1 * p.R2) / (p.R1 + p.R2);
            I1 = p.E / p.R1;
            I2 = p.E / p.R2;
            I_total = I1 + I2;
            U1 = p.E;
            U2 = p.E;
        }

        const reqEl = document.getElementById('dc-req');
        const itotEl = document.getElementById('dc-itot');
        const u1El = document.getElementById('dc-u1');
        const u2El = document.getElementById('dc-u2');

        if (reqEl) reqEl.textContent = R_eq.toFixed(2) + ' Ω';
        if (itotEl) itotEl.textContent = I_total.toFixed(2) + ' A';
        if (u1El) u1El.textContent = U1.toFixed(1) + ' V';
        if (u2El) u2El.textContent = U2.toFixed(1) + ' V';
    }

    function draw() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        const bgGrad = ctx.createLinearGradient(0, 0, 0, canvas.height);
        bgGrad.addColorStop(0, '#040d1a');
        bgGrad.addColorStop(1, '#091e38');
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        const p = getParams();

        const x1 = 120, y1 = 90;
        const x2 = canvas.width - 120, y2 = 280;

        // Dây mạch chính
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 3;

        if (circuitType === 'series') {
            // Mạch nối tiếp hình chữ nhật
            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y1);
            ctx.lineTo(x2, y2);
            ctx.lineTo(x1, y2);
            ctx.closePath();
            ctx.stroke();

            // Nguồn pin ở cạnh trái
            drawBattery(ctx, x1, (y1 + y2) / 2, p.E);

            // Điện trở R1 ở cạnh trên bên trái
            drawResistor(ctx, (x1 + x2) / 2 - 80, y1, `R₁ = ${p.R1}Ω`);

            // Điện trở R2 ở cạnh trên bên phải
            drawResistor(ctx, (x1 + x2) / 2 + 80, y1, `R₂ = ${p.R2}Ω`);

            // Ampe kế đo dòng I ở cạnh dưới
            drawAmmeter(ctx, (x1 + x2) / 2, y2);

        } else {
            // Mạch song song
            ctx.beginPath();
            // Khung ngoài (Nhánh R2)
            ctx.rect(x1, y1 - 30, x2 - x1, (y2 - y1) + 60);
            ctx.stroke();

            // Nhánh giữa (Nhánh R1)
            ctx.beginPath();
            ctx.moveTo(x1 + 100, y1 + 50);
            ctx.lineTo(x2 - 100, y1 + 50);
            ctx.stroke();

            // Nguồn pin
            drawBattery(ctx, x1, (y1 + y2) / 2, p.E);

            // R1 và R2
            drawResistor(ctx, (x1 + x2) / 2, y1 + 50, `R₁ = ${p.R1}Ω`);
            drawResistor(ctx, (x1 + x2) / 2, y1 - 30, `R₂ = ${p.R2}Ω`);

            drawAmmeter(ctx, (x1 + x2) / 2, y2 + 30);
        }

        // Dòng electron chuyển động dọc theo mạch
        drawMovingElectrons(ctx, x1, y1, x2, y2);
    }

    function drawBattery(ctx, x, y, val) {
        ctx.save();
        ctx.translate(x, y);

        // Khối pin hình trụ 3D kim loại
        const bw = 28, bh = 56;
        const bGrad = ctx.createLinearGradient(-bw/2, 0, bw/2, 0);
        bGrad.addColorStop(0, '#1e3a5f');
        bGrad.addColorStop(0.3, '#38bdf8');
        bGrad.addColorStop(0.7, '#0284c7');
        bGrad.addColorStop(1, '#0c4a6e');
        ctx.fillStyle = bGrad;
        ctx.beginPath();
        ctx.roundRect(-bw/2, -bh/2 + 6, bw, bh - 12, 3);
        ctx.fill();

        // Nắp cực kim loại mạ vàng (+) phía trên
        const capGrad = ctx.createLinearGradient(-6, 0, 6, 0);
        capGrad.addColorStop(0, '#d97706');
        capGrad.addColorStop(0.5, '#fef08a');
        capGrad.addColorStop(1, '#92400e');
        ctx.fillStyle = capGrad;
        ctx.beginPath();
        ctx.roundRect(-5, -bh/2, 10, 6, [3, 3, 0, 0]);
        ctx.fill();

        // Đáy kim loại cực âm (-)
        ctx.fillStyle = '#94a3b8';
        ctx.fillRect(-bw/2 + 2, bh/2 - 6, bw - 4, 5);

        // Ký hiệu cực dương (+) và âm (-)
        ctx.fillStyle = '#ef4444';
        ctx.font = 'bold 13px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('+', 0, -bh/2 + 20);

        ctx.fillStyle = '#60a5fa';
        ctx.font = 'bold 15px sans-serif';
        ctx.fillText('−', 0, bh/2 - 12);

        // Nhãn điện áp
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 11px "Space Grotesk", sans-serif';
        ctx.fillText(`${val}V`, -bw/2 - 20, 4);

        ctx.restore();
    }

    function drawResistor(ctx, x, y, label) {
        ctx.save();
        ctx.translate(x, y);

        // Thân điện trở gốm màu be (Ceramic Resistor Body)
        const rw = 52, rh = 20;
        const bodyGrad = ctx.createLinearGradient(0, -rh/2, 0, rh/2);
        bodyGrad.addColorStop(0, '#fef3c7');
        bodyGrad.addColorStop(0.4, '#fde68a');
        bodyGrad.addColorStop(0.8, '#d97706');
        bodyGrad.addColorStop(1, '#78350f');

        ctx.fillStyle = bodyGrad;
        ctx.beginPath();
        ctx.roundRect(-rw/2, -rh/2, rw, rh, 6);
        ctx.fill();
        ctx.strokeStyle = '#92400e';
        ctx.lineWidth = 1;
        ctx.stroke();

        // 4 vạch màu điện trở tiêu chuẩn (Color code bands)
        const bands = ['#b45309', '#1e293b', '#ef4444', '#f59e0b']; // Nâu, Đen, Đỏ, Vàng kim
        const bandX = [-14, -5, 4, 15];
        bands.forEach((color, i) => {
            ctx.fillStyle = color;
            ctx.fillRect(bandX[i], -rh/2, 4.5, rh);
        });

        // Nhãn thông số điện trở nổi bật
        ctx.fillStyle = '#fbbf24';
        ctx.font = 'bold 12px "Space Grotesk", sans-serif';
        ctx.textAlign = 'center';
        ctx.shadowColor = 'rgba(0,0,0,0.8)';
        ctx.shadowBlur = 4;
        ctx.fillText(label, 0, -rh/2 - 8);

        ctx.restore();
    }

    function drawAmmeter(ctx, x, y) {
        ctx.save();
        ctx.translate(x, y);

        // Đồng hồ đo kim analog mặt kính tròn
        const r = 24;
        // Viền đồng hồ kim loại
        const mGrad = ctx.createLinearGradient(-r, -r, r, r);
        mGrad.addColorStop(0, '#64748b');
        mGrad.addColorStop(0.5, '#f8fafc');
        mGrad.addColorStop(1, '#334155');
        ctx.fillStyle = mGrad;
        ctx.beginPath();
        ctx.arc(0, 0, r + 4, 0, Math.PI * 2);
        ctx.fill();

        // Mặt đồng hồ màu trắng sữa
        ctx.fillStyle = '#f8fafc';
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#cbd5e1';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Vạch chia đồng hồ
        ctx.strokeStyle = '#475569';
        ctx.lineWidth = 1;
        for (let a = -Math.PI * 0.75; a <= -Math.PI * 0.25; a += 0.2) {
            ctx.beginPath();
            ctx.moveTo(Math.cos(a) * (r - 7), Math.sin(a) * (r - 7));
            ctx.lineTo(Math.cos(a) * (r - 2), Math.sin(a) * (r - 2));
            ctx.stroke();
        }

        // Chữ A (Ampe)
        ctx.fillStyle = '#0f172a';
        ctx.font = 'bold 10px "Space Grotesk", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('A', 0, r - 8);

        // Kim chỉ thị màu đỏ
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.moveTo(0, 4);
        ctx.lineTo(-6, -r + 6);
        ctx.stroke();

        // Trục kim tròn
        ctx.fillStyle = '#1e293b';
        ctx.beginPath();
        ctx.arc(0, 4, 3, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }

    function drawMovingElectrons(ctx, x1, y1, x2, y2) {
        electronOffset = (electronOffset + 1.2) % 36;
        ctx.save();

        // Vẽ các hạt electron phát sáng xanh cyan di chuyển
        ctx.fillStyle = '#38bdf8';
        ctx.shadowColor = '#38bdf8';
        ctx.shadowBlur = 8;

        for (let d = electronOffset; d < (x2 - x1); d += 36) {
            // Nhánh trên
            ctx.beginPath();
            ctx.arc(x1 + d, y1, 3.5, 0, Math.PI * 2);
            ctx.fill();

            // Nhánh dưới
            ctx.beginPath();
            ctx.arc(x2 - d, y2, 3.5, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();
    }

    function loop() {
        draw();
        requestAnimationFrame(loop);
    }
    requestAnimationFrame(loop);

    ['dc-voltage', 'dc-r1', 'dc-r2'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('input', () => { syncLabels(); });
    });

    document.querySelectorAll('input[name="dc-type"]').forEach(radio => {
        radio.addEventListener('change', () => {
            circuitType = radio.value;
            syncLabels();
        });
    });

    syncLabels();
})();

// ─────────────────────────────────────────────────────────────
// 17. TỪ TRƯỜNG & LỰC LORENTZ (Magnetic Field & Lorentz Force)
// ─────────────────────────────────────────────────────────────
(function initLorentzForce() {
    const canvas = document.getElementById('lorentzCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    let particle = { x: 80, y: 220, vx: 5, vy: 0, q: 1.0, m: 1.0 };
    let trail = [];
    let running = true;

    function getParams() {
        const bEl = document.getElementById('lorentz-b');
        const vEl = document.getElementById('lorentz-v');
        const qEl = document.getElementById('lorentz-q');

        return {
            B: bEl ? parseFloat(bEl.value) : 1.2, // Tesla (hướng ra ngoài hoặc vào trong)
            v0: vEl ? parseFloat(vEl.value) : 25, // m/s
            q: qEl ? parseFloat(qEl.value) : 1.0  // C (+ hoặc -)
        };
    }

    function syncLabels() {
        const p = getParams();
        const bVal = document.getElementById('lorentz-b-val');
        const vVal = document.getElementById('lorentz-v-val');
        const qVal = document.getElementById('lorentz-q-val');

        if (bVal) bVal.textContent = p.B.toFixed(1) + ' T';
        if (vVal) vVal.textContent = p.v0.toFixed(0) + ' m/s';
        if (qVal) qVal.textContent = (p.q > 0 ? '+' : '') + p.q.toFixed(1) + ' C';

        // Bán kính cyclotron: R = m * v / (|q| * B)
        const R = (1.0 * p.v0) / (Math.abs(p.q) * Math.abs(p.B));
        const T = (2 * Math.PI * 1.0) / (Math.abs(p.q) * Math.abs(p.B));

        const rEl = document.getElementById('lorentz-radius');
        const tEl = document.getElementById('lorentz-period');
        if (rEl) rEl.textContent = R.toFixed(2) + ' m';
        if (tEl) tEl.textContent = T.toFixed(2) + ' s';
    }

    function resetSimulation() {
        const p = getParams();
        particle.x = 100;
        particle.y = 220;
        particle.vx = p.v0 * 2.5;
        particle.vy = 0;
        particle.q = p.q;
        trail = [];
        running = true;
    }

    function update(dt) {
        if (!running) return;
        const p = getParams();

        // Lực Lorentz: F = q * (v x B)
        // Khi B vuông góc màn hình hướng vào trong (chiều z):
        // Fx = q * vy * B
        // Fy = -q * vx * B
        const B = p.B;
        const q = particle.q;

        const ax = (q * particle.vy * B) / particle.m;
        const ay = (-q * particle.vx * B) / particle.m;

        particle.vx += ax * dt * 4;
        particle.vy += ay * dt * 4;

        particle.x += particle.vx * dt;
        particle.y += particle.vy * dt;

        trail.push({ x: particle.x, y: particle.y });
        if (trail.length > 250) trail.shift();

        // Ra khỏi màn hình
        if (particle.x < 10 || particle.x > canvas.width - 10 || particle.y < 10 || particle.y > canvas.height - 10) {
            resetSimulation();
        }
    }

    function draw() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        const bgGrad = ctx.createLinearGradient(0, 0, 0, canvas.height);
        bgGrad.addColorStop(0, '#040d1a');
        bgGrad.addColorStop(1, '#091e38');
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        const p = getParams();

        // 1. Ký hiệu từ trường B đều hướng vào mặt phẳng (các dấu cộng ⨂)
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.2)';
        ctx.lineWidth = 1.2;
        for (let x = 40; x < canvas.width; x += 45) {
            for (let y = 40; y < canvas.height; y += 45) {
                ctx.beginPath();
                ctx.arc(x, y, 7, 0, Math.PI * 2);
                ctx.stroke();
                ctx.beginPath();
                ctx.moveTo(x - 4, y - 4);
                ctx.lineTo(x + 4, y + 4);
                ctx.moveTo(x + 4, y - 4);
                ctx.lineTo(x - 4, y + 4);
                ctx.stroke();
            }
        }

        // 2. Vệt quỹ đạo tròn
        if (trail.length > 1) {
            ctx.strokeStyle = '#38bdf8';
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            trail.forEach((pt, i) => {
                if (i === 0) ctx.moveTo(pt.x, pt.y);
                else ctx.lineTo(pt.x, pt.y);
            });
            ctx.stroke();
        }

        // 3. Hạt mang điện
        ctx.fillStyle = particle.q > 0 ? '#ef4444' : '#3b82f6';
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, 10, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 12px "Space Grotesk", -apple-system, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(particle.q > 0 ? '+' : '−', particle.x, particle.y + 4);

        // Vector vận tốc v (màu xanh lá)
        drawArrow(ctx, particle.x, particle.y, particle.x + particle.vx * 0.4, particle.y + particle.vy * 0.4, '#22c55e', 'v');

        // Vector lực Lorentz F (màu đỏ vuông góc với v)
        const fx = (particle.q * particle.vy * p.B) * 0.5;
        const fy = (-particle.q * particle.vx * p.B) * 0.5;
        drawArrow(ctx, particle.x, particle.y, particle.x + fx, particle.y + fy, '#ef4444', 'F_L');
    }

    function drawArrow(ctx, fromX, fromY, toX, toY, color, label) {
        const headlen = 6;
        const angle = Math.atan2(toY - fromY, toX - fromX);
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(fromX, fromY);
        ctx.lineTo(toX, toY);
        ctx.stroke();

        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.moveTo(toX, toY);
        ctx.lineTo(toX - headlen * Math.cos(angle - Math.PI / 6), toY - headlen * Math.sin(angle - Math.PI / 6));
        ctx.lineTo(toX - headlen * Math.cos(angle + Math.PI / 6), toY - headlen * Math.sin(angle + Math.PI / 6));
        ctx.fill();

        ctx.font = '11px "Space Grotesk", -apple-system, sans-serif';
        ctx.fillText(label, toX + 6, toY + 4);
    }

    let lastTime = performance.now();
    function loop(now) {
        const dt = Math.min((now - lastTime) / 1000, 0.05);
        lastTime = now;
        update(dt);
        draw();
        requestAnimationFrame(loop);
    }
    requestAnimationFrame(loop);

    ['lorentz-b', 'lorentz-v', 'lorentz-q'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('input', () => { syncLabels(); resetSimulation(); });
    });

    syncLabels();
    resetSimulation();
})();

// ─────────────────────────────────────────────────────────────
// 18. CẢM ỨNG ĐIỆN TỪ (Faraday & Lenz Induction)
// ─────────────────────────────────────────────────────────────
(function initFaradayInduction() {
    const canvas = document.getElementById('faradayCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    let magnetX = 140;
    let magnetVx = 0;
    let draggingMagnet = false;
    let inducedEMF = 0;

    function getParams() {
        const turnsEl = document.getElementById('faraday-turns');
        return {
            N: turnsEl ? parseInt(turnsEl.value) : 10 // Số vòng dây
        };
    }

    function syncLabels() {
        const p = getParams();
        const nVal = document.getElementById('faraday-turns-val');
        if (nVal) nVal.textContent = p.N + ' vòng';

        const emfEl = document.getElementById('faraday-emf');
        if (emfEl) emfEl.textContent = inducedEMF.toFixed(2) + ' V';
    }

    canvas.addEventListener('mousedown', (e) => {
        const rect = canvas.getBoundingClientRect();
        const mx = (e.clientX - rect.left) * (canvas.width / rect.width);
        if (Math.abs(mx - magnetX) < 60) {
            draggingMagnet = true;
        }
    });

    window.addEventListener('mousemove', (e) => {
        if (!draggingMagnet) return;
        const rect = canvas.getBoundingClientRect();
        const mx = (e.clientX - rect.left) * (canvas.width / rect.width);
        const oldX = magnetX;
        magnetX = Math.max(80, Math.min(canvas.width - 120, mx));
        magnetVx = (magnetX - oldX) * 60; // Vận tốc di chuyển thanh nam châm
    });

    window.addEventListener('mouseup', () => {
        draggingMagnet = false;
        magnetVx = 0;
    });

    function update() {
        const p = getParams();
        const coilCenterX = 440;
        const dist = Math.abs(magnetX - coilCenterX);

        // Suất điện động cảm ứng tỷ lệ với dPhi/dt: e_c = -N * (dPhi/dx) * v
        if (dist < 180 && Math.abs(magnetVx) > 1) {
            const grad = (magnetX - coilCenterX) / Math.pow(dist * 0.1 + 10, 2);
            inducedEMF = -p.N * 0.05 * grad * (magnetVx / 50);
        } else {
            inducedEMF *= 0.9; // Giảm dần về 0 khi nam châm đứng yên
        }

        syncLabels();
    }

    function draw() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        const bgGrad = ctx.createLinearGradient(0, 0, 0, canvas.height);
        bgGrad.addColorStop(0, '#040d1a');
        bgGrad.addColorStop(1, '#091e38');
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        const p = getParams();

        const coilCenterX = 440;
        const coilY = 210;

        // 1. Cuộn dây Solenoid N vòng
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 4;
        const coilW = 120;
        const step = coilW / p.N;

        for (let i = 0; i < p.N; i++) {
            const cx = (coilCenterX - coilW / 2) + i * step;
            ctx.beginPath();
            ctx.ellipse(cx, coilY, 12, 45, 0, 0, Math.PI * 2);
            ctx.stroke();
        }

        // Lõi sắt từ cuộn dây
        ctx.fillStyle = 'rgba(148, 163, 184, 0.3)';
        ctx.fillRect(coilCenterX - coilW / 2 - 10, coilY - 12, coilW + 20, 24);

        // 2. Thanh nam châm thẳng N-S di động
        const magW = 100;
        const magH = 36;
        const magY = coilY - magH / 2;

        // Cực Bắc (N - Đỏ)
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(magnetX, magY, magW / 2, magH);
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 14px "Space Grotesk", -apple-system, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('N', magnetX + magW / 4, magY + 23);

        // Cực Nam (S - Xanh)
        ctx.fillStyle = '#3b82f6';
        ctx.fillRect(magnetX - magW / 2, magY, magW / 2, magH);
        ctx.fillStyle = '#ffffff';
        ctx.fillText('S', magnetX - magW / 4, magY + 23);

        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.strokeRect(magnetX - magW / 2, magY, magW, magH);

        // 3. Điện kế nhạy Galvanometer đo dòng cảm ứng
        drawGalvanometer(ctx, 440, 80, inducedEMF);
    }

    function drawGalvanometer(ctx, x, y, val) {
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(x - 50, y - 30, 100, 60);
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 2;
        ctx.strokeRect(x - 50, y - 30, 100, 60);

        // Kim chỉ độ lệch
        const needleAngle = Math.max(-0.8, Math.min(0.8, val * 0.4));
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(x, y + 20);
        ctx.lineTo(x + Math.sin(needleAngle) * 35, y + 20 - Math.cos(needleAngle) * 35);
        ctx.stroke();

        ctx.fillStyle = '#ffffff';
        ctx.font = '10px "Space Grotesk", -apple-system, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Điện kế G (Lenz)', x, y - 12);
    }

    function loop() {
        update();
        draw();
        requestAnimationFrame(loop);
    }
    requestAnimationFrame(loop);

    const turnsSlider = document.getElementById('faraday-turns');
    if (turnsSlider) turnsSlider.addEventListener('input', () => { syncLabels(); });

    syncLabels();
})();

// ─────────────────────────────────────────────────────────────
// 19. MẠCH ĐIỆN XOAY CHIỀU A.C. RLC (AC Resonance & Phasor)
// ─────────────────────────────────────────────────────────────
(function initRLCAC() {
    const canvas = document.getElementById('rlcCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    let t = 0;

    function getParams() {
        const rEl = document.getElementById('rlc-r');
        const lEl = document.getElementById('rlc-l');
        const cEl = document.getElementById('rlc-c');
        const fEl = document.getElementById('rlc-freq');

        return {
            R: rEl ? parseFloat(rEl.value) : 40,   // Ohm
            L: lEl ? parseFloat(lEl.value) : 0.2,  // Henry
            C: cEl ? parseFloat(cEl.value) : 100,  // microFarad
            f: fEl ? parseFloat(fEl.value) : 50    // Hz
        };
    }

    function syncLabels() {
        const p = getParams();
        const rVal = document.getElementById('rlc-r-val');
        const lVal = document.getElementById('rlc-l-val');
        const cVal = document.getElementById('rlc-c-val');
        const fVal = document.getElementById('rlc-freq-val');

        if (rVal) rVal.textContent = p.R.toFixed(0) + ' Ω';
        if (lVal) lVal.textContent = p.L.toFixed(2) + ' H';
        if (cVal) cVal.textContent = p.C.toFixed(0) + ' μF';
        if (fVal) fVal.textContent = p.f.toFixed(1) + ' Hz';

        // Tính ZL, ZC, Z, phi
        const omega = 2 * Math.PI * p.f;
        const ZL = omega * p.L;
        const ZC = 1 / (omega * p.C * 1e-6);
        const Z = Math.sqrt(p.R * p.R + Math.pow(ZL - ZC, 2));
        const phi = Math.atan2(ZL - ZC, p.R);

        // Tần số cộng hưởng điện: f0 = 1 / (2*pi*sqrt(LC))
        const f0 = 1 / (2 * Math.PI * Math.sqrt(p.L * p.C * 1e-6));

        const zlEl = document.getElementById('rlc-zl');
        const zcEl = document.getElementById('rlc-zc');
        const ztotEl = document.getElementById('rlc-ztot');
        const phiEl = document.getElementById('rlc-phi');
        const f0El = document.getElementById('rlc-f0');

        if (zlEl) zlEl.textContent = ZL.toFixed(1) + ' Ω';
        if (zcEl) zcEl.textContent = ZC.toFixed(1) + ' Ω';
        if (ztotEl) ztotEl.textContent = Z.toFixed(1) + ' Ω';
        if (phiEl) phiEl.textContent = (phi * 180 / Math.PI).toFixed(1) + '°';
        if (f0El) f0El.textContent = f0.toFixed(1) + ' Hz';
    }

    function draw() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        const bgGrad = ctx.createLinearGradient(0, 0, 0, canvas.height);
        bgGrad.addColorStop(0, '#040d1a');
        bgGrad.addColorStop(1, '#091e38');
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        const p = getParams();

        const omega = 2 * Math.PI * p.f;
        const ZL = omega * p.L;
        const ZC = 1 / (omega * p.C * 1e-6);
        const Z = Math.sqrt(p.R * p.R + Math.pow(ZL - ZC, 2));
        const phi = Math.atan2(ZL - ZC, p.R);

        const U0 = 100; // Volt
        const I0 = (U0 / Z) * 20; // Scale hiển thị

        // 1. Đồ thị sóng dao động u(t) và i(t) bên trái
        drawWaveforms(ctx, 30, 30, 360, 340, omega, phi, U0, I0);

        // 2. Giản đồ vector Fresnel quay bên phải
        drawFresnelDiagram(ctx, 430, 30, canvas.width - 460, 340, p.R, ZL, ZC, phi);
    }

    function drawWaveforms(ctx, ox, oy, w, h, omega, phi, U0, I0) {
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(ox, oy, w, h);
        ctx.strokeStyle = '#334155';
        ctx.strokeRect(ox, oy, w, h);

        const midY = oy + h / 2;
        ctx.strokeStyle = '#475569';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(ox, midY);
        ctx.lineTo(ox + w, midY);
        ctx.stroke();

        // Sóng điện áp u(t) = U0 * cos(omega*t) - Màu đỏ
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        for (let x = 0; x < w; x += 2) {
            const timeX = t + x * 0.0005;
            const y = midY - Math.cos(omega * timeX) * 70;
            if (x === 0) ctx.moveTo(ox + x, y);
            else ctx.lineTo(ox + x, y);
        }
        ctx.stroke();

        // Sóng dòng điện i(t) = I0 * cos(omega*t - phi) - Màu xanh
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        for (let x = 0; x < w; x += 2) {
            const timeX = t + x * 0.0005;
            const y = midY - Math.cos(omega * timeX - phi) * Math.min(85, I0 * 3);
            if (x === 0) ctx.moveTo(ox + x, y);
            else ctx.lineTo(ox + x, y);
        }
        ctx.stroke();

        ctx.fillStyle = '#ef4444';
        ctx.font = '11px "Space Grotesk", -apple-system, sans-serif';
        ctx.fillText('— Điện áp u(t)', ox + 20, oy + 25);
        ctx.fillStyle = '#38bdf8';
        ctx.fillText('— Dòng điện i(t)', ox + 140, oy + 25);
    }

    function drawFresnelDiagram(ctx, ox, oy, w, h, R, ZL, ZC, phi) {
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(ox, oy, w, h);
        ctx.strokeStyle = '#475569';
        ctx.strokeRect(ox, oy, w, h);

        const cx = ox + 60;
        const cy = oy + h / 2;

        ctx.fillStyle = '#ffffff';
        ctx.font = '12px "Space Grotesk", -apple-system, sans-serif';
        ctx.fillText('Giản Đồ Vector Fresnel', ox + 20, oy + 25);

        // Vector UR nằm ngang (theo trục I)
        const scale = 1.2;
        drawVector(ctx, cx, cy, R * scale, 0, '#10b981', 'U_R');

        // Vector UL hướng thẳng đứng lên trên (+y)
        drawVector(ctx, cx, cy, 0, -ZL * scale * 0.6, '#ef4444', 'U_L');

        // Vector UC hướng thẳng đứng xuống dưới (-y)
        drawVector(ctx, cx, cy, 0, ZC * scale * 0.6, '#38bdf8', 'U_C');

        // Vector U tổng hợp
        const netY = (ZC - ZL) * scale * 0.6;
        drawVector(ctx, cx, cy, R * scale, netY, '#f59e0b', 'U');
    }

    function drawVector(ctx, fromX, fromY, dx, dy, color, label) {
        const toX = fromX + dx;
        const toY = fromY + dy;
        const headlen = 7;
        const angle = Math.atan2(dy, dx);

        ctx.strokeStyle = color;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(fromX, fromY);
        ctx.lineTo(toX, toY);
        ctx.stroke();

        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.moveTo(toX, toY);
        ctx.lineTo(toX - headlen * Math.cos(angle - Math.PI / 6), toY - headlen * Math.sin(angle - Math.PI / 6));
        ctx.lineTo(toX - headlen * Math.cos(angle + Math.PI / 6), toY - headlen * Math.sin(angle + Math.PI / 6));
        ctx.fill();

        ctx.font = '11px "Space Grotesk", -apple-system, sans-serif';
        ctx.fillText(label, toX + 6, toY + 4);
    }

    let lastTime = performance.now();
    function loop(now) {
        const dt = Math.min((now - lastTime) / 1000, 0.05);
        lastTime = now;
        t += dt;
        draw();
        requestAnimationFrame(loop);
    }
    requestAnimationFrame(loop);

    ['rlc-r', 'rlc-l', 'rlc-c', 'rlc-freq'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('input', () => { syncLabels(); });
    });

    syncLabels();
})();



/* --- BUNDLED: simulations/optics.js --- */
/* ============================================================
   🌈 LP.VirtualLab - CHUYÊN ĐỀ 6: QUANG HỌC (Optics)
   Bao gồm 5 bài mô phỏng chuẩn mực:
   20. Khúc xạ ánh sáng & Phản xạ toàn phần (Snell's Law & Total Internal Reflection)
   21. Quang hình: Thấu kính mỏng & Gương cầu (Geometric Optics & Lens Formula)
   22. Giao thoa ánh sáng: Khe Young & Vòng tròn Newton (Young's Slits & Newton's Rings)
   23. Nhiễu xạ ánh sáng: Khe hẹp, Lỗ tròn & Cách mạng (Fraunhofer Diffraction & Airy Disk)
   24. Phân cực ánh sáng: Định luật Malus & Góc Brewster (Polarization & Brewster's Angle)
   Tác giả: Lê Ngọc Phú - SĐT: 0853257289
   ============================================================ */

// ─────────────────────────────────────────────────────────────
// 20. KHÚC XẠ & PHẢN XẠ TOÀN PHẦN (Snell's Law & TIR)
// ─────────────────────────────────────────────────────────────
(function initSnellRefraction() {
    const canvas = document.getElementById('snellCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    function getParams() {
        const n1El = document.getElementById('snell-n1');
        const n2El = document.getElementById('snell-n2');
        const angleEl = document.getElementById('snell-angle');

        return {
            n1: n1El ? parseFloat(n1El.value) : 1.0,  // Môi trường 1 (Không khí = 1.0)
            n2: n2El ? parseFloat(n2El.value) : 1.5,  // Môi trường 2 (Thủy tinh = 1.5, Nước = 1.33)
            iDeg: angleEl ? parseFloat(angleEl.value) : 45 // Góc tới i (độ)
        };
    }

    function syncLabels() {
        const p = getParams();
        const n1Val = document.getElementById('snell-n1-val');
        const n2Val = document.getElementById('snell-n2-val');
        const aVal = document.getElementById('snell-angle-val');

        if (n1Val) n1Val.textContent = p.n1.toFixed(2);
        if (n2Val) n2Val.textContent = p.n2.toFixed(2);
        if (aVal) aVal.textContent = p.iDeg.toFixed(0) + '°';

        const iRad = (p.iDeg * Math.PI) / 180;
        const sinR = (p.n1 * Math.sin(iRad)) / p.n2;

        let rDeg = 0;
        let isTIR = false;
        let ighDeg = 0;

        if (p.n1 > p.n2) {
            ighDeg = (Math.asin(p.n2 / p.n1) * 180) / Math.PI;
        }

        if (sinR > 1.0) {
            isTIR = true;
        } else {
            rDeg = (Math.asin(sinR) * 180) / Math.PI;
        }

        const rEl = document.getElementById('snell-r-angle');
        const ighEl = document.getElementById('snell-igh');
        const stEl = document.getElementById('snell-status');

        if (rEl) rEl.textContent = isTIR ? 'Không có (Bị phản xạ toàn phần)' : rDeg.toFixed(1) + '°';
        if (ighEl) ighEl.textContent = p.n1 > p.n2 ? ighDeg.toFixed(1) + '°' : 'Không có (n₁ ≤ n₂)';
        if (stEl) {
            if (isTIR) {
                stEl.textContent = '💎 PHẢN XẠ TOÀN PHẦN (i > i_gh)! 100% ánh sáng phản xạ.';
                stEl.style.color = '#ef4444';
            } else {
                stEl.textContent = 'Khúc xạ bình thường theo định luật Snell';
                stEl.style.color = '#10b981';
            }
        }
    }

    function draw() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        const bgGrad = ctx.createLinearGradient(0, 0, 0, canvas.height);
        bgGrad.addColorStop(0, '#040d1a');
        bgGrad.addColorStop(1, '#091e38');
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        const p = getParams();

        const midY = canvas.height / 2;
        const midX = canvas.width / 2;

        // 1. Phân chia 2 môi trường
        // Môi trường 1 (ở trên)
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(0, 0, canvas.width, midY);

        // Môi trường 2 (ở dưới)
        ctx.fillStyle = p.n2 > 1.3 ? 'rgba(56, 189, 248, 0.15)' : '#1e293b';
        ctx.fillRect(0, midY, canvas.width, midY);

        // Mặt phân cách giữa 2 môi trường
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(0, midY);
        ctx.lineTo(canvas.width, midY);
        ctx.stroke();

        // Đường pháp tuyến N-N' (nét đứt)
        ctx.strokeStyle = '#94a3b8';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(midX, 20);
        ctx.lineTo(midX, canvas.height - 20);
        ctx.stroke();
        ctx.setLineDash([]);

        // Nhãn môi trường
        ctx.fillStyle = '#ffffff';
        ctx.font = '12px "Space Grotesk", -apple-system, sans-serif';
        ctx.fillText(`Môi trường 1: n₁ = ${p.n1.toFixed(2)}`, 30, 40);
        ctx.fillText(`Môi trường 2: n₂ = ${p.n2.toFixed(2)}`, 30, midY + 40);
        ctx.fillText('Pháp tuyến N', midX + 10, 40);

        // 2. Tia tới Laser (Màu đỏ sáng)
        const iRad = (p.iDeg * Math.PI) / 180;
        const rayLen = 220;
        const startX = midX - rayLen * Math.sin(iRad);
        const startY = midY - rayLen * Math.cos(iRad);

        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 3.5;
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(midX, midY);
        ctx.stroke();

        // 3. Tia phản xạ (Góc phản xạ i' = i)
        const reflX = midX + rayLen * Math.sin(iRad);
        const reflY = midY - rayLen * Math.cos(iRad);

        const sinR = (p.n1 * Math.sin(iRad)) / p.n2;
        const isTIR = sinR > 1.0;

        ctx.strokeStyle = isTIR ? '#ef4444' : 'rgba(239, 68, 68, 0.35)';
        ctx.lineWidth = isTIR ? 3.5 : 2;
        ctx.beginPath();
        ctx.moveTo(midX, midY);
        ctx.lineTo(reflX, reflY);
        ctx.stroke();

        // 4. Tia khúc xạ (nếu không bị phản xạ toàn phần)
        if (!isTIR) {
            const rRad = Math.asin(sinR);
            const refrX = midX + rayLen * Math.sin(rRad);
            const refrY = midY + rayLen * Math.cos(rRad);

            ctx.strokeStyle = '#ef4444';
            ctx.lineWidth = 3.5;
            ctx.beginPath();
            ctx.moveTo(midX, midY);
            ctx.lineTo(refrX, refrY);
            ctx.stroke();

            // Cung đo góc khúc xạ r
            ctx.strokeStyle = '#fbbf24';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.arc(midX, midY, 50, Math.PI / 2 - rRad, Math.PI / 2);
            ctx.stroke();
            ctx.fillStyle = '#fbbf24';
            ctx.fillText(`r = ${(rRad * 180 / Math.PI).toFixed(1)}°`, midX + 15, midY + 70);
        }

        // Cung đo góc tới i
        ctx.strokeStyle = '#fbbf24';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(midX, midY, 50, -Math.PI / 2, -Math.PI / 2 + iRad);
        ctx.stroke();
        ctx.fillStyle = '#fbbf24';
        ctx.fillText(`i = ${p.iDeg}°`, midX - 45, midY - 60);
    }

    function loop() {
        draw();
        requestAnimationFrame(loop);
    }
    requestAnimationFrame(loop);

    ['snell-n1', 'snell-n2', 'snell-angle'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('input', () => { syncLabels(); });
    });

    syncLabels();
})();

// ─────────────────────────────────────────────────────────────
// 21. QUANG HÌNH: THẤU KÍNH MỎNG & GƯƠNG (Geometric Optics)
// ─────────────────────────────────────────────────────────────
(function initGeometricOptics() {
    const canvas = document.getElementById('opticsCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    let objDist = 180; // Khoảng cách từ vật tới thấu kính d (px)
    let objHeight = 50; // Chiều cao vật h (px)
    let draggingObj = false;

    function getParams() {
        const fEl = document.getElementById('optics-f');
        const hEl = document.getElementById('optics-h');
        const typeEl = document.querySelector('input[name="optics-type"]:checked');

        const isConvex = !typeEl || typeEl.value === 'convex'; // Hội tụ f > 0, Phân kỳ f < 0
        const fMag = fEl ? parseFloat(fEl.value) : 100;
        const f = isConvex ? fMag : -fMag;
        const h = hEl ? parseFloat(hEl.value) : 50;

        return { f, h };
    }

    function syncLabels() {
        const p = getParams();
        const fVal = document.getElementById('optics-f-val');
        const hVal = document.getElementById('optics-h-val');
        const dVal = document.getElementById('optics-d-val');

        if (fVal) fVal.textContent = (p.f > 0 ? '+' : '') + (p.f / 10).toFixed(1) + ' cm';
        if (hVal) hVal.textContent = (p.h / 10).toFixed(1) + ' cm';
        if (dVal) dVal.textContent = (objDist / 10).toFixed(1) + ' cm';

        // Công thức thấu kính Gauss: 1/f = 1/d + 1/d' => d' = d * f / (d - f)
        const d = objDist;
        const f = p.f;
        let dPrime = 0;
        let k = 0;
        let imgHeight = 0;
        let isReal = true;

        if (Math.abs(d - f) < 0.1) {
            dPrime = Infinity; // Ở vô cực
        } else {
            dPrime = (d * f) / (d - f);
            k = -dPrime / d;
            imgHeight = k * p.h;
            isReal = dPrime > 0;
        }

        const dpEl = document.getElementById('optics-dprime');
        const kEl = document.getElementById('optics-k');
        const stEl = document.getElementById('optics-status');

        if (dpEl) dpEl.textContent = isFinite(dPrime) ? (dPrime / 10).toFixed(1) + ' cm' : 'Ở vô cực (∞)';
        if (kEl) kEl.textContent = isFinite(k) ? k.toFixed(2) : '∞';
        if (stEl) {
            if (!isFinite(dPrime)) {
                stEl.textContent = 'Vật tại tiêu điểm F: chùm tia ló song song, ảnh ở vô cực';
            } else if (isReal) {
                stEl.textContent = `Ảnh THẬT, ngược chiều, hứng được trên màn (k = ${k.toFixed(2)})`;
                stEl.style.color = '#10b981';
            } else {
                stEl.textContent = `Ảnh ẢO, cùng chiều, nằm trước thấu kính (k = ${k.toFixed(2)})`;
                stEl.style.color = '#38bdf8';
            }
        }
    }

    // Kéo thả vật sáng
    canvas.addEventListener('mousedown', (e) => {
        const rect = canvas.getBoundingClientRect();
        const mx = (e.clientX - rect.left) * (canvas.width / rect.width);
        const my = (e.clientY - rect.top) * (canvas.height / rect.height);
        const midX = canvas.width / 2;
        const ox = midX - objDist;
        const oy = canvas.height / 2;

        if (Math.hypot(mx - ox, my - (oy - objHeight)) < 25) {
            draggingObj = true;
        }
    });

    window.addEventListener('mousemove', (e) => {
        if (!draggingObj) return;
        const rect = canvas.getBoundingClientRect();
        const mx = (e.clientX - rect.left) * (canvas.width / rect.width);
        const midX = canvas.width / 2;
        objDist = Math.max(30, Math.min(midX - 20, midX - mx));
        syncLabels();
    });

    window.addEventListener('mouseup', () => { draggingObj = false; });

    function draw() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        const bgGrad = ctx.createLinearGradient(0, 0, 0, canvas.height);
        bgGrad.addColorStop(0, '#040d1a');
        bgGrad.addColorStop(1, '#091e38');
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        const p = getParams();

        const midX = canvas.width / 2;
        const midY = canvas.height / 2;

        // 1. Trục chính quang học (nằm ngang)
        ctx.strokeStyle = '#64748b';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(0, midY);
        ctx.lineTo(canvas.width, midY);
        ctx.stroke();

        // 2. Thấu kính tại trục giữa midX
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(midX, midY - 140);
        ctx.lineTo(midX, midY + 140);
        ctx.stroke();

        // Mũi tên chỉ thấu kính hội tụ (mũi tên hướng ra) hoặc phân kỳ (mũi tên hướng vào)
        if (p.f > 0) {
            drawLensArrow(ctx, midX, midY - 140, true);
            drawLensArrow(ctx, midX, midY + 140, false);
        } else {
            drawLensArrow(ctx, midX, midY - 140, false);
            drawLensArrow(ctx, midX, midY + 140, true);
        }

        // 3. Các tiêu điểm F và F'
        const fAbs = Math.abs(p.f);
        drawFocalPoint(ctx, midX - fAbs, midY, p.f > 0 ? 'F' : "F'");
        drawFocalPoint(ctx, midX + fAbs, midY, p.f > 0 ? "F'" : 'F');

        // Quang tâm O
        ctx.fillStyle = '#ffffff';
        ctx.font = '12px "Space Grotesk", -apple-system, sans-serif';
        ctx.fillText('O', midX + 8, midY + 16);

        // 4. Vật sáng AB (mũi tên màu đỏ)
        const ax = midX - objDist;
        const ay = midY;
        const bx = ax;
        const by = midY - p.h;

        drawArrowObject(ctx, ax, ay, bx, by, '#ef4444', 'B', 'A');

        // 5. Tính vị trí ảnh A'B'
        const d = objDist;
        const f = p.f;
        if (Math.abs(d - f) > 0.1) {
            const dPrime = (d * f) / (d - f);
            const k = -dPrime / d;
            const aPrimeX = midX + dPrime;
            const bPrimeY = midY - k * p.h;

            // 6. Vẽ 3 tia sáng đặc biệt:
            // Tia 1: Đi từ ngọn B song song trục chính tới thấu kính tại (midX, by)
            ctx.strokeStyle = '#f59e0b';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(bx, by);
            ctx.lineTo(midX, by);
            if (p.f > 0) {
                // Thấu kính hội tụ: tia ló đi qua tiêu điểm ảnh F' (midX + f, midY)
                ctx.lineTo(aPrimeX, bPrimeY);
            } else {
                // Thấu kính phân kỳ: đường kéo dài đi qua F' (midX - fAbs, midY)
                ctx.lineTo(midX + 200, by + (by - midY) / fAbs * 200);
            }
            ctx.stroke();

            // Tia 2: Đi qua quang tâm O truyền thẳng không đổi hướng
            ctx.strokeStyle = '#10b981';
            ctx.beginPath();
            ctx.moveTo(bx, by);
            ctx.lineTo(midX, midY);
            ctx.lineTo(aPrimeX, bPrimeY);
            ctx.stroke();

            // Vẽ ảnh A'B' (Nét liền nếu ảnh thật, nét đứt nếu ảnh ảo)
            const isReal = dPrime > 0;
            ctx.setLineDash(isReal ? [] : [4, 4]);
            drawArrowObject(ctx, aPrimeX, midY, aPrimeX, bPrimeY, isReal ? '#10b981' : '#38bdf8', "B'", "A'");
            ctx.setLineDash([]);
        }
    }

    function drawFocalPoint(ctx, x, y, label) {
        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.arc(x, y, 4, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 12px "Space Grotesk", -apple-system, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(label, x, y + 18);
    }

    function drawArrowObject(ctx, x1, y1, x2, y2, color, topLabel, bottomLabel) {
        ctx.strokeStyle = color;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();

        // Mũi tên ở đầu (x2, y2)
        const sign = Math.sign(y2 - y1);
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.moveTo(x2, y2);
        ctx.lineTo(x2 - 6, y2 - sign * 10);
        ctx.lineTo(x2 + 6, y2 - sign * 10);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 12px "Space Grotesk", -apple-system, sans-serif';
        ctx.fillText(topLabel, x2, y2 - sign * 12);
        ctx.fillText(bottomLabel, x1, y1 + 14);
    }

    function drawLensArrow(ctx, x, y, pointUp) {
        const sign = pointUp ? 1 : -1;
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(x - 8, y + sign * 10);
        ctx.lineTo(x, y);
        ctx.lineTo(x + 8, y + sign * 10);
        ctx.stroke();
    }

    function loop() {
        draw();
        requestAnimationFrame(loop);
    }
    requestAnimationFrame(loop);

    ['optics-f', 'optics-h'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('input', () => { syncLabels(); });
    });

    document.querySelectorAll('input[name="optics-type"]').forEach(radio => {
        radio.addEventListener('change', () => { syncLabels(); });
    });

    syncLabels();
})();

// ─────────────────────────────────────────────────────────────
// 22. GIAO THOA ÁNH SÁNG: KHE YOUNG & VÒNG TRÒN NEWTON
// ─────────────────────────────────────────────────────────────
(function initYoungInterference() {
    const canvas = document.getElementById('youngCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    let mode = 'young'; // 'young' or 'newton'

    function getParams() {
        const lambdaEl = document.getElementById('young-lambda');
        const aEl = document.getElementById('young-a');
        const dEl = document.getElementById('young-d');

        return {
            lambdaNm: lambdaEl ? parseFloat(lambdaEl.value) : 632, // Bước sóng nm (Laser He-Ne 632.8 nm)
            aMm: aEl ? parseFloat(aEl.value) : 0.5,                // Khoảng cách 2 khe mm
            dM: dEl ? parseFloat(dEl.value) : 1.5                  // Khoảng cách từ khe tới màn m
        };
    }

    function syncLabels() {
        const p = getParams();
        const lVal = document.getElementById('young-lambda-val');
        const aVal = document.getElementById('young-a-val');
        const dVal = document.getElementById('young-d-val');

        if (lVal) lVal.textContent = p.lambdaNm.toFixed(0) + ' nm';
        if (aVal) aVal.textContent = p.aMm.toFixed(2) + ' mm';
        if (dVal) dVal.textContent = p.dM.toFixed(2) + ' m';

        // Khoảng vân: i = lambda * D / a
        // lambda (m) = lambdaNm * 1e-9
        // D (m) = dM
        // a (m) = aMm * 1e-3
        const i_mm = (p.lambdaNm * 1e-6 * p.dM) / (p.aMm * 1e-3);

        const iEl = document.getElementById('young-fringe-i');
        if (iEl) iEl.textContent = i_mm.toFixed(3) + ' mm';
    }

    function nmToColor(nm) {
        if (nm >= 380 && nm < 440) return '#8b5cf6';
        if (nm >= 440 && nm < 490) return '#3b82f6';
        if (nm >= 490 && nm < 560) return '#10b981';
        if (nm >= 560 && nm < 590) return '#eab308';
        if (nm >= 590 && nm < 630) return '#f97316';
        if (nm >= 630 && nm <= 750) return '#ef4444';
        return '#ef4444';
    }

    function draw() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        const bgGrad = ctx.createLinearGradient(0, 0, 0, canvas.height);
        bgGrad.addColorStop(0, '#040d1a');
        bgGrad.addColorStop(1, '#091e38');
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        const p = getParams();
        const laserColor = nmToColor(p.lambdaNm);

        if (mode === 'young') {
            drawYoungSlits(ctx, p, laserColor);
        } else {
            drawNewtonRings(ctx, p, laserColor);
        }
    }

    function drawYoungSlits(ctx, p, laserColor) {
        // 1. Phía bên trái: Sơ đồ 2 khe hẹp S1, S2
        const slitX = 90;
        const screenX = canvas.width - 140;
        const midY = canvas.height / 2;

        ctx.fillStyle = '#475569';
        ctx.fillRect(slitX - 8, 20, 8, canvas.height - 40);

        // 2 khe hẹp cách nhau khoảng a
        const slitGap = p.aMm * 40;
        ctx.clearRect(slitX - 8, midY - slitGap / 2 - 4, 8, 8);
        ctx.clearRect(slitX - 8, midY + slitGap / 2 - 4, 8, 8);

        // Nguồn laser chiếu tới khe
        ctx.strokeStyle = laserColor;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(15, midY);
        ctx.lineTo(slitX - 8, midY);
        ctx.stroke();

        // 2. Màn quan sát bên phải
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(screenX, 20, 110, canvas.height - 40);
        ctx.strokeStyle = '#64748b';
        ctx.strokeRect(screenX, 20, 110, canvas.height - 40);

        // Vẽ hệ vân giao thoa thực tế trên màn quan sát: I(x) = I0 * cos^2(pi * a * x / (lambda * D))
        const i_mm = (p.lambdaNm * 1e-6 * p.dM) / (p.aMm * 1e-3);
        const scalePx = 18; // 1 mm = 18 pixel

        for (let y = 20; y < canvas.height - 20; y += 2) {
            const dy = (y - midY) / scalePx; // mm
            const phase = (Math.PI * p.aMm * dy) / (p.lambdaNm * 1e-6 * p.dM * 1000);
            const intensity = Math.pow(Math.cos(phase), 2);

            ctx.fillStyle = laserColor;
            ctx.globalAlpha = intensity;
            ctx.fillRect(screenX, y, 110, 2);
        }
        ctx.globalAlpha = 1.0;

        // Chú thích
        ctx.fillStyle = '#ffffff';
        ctx.font = '11px "Space Grotesk", -apple-system, sans-serif';
        ctx.fillText(`Màn hứng vân giao thoa (Khoảng vân i = ${(i_mm).toFixed(2)} mm)`, screenX - 100, 35);
    }

    function drawNewtonRings(ctx, p, laserColor) {
        // Vòng tròn Newton: các vòng tròn đồng tâm sáng tối
        const cx = canvas.width / 2;
        const cy = canvas.height / 2;
        const R = 2.0; // Bán kính cong thấu kính (m)

        ctx.fillStyle = '#0f172a';
        ctx.fillRect(cx - 150, cy - 150, 300, 300);
        ctx.strokeStyle = '#38bdf8';
        ctx.strokeRect(cx - 150, cy - 150, 300, 300);

        // Bán kính vân tối: r_k = sqrt(k * lambda * R)
        for (let k = 1; k <= 14; k++) {
            const r = Math.sqrt(k * p.lambdaNm * 1e-9 * R) * 5500;
            ctx.strokeStyle = laserColor;
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(cx, cy, r, 0, Math.PI * 2);
            ctx.stroke();
        }

        // Tâm tiếp xúc (vân tối trung tâm)
        ctx.fillStyle = '#000000';
        ctx.beginPath();
        ctx.arc(cx, cy, 6, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.font = '12px "Space Grotesk", -apple-system, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText("Vòng Tròn Newton (Giao Thoa Bản Nêm Không Khí r_k = √(k·λ·R))", cx, 30);
    }

    function loop() {
        draw();
        requestAnimationFrame(loop);
    }
    requestAnimationFrame(loop);

    ['young-lambda', 'young-a', 'young-d'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('input', () => { syncLabels(); });
    });

    document.querySelectorAll('input[name="young-mode"]').forEach(radio => {
        radio.addEventListener('change', () => {
            mode = radio.value;
            syncLabels();
        });
    });

    syncLabels();
})();

// ─────────────────────────────────────────────────────────────
// 23. NHIỄU XẠ ÁNH SÁNG: KHE HẸP, LỖ TRÒN & CÁCH MẠNG
// ─────────────────────────────────────────────────────────────
(function initDiffraction() {
    const canvas = document.getElementById('diffractionCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    let mode = 'single-slit'; // 'single-slit' or 'circular' or 'grating'

    function getParams() {
        const slitWEl = document.getElementById('diff-slit-width');
        const lambdaEl = document.getElementById('diff-lambda');

        return {
            bUm: slitWEl ? parseFloat(slitWEl.value) : 10,   // Bề rộng khe b (micromet)
            lambdaNm: lambdaEl ? parseFloat(lambdaEl.value) : 550 // Bước sóng nm
        };
    }

    function syncLabels() {
        const p = getParams();
        const bVal = document.getElementById('diff-slit-val');
        const lVal = document.getElementById('diff-lambda-val');

        if (bVal) bVal.textContent = p.bUm.toFixed(1) + ' μm';
        if (lVal) lVal.textContent = p.lambdaNm.toFixed(0) + ' nm';

        // Góc mở cực đại trung tâm: theta = 2 * lambda / b
        const thetaRad = (2 * p.lambdaNm * 1e-9) / (p.bUm * 1e-6);
        const thetaDeg = (thetaRad * 180) / Math.PI;

        const thEl = document.getElementById('diff-angle');
        if (thEl) thEl.textContent = thetaDeg.toFixed(2) + '°';
    }

    function draw() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        const bgGrad = ctx.createLinearGradient(0, 0, 0, canvas.height);
        bgGrad.addColorStop(0, '#040d1a');
        bgGrad.addColorStop(1, '#091e38');
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        const p = getParams();

        const cx = canvas.width / 2;
        const cy = canvas.height / 2;

        if (mode === 'single-slit') {
            // Nhiễu xạ qua 1 khe hẹp: I(theta) = I0 * (sin(beta)/beta)^2
            drawSingleSlit(ctx, cx, cy, p);
        } else if (mode === 'circular') {
            // Nhiễu xạ qua lỗ tròn: Đĩa Airy
            drawAiryDisk(ctx, cx, cy, p);
        } else {
            // Cách mạng nhiễu xạ
            drawGrating(ctx, cx, cy, p);
        }
    }

    function drawSingleSlit(ctx, cx, cy, p) {
        // Vẽ dải vân trên màn
        const barH = 50;
        const screenY = cy - 80;

        for (let x = 30; x < canvas.width - 30; x++) {
            const dx = (x - cx) * 0.08;
            const beta = (Math.PI * p.bUm * 0.2 * dx) / (p.lambdaNm * 0.05);
            const intensity = beta === 0 ? 1 : Math.pow(Math.sin(beta) / beta, 2);

            ctx.fillStyle = '#22c55e';
            ctx.globalAlpha = intensity;
            ctx.fillRect(x, screenY, 1, barH);
        }
        ctx.globalAlpha = 1.0;

        // Vẽ đồ thị đường cong cường độ I(x) phía dưới
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        for (let x = 30; x < canvas.width - 30; x += 2) {
            const dx = (x - cx) * 0.08;
            const beta = (Math.PI * p.bUm * 0.2 * dx) / (p.lambdaNm * 0.05);
            const intensity = beta === 0 ? 1 : Math.pow(Math.sin(beta) / beta, 2);
            const py = cy + 120 - intensity * 100;
            if (x === 30) ctx.moveTo(x, py);
            else ctx.lineTo(x, py);
        }
        ctx.stroke();

        ctx.fillStyle = '#ffffff';
        ctx.font = '12px "Space Grotesk", -apple-system, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Nhiễu xạ Fraunhofer qua 1 khe hẹp: Cực đại trung tâm rộng gấp đôi', cx, 30);
    }

    function drawAiryDisk(ctx, cx, cy, p) {
        // Đĩa Airy với vòng tròn tối thứ nhất theta = 1.22 * lambda / D
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(cx - 140, cy - 140, 280, 280);

        const rAiry = (1.22 * p.lambdaNm * 1e-9 / (p.bUm * 1e-6)) * 60000;

        // Đĩa sáng trung tâm Airy disk (84% năng lượng)
        const radGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, rAiry);
        radGrad.addColorStop(0, '#22c55e');
        radGrad.addColorStop(0.7, 'rgba(34, 197, 94, 0.6)');
        radGrad.addColorStop(1, 'rgba(34, 197, 94, 0)');
        ctx.fillStyle = radGrad;
        ctx.beginPath();
        ctx.arc(cx, cy, rAiry, 0, Math.PI * 2);
        ctx.fill();

        // Vòng sáng thứ 2
        ctx.strokeStyle = 'rgba(34, 197, 94, 0.4)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(cx, cy, rAiry * 1.6, 0, Math.PI * 2);
        ctx.stroke();

        ctx.fillStyle = '#ffffff';
        ctx.font = '12px "Space Grotesk", -apple-system, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Nhiễu Xạ Lỗ Tròn - Đĩa Airy (Tiêu chuẩn Rayleigh phân giải quang học)', cx, 30);
    }

    function drawGrating(ctx, cx, cy, p) {
        // Cách mạng nhiễu xạ: các vạch cực đại sắc nét
        ctx.fillStyle = '#ffffff';
        ctx.font = '12px "Space Grotesk", -apple-system, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Cách mạng nhiễu xạ (Diffraction Grating): Tách các vạch phổ sắc nét d·sinθ = kλ', cx, 30);

        const colors = ['#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ef4444'];
        [-1, 0, 1].forEach(k => {
            colors.forEach((col, idx) => {
                const px = cx + k * (120 + idx * 25);
                ctx.fillStyle = col;
                ctx.fillRect(px - 2, cy - 60, 4, 120);
            });
        });
    }

    function loop() {
        draw();
        requestAnimationFrame(loop);
    }
    requestAnimationFrame(loop);

    ['diff-slit-width', 'diff-lambda'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('input', () => { syncLabels(); });
    });

    document.querySelectorAll('input[name="diff-mode"]').forEach(radio => {
        radio.addEventListener('change', () => {
            mode = radio.value;
            syncLabels();
        });
    });

    syncLabels();
})();

// ─────────────────────────────────────────────────────────────
// 24. PHÂN CỰC ÁNH SÁNG: ĐỊNH LUẬT MALUS & GÓC BREWSTER
// ─────────────────────────────────────────────────────────────
(function initPolarization() {
    const canvas = document.getElementById('polarizationCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    function getParams() {
        const angleEl = document.getElementById('pol-angle');
        return {
            thetaDeg: angleEl ? parseFloat(angleEl.value) : 45 // Góc giữa 2 trục kính lọc (độ)
        };
    }

    function syncLabels() {
        const p = getParams();
        const aVal = document.getElementById('pol-angle-val');
        if (aVal) aVal.textContent = p.thetaDeg.toFixed(0) + '°';

        // Định luật Malus: I = I0 * cos^2(theta)
        const rad = (p.thetaDeg * Math.PI) / 180;
        const transPercent = Math.pow(Math.cos(rad), 2) * 100;

        const tEl = document.getElementById('pol-transmission');
        const stEl = document.getElementById('pol-status');

        if (tEl) tEl.textContent = transPercent.toFixed(1) + ' %';
        if (stEl) {
            if (p.thetaDeg === 90) {
                stEl.textContent = '🌑 Hai kính vuông góc: Triệt tiêu 100% ánh sáng (I = 0)!';
                stEl.style.color = '#ef4444';
            } else if (p.thetaDeg === 0) {
                stEl.textContent = '☀️ Hai kính song song: Cho 100% ánh sáng phân cực đi qua!';
                stEl.style.color = '#10b981';
            } else {
                stEl.textContent = `Cường độ sáng còn lại ${(transPercent).toFixed(1)}% theo Malus`;
                stEl.style.color = '#38bdf8';
            }
        }
    }

    function draw() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        const bgGrad = ctx.createLinearGradient(0, 0, 0, canvas.height);
        bgGrad.addColorStop(0, '#040d1a');
        bgGrad.addColorStop(1, '#091e38');
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        const p = getParams();

        const cy = canvas.height / 2;

        // 1. Chùm sáng tự nhiên chưa phân cực
        ctx.strokeStyle = '#fbbf24';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(30, cy);
        ctx.lineTo(160, cy);
        ctx.stroke();

        ctx.fillStyle = '#fbbf24';
        ctx.font = '11px "Space Grotesk", -apple-system, sans-serif';
        ctx.fillText('Ánh sáng tự nhiên I₀', 40, cy - 20);

        // 2. Kính lọc phân cực thứ nhất (Polarizer) - Trục thẳng đứng
        drawPolarizerFilter(ctx, 180, cy, 0, 'Kính Phân Cực P₁ (Trục thẳng đứng)');

        // Chùm sáng sau P1: Phân cực thẳng I1 = I0 / 2
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 3.5;
        ctx.beginPath();
        ctx.moveTo(200, cy);
        ctx.lineTo(380, cy);
        ctx.stroke();

        ctx.fillStyle = '#38bdf8';
        ctx.fillText('I₁ = ½ I₀', 270, cy - 15);

        // 3. Kính lọc phân tích thứ hai (Analyzer) - Trục lệch góc theta
        drawPolarizerFilter(ctx, 400, cy, p.thetaDeg, `Kính Phân Tích P₂ (Góc θ = ${p.thetaDeg}°)`);

        // Chùm sáng sau P2: Cường độ I2 = I1 * cos^2(theta)
        const rad = (p.thetaDeg * Math.PI) / 180;
        const factor = Math.pow(Math.cos(rad), 2);

        if (factor > 0.01) {
            ctx.strokeStyle = `rgba(56, 189, 248, ${factor})`;
            ctx.lineWidth = Math.max(1, factor * 4);
            ctx.beginPath();
            ctx.moveTo(420, cy);
            ctx.lineTo(canvas.width - 40, cy);
            ctx.stroke();
        }

        ctx.fillStyle = '#ffffff';
        ctx.font = '12px "Space Grotesk", -apple-system, sans-serif';
        ctx.fillText(`I₂ = I₁·cos²(${p.thetaDeg}°) = ${(factor * 100).toFixed(1)}%`, 450, cy - 15);
    }

    function drawPolarizerFilter(ctx, x, y, angleDeg, label) {
        ctx.save();
        ctx.translate(x, y);

        // Khung kính lọc tròn
        ctx.fillStyle = 'rgba(30, 41, 59, 0.85)';
        ctx.beginPath();
        ctx.arc(0, 0, 50, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 2.5;
        ctx.stroke();

        // Các đường khe song song của trục quang học
        ctx.rotate((angleDeg * Math.PI) / 180);
        ctx.strokeStyle = '#fbbf24';
        ctx.lineWidth = 2;
        for (let i = -30; i <= 30; i += 12) {
            ctx.beginPath();
            ctx.moveTo(i, -Math.sqrt(2500 - i * i));
            ctx.lineTo(i, Math.sqrt(2500 - i * i));
            ctx.stroke();
        }

        ctx.restore();

        ctx.fillStyle = '#ffffff';
        ctx.font = '10px "Space Grotesk", -apple-system, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(label, x, y + 70);
    }

    function loop() {
        draw();
        requestAnimationFrame(loop);
    }
    requestAnimationFrame(loop);

    const angleSlider = document.getElementById('pol-angle');
    if (angleSlider) angleSlider.addEventListener('input', () => { syncLabels(); });

    syncLabels();
})();



/* --- BUNDLED: simulations/modern.js --- */
/* ============================================================
   ⚛️ LP.VirtualLab - CHUYÊN ĐỀ 7: VẬT LÝ HIỆN ĐẠI (Modern Physics)
   Bao gồm 3 bài mô phỏng chuẩn mực:
   25. Hiệu ứng quang điện ngoài (Einstein's Photoelectric Effect)
   26. Bức xạ vật đen & Định luật Wien, Stefan-Boltzmann (Blackbody Radiation)
   27. Mô hình nguyên tử Bohr & Tán xạ hạt Alpha Rutherford (Bohr & Rutherford)
   Tác giả: Lê Ngọc Phú - SĐT: 0853257289
   ============================================================ */

// ─────────────────────────────────────────────────────────────
// 25. HIỆU ỨNG QUANG ĐIỆN NGOÀI (Photoelectric Effect)
// ─────────────────────────────────────────────────────────────
(function initPhotoelectric() {
    const canvas = document.getElementById('photoelectricCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const metals = {
        'Cs': { name: 'Caesi (Cs)', workFunction: 2.14 },
        'Na': { name: 'Natri (Na)', workFunction: 2.36 },
        'Zn': { name: 'Kẽm (Zn)', workFunction: 4.30 },
        'Cu': { name: 'Đồng (Cu)', workFunction: 4.70 },
        'Pt': { name: 'Bạch kim (Pt)', workFunction: 6.35 }
    };

    let electrons = [];

    function getParams() {
        const metalEl = document.getElementById('pe-metal');
        const lambdaEl = document.getElementById('pe-lambda');
        const intensityEl = document.getElementById('pe-intensity');
        const voltEl = document.getElementById('pe-voltage');

        const metalKey = metalEl ? metalEl.value : 'Na';
        const workFunc = metals[metalKey] ? metals[metalKey].workFunction : 2.36;

        return {
            metalKey,
            workFunc,
            lambdaNm: lambdaEl ? parseFloat(lambdaEl.value) : 400, // nm
            intensity: intensityEl ? parseFloat(intensityEl.value) : 80, // %
            voltage: voltEl ? parseFloat(voltEl.value) : 0 // Volt (ngược chiều là điện áp hãm)
        };
    }

    function syncLabels() {
        const p = getParams();
        const lVal = document.getElementById('pe-lambda-val');
        const iVal = document.getElementById('pe-intensity-val');
        const vVal = document.getElementById('pe-voltage-val');

        if (lVal) lVal.textContent = p.lambdaNm.toFixed(0) + ' nm';
        if (iVal) iVal.textContent = p.intensity.toFixed(0) + ' %';
        if (vVal) vVal.textContent = p.voltage.toFixed(2) + ' V';

        // Năng lượng photon: E = hc / lambda
        // hc = 1240 eV * nm
        const photonEnergy = 1240 / p.lambdaNm; // eV
        // Giới hạn quang điện: lambda_0 = hc / A
        const lambda0 = 1240 / p.workFunc; // nm

        // Động năng cực đại: K_max = E - A (nếu E > A)
        const canEject = photonEnergy >= p.workFunc;
        const kMax = canEject ? (photonEnergy - p.workFunc) : 0;
        const vStop = kMax; // Điện áp hãm Uh = K_max / e (Volt)

        const eEl = document.getElementById('pe-photon-e');
        const aEl = document.getElementById('pe-work-func');
        const l0El = document.getElementById('pe-lambda0');
        const kEl = document.getElementById('pe-kmax');
        const vStopEl = document.getElementById('pe-vstop');
        const stEl = document.getElementById('pe-status');

        if (eEl) eEl.textContent = photonEnergy.toFixed(2) + ' eV';
        if (aEl) aEl.textContent = p.workFunc.toFixed(2) + ' eV';
        if (l0El) l0El.textContent = lambda0.toFixed(0) + ' nm';
        if (kEl) kEl.textContent = kMax.toFixed(2) + ' eV';
        if (vStopEl) vStopEl.textContent = vStop.toFixed(2) + ' V';

        if (stEl) {
            if (!canEject) {
                stEl.textContent = `❌ Không xảy ra quang điện (λ > λ₀ = ${lambda0.toFixed(0)}nm)`;
                stEl.style.color = '#ef4444';
            } else if (p.voltage <= -vStop) {
                stEl.textContent = `🛑 Đã triệt tiêu dòng quang điện do U ≤ -Uh (-${vStop.toFixed(2)}V)`;
                stEl.style.color = '#f59e0b';
            } else {
                stEl.textContent = `⚡ Xảy ra quang điện! Electron bứt ra và bay sang anốt.`;
                stEl.style.color = '#10b981';
            }
        }
    }

    function nmToColor(nm) {
        if (nm < 380) return '#a855f7'; // Tử ngoại UV
        if (nm >= 380 && nm < 440) return '#6366f1';
        if (nm >= 440 && nm < 490) return '#38bdf8';
        if (nm >= 490 && nm < 560) return '#22c55e';
        if (nm >= 560 && nm < 590) return '#eab308';
        if (nm >= 590 && nm < 630) return '#f97316';
        if (nm >= 630 && nm <= 750) return '#ef4444';
        return '#dc2626'; // Hồng ngoại
    }

    function update(dt) {
        const p = getParams();
        const photonEnergy = 1240 / p.lambdaNm;
        const canEject = photonEnergy >= p.workFunc;
        const kMax = canEject ? (photonEnergy - p.workFunc) : 0;

        // Sinh electron từ Catot
        if (canEject && Math.random() < (p.intensity / 100) * 0.4) {
            const v0 = Math.sqrt(kMax) * 45;
            electrons.push({
                x: 180,
                y: 110 + Math.random() * 140,
                vx: v0 * (0.6 + 0.4 * Math.random()),
                vy: (Math.random() - 0.5) * 15
            });
        }

        // Cập nhật vị trí electron dưới điện trường gia tốc/hãm U
        const anodeX = canvas.width - 180;
        const accX = (p.voltage / 0.2) * 8; // Gia tốc điện trường

        for (let i = electrons.length - 1; i >= 0; i--) {
            const el = electrons[i];
            el.vx += accX * dt;
            el.x += el.vx * dt * 4;
            el.y += el.vy * dt * 4;

            // Chạm anốt hoặc quay đầu về catôt do điện trường hãm
            if (el.x >= anodeX || el.x < 175 || el.y < 80 || el.y > 280) {
                electrons.splice(i, 1);
            }
        }
    }

    function draw() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        const bgGrad = ctx.createLinearGradient(0, 0, 0, canvas.height);
        bgGrad.addColorStop(0, '#040d1a');
        bgGrad.addColorStop(1, '#091e38');
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        const p = getParams();

        const lightColor = nmToColor(p.lambdaNm);
        const cathodeX = 170;
        const anodeX = canvas.width - 170;

        // 1. Bình chân không bóng thủy tinh
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.4)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.ellipse(canvas.width / 2, 180, 220, 120, 0, 0, Math.PI * 2);
        ctx.stroke();

        // 2. Catot (Bản kim loại chiếu sáng)
        ctx.fillStyle = '#475569';
        ctx.fillRect(cathodeX, 100, 14, 160);
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(cathodeX, 100, 14, 160);

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 12px "Space Grotesk", -apple-system, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`Catôt (${p.metalKey})`, cathodeX - 35, 185);

        // 3. Anot (Bản thu electron)
        ctx.fillStyle = '#334155';
        ctx.fillRect(anodeX, 100, 14, 160);
        ctx.strokeRect(anodeX, 100, 14, 160);
        ctx.fillText('Anôt', anodeX + 35, 185);

        // 4. Chùm ánh sáng photon chiếu vào catôt
        ctx.strokeStyle = lightColor;
        ctx.lineWidth = Math.max(2, (p.intensity / 100) * 8);
        ctx.beginPath();
        ctx.moveTo(40, 60);
        ctx.lineTo(cathodeX, 180);
        ctx.stroke();

        ctx.fillStyle = lightColor;
        ctx.font = '11px "Space Grotesk", -apple-system, sans-serif';
        ctx.fillText(`Photon hf (λ = ${p.lambdaNm}nm)`, 80, 60);

        // 5. Các electron đang bay
        electrons.forEach(el => {
            ctx.fillStyle = '#38bdf8';
            ctx.beginPath();
            ctx.arc(el.x, el.y, 3.5, 0, Math.PI * 2);
            ctx.fill();
        });

        // 6. Mạch ngoài nối nguồn điện áp điều chỉnh U
        drawCircuitVolt(ctx, cathodeX, anodeX, p.voltage);
    }

    function drawCircuitVolt(ctx, cx, ax, volt) {
        ctx.strokeStyle = '#64748b';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(cx, 260);
        ctx.lineTo(cx, 320);
        ctx.lineTo(canvas.width / 2 - 30, 320);

        ctx.moveTo(ax, 260);
        ctx.lineTo(ax, 320);
        ctx.lineTo(canvas.width / 2 + 30, 320);
        ctx.stroke();

        // Đồng hồ đo điện áp
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(canvas.width / 2 - 35, 305, 70, 30);
        ctx.strokeStyle = '#38bdf8';
        ctx.strokeRect(canvas.width / 2 - 35, 305, 70, 30);

        ctx.fillStyle = '#ffffff';
        ctx.font = '11px "Space Grotesk", -apple-system, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`U = ${volt.toFixed(2)}V`, canvas.width / 2, 324);
    }

    let lastTime = performance.now();
    function loop(now) {
        const dt = Math.min((now - lastTime) / 1000, 0.05);
        lastTime = now;
        update(dt);
        draw();
        requestAnimationFrame(loop);
    }
    requestAnimationFrame(loop);

    ['pe-metal', 'pe-lambda', 'pe-intensity', 'pe-voltage'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('input', () => { syncLabels(); });
        if (el && el.tagName === 'SELECT') el.addEventListener('change', () => { syncLabels(); });
    });

    syncLabels();
})();

// ─────────────────────────────────────────────────────────────
// 26. BỨC XẠ VẬT ĐEN (Blackbody Radiation: Wien & Stefan-Boltzmann)
// ─────────────────────────────────────────────────────────────
(function initBlackbody() {
    const canvas = document.getElementById('blackbodyCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    function getParams() {
        const tEl = document.getElementById('bb-temp');
        return {
            tempK: tEl ? parseFloat(tEl.value) : 5800 // Nhiệt độ tuyệt đối (5800 K là bề mặt Mặt Trời)
        };
    }

    function syncLabels() {
        const p = getParams();
        const tVal = document.getElementById('bb-temp-val');
        if (tVal) tVal.textContent = p.tempK.toFixed(0) + ' K';

        // Định luật dịch chuyển Wien: lambda_max * T = b = 2.898e-3 m*K
        const b = 2.898e-3;
        const lambdaMaxNm = (b / p.tempK) * 1e9;

        // Định luật Stefan-Boltzmann: P = sigma * T^4
        // sigma = 5.67e-8 W/(m2 K4)
        const sigma = 5.67037e-8;
        const totalPower = sigma * Math.pow(p.tempK, 4);

        const lMaxEl = document.getElementById('bb-lambda-max');
        const pTotEl = document.getElementById('bb-total-power');
        const colDescEl = document.getElementById('bb-color-desc');

        if (lMaxEl) lMaxEl.textContent = lambdaMaxNm.toFixed(0) + ' nm';
        if (pTotEl) pTotEl.textContent = (totalPower / 1e6).toFixed(2) + ' MW/m²';

        if (colDescEl) {
            if (p.tempK < 2000) colDescEl.textContent = 'Đỏ sẫm (Hồng ngoại nung nóng)';
            else if (p.tempK < 3500) colDescEl.textContent = 'Vàng cam (Dây tóc bóng đèn sợi đốt)';
            else if (p.tempK < 6500) colDescEl.textContent = 'Trắng sáng rực rỡ (Bề mặt Mặt Trời)';
            else colDescEl.textContent = 'Xanh lam lơ (Các ngôi sao khổng lồ cực nóng)';
        }
    }

    function getBlackbodyGlow(tempK) {
        if (tempK < 2000) return '#ef4444';
        if (tempK < 3500) return '#f59e0b';
        if (tempK < 6500) return '#ffffff';
        return '#38bdf8';
    }

    function draw() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        const bgGrad = ctx.createLinearGradient(0, 0, 0, canvas.height);
        bgGrad.addColorStop(0, '#040d1a');
        bgGrad.addColorStop(1, '#091e38');
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        const p = getParams();

        const glowColor = getBlackbodyGlow(p.tempK);

        // 1. Quả cầu nung nóng vật đen bên trái
        const sphereX = 110;
        const sphereY = 170;
        const r = 50;

        const radGrad = ctx.createRadialGradient(sphereX, sphereY, 5, sphereX, sphereY, r + 30);
        radGrad.addColorStop(0, '#ffffff');
        radGrad.addColorStop(0.5, glowColor);
        radGrad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = radGrad;
        ctx.beginPath();
        ctx.arc(sphereX, sphereY, r + 30, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = glowColor;
        ctx.beginPath();
        ctx.arc(sphereX, sphereY, r, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.font = '12px "Space Grotesk", -apple-system, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`Vật đen T = ${p.tempK} K`, sphereX, sphereY + r + 45);

        // 2. Đồ thị phổ Planck u(lambda, T) bên phải
        drawPlanckSpectrum(ctx, 230, 30, canvas.width - 250, 310, p);
    }

    function drawPlanckSpectrum(ctx, ox, oy, w, h, p) {
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(ox, oy, w, h);
        ctx.strokeStyle = '#334155';
        ctx.strokeRect(ox, oy, w, h);

        const xBase = ox + 45;
        const yBase = oy + h - 35;
        const dw = w - 65;
        const dh = h - 60;

        // Trục tọa độ: Hoành là bước sóng lambda (0 đến 2500 nm)
        ctx.strokeStyle = '#94a3b8';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(xBase, yBase);
        ctx.lineTo(xBase + dw, yBase);
        ctx.moveTo(xBase, yBase);
        ctx.lineTo(xBase, yBase - dh);
        ctx.stroke();

        ctx.fillStyle = '#ffffff';
        ctx.font = '11px "Space Grotesk", -apple-system, sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText('Bước sóng λ (nm)', xBase + dw - 70, yBase + 25);
        ctx.fillText('Cường độ I(λ)', xBase - 40, yBase - dh + 10);

        // Vùng ánh sáng nhìn thấy (380 - 750 nm)
        const vMin = xBase + (380 / 2500) * dw;
        const vMax = xBase + (750 / 2500) * dw;
        const visGrad = ctx.createLinearGradient(vMin, 0, vMax, 0);
        visGrad.addColorStop(0, 'rgba(139, 92, 246, 0.25)');
        visGrad.addColorStop(0.5, 'rgba(34, 197, 94, 0.25)');
        visGrad.addColorStop(1, 'rgba(239, 68, 68, 0.25)');
        ctx.fillStyle = visGrad;
        ctx.fillRect(vMin, yBase - dh, vMax - vMin, dh);

        // Đường cong phổ Planck: I(lambda, T) = (8*pi*h*c / lambda^5) / (exp(hc / lambda k T) - 1)
        // Dùng dạng chuẩn hóa theo đỉnh
        const b = 2.898e-3;
        const lambdaPeak = (b / p.tempK) * 1e9; // nm

        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 2.5;
        ctx.beginPath();

        let peakX = 0, peakY = 0;

        for (let l = 40; l <= 2500; l += 20) {
            const xNorm = l / lambdaPeak;
            // Dạng chuẩn hóa f(x) = (1/x^5) / (exp(4.965 / x) - 1)
            const f = (1 / Math.pow(xNorm, 5)) / (Math.exp(4.9651 / xNorm) - 1);
            const normF = f / 0.0468; // Đỉnh đạt 1.0

            const px = xBase + (l / 2500) * dw;
            const py = yBase - Math.min(dh - 10, normF * (dh - 30));

            if (l === 40) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);

            if (Math.abs(l - lambdaPeak) < 15) {
                peakX = px;
                peakY = py;
            }
        }
        ctx.stroke();

        // Đánh dấu đỉnh bước sóng cực đại lambda_max
        if (peakX > 0) {
            ctx.fillStyle = '#ef4444';
            ctx.beginPath();
            ctx.arc(peakX, peakY, 5, 0, Math.PI * 2);
            ctx.fill();

            ctx.strokeStyle = '#ef4444';
            ctx.setLineDash([3, 3]);
            ctx.beginPath();
            ctx.moveTo(peakX, peakY);
            ctx.lineTo(peakX, yBase);
            ctx.stroke();
            ctx.setLineDash([]);

            ctx.fillStyle = '#ef4444';
            ctx.fillText(`λ_max = ${lambdaPeak.toFixed(0)}nm`, peakX - 25, peakY - 10);
        }
    }

    function loop() {
        draw();
        requestAnimationFrame(loop);
    }
    requestAnimationFrame(loop);

    const tSlider = document.getElementById('bb-temp');
    if (tSlider) tSlider.addEventListener('input', () => { syncLabels(); });

    syncLabels();
})();

// ─────────────────────────────────────────────────────────────
// 27. NGUYÊN TỬ BOHR & TÁN XẠ RUTHERFORD (Bohr & Rutherford)
// ─────────────────────────────────────────────────────────────
(function initBohrRutherford() {
    const canvas = document.getElementById('bohrCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    let mode = 'bohr'; // 'bohr' or 'rutherford'
    let currentN = 3;
    let targetN = 1;
    let electronTheta = 0;
    let emittedPhoton = null;
    let alphaParticles = [];

    function getParams() {
        const nEl = document.getElementById('bohr-level-n');
        return {
            n: nEl ? parseInt(nEl.value) : 3
        };
    }

    function syncLabels() {
        const p = getParams();
        const nVal = document.getElementById('bohr-level-val');
        if (nVal) nVal.textContent = p.n;

        // Bán kính Bohr: r_n = n^2 * r0 (r0 = 0.53 Angstrom)
        const rn = p.n * p.n * 0.53;
        // Mức năng lượng: E_n = -13.6 / n^2 eV
        const En = -13.6 / (p.n * p.n);

        const rEl = document.getElementById('bohr-radius');
        const eEl = document.getElementById('bohr-energy');

        if (rEl) rEl.textContent = rn.toFixed(2) + ' Å';
        if (eEl) eEl.textContent = En.toFixed(2) + ' eV';
    }

    function triggerJump(toN) {
        const p = getParams();
        if (toN >= p.n) return;
        currentN = p.n;
        targetN = toN;

        // Phát ra photon năng lượng deltaE = En - Em
        const deltaE = 13.6 * (1 / (toN * toN) - 1 / (currentN * currentN));
        const lambdaNm = 1240 / deltaE;

        emittedPhoton = {
            x: canvas.width / 2,
            y: canvas.height / 2,
            vx: 180,
            vy: -100,
            lambda: lambdaNm,
            energy: deltaE
        };

        const phEl = document.getElementById('bohr-emitted-photon');
        if (phEl) phEl.textContent = `${deltaE.toFixed(2)} eV (λ = ${lambdaNm.toFixed(0)} nm)`;
    }

    function update(dt) {
        if (mode === 'bohr') {
            electronTheta += (4.0 / currentN) * dt;
            if (emittedPhoton) {
                emittedPhoton.x += emittedPhoton.vx * dt;
                emittedPhoton.y += emittedPhoton.vy * dt;
                if (emittedPhoton.x > canvas.width || emittedPhoton.y < 0) {
                    emittedPhoton = null;
                }
            }
        } else {
            // Cập nhật tán xạ Rutherford hạt alpha
            if (Math.random() < 0.25) {
                alphaParticles.push({
                    x: 20,
                    y: 80 + Math.random() * 200,
                    vx: 240,
                    vy: 0
                });
            }

            const goldX = canvas.width / 2;
            const goldY = canvas.height / 2;

            for (let i = alphaParticles.length - 1; i >= 0; i--) {
                const pt = alphaParticles[i];
                const dx = pt.x - goldX;
                const dy = pt.y - goldY;
                const dist = Math.hypot(dx, dy);

                // Lực đẩy Coulomb giữa hạt alpha (+2e) và hạt nhân vàng (+79e): F ~ 1 / r^2
                if (dist > 8 && dist < 160) {
                    const F = 65000 / (dist * dist);
                    pt.vx += (dx / dist) * F * dt;
                    pt.vy += (dy / dist) * F * dt;
                }

                pt.x += pt.vx * dt;
                pt.y += pt.vy * dt;

                if (pt.x > canvas.width || pt.x < 0 || pt.y > canvas.height || pt.y < 0) {
                    alphaParticles.splice(i, 1);
                }
            }
        }
    }

    function draw() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        const bgGrad = ctx.createLinearGradient(0, 0, 0, canvas.height);
        bgGrad.addColorStop(0, '#040d1a');
        bgGrad.addColorStop(1, '#091e38');
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        const cx = canvas.width / 2;
        const cy = canvas.height / 2;

        if (mode === 'bohr') {
            drawBohrAtom(ctx, cx, cy);
        } else {
            drawRutherfordScattering(ctx, cx, cy);
        }
    }

    function drawBohrAtom(ctx, cx, cy) {
        const p = getParams();

        // 1. Hạt nhân Proton ở tâm (+e)
        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.arc(cx, cy, 10, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 11px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('+e', cx, cy + 4);

        // 2. Các quỹ đạo tròn dừng n = 1, 2, 3, 4, 5
        const baseR = 35;
        for (let n = 1; n <= 5; n++) {
            const r = baseR * Math.sqrt(n) * 1.5;
            ctx.strokeStyle = n === p.n ? '#38bdf8' : 'rgba(148, 163, 184, 0.25)';
            ctx.lineWidth = n === p.n ? 2 : 1;
            ctx.setLineDash([4, 4]);
            ctx.beginPath();
            ctx.arc(cx, cy, r, 0, Math.PI * 2);
            ctx.stroke();
            ctx.setLineDash([]);

            ctx.fillStyle = '#94a3b8';
            ctx.font = '10px "Space Grotesk", -apple-system, sans-serif';
            ctx.fillText(`n=${n}`, cx + r + 4, cy - 4);
        }

        // 3. Electron trên quỹ đạo hiện tại
        const curR = baseR * Math.sqrt(p.n) * 1.5;
        const ex = cx + curR * Math.cos(electronTheta);
        const ey = cy + curR * Math.sin(electronTheta);

        ctx.fillStyle = '#38bdf8';
        ctx.beginPath();
        ctx.arc(ex, ey, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // 4. Photon phát xạ nếu đang chuyển mức
        if (emittedPhoton) {
            ctx.strokeStyle = '#f59e0b';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(emittedPhoton.x, emittedPhoton.y);
            ctx.lineTo(emittedPhoton.x + 20, emittedPhoton.y - 12);
            ctx.stroke();

            ctx.fillStyle = '#f59e0b';
            ctx.font = '11px "Space Grotesk", -apple-system, sans-serif';
            ctx.fillText(`Photon hν (${emittedPhoton.energy.toFixed(1)}eV)`, emittedPhoton.x + 25, emittedPhoton.y - 10);
        }

        ctx.fillStyle = '#ffffff';
        ctx.font = '12px "Space Grotesk", -apple-system, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Mô Hình Nguyên Tử Bohr: Quỹ đạo lượng tử hóa r_n = n²·r₀, Mức năng lượng E_n = -13.6/n² eV', cx, 25);
    }

    function drawRutherfordScattering(ctx, cx, cy) {
        // Hạt nhân Vàng (Gold Nucleus +79e)
        ctx.fillStyle = '#fbbf24';
        ctx.beginPath();
        ctx.arc(cx, cy, 14, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.fillStyle = '#000000';
        ctx.font = 'bold 11px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('+79e', cx, cy + 4);

        // Các hạt alpha bắn tới
        alphaParticles.forEach(pt => {
            ctx.fillStyle = '#ef4444';
            ctx.beginPath();
            ctx.arc(pt.x, pt.y, 4, 0, Math.PI * 2);
            ctx.fill();
        });

        ctx.fillStyle = '#ffffff';
        ctx.font = '12px "Space Grotesk", -apple-system, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Thí Nghiệm Tán Xạ Hạt Alpha (α) Rutherford: Khám phá hạt nhân nguyên tử!', cx, 25);
    }

    let lastTime = performance.now();
    function loop(now) {
        const dt = Math.min((now - lastTime) / 1000, 0.05);
        lastTime = now;
        update(dt);
        draw();
        requestAnimationFrame(loop);
    }
    requestAnimationFrame(loop);

    const nSlider = document.getElementById('bohr-level-n');
    if (nSlider) nSlider.addEventListener('input', () => { syncLabels(); });

    const jumpLymanBtn = document.getElementById('bohr-jump-lyman');
    if (jumpLymanBtn) jumpLymanBtn.addEventListener('click', () => { triggerJump(1); });

    const jumpBalmerBtn = document.getElementById('bohr-jump-balmer');
    if (jumpBalmerBtn) jumpBalmerBtn.addEventListener('click', () => { triggerJump(2); });

    document.querySelectorAll('input[name="bohr-mode"]').forEach(radio => {
        radio.addEventListener('change', () => {
            mode = radio.value;
            syncLabels();
        });
    });

    syncLabels();
})();


