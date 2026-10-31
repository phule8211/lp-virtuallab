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


// ============================================================
// 🎨 PHET SCIENTIFIC DRAWING ENGINE (CORE SKEUOMORPHIC LIBRARY)
// ============================================================

/* ============================================================
   🎨 LP.VirtualLab - PhET Scientific Drawing Engine (Core Library)
   Cung cấp các hàm vẽ 3D/Skeuomorphic siêu thực chuẩn PhET:
   - Đồng hồ đo áp suất, vôn kế, ampe kế analog mặt kính
   - Nhiệt kế thủy ngân có cột dâng hạ và vạch đo Kelvin/Celsius
   - Quả pin 3D hình trụ kim loại với cực đồng và thanh đo điện thế
   - Lò xo xoắn ốc 3D kim loại có bóng đổ và độ co giãn
   - Con lắc đơn có thanh treo và quả nặng phản xạ ánh sáng
   - Bơm khí tay piston với xi lanh và ống dẫn khí
   - Ngọn lửa / Băng tuyết làm nóng/lạnh với hiệu ứng hạt
   - Đèn laser quang học với chùm tia phát sáng
   - Thấu kính thủy tinh lồi/lõm có khúc xạ và phản xạ
   - Biểu đồ thanh năng lượng (Động năng, Thế năng, Nhiệt, Toàn phần)
   - Thước đo milimet / centimet khoa học
   - Bảng HUD Frosted Glass hiển thị dữ liệu thời gian thực
   ============================================================ */

window.PhET = {
    // 1. Phông nền phòng thí nghiệm khoa học chuẩn PhET
    drawLabBackground(ctx, w, h, title = '') {
        const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
        bgGrad.addColorStop(0, '#040d1a');
        bgGrad.addColorStop(0.5, '#07172b');
        bgGrad.addColorStop(1, '#0a223f');
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, w, h);

        // Lưới tọa độ phòng thí nghiệm tinh tế
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.04)';
        ctx.lineWidth = 1;
        for (let x = 20; x < w; x += 35) {
            ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
        }
        for (let y = 20; y < h; y += 35) {
            ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
        }

        if (title) {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
            ctx.font = 'bold 11px "Space Grotesk", sans-serif';
            ctx.textAlign = 'right';
            ctx.fillText(title, w - 16, 22);
        }
    },

    // 2. Thước đo khoảng cách khoa học với vạch chia rõ nét
    drawRuler(ctx, x, y, length, isVertical = false, label = '', unit = 'cm') {
        ctx.save();
        ctx.translate(x, y);
        if (isVertical) ctx.rotate(Math.PI / 2);

        // Thân thước nhựa vàng hoặc kim loại
        const rH = 22;
        const rGrad = ctx.createLinearGradient(0, 0, 0, rH);
        rGrad.addColorStop(0, '#fef08a');
        rGrad.addColorStop(0.5, '#fde047');
        rGrad.addColorStop(1, '#ca8a04');
        ctx.fillStyle = rGrad;
        ctx.beginPath();
        ctx.roundRect(0, 0, length, rH, 3);
        ctx.fill();
        ctx.strokeStyle = '#a16207';
        ctx.lineWidth = 1;
        ctx.stroke();

        // Vạch chia độ
        ctx.fillStyle = '#713f12';
        ctx.font = 'bold 9px monospace';
        ctx.textAlign = 'center';

        const step = 10;
        for (let px = 0; px <= length; px += step) {
            const isMajor = px % 50 === 0;
            const isMedium = px % 25 === 0;
            const tickH = isMajor ? 12 : (isMedium ? 8 : 5);

            ctx.beginPath();
            ctx.moveTo(px, 0);
            ctx.lineTo(px, tickH);
            ctx.stroke();

            if (isMajor && px > 0 && px < length) {
                ctx.fillText((px / 10).toString(), px, rH - 3);
            }
        }

        if (label) {
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 11px "Space Grotesk", sans-serif';
            ctx.textAlign = 'left';
            ctx.fillText(label, 6, -6);
        }
        ctx.restore();
    },

    // 3. Đồng hồ đo kim analog mặt kính tròn (Áp suất, Dòng điện, Điện áp)
    drawAnalogGauge(ctx, x, y, radius, value, min, max, unit, label) {
        ctx.save();
        ctx.translate(x, y);

        // Viền kim loại mạ crom
        const rimGrad = ctx.createLinearGradient(-radius, -radius, radius, radius);
        rimGrad.addColorStop(0, '#94a3b8');
        rimGrad.addColorStop(0.3, '#f8fafc');
        rimGrad.addColorStop(0.7, '#64748b');
        rimGrad.addColorStop(1, '#334155');
        ctx.fillStyle = rimGrad;
        ctx.beginPath();
        ctx.arc(0, 0, radius + 5, 0, Math.PI * 2);
        ctx.fill();

        // Mặt đồng hồ
        ctx.fillStyle = '#f8fafc';
        ctx.beginPath();
        ctx.arc(0, 0, radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#cbd5e1';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Vạch chia mặt số (Góc từ -135° đến +135°)
        const startAngle = -Math.PI * 0.75;
        const endAngle = Math.PI * 0.75;
        const totalAngle = endAngle - startAngle;

        ctx.strokeStyle = '#475569';
        ctx.lineWidth = 1.2;
        for (let i = 0; i <= 10; i++) {
            const a = startAngle + (i / 10) * totalAngle;
            const isMajor = i % 2 === 0;
            const len = isMajor ? 8 : 4;

            ctx.beginPath();
            ctx.moveTo(Math.cos(a) * (radius - len - 2), Math.sin(a) * (radius - len - 2));
            ctx.lineTo(Math.cos(a) * (radius - 2), Math.sin(a) * (radius - 2));
            ctx.stroke();
        }

        // Tên đơn vị và nhãn
        ctx.fillStyle = '#0f172a';
        ctx.font = 'bold 10px "Space Grotesk", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(unit, 0, radius * 0.45);
        if (label) {
            ctx.font = '9px "Space Grotesk", sans-serif';
            ctx.fillStyle = '#64748b';
            ctx.fillText(label, 0, -radius * 0.35);
        }

        // Kim chỉ thị màu đỏ phản xạ
        const normVal = Math.max(0, Math.min(1, (value - min) / (max - min)));
        const needleAngle = startAngle + normVal * totalAngle;

        ctx.save();
        ctx.rotate(needleAngle);
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-radius * 0.2, 0);
        ctx.lineTo(radius * 0.82, 0);
        ctx.stroke();

        // Mũi kim nhọn
        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.moveTo(radius * 0.82, 0);
        ctx.lineTo(radius * 0.72, -2.5);
        ctx.lineTo(radius * 0.72, 2.5);
        ctx.closePath();
        ctx.fill();
        ctx.restore();

        // Trục kim tròn trung tâm
        ctx.fillStyle = '#1e293b';
        ctx.beginPath();
        ctx.arc(0, 0, 4.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#f8fafc';
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.restore();
    },

    // 4. Nhiệt kế thủy ngân khoa học (PhET Thermometer)
    drawThermometer(ctx, x, y, width, height, tempK, minK = 100, maxK = 1000) {
        ctx.save();
        ctx.translate(x, y);

        const bulbR = width * 1.3;
        const stemW = width;
        const stemH = height - bulbR;

        // Vỏ thủy tinh trong suốt
        ctx.fillStyle = 'rgba(241, 245, 249, 0.25)';
        ctx.beginPath();
        ctx.roundRect(-stemW / 2, 0, stemW, stemH, stemW / 2);
        ctx.fill();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Cột chất lỏng đỏ dâng hạ theo nhiệt độ
        const normT = Math.max(0.05, Math.min(1, (tempK - minK) / (maxK - minK)));
        const fillH = stemH * normT;

        const liquidGrad = ctx.createLinearGradient(-stemW / 2, 0, stemW / 2, 0);
        liquidGrad.addColorStop(0, '#f87171');
        liquidGrad.addColorStop(0.5, '#ef4444');
        liquidGrad.addColorStop(1, '#b91c1c');
        ctx.fillStyle = liquidGrad;
        ctx.fillRect(-stemW / 2 + 1.5, stemH - fillH, stemW - 3, fillH);

        // Bầu chứa thủy ngân ở đáy
        ctx.beginPath();
        ctx.arc(0, stemH + bulbR * 0.4, bulbR, 0, Math.PI * 2);
        ctx.fillStyle = liquidGrad;
        ctx.fill();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Điểm sáng phản chiếu trên bầu thủy tinh
        ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.beginPath();
        ctx.arc(-bulbR * 0.35, stemH + bulbR * 0.15, bulbR * 0.35, 0, Math.PI * 2);
        ctx.fill();

        // Vạch chia độ bên cạnh
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.lineWidth = 1;
        for (let i = 0; i <= 8; i++) {
            const ty = stemH - (i / 8) * stemH;
            ctx.beginPath();
            ctx.moveTo(stemW / 2 + 2, ty);
            ctx.lineTo(stemW / 2 + (i % 2 === 0 ? 8 : 4), ty);
            ctx.stroke();
        }

        // Nhãn nhiệt độ hiển thị số to rõ
        ctx.fillStyle = '#fef08a';
        ctx.font = 'bold 12px "Space Grotesk", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(tempK.toFixed(0) + ' K', 0, -10);
        ctx.fillStyle = '#94a3b8';
        ctx.font = '10px "Space Grotesk", sans-serif';
        ctx.fillText('(' + (tempK - 273.15).toFixed(0) + '°C)', 0, -24);

        ctx.restore();
    },

    // 5. Nguồn nhiệt / Làm lạnh (PhET Fire/Ice Burner)
    drawHeaterCooler(ctx, x, y, width, heatState) {
        // heatState: > 0 = ngọn lửa, < 0 = băng giá, = 0 = tắt
        ctx.save();
        ctx.translate(x, y);

        // Bệ đỡ bếp lò
        ctx.fillStyle = '#334155';
        ctx.beginPath();
        ctx.roundRect(-width / 2, 0, width, 18, 4);
        ctx.fill();
        ctx.strokeStyle = '#64748b';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        if (heatState > 0.05) {
            // Ngọn lửa bùng cháy rực rỡ
            const flameH = 35 * Math.min(1.5, heatState);
            const numFlames = 5;
            for (let i = 0; i < numFlames; i++) {
                const fx = -width * 0.35 + (i / (numFlames - 1)) * width * 0.7;
                const fh = flameH * (0.7 + 0.3 * Math.sin(Date.now() * 0.015 + i));

                const fGrad = ctx.createRadialGradient(fx, -fh * 0.5, 2, fx, -fh * 0.3, fh * 0.8);
                fGrad.addColorStop(0, '#fef08a');
                fGrad.addColorStop(0.3, '#f59e0b');
                fGrad.addColorStop(0.7, '#ef4444');
                fGrad.addColorStop(1, 'rgba(239, 68, 68, 0)');

                ctx.fillStyle = fGrad;
                ctx.beginPath();
                ctx.moveTo(fx - 10, 0);
                ctx.quadraticCurveTo(fx - 12, -fh * 0.6, fx, -fh);
                ctx.quadraticCurveTo(fx + 12, -fh * 0.6, fx + 10, 0);
                ctx.closePath();
                ctx.fill();
            }
        } else if (heatState < -0.05) {
            // Khối băng tuyết lạnh giá
            const iceCount = 6;
            ctx.fillStyle = '#38bdf8';
            ctx.strokeStyle = '#bae6fd';
            ctx.lineWidth = 1.5;
            for (let i = 0; i < iceCount; i++) {
                const ix = -width * 0.38 + (i / (iceCount - 1)) * width * 0.76;
                const ih = 18 * Math.abs(heatState);
                ctx.beginPath();
                ctx.moveTo(ix, 0);
                ctx.lineTo(ix - 7, -ih * 0.6);
                ctx.lineTo(ix, -ih);
                ctx.lineTo(ix + 7, -ih * 0.6);
                ctx.closePath();
                ctx.fill();
                ctx.stroke();
            }
        }

        ctx.restore();
    },

    // 6. Lò xo xoắn ốc kim loại 3D (PhET Spring)
    drawCoiledSpring(ctx, x1, y1, x2, y2, coils = 14, radius = 16, color = '#94a3b8') {
        ctx.save();
        const dx = x2 - x1;
        const dy = y2 - y1;
        const dist = Math.hypot(dx, dy);
        const angle = Math.atan2(dy, dx);

        ctx.translate(x1, y1);
        ctx.rotate(angle);

        ctx.strokeStyle = color;
        ctx.lineWidth = 3.5;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        // Đoạn thẳng nối đầu lò xo
        const leadLen = 15;
        const coilSpan = Math.max(20, dist - leadLen * 2);

        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(leadLen, 0);

        // Các vòng xoắn lò xo hình sin/zig-zag bo góc
        for (let i = 0; i < coils; i++) {
            const stepX = coilSpan / coils;
            const cx = leadLen + i * stepX;
            const sign = i % 2 === 0 ? 1 : -1;

            ctx.bezierCurveTo(
                cx + stepX * 0.25, sign * radius,
                cx + stepX * 0.75, sign * radius,
                cx + stepX, 0
            );
        }

        ctx.lineTo(dist, 0);
        ctx.stroke();

        // Ánh sáng phản xạ kim loại nổi (Highlight line)
        ctx.strokeStyle = '#f8fafc';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(leadLen, 0);
        for (let i = 0; i < coils; i++) {
            const stepX = coilSpan / coils;
            const cx = leadLen + i * stepX;
            const sign = i % 2 === 0 ? 1 : -1;
            ctx.bezierCurveTo(
                cx + stepX * 0.25, sign * (radius - 3),
                cx + stepX * 0.75, sign * (radius - 3),
                cx + stepX, 0
            );
        }
        ctx.lineTo(dist, 0);
        ctx.stroke();

        ctx.restore();
    },

    // 7. Biểu đồ thanh năng lượng khoa học chuẩn PhET (Energy Bar Chart)
    drawEnergyBars(ctx, x, y, width, height, energies) {
        // energies: [ { label: 'Động năng', val: Ek, color: '#22c55e' }, ... ]
        ctx.save();
        ctx.translate(x, y);

        // Hộp chứa biểu đồ kính mờ Frosted Glass
        ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.35)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.roundRect(0, 0, width, height, 8);
        ctx.fill();
        ctx.stroke();

        // Tiêu đề
        ctx.fillStyle = '#38bdf8';
        ctx.font = 'bold 11px "Space Grotesk", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('⚡ NĂNG LƯỢNG HỆ THỐNG', width / 2, 18);

        // Tìm giá trị max để scale cột
        let maxVal = 10;
        energies.forEach(e => { if (Math.abs(e.val) > maxVal) maxVal = Math.abs(e.val); });

        const barAreaH = height - 52;
        const barW = Math.max(14, (width - 24) / energies.length - 8);

        energies.forEach((item, idx) => {
            const bx = 16 + idx * (barW + 8);
            const normH = Math.min(barAreaH, (Math.max(0, item.val) / maxVal) * barAreaH);
            const by = height - 26 - normH;

            // Cột năng lượng phát sáng
            const colGrad = ctx.createLinearGradient(bx, by, bx + barW, by);
            colGrad.addColorStop(0, item.color);
            colGrad.addColorStop(1, item.color + 'aa');
            ctx.fillStyle = colGrad;
            ctx.beginPath();
            ctx.roundRect(bx, by, barW, normH, [3, 3, 0, 0]);
            ctx.fill();

            // Viền sáng
            ctx.strokeStyle = item.color;
            ctx.lineWidth = 1;
            ctx.stroke();

            // Nhãn viết tắt (K, P, Th, Tot)
            ctx.fillStyle = '#cbd5e1';
            ctx.font = 'bold 9.5px "Space Grotesk", sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(item.shortLabel || item.label.slice(0, 3), bx + barW / 2, height - 10);
        });

        ctx.restore();
    },

    // 8. Vector lực / vận tốc chuẩn mực với mũi tên nhọn và nhãn
    drawVector(ctx, fromX, fromY, dx, dy, color, label = '', lineWidth = 2.5) {
        const len = Math.hypot(dx, dy);
        if (len < 1) return;

        ctx.save();
        ctx.strokeStyle = color;
        ctx.fillStyle = color;
        ctx.lineWidth = lineWidth;
        ctx.shadowColor = color;
        ctx.shadowBlur = 6;

        const toX = fromX + dx;
        const toY = fromY + dy;
        const angle = Math.atan2(dy, dx);
        const headlen = Math.min(12, Math.max(7, len * 0.25));

        // Đường thân vector
        ctx.beginPath();
        ctx.moveTo(fromX, fromY);
        ctx.lineTo(toX, toY);
        ctx.stroke();

        // Mũi tên nhọn chuẩn
        ctx.beginPath();
        ctx.moveTo(toX, toY);
        ctx.lineTo(
            toX - headlen * Math.cos(angle - Math.PI / 6),
            toY - headlen * Math.sin(angle - Math.PI / 6)
        );
        ctx.lineTo(
            toX - headlen * Math.cos(angle + Math.PI / 6),
            toY - headlen * Math.sin(angle + Math.PI / 6)
        );
        ctx.closePath();
        ctx.fill();

        // Nhãn vector
        if (label) {
            ctx.font = 'bold 11px "Space Grotesk", sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            const textOffset = 14;
            const tx = toX + Math.cos(angle) * textOffset;
            const ty = toY + Math.sin(angle) * textOffset;
            ctx.fillText(label, tx, ty);
        }

        ctx.restore();
    },

    // 9. Bảng HUD kính mờ đa năng (Heads-Up Display)
    drawHUD(ctx, x, y, title, items, w = 210) {
        ctx.save();
        const rowH = 18;
        const h = 32 + items.length * rowH;

        ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.4)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.roundRect(x, y, w, h, 8);
        ctx.fill();
        ctx.stroke();

        ctx.font = 'bold 11.5px "Space Grotesk", sans-serif';
        ctx.fillStyle = '#38bdf8';
        ctx.textAlign = 'left';
        ctx.fillText(title, x + 10, y + 18);

        ctx.font = '11px "Space Grotesk", monospace';
        items.forEach((item, idx) => {
            const ry = y + 36 + idx * rowH;
            ctx.fillStyle = '#94a3b8';
            ctx.fillText(item.label + ':', x + 10, ry);
            ctx.fillStyle = item.color || '#f8fafc';
            ctx.textAlign = 'right';
            ctx.fillText(item.val, x + w - 10, ry);
            ctx.textAlign = 'left';
        });

        ctx.restore();
    }
};




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


// ============================================================
// 🎨 PHET SCIENTIFIC DRAWING ENGINE (CORE SKEUOMORPHIC LIBRARY)
// ============================================================

/* ============================================================
   🎨 LP.VirtualLab - PhET Scientific Drawing Engine (Core Library)
   Cung cấp các hàm vẽ 3D/Skeuomorphic siêu thực chuẩn PhET:
   - Đồng hồ đo áp suất, vôn kế, ampe kế analog mặt kính
   - Nhiệt kế thủy ngân có cột dâng hạ và vạch đo Kelvin/Celsius
   - Quả pin 3D hình trụ kim loại với cực đồng và thanh đo điện thế
   - Lò xo xoắn ốc 3D kim loại có bóng đổ và độ co giãn
   - Con lắc đơn có thanh treo và quả nặng phản xạ ánh sáng
   - Bơm khí tay piston với xi lanh và ống dẫn khí
   - Ngọn lửa / Băng tuyết làm nóng/lạnh với hiệu ứng hạt
   - Đèn laser quang học với chùm tia phát sáng
   - Thấu kính thủy tinh lồi/lõm có khúc xạ và phản xạ
   - Biểu đồ thanh năng lượng (Động năng, Thế năng, Nhiệt, Toàn phần)
   - Thước đo milimet / centimet khoa học
   - Bảng HUD Frosted Glass hiển thị dữ liệu thời gian thực
   ============================================================ */

window.PhET = {
    // 1. Phông nền phòng thí nghiệm khoa học chuẩn PhET
    drawLabBackground(ctx, w, h, title = '') {
        const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
        bgGrad.addColorStop(0, '#040d1a');
        bgGrad.addColorStop(0.5, '#07172b');
        bgGrad.addColorStop(1, '#0a223f');
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, w, h);

        // Lưới tọa độ phòng thí nghiệm tinh tế
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.04)';
        ctx.lineWidth = 1;
        for (let x = 20; x < w; x += 35) {
            ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
        }
        for (let y = 20; y < h; y += 35) {
            ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
        }

        if (title) {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
            ctx.font = 'bold 11px "Space Grotesk", sans-serif';
            ctx.textAlign = 'right';
            ctx.fillText(title, w - 16, 22);
        }
    },

    // 2. Thước đo khoảng cách khoa học với vạch chia rõ nét
    drawRuler(ctx, x, y, length, isVertical = false, label = '', unit = 'cm') {
        ctx.save();
        ctx.translate(x, y);
        if (isVertical) ctx.rotate(Math.PI / 2);

        // Thân thước nhựa vàng hoặc kim loại
        const rH = 22;
        const rGrad = ctx.createLinearGradient(0, 0, 0, rH);
        rGrad.addColorStop(0, '#fef08a');
        rGrad.addColorStop(0.5, '#fde047');
        rGrad.addColorStop(1, '#ca8a04');
        ctx.fillStyle = rGrad;
        ctx.beginPath();
        ctx.roundRect(0, 0, length, rH, 3);
        ctx.fill();
        ctx.strokeStyle = '#a16207';
        ctx.lineWidth = 1;
        ctx.stroke();

        // Vạch chia độ
        ctx.fillStyle = '#713f12';
        ctx.font = 'bold 9px monospace';
        ctx.textAlign = 'center';

        const step = 10;
        for (let px = 0; px <= length; px += step) {
            const isMajor = px % 50 === 0;
            const isMedium = px % 25 === 0;
            const tickH = isMajor ? 12 : (isMedium ? 8 : 5);

            ctx.beginPath();
            ctx.moveTo(px, 0);
            ctx.lineTo(px, tickH);
            ctx.stroke();

            if (isMajor && px > 0 && px < length) {
                ctx.fillText((px / 10).toString(), px, rH - 3);
            }
        }

        if (label) {
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 11px "Space Grotesk", sans-serif';
            ctx.textAlign = 'left';
            ctx.fillText(label, 6, -6);
        }
        ctx.restore();
    },

    // 3. Đồng hồ đo kim analog mặt kính tròn (Áp suất, Dòng điện, Điện áp)
    drawAnalogGauge(ctx, x, y, radius, value, min, max, unit, label) {
        ctx.save();
        ctx.translate(x, y);

        // Viền kim loại mạ crom
        const rimGrad = ctx.createLinearGradient(-radius, -radius, radius, radius);
        rimGrad.addColorStop(0, '#94a3b8');
        rimGrad.addColorStop(0.3, '#f8fafc');
        rimGrad.addColorStop(0.7, '#64748b');
        rimGrad.addColorStop(1, '#334155');
        ctx.fillStyle = rimGrad;
        ctx.beginPath();
        ctx.arc(0, 0, radius + 5, 0, Math.PI * 2);
        ctx.fill();

        // Mặt đồng hồ
        ctx.fillStyle = '#f8fafc';
        ctx.beginPath();
        ctx.arc(0, 0, radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#cbd5e1';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Vạch chia mặt số (Góc từ -135° đến +135°)
        const startAngle = -Math.PI * 0.75;
        const endAngle = Math.PI * 0.75;
        const totalAngle = endAngle - startAngle;

        ctx.strokeStyle = '#475569';
        ctx.lineWidth = 1.2;
        for (let i = 0; i <= 10; i++) {
            const a = startAngle + (i / 10) * totalAngle;
            const isMajor = i % 2 === 0;
            const len = isMajor ? 8 : 4;

            ctx.beginPath();
            ctx.moveTo(Math.cos(a) * (radius - len - 2), Math.sin(a) * (radius - len - 2));
            ctx.lineTo(Math.cos(a) * (radius - 2), Math.sin(a) * (radius - 2));
            ctx.stroke();
        }

        // Tên đơn vị và nhãn
        ctx.fillStyle = '#0f172a';
        ctx.font = 'bold 10px "Space Grotesk", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(unit, 0, radius * 0.45);
        if (label) {
            ctx.font = '9px "Space Grotesk", sans-serif';
            ctx.fillStyle = '#64748b';
            ctx.fillText(label, 0, -radius * 0.35);
        }

        // Kim chỉ thị màu đỏ phản xạ
        const normVal = Math.max(0, Math.min(1, (value - min) / (max - min)));
        const needleAngle = startAngle + normVal * totalAngle;

        ctx.save();
        ctx.rotate(needleAngle);
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-radius * 0.2, 0);
        ctx.lineTo(radius * 0.82, 0);
        ctx.stroke();

        // Mũi kim nhọn
        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.moveTo(radius * 0.82, 0);
        ctx.lineTo(radius * 0.72, -2.5);
        ctx.lineTo(radius * 0.72, 2.5);
        ctx.closePath();
        ctx.fill();
        ctx.restore();

        // Trục kim tròn trung tâm
        ctx.fillStyle = '#1e293b';
        ctx.beginPath();
        ctx.arc(0, 0, 4.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#f8fafc';
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.restore();
    },

    // 4. Nhiệt kế thủy ngân khoa học (PhET Thermometer)
    drawThermometer(ctx, x, y, width, height, tempK, minK = 100, maxK = 1000) {
        ctx.save();
        ctx.translate(x, y);

        const bulbR = width * 1.3;
        const stemW = width;
        const stemH = height - bulbR;

        // Vỏ thủy tinh trong suốt
        ctx.fillStyle = 'rgba(241, 245, 249, 0.25)';
        ctx.beginPath();
        ctx.roundRect(-stemW / 2, 0, stemW, stemH, stemW / 2);
        ctx.fill();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Cột chất lỏng đỏ dâng hạ theo nhiệt độ
        const normT = Math.max(0.05, Math.min(1, (tempK - minK) / (maxK - minK)));
        const fillH = stemH * normT;

        const liquidGrad = ctx.createLinearGradient(-stemW / 2, 0, stemW / 2, 0);
        liquidGrad.addColorStop(0, '#f87171');
        liquidGrad.addColorStop(0.5, '#ef4444');
        liquidGrad.addColorStop(1, '#b91c1c');
        ctx.fillStyle = liquidGrad;
        ctx.fillRect(-stemW / 2 + 1.5, stemH - fillH, stemW - 3, fillH);

        // Bầu chứa thủy ngân ở đáy
        ctx.beginPath();
        ctx.arc(0, stemH + bulbR * 0.4, bulbR, 0, Math.PI * 2);
        ctx.fillStyle = liquidGrad;
        ctx.fill();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Điểm sáng phản chiếu trên bầu thủy tinh
        ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.beginPath();
        ctx.arc(-bulbR * 0.35, stemH + bulbR * 0.15, bulbR * 0.35, 0, Math.PI * 2);
        ctx.fill();

        // Vạch chia độ bên cạnh
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.lineWidth = 1;
        for (let i = 0; i <= 8; i++) {
            const ty = stemH - (i / 8) * stemH;
            ctx.beginPath();
            ctx.moveTo(stemW / 2 + 2, ty);
            ctx.lineTo(stemW / 2 + (i % 2 === 0 ? 8 : 4), ty);
            ctx.stroke();
        }

        // Nhãn nhiệt độ hiển thị số to rõ
        ctx.fillStyle = '#fef08a';
        ctx.font = 'bold 12px "Space Grotesk", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(tempK.toFixed(0) + ' K', 0, -10);
        ctx.fillStyle = '#94a3b8';
        ctx.font = '10px "Space Grotesk", sans-serif';
        ctx.fillText('(' + (tempK - 273.15).toFixed(0) + '°C)', 0, -24);

        ctx.restore();
    },

    // 5. Nguồn nhiệt / Làm lạnh (PhET Fire/Ice Burner)
    drawHeaterCooler(ctx, x, y, width, heatState) {
        // heatState: > 0 = ngọn lửa, < 0 = băng giá, = 0 = tắt
        ctx.save();
        ctx.translate(x, y);

        // Bệ đỡ bếp lò
        ctx.fillStyle = '#334155';
        ctx.beginPath();
        ctx.roundRect(-width / 2, 0, width, 18, 4);
        ctx.fill();
        ctx.strokeStyle = '#64748b';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        if (heatState > 0.05) {
            // Ngọn lửa bùng cháy rực rỡ
            const flameH = 35 * Math.min(1.5, heatState);
            const numFlames = 5;
            for (let i = 0; i < numFlames; i++) {
                const fx = -width * 0.35 + (i / (numFlames - 1)) * width * 0.7;
                const fh = flameH * (0.7 + 0.3 * Math.sin(Date.now() * 0.015 + i));

                const fGrad = ctx.createRadialGradient(fx, -fh * 0.5, 2, fx, -fh * 0.3, fh * 0.8);
                fGrad.addColorStop(0, '#fef08a');
                fGrad.addColorStop(0.3, '#f59e0b');
                fGrad.addColorStop(0.7, '#ef4444');
                fGrad.addColorStop(1, 'rgba(239, 68, 68, 0)');

                ctx.fillStyle = fGrad;
                ctx.beginPath();
                ctx.moveTo(fx - 10, 0);
                ctx.quadraticCurveTo(fx - 12, -fh * 0.6, fx, -fh);
                ctx.quadraticCurveTo(fx + 12, -fh * 0.6, fx + 10, 0);
                ctx.closePath();
                ctx.fill();
            }
        } else if (heatState < -0.05) {
            // Khối băng tuyết lạnh giá
            const iceCount = 6;
            ctx.fillStyle = '#38bdf8';
            ctx.strokeStyle = '#bae6fd';
            ctx.lineWidth = 1.5;
            for (let i = 0; i < iceCount; i++) {
                const ix = -width * 0.38 + (i / (iceCount - 1)) * width * 0.76;
                const ih = 18 * Math.abs(heatState);
                ctx.beginPath();
                ctx.moveTo(ix, 0);
                ctx.lineTo(ix - 7, -ih * 0.6);
                ctx.lineTo(ix, -ih);
                ctx.lineTo(ix + 7, -ih * 0.6);
                ctx.closePath();
                ctx.fill();
                ctx.stroke();
            }
        }

        ctx.restore();
    },

    // 6. Lò xo xoắn ốc kim loại 3D (PhET Spring)
    drawCoiledSpring(ctx, x1, y1, x2, y2, coils = 14, radius = 16, color = '#94a3b8') {
        ctx.save();
        const dx = x2 - x1;
        const dy = y2 - y1;
        const dist = Math.hypot(dx, dy);
        const angle = Math.atan2(dy, dx);

        ctx.translate(x1, y1);
        ctx.rotate(angle);

        ctx.strokeStyle = color;
        ctx.lineWidth = 3.5;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        // Đoạn thẳng nối đầu lò xo
        const leadLen = 15;
        const coilSpan = Math.max(20, dist - leadLen * 2);

        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(leadLen, 0);

        // Các vòng xoắn lò xo hình sin/zig-zag bo góc
        for (let i = 0; i < coils; i++) {
            const stepX = coilSpan / coils;
            const cx = leadLen + i * stepX;
            const sign = i % 2 === 0 ? 1 : -1;

            ctx.bezierCurveTo(
                cx + stepX * 0.25, sign * radius,
                cx + stepX * 0.75, sign * radius,
                cx + stepX, 0
            );
        }

        ctx.lineTo(dist, 0);
        ctx.stroke();

        // Ánh sáng phản xạ kim loại nổi (Highlight line)
        ctx.strokeStyle = '#f8fafc';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(leadLen, 0);
        for (let i = 0; i < coils; i++) {
            const stepX = coilSpan / coils;
            const cx = leadLen + i * stepX;
            const sign = i % 2 === 0 ? 1 : -1;
            ctx.bezierCurveTo(
                cx + stepX * 0.25, sign * (radius - 3),
                cx + stepX * 0.75, sign * (radius - 3),
                cx + stepX, 0
            );
        }
        ctx.lineTo(dist, 0);
        ctx.stroke();

        ctx.restore();
    },

    // 7. Biểu đồ thanh năng lượng khoa học chuẩn PhET (Energy Bar Chart)
    drawEnergyBars(ctx, x, y, width, height, energies) {
        // energies: [ { label: 'Động năng', val: Ek, color: '#22c55e' }, ... ]
        ctx.save();
        ctx.translate(x, y);

        // Hộp chứa biểu đồ kính mờ Frosted Glass
        ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.35)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.roundRect(0, 0, width, height, 8);
        ctx.fill();
        ctx.stroke();

        // Tiêu đề
        ctx.fillStyle = '#38bdf8';
        ctx.font = 'bold 11px "Space Grotesk", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('⚡ NĂNG LƯỢNG HỆ THỐNG', width / 2, 18);

        // Tìm giá trị max để scale cột
        let maxVal = 10;
        energies.forEach(e => { if (Math.abs(e.val) > maxVal) maxVal = Math.abs(e.val); });

        const barAreaH = height - 52;
        const barW = Math.max(14, (width - 24) / energies.length - 8);

        energies.forEach((item, idx) => {
            const bx = 16 + idx * (barW + 8);
            const normH = Math.min(barAreaH, (Math.max(0, item.val) / maxVal) * barAreaH);
            const by = height - 26 - normH;

            // Cột năng lượng phát sáng
            const colGrad = ctx.createLinearGradient(bx, by, bx + barW, by);
            colGrad.addColorStop(0, item.color);
            colGrad.addColorStop(1, item.color + 'aa');
            ctx.fillStyle = colGrad;
            ctx.beginPath();
            ctx.roundRect(bx, by, barW, normH, [3, 3, 0, 0]);
            ctx.fill();

            // Viền sáng
            ctx.strokeStyle = item.color;
            ctx.lineWidth = 1;
            ctx.stroke();

            // Nhãn viết tắt (K, P, Th, Tot)
            ctx.fillStyle = '#cbd5e1';
            ctx.font = 'bold 9.5px "Space Grotesk", sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(item.shortLabel || item.label.slice(0, 3), bx + barW / 2, height - 10);
        });

        ctx.restore();
    },

    // 8. Vector lực / vận tốc chuẩn mực với mũi tên nhọn và nhãn
    drawVector(ctx, fromX, fromY, dx, dy, color, label = '', lineWidth = 2.5) {
        const len = Math.hypot(dx, dy);
        if (len < 1) return;

        ctx.save();
        ctx.strokeStyle = color;
        ctx.fillStyle = color;
        ctx.lineWidth = lineWidth;
        ctx.shadowColor = color;
        ctx.shadowBlur = 6;

        const toX = fromX + dx;
        const toY = fromY + dy;
        const angle = Math.atan2(dy, dx);
        const headlen = Math.min(12, Math.max(7, len * 0.25));

        // Đường thân vector
        ctx.beginPath();
        ctx.moveTo(fromX, fromY);
        ctx.lineTo(toX, toY);
        ctx.stroke();

        // Mũi tên nhọn chuẩn
        ctx.beginPath();
        ctx.moveTo(toX, toY);
        ctx.lineTo(
            toX - headlen * Math.cos(angle - Math.PI / 6),
            toY - headlen * Math.sin(angle - Math.PI / 6)
        );
        ctx.lineTo(
            toX - headlen * Math.cos(angle + Math.PI / 6),
            toY - headlen * Math.sin(angle + Math.PI / 6)
        );
        ctx.closePath();
        ctx.fill();

        // Nhãn vector
        if (label) {
            ctx.font = 'bold 11px "Space Grotesk", sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            const textOffset = 14;
            const tx = toX + Math.cos(angle) * textOffset;
            const ty = toY + Math.sin(angle) * textOffset;
            ctx.fillText(label, tx, ty);
        }

        ctx.restore();
    },

    // 9. Bảng HUD kính mờ đa năng (Heads-Up Display)
    drawHUD(ctx, x, y, title, items, w = 210) {
        ctx.save();
        const rowH = 18;
        const h = 32 + items.length * rowH;

        ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.4)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.roundRect(x, y, w, h, 8);
        ctx.fill();
        ctx.stroke();

        ctx.font = 'bold 11.5px "Space Grotesk", sans-serif';
        ctx.fillStyle = '#38bdf8';
        ctx.textAlign = 'left';
        ctx.fillText(title, x + 10, y + 18);

        ctx.font = '11px "Space Grotesk", monospace';
        items.forEach((item, idx) => {
            const ry = y + 36 + idx * rowH;
            ctx.fillStyle = '#94a3b8';
            ctx.fillText(item.label + ':', x + 10, ry);
            ctx.fillStyle = item.color || '#f8fafc';
            ctx.textAlign = 'right';
            ctx.fillText(item.val, x + w - 10, ry);
            ctx.textAlign = 'left';
        });

        ctx.restore();
    }
};




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


// ============================================================
// 🎨 PHET SCIENTIFIC DRAWING ENGINE (CORE SKEUOMORPHIC LIBRARY)
// ============================================================

/* ============================================================
   🎨 LP.VirtualLab - PhET Scientific Drawing Engine (Core Library)
   Cung cấp các hàm vẽ 3D/Skeuomorphic siêu thực chuẩn PhET:
   - Đồng hồ đo áp suất, vôn kế, ampe kế analog mặt kính
   - Nhiệt kế thủy ngân có cột dâng hạ và vạch đo Kelvin/Celsius
   - Quả pin 3D hình trụ kim loại với cực đồng và thanh đo điện thế
   - Lò xo xoắn ốc 3D kim loại có bóng đổ và độ co giãn
   - Con lắc đơn có thanh treo và quả nặng phản xạ ánh sáng
   - Bơm khí tay piston với xi lanh và ống dẫn khí
   - Ngọn lửa / Băng tuyết làm nóng/lạnh với hiệu ứng hạt
   - Đèn laser quang học với chùm tia phát sáng
   - Thấu kính thủy tinh lồi/lõm có khúc xạ và phản xạ
   - Biểu đồ thanh năng lượng (Động năng, Thế năng, Nhiệt, Toàn phần)
   - Thước đo milimet / centimet khoa học
   - Bảng HUD Frosted Glass hiển thị dữ liệu thời gian thực
   ============================================================ */

window.PhET = {
    // 1. Phông nền phòng thí nghiệm khoa học chuẩn PhET
    drawLabBackground(ctx, w, h, title = '') {
        const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
        bgGrad.addColorStop(0, '#040d1a');
        bgGrad.addColorStop(0.5, '#07172b');
        bgGrad.addColorStop(1, '#0a223f');
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, w, h);

        // Lưới tọa độ phòng thí nghiệm tinh tế
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.04)';
        ctx.lineWidth = 1;
        for (let x = 20; x < w; x += 35) {
            ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
        }
        for (let y = 20; y < h; y += 35) {
            ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
        }

        if (title) {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
            ctx.font = 'bold 11px "Space Grotesk", sans-serif';
            ctx.textAlign = 'right';
            ctx.fillText(title, w - 16, 22);
        }
    },

    // 2. Thước đo khoảng cách khoa học với vạch chia rõ nét
    drawRuler(ctx, x, y, length, isVertical = false, label = '', unit = 'cm') {
        ctx.save();
        ctx.translate(x, y);
        if (isVertical) ctx.rotate(Math.PI / 2);

        // Thân thước nhựa vàng hoặc kim loại
        const rH = 22;
        const rGrad = ctx.createLinearGradient(0, 0, 0, rH);
        rGrad.addColorStop(0, '#fef08a');
        rGrad.addColorStop(0.5, '#fde047');
        rGrad.addColorStop(1, '#ca8a04');
        ctx.fillStyle = rGrad;
        ctx.beginPath();
        ctx.roundRect(0, 0, length, rH, 3);
        ctx.fill();
        ctx.strokeStyle = '#a16207';
        ctx.lineWidth = 1;
        ctx.stroke();

        // Vạch chia độ
        ctx.fillStyle = '#713f12';
        ctx.font = 'bold 9px monospace';
        ctx.textAlign = 'center';

        const step = 10;
        for (let px = 0; px <= length; px += step) {
            const isMajor = px % 50 === 0;
            const isMedium = px % 25 === 0;
            const tickH = isMajor ? 12 : (isMedium ? 8 : 5);

            ctx.beginPath();
            ctx.moveTo(px, 0);
            ctx.lineTo(px, tickH);
            ctx.stroke();

            if (isMajor && px > 0 && px < length) {
                ctx.fillText((px / 10).toString(), px, rH - 3);
            }
        }

        if (label) {
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 11px "Space Grotesk", sans-serif';
            ctx.textAlign = 'left';
            ctx.fillText(label, 6, -6);
        }
        ctx.restore();
    },

    // 3. Đồng hồ đo kim analog mặt kính tròn (Áp suất, Dòng điện, Điện áp)
    drawAnalogGauge(ctx, x, y, radius, value, min, max, unit, label) {
        ctx.save();
        ctx.translate(x, y);

        // Viền kim loại mạ crom
        const rimGrad = ctx.createLinearGradient(-radius, -radius, radius, radius);
        rimGrad.addColorStop(0, '#94a3b8');
        rimGrad.addColorStop(0.3, '#f8fafc');
        rimGrad.addColorStop(0.7, '#64748b');
        rimGrad.addColorStop(1, '#334155');
        ctx.fillStyle = rimGrad;
        ctx.beginPath();
        ctx.arc(0, 0, radius + 5, 0, Math.PI * 2);
        ctx.fill();

        // Mặt đồng hồ
        ctx.fillStyle = '#f8fafc';
        ctx.beginPath();
        ctx.arc(0, 0, radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#cbd5e1';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Vạch chia mặt số (Góc từ -135° đến +135°)
        const startAngle = -Math.PI * 0.75;
        const endAngle = Math.PI * 0.75;
        const totalAngle = endAngle - startAngle;

        ctx.strokeStyle = '#475569';
        ctx.lineWidth = 1.2;
        for (let i = 0; i <= 10; i++) {
            const a = startAngle + (i / 10) * totalAngle;
            const isMajor = i % 2 === 0;
            const len = isMajor ? 8 : 4;

            ctx.beginPath();
            ctx.moveTo(Math.cos(a) * (radius - len - 2), Math.sin(a) * (radius - len - 2));
            ctx.lineTo(Math.cos(a) * (radius - 2), Math.sin(a) * (radius - 2));
            ctx.stroke();
        }

        // Tên đơn vị và nhãn
        ctx.fillStyle = '#0f172a';
        ctx.font = 'bold 10px "Space Grotesk", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(unit, 0, radius * 0.45);
        if (label) {
            ctx.font = '9px "Space Grotesk", sans-serif';
            ctx.fillStyle = '#64748b';
            ctx.fillText(label, 0, -radius * 0.35);
        }

        // Kim chỉ thị màu đỏ phản xạ
        const normVal = Math.max(0, Math.min(1, (value - min) / (max - min)));
        const needleAngle = startAngle + normVal * totalAngle;

        ctx.save();
        ctx.rotate(needleAngle);
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-radius * 0.2, 0);
        ctx.lineTo(radius * 0.82, 0);
        ctx.stroke();

        // Mũi kim nhọn
        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.moveTo(radius * 0.82, 0);
        ctx.lineTo(radius * 0.72, -2.5);
        ctx.lineTo(radius * 0.72, 2.5);
        ctx.closePath();
        ctx.fill();
        ctx.restore();

        // Trục kim tròn trung tâm
        ctx.fillStyle = '#1e293b';
        ctx.beginPath();
        ctx.arc(0, 0, 4.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#f8fafc';
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.restore();
    },

    // 4. Nhiệt kế thủy ngân khoa học (PhET Thermometer)
    drawThermometer(ctx, x, y, width, height, tempK, minK = 100, maxK = 1000) {
        ctx.save();
        ctx.translate(x, y);

        const bulbR = width * 1.3;
        const stemW = width;
        const stemH = height - bulbR;

        // Vỏ thủy tinh trong suốt
        ctx.fillStyle = 'rgba(241, 245, 249, 0.25)';
        ctx.beginPath();
        ctx.roundRect(-stemW / 2, 0, stemW, stemH, stemW / 2);
        ctx.fill();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Cột chất lỏng đỏ dâng hạ theo nhiệt độ
        const normT = Math.max(0.05, Math.min(1, (tempK - minK) / (maxK - minK)));
        const fillH = stemH * normT;

        const liquidGrad = ctx.createLinearGradient(-stemW / 2, 0, stemW / 2, 0);
        liquidGrad.addColorStop(0, '#f87171');
        liquidGrad.addColorStop(0.5, '#ef4444');
        liquidGrad.addColorStop(1, '#b91c1c');
        ctx.fillStyle = liquidGrad;
        ctx.fillRect(-stemW / 2 + 1.5, stemH - fillH, stemW - 3, fillH);

        // Bầu chứa thủy ngân ở đáy
        ctx.beginPath();
        ctx.arc(0, stemH + bulbR * 0.4, bulbR, 0, Math.PI * 2);
        ctx.fillStyle = liquidGrad;
        ctx.fill();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Điểm sáng phản chiếu trên bầu thủy tinh
        ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.beginPath();
        ctx.arc(-bulbR * 0.35, stemH + bulbR * 0.15, bulbR * 0.35, 0, Math.PI * 2);
        ctx.fill();

        // Vạch chia độ bên cạnh
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.lineWidth = 1;
        for (let i = 0; i <= 8; i++) {
            const ty = stemH - (i / 8) * stemH;
            ctx.beginPath();
            ctx.moveTo(stemW / 2 + 2, ty);
            ctx.lineTo(stemW / 2 + (i % 2 === 0 ? 8 : 4), ty);
            ctx.stroke();
        }

        // Nhãn nhiệt độ hiển thị số to rõ
        ctx.fillStyle = '#fef08a';
        ctx.font = 'bold 12px "Space Grotesk", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(tempK.toFixed(0) + ' K', 0, -10);
        ctx.fillStyle = '#94a3b8';
        ctx.font = '10px "Space Grotesk", sans-serif';
        ctx.fillText('(' + (tempK - 273.15).toFixed(0) + '°C)', 0, -24);

        ctx.restore();
    },

    // 5. Nguồn nhiệt / Làm lạnh (PhET Fire/Ice Burner)
    drawHeaterCooler(ctx, x, y, width, heatState) {
        // heatState: > 0 = ngọn lửa, < 0 = băng giá, = 0 = tắt
        ctx.save();
        ctx.translate(x, y);

        // Bệ đỡ bếp lò
        ctx.fillStyle = '#334155';
        ctx.beginPath();
        ctx.roundRect(-width / 2, 0, width, 18, 4);
        ctx.fill();
        ctx.strokeStyle = '#64748b';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        if (heatState > 0.05) {
            // Ngọn lửa bùng cháy rực rỡ
            const flameH = 35 * Math.min(1.5, heatState);
            const numFlames = 5;
            for (let i = 0; i < numFlames; i++) {
                const fx = -width * 0.35 + (i / (numFlames - 1)) * width * 0.7;
                const fh = flameH * (0.7 + 0.3 * Math.sin(Date.now() * 0.015 + i));

                const fGrad = ctx.createRadialGradient(fx, -fh * 0.5, 2, fx, -fh * 0.3, fh * 0.8);
                fGrad.addColorStop(0, '#fef08a');
                fGrad.addColorStop(0.3, '#f59e0b');
                fGrad.addColorStop(0.7, '#ef4444');
                fGrad.addColorStop(1, 'rgba(239, 68, 68, 0)');

                ctx.fillStyle = fGrad;
                ctx.beginPath();
                ctx.moveTo(fx - 10, 0);
                ctx.quadraticCurveTo(fx - 12, -fh * 0.6, fx, -fh);
                ctx.quadraticCurveTo(fx + 12, -fh * 0.6, fx + 10, 0);
                ctx.closePath();
                ctx.fill();
            }
        } else if (heatState < -0.05) {
            // Khối băng tuyết lạnh giá
            const iceCount = 6;
            ctx.fillStyle = '#38bdf8';
            ctx.strokeStyle = '#bae6fd';
            ctx.lineWidth = 1.5;
            for (let i = 0; i < iceCount; i++) {
                const ix = -width * 0.38 + (i / (iceCount - 1)) * width * 0.76;
                const ih = 18 * Math.abs(heatState);
                ctx.beginPath();
                ctx.moveTo(ix, 0);
                ctx.lineTo(ix - 7, -ih * 0.6);
                ctx.lineTo(ix, -ih);
                ctx.lineTo(ix + 7, -ih * 0.6);
                ctx.closePath();
                ctx.fill();
                ctx.stroke();
            }
        }

        ctx.restore();
    },

    // 6. Lò xo xoắn ốc kim loại 3D (PhET Spring)
    drawCoiledSpring(ctx, x1, y1, x2, y2, coils = 14, radius = 16, color = '#94a3b8') {
        ctx.save();
        const dx = x2 - x1;
        const dy = y2 - y1;
        const dist = Math.hypot(dx, dy);
        const angle = Math.atan2(dy, dx);

        ctx.translate(x1, y1);
        ctx.rotate(angle);

        ctx.strokeStyle = color;
        ctx.lineWidth = 3.5;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        // Đoạn thẳng nối đầu lò xo
        const leadLen = 15;
        const coilSpan = Math.max(20, dist - leadLen * 2);

        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(leadLen, 0);

        // Các vòng xoắn lò xo hình sin/zig-zag bo góc
        for (let i = 0; i < coils; i++) {
            const stepX = coilSpan / coils;
            const cx = leadLen + i * stepX;
            const sign = i % 2 === 0 ? 1 : -1;

            ctx.bezierCurveTo(
                cx + stepX * 0.25, sign * radius,
                cx + stepX * 0.75, sign * radius,
                cx + stepX, 0
            );
        }

        ctx.lineTo(dist, 0);
        ctx.stroke();

        // Ánh sáng phản xạ kim loại nổi (Highlight line)
        ctx.strokeStyle = '#f8fafc';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(leadLen, 0);
        for (let i = 0; i < coils; i++) {
            const stepX = coilSpan / coils;
            const cx = leadLen + i * stepX;
            const sign = i % 2 === 0 ? 1 : -1;
            ctx.bezierCurveTo(
                cx + stepX * 0.25, sign * (radius - 3),
                cx + stepX * 0.75, sign * (radius - 3),
                cx + stepX, 0
            );
        }
        ctx.lineTo(dist, 0);
        ctx.stroke();

        ctx.restore();
    },

    // 7. Biểu đồ thanh năng lượng khoa học chuẩn PhET (Energy Bar Chart)
    drawEnergyBars(ctx, x, y, width, height, energies) {
        // energies: [ { label: 'Động năng', val: Ek, color: '#22c55e' }, ... ]
        ctx.save();
        ctx.translate(x, y);

        // Hộp chứa biểu đồ kính mờ Frosted Glass
        ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.35)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.roundRect(0, 0, width, height, 8);
        ctx.fill();
        ctx.stroke();

        // Tiêu đề
        ctx.fillStyle = '#38bdf8';
        ctx.font = 'bold 11px "Space Grotesk", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('⚡ NĂNG LƯỢNG HỆ THỐNG', width / 2, 18);

        // Tìm giá trị max để scale cột
        let maxVal = 10;
        energies.forEach(e => { if (Math.abs(e.val) > maxVal) maxVal = Math.abs(e.val); });

        const barAreaH = height - 52;
        const barW = Math.max(14, (width - 24) / energies.length - 8);

        energies.forEach((item, idx) => {
            const bx = 16 + idx * (barW + 8);
            const normH = Math.min(barAreaH, (Math.max(0, item.val) / maxVal) * barAreaH);
            const by = height - 26 - normH;

            // Cột năng lượng phát sáng
            const colGrad = ctx.createLinearGradient(bx, by, bx + barW, by);
            colGrad.addColorStop(0, item.color);
            colGrad.addColorStop(1, item.color + 'aa');
            ctx.fillStyle = colGrad;
            ctx.beginPath();
            ctx.roundRect(bx, by, barW, normH, [3, 3, 0, 0]);
            ctx.fill();

            // Viền sáng
            ctx.strokeStyle = item.color;
            ctx.lineWidth = 1;
            ctx.stroke();

            // Nhãn viết tắt (K, P, Th, Tot)
            ctx.fillStyle = '#cbd5e1';
            ctx.font = 'bold 9.5px "Space Grotesk", sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(item.shortLabel || item.label.slice(0, 3), bx + barW / 2, height - 10);
        });

        ctx.restore();
    },

    // 8. Vector lực / vận tốc chuẩn mực với mũi tên nhọn và nhãn
    drawVector(ctx, fromX, fromY, dx, dy, color, label = '', lineWidth = 2.5) {
        const len = Math.hypot(dx, dy);
        if (len < 1) return;

        ctx.save();
        ctx.strokeStyle = color;
        ctx.fillStyle = color;
        ctx.lineWidth = lineWidth;
        ctx.shadowColor = color;
        ctx.shadowBlur = 6;

        const toX = fromX + dx;
        const toY = fromY + dy;
        const angle = Math.atan2(dy, dx);
        const headlen = Math.min(12, Math.max(7, len * 0.25));

        // Đường thân vector
        ctx.beginPath();
        ctx.moveTo(fromX, fromY);
        ctx.lineTo(toX, toY);
        ctx.stroke();

        // Mũi tên nhọn chuẩn
        ctx.beginPath();
        ctx.moveTo(toX, toY);
        ctx.lineTo(
            toX - headlen * Math.cos(angle - Math.PI / 6),
            toY - headlen * Math.sin(angle - Math.PI / 6)
        );
        ctx.lineTo(
            toX - headlen * Math.cos(angle + Math.PI / 6),
            toY - headlen * Math.sin(angle + Math.PI / 6)
        );
        ctx.closePath();
        ctx.fill();

        // Nhãn vector
        if (label) {
            ctx.font = 'bold 11px "Space Grotesk", sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            const textOffset = 14;
            const tx = toX + Math.cos(angle) * textOffset;
            const ty = toY + Math.sin(angle) * textOffset;
            ctx.fillText(label, tx, ty);
        }

        ctx.restore();
    },

    // 9. Bảng HUD kính mờ đa năng (Heads-Up Display)
    drawHUD(ctx, x, y, title, items, w = 210) {
        ctx.save();
        const rowH = 18;
        const h = 32 + items.length * rowH;

        ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.4)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.roundRect(x, y, w, h, 8);
        ctx.fill();
        ctx.stroke();

        ctx.font = 'bold 11.5px "Space Grotesk", sans-serif';
        ctx.fillStyle = '#38bdf8';
        ctx.textAlign = 'left';
        ctx.fillText(title, x + 10, y + 18);

        ctx.font = '11px "Space Grotesk", monospace';
        items.forEach((item, idx) => {
            const ry = y + 36 + idx * rowH;
            ctx.fillStyle = '#94a3b8';
            ctx.fillText(item.label + ':', x + 10, ry);
            ctx.fillStyle = item.color || '#f8fafc';
            ctx.textAlign = 'right';
            ctx.fillText(item.val, x + w - 10, ry);
            ctx.textAlign = 'left';
        });

        ctx.restore();
    }
};




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
// 2. ĐỊNH LUẬT NEWTON & MA SÁT TRÊN MẶT PHẲNG NGHIÊNG (PhET Friction Ramp)
// ─────────────────────────────────────────────────────────────
(function initNewtonFriction() {
    const canvas = document.getElementById('newtonFrictionCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    let x = 80;
    let v = 0;
    let running = true;
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
        paused = false;
    }

    function update(dt) {
        if (!running || paused) return;
        const p = getParams();
        const alphaRad = (p.alphaDeg * Math.PI) / 180;

        const N = p.m * p.g * Math.cos(alphaRad);
        const P_par = p.m * p.g * Math.sin(alphaRad);
        const fMaxStatic = p.muS * N;
        const F_net_no_friction = p.fPull - P_par;

        let a = 0;
        let frictionForce = 0;
        let stateText = 'Đang đứng yên (Ma sát nghỉ)';

        if (Math.abs(v) < 0.001) {
            if (Math.abs(F_net_no_friction) <= fMaxStatic) {
                frictionForce = -F_net_no_friction;
                a = 0;
                v = 0;
                stateText = 'Đứng yên cân bằng (F_ms nghỉ = ' + Math.abs(frictionForce).toFixed(1) + ' N)';
            } else {
                const sign = Math.sign(F_net_no_friction);
                frictionForce = -sign * p.muK * N;
                a = (F_net_no_friction + frictionForce) / p.m;
                stateText = sign > 0 ? 'Trượt lên dốc gia tốc a > 0' : 'Trượt xuống dốc gia tốc a < 0';
            }
        } else {
            const sign = Math.sign(v);
            frictionForce = -sign * p.muK * N;
            a = (F_net_no_friction + frictionForce) / p.m;
            stateText = v > 0 ? 'Đang trượt lên dốc' : 'Đang trượt xuống dốc';
        }

        v += a * dt;
        x += v * dt * 25;

        if (x < 50) { x = 50; v = 0; stateText = 'Chạm chân dốc'; }
        else if (x > 500) { x = 500; v = 0; stateText = 'Chạm đỉnh dốc'; }

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
        
        ctx.save();
        ctx.scale(canvas.width / 700, canvas.height / 460);

        PhET.drawLabBackground(ctx, 700, 460, 'MẶT PHẲNG NGHIÊNG & MA SÁT NEWTON');

        const p = getParams();
        const alphaRad = (p.alphaDeg * Math.PI) / 180;

        const baseX = 80;
        const baseY = 390;
        const rampLength = 540;
        const topX = baseX + rampLength * Math.cos(alphaRad);
        const topY = baseY - rampLength * Math.sin(alphaRad);

        // 1. Nêm mặt phẳng nghiêng bằng gỗ/kim loại cao cấp
        const rampGrad = ctx.createLinearGradient(baseX, baseY, topX, topY);
        rampGrad.addColorStop(0, '#334155');
        rampGrad.addColorStop(0.5, '#1e293b');
        rampGrad.addColorStop(1, '#0f172a');
        ctx.fillStyle = rampGrad;
        ctx.beginPath();
        ctx.moveTo(baseX, baseY);
        ctx.lineTo(topX, topY);
        ctx.lineTo(topX, baseY);
        ctx.closePath();
        ctx.fill();

        // Bề mặt dốc có lớp trượt phản quang
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(baseX, baseY);
        ctx.lineTo(topX, topY);
        ctx.stroke();

        // Cung đo góc nghiêng alpha với thước đo
        ctx.strokeStyle = '#facc15';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(baseX, baseY, 65, -alphaRad, 0);
        ctx.stroke();

        ctx.fillStyle = '#facc15';
        ctx.font = 'bold 13px "Space Grotesk", sans-serif';
        ctx.fillText(`α = ${p.alphaDeg}°`, baseX + 80, baseY - 16);

        // 2. Khối gỗ ma sát trượt trên dốc (Textured Wooden/Brass Block)
        const boxDist = x;
        const boxSize = 42 + p.m * 2;
        const cx = baseX + boxDist * Math.cos(alphaRad);
        const cy = baseY - boxDist * Math.sin(alphaRad);

        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(-alphaRad);

        // Thân khối hộp gỗ 3D
        const bGrad = ctx.createLinearGradient(-boxSize/2, -boxSize, boxSize/2, 0);
        bGrad.addColorStop(0, '#d97706');
        bGrad.addColorStop(0.5, '#f59e0b');
        bGrad.addColorStop(1, '#b45309');
        ctx.fillStyle = bGrad;
        ctx.beginPath();
        ctx.roundRect(-boxSize / 2, -boxSize, boxSize, boxSize, 4);
        ctx.fill();
        ctx.strokeStyle = '#fef3c7';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        ctx.fillStyle = '#0f172a';
        ctx.font = 'bold 12px "Space Grotesk", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`${p.m}kg`, 0, -boxSize / 2 + 4);

        // Các vector lực: N, F_keo, F_ms
        const ox = 0, oy = -boxSize / 2;
        const scale = 1.6;
        const N = p.m * p.g * Math.cos(alphaRad);

        // Phản lực N vuông góc lên trên
        PhET.drawVector(ctx, ox, oy, 0, -N * scale, '#4ade80', `N = ${N.toFixed(1)}N`, 2.5);

        // Lực kéo F_kéo hướng lên theo mặt nghiêng (+x)
        if (p.fPull > 0) {
            PhET.drawVector(ctx, ox, oy, p.fPull * scale, 0, '#facc15', `F_kéo = ${p.fPull}N`, 2.5);
        }

        ctx.restore();

        // Trọng lực P = mg hướng thẳng đứng xuống đất
        const P = p.m * p.g;
        PhET.drawVector(ctx, cx, cy - boxSize / 2, 0, P * 1.6, '#ef4444', `P = ${P.toFixed(1)}N`, 2.5);

        ctx.restore();
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
        if (el) el.addEventListener('input', () => { syncLabels(); });
    });

    const resetBtn = document.getElementById('nf-reset');
    if (resetBtn) resetBtn.addEventListener('click', resetSimulation);

    const pauseBtn = document.getElementById('nf-pause');
    if (pauseBtn) {
        pauseBtn.addEventListener('click', () => {
            paused = !paused;
            pauseBtn.textContent = paused ? 'Tiếp tục' : 'Tạm dừng';
        });
    }

    syncLabels();
})();

// ─────────────────────────────────────────────────────────────
// 3. CHUYỂN ĐỘNG TRÒN ĐỀU & LỰC HƯỚNG TÂM (PhET Circular Motion)
// ─────────────────────────────────────────────────────────────
(function initCircularMotion() {
    const canvas = document.getElementById('circularMotionCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    let theta = 0;
    let trail = [];
    let isStringCut = false;
    let cutPos = { x: 0, y: 0, vx: 0, vy: 0 };

    function getParams() {
        const rEl = document.getElementById('cm-radius');
        const wEl = document.getElementById('cm-omega');
        const mEl = document.getElementById('cm-mass');

        return {
            R: rEl ? parseFloat(rEl.value) : 1.5,
            omega: wEl ? parseFloat(wEl.value) : 3.0,
            m: mEl ? parseFloat(mEl.value) : 1.0
        };
    }

    function syncLabels() {
        const p = getParams();
        const rVal = document.getElementById('cm-radius-val');
        const wVal = document.getElementById('cm-omega-val');
        const mVal = document.getElementById('cm-mass-val');

        if (rVal) rVal.textContent = p.R.toFixed(1) + ' m';
        if (wVal) wVal.textContent = p.omega.toFixed(1) + ' rad/s';
        if (mVal) mVal.textContent = p.m.toFixed(1) + ' kg';

        const vLinear = p.omega * p.R;
        const acp = p.omega * p.omega * p.R;
        const Fcp = p.m * acp;
        const period = (2 * Math.PI) / p.omega;

        const vEl = document.getElementById('cm-linear-v');
        const aEl = document.getElementById('cm-acp');
        const fEl = document.getElementById('cm-fcp');
        const tEl = document.getElementById('cm-period');

        if (vEl) vEl.textContent = vLinear.toFixed(2) + ' m/s';
        if (aEl) aEl.textContent = acp.toFixed(2) + ' m/s²';
        if (fEl) fEl.textContent = Fcp.toFixed(2) + ' N';
        if (tEl) tEl.textContent = period.toFixed(2) + ' s';
    }

    function update(dt) {
        const p = getParams();
        if (!isStringCut) {
            theta += p.omega * dt;
        } else {
            cutPos.x += cutPos.vx * dt * 45;
            cutPos.y += cutPos.vy * dt * 45;
        }
    }

    function draw() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        ctx.save();
        ctx.scale(canvas.width / 700, canvas.height / 460);

        PhET.drawLabBackground(ctx, 700, 460, 'CHUYỂN ĐỘNG TRÒN ĐỀU & LỰC HƯỚNG TÂM');

        const p = getParams();
        const cx = 350;
        const cy = 230;
        const rPx = p.R * 85;

        // 1. Bàn quay tròn / Quỹ đạo tròn (Turntable Track)
        ctx.fillStyle = 'rgba(15, 23, 42, 0.7)';
        ctx.beginPath();
        ctx.arc(cx, cy, rPx + 25, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.25)';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Đường quỹ đạo nét đứt
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([5, 4]);
        ctx.beginPath();
        ctx.arc(cx, cy, rPx, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);

        // Trục quay trung tâm (Pivot Axis)
        ctx.fillStyle = '#64748b';
        ctx.beginPath(); ctx.arc(cx, cy, 10, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#e2e8f0'; ctx.lineWidth = 2; ctx.stroke();
        ctx.fillStyle = '#f59e0b'; ctx.beginPath(); ctx.arc(cx, cy, 4, 0, Math.PI * 2); ctx.fill();

        // 2. Tọa độ vật
        let bx = 0, by = 0;
        if (!isStringCut) {
            bx = cx + rPx * Math.cos(theta);
            by = cy + rPx * Math.sin(theta);

            // Dây treo thép nối từ tâm tới vật
            ctx.strokeStyle = '#cbd5e1';
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            ctx.moveTo(cx, cy);
            ctx.lineTo(bx, by);
            ctx.stroke();
        } else {
            bx = cutPos.x;
            by = cutPos.y;
        }

        // 3. Quả cầu kim loại chuyển động
        const bobR = 14 + p.m * 2.5;
        const ballGrad = ctx.createRadialGradient(bx - 4, by - 4, 2, bx, by, bobR);
        ballGrad.addColorStop(0, '#fef08a');
        ballGrad.addColorStop(0.3, '#f59e0b');
        ballGrad.addColorStop(1, '#b45309');
        ctx.fillStyle = ballGrad;
        ctx.beginPath();
        ctx.arc(bx, by, bobR, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.fillStyle = '#0f172a';
        ctx.font = 'bold 11px "Space Grotesk", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`${p.m}kg`, bx, by + 4);

        if (!isStringCut) {
            // Vector vận tốc tiếp tuyến v (xanh lá)
            const vxLen = -Math.sin(theta) * (p.omega * p.R * 14);
            const vyLen = Math.cos(theta) * (p.omega * p.R * 14);
            PhET.drawVector(ctx, bx, by, vxLen, vyLen, '#22c55e', 'v', 2.8);

            // Vector lực hướng tâm F_cp (đỏ hướng về tâm)
            const fxLen = -Math.cos(theta) * (p.m * p.omega * p.omega * 5.5);
            const fyLen = -Math.sin(theta) * (p.m * p.omega * p.omega * 5.5);
            PhET.drawVector(ctx, bx, by, fxLen, fyLen, '#ef4444', 'F_ht', 2.8);
        }

        // Bảng HUD thông số
        const vLinear = p.omega * p.R;
        const acp = p.omega * p.omega * p.R;
        const Fcp = p.m * acp;
        PhET.drawHUD(ctx, 480, 290, '📊 CHUYỂN ĐỘNG TRÒN ĐỀU', [
            { label: 'Vận tốc dài v', val: `${vLinear.toFixed(2)} m/s`, color: '#22c55e' },
            { label: 'Gia tốc hướng tâm', val: `${acp.toFixed(2)} m/s²`, color: '#facc15' },
            { label: 'Lực hướng tâm F_ht', val: `${Fcp.toFixed(2)} N`, color: '#ef4444' }
        ], 200);

        ctx.restore();
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
        if (el) el.addEventListener('input', () => { syncLabels(); });
    });

    const cutBtn = document.getElementById('cm-cut-string');
    if (cutBtn) {
        cutBtn.addEventListener('click', () => {
            if (!isStringCut) {
                const p = getParams();
                const rPx = p.R * 85;
                isStringCut = true;
                cutPos = {
                    x: 350 + rPx * Math.cos(theta),
                    y: 230 + rPx * Math.sin(theta),
                    vx: -Math.sin(theta) * (p.omega * p.R),
                    vy: Math.cos(theta) * (p.omega * p.R)
                };
            }
        });
    }

    const resetBtn = document.getElementById('cm-reset');
    if (resetBtn) {
        resetBtn.addEventListener('click', () => {
            isStringCut = false;
            theta = 0;
        });
    }

    syncLabels();
})();

// ─────────────────────────────────────────────────────────────
// 4. VA CHẠM & BẢO TOÀN ĐỘNG LƯỢNG (PhET Collision Lab)
// ─────────────────────────────────────────────────────────────
(function initCollisionLab() {
    const canvas = document.getElementById('collisionCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    let b1 = { x: 140, y: 230, vx: 4, m: 2, r: 28, color: '#38bdf8' };
    let b2 = { x: 520, y: 230, vx: -2, m: 3, r: 34, color: '#f59e0b' };
    let running = true;
    let restitution = 1.0;

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
        b1.r = 22 + p.m1 * 3.5;
        b1.vx = p.v1;
        b1.x = 140;

        b2.m = p.m2;
        b2.r = 22 + p.m2 * 3.5;
        b2.vx = p.v2;
        b2.x = 520;

        restitution = p.e;
        running = true;
    }

    function update(dt) {
        if (!running) return;

        b1.x += b1.vx * dt * 45;
        b2.x += b2.vx * dt * 45;

        const dist = Math.abs(b2.x - b1.x);
        const minDist = b1.r + b2.r;

        if (dist <= minDist && (b1.vx - b2.vx) > 0) {
            const m1 = b1.m, m2 = b2.m;
            const u1 = b1.vx, u2 = b2.vx;
            const e = restitution;

            const v1Prime = (m1 * u1 + m2 * u2 - m2 * e * (u1 - u2)) / (m1 + m2);
            const v2Prime = (m1 * u1 + m2 * u2 + m1 * e * (u1 - u2)) / (m1 + m2);

            b1.vx = v1Prime;
            b2.vx = v2Prime;

            const overlap = minDist - dist;
            b1.x -= overlap / 2;
            b2.x += overlap / 2;
        }

        if (b1.x - b1.r < 50) { b1.x = 50 + b1.r; b1.vx = -b1.vx; }
        if (b2.x + b2.r > 650) { b2.x = 650 - b2.r; b2.vx = -b2.vx; }

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
        
        ctx.save();
        ctx.scale(canvas.width / 700, canvas.height / 460);

        PhET.drawLabBackground(ctx, 700, 460, 'PHÒNG THÍ NGHIỆM VA CHẠM & BẢO TOÀN ĐỘNG LƯỢNG');

        const trackY = 250;

        // 1. Đệm không khí (Air Track Rail)
        PhET.drawRuler(ctx, 45, trackY + 30, 610, false, 'cm', 'cm');

        // Băng ray kim loại dẫn hướng
        ctx.fillStyle = '#334155';
        ctx.fillRect(40, trackY, 620, 24);
        ctx.strokeStyle = '#94a3b8';
        ctx.lineWidth = 2;
        ctx.strokeRect(40, trackY, 620, 24);

        // Hai đệm cản hai đầu
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(35, trackY - 20, 15, 50);
        ctx.fillRect(650, trackY - 20, 15, 50);

        // 2. Xe trượt 1 (Cart 1 - Xanh cyan)
        drawCart(ctx, b1.x, trackY, b1.m, b1.vx, '#0284c7', '#38bdf8', 'Xe 1');

        // 3. Xe trượt 2 (Cart 2 - Cam vàng)
        drawCart(ctx, b2.x, trackY, b2.m, b2.vx, '#b45309', '#f59e0b', 'Xe 2');

        // 4. Biểu đồ thanh năng lượng & động lượng phía trên
        const p1 = b1.m * b1.vx;
        const p2 = b2.m * b2.vx;
        const pTot = p1 + p2;
        const keTot = 0.5 * b1.m * b1.vx * b1.vx + 0.5 * b2.m * b2.vx * b2.vx;

        PhET.drawHUD(ctx, 470, 310, '📊 ĐỊNH LUẬT BẢO TOÀN', [
            { label: 'Động lượng p_tổng', val: `${pTot.toFixed(2)} kg·m/s`, color: '#38bdf8' },
            { label: 'Động năng K_tổng', val: `${keTot.toFixed(2)} J`, color: '#4ade80' }
        ], 195);

        ctx.restore();
    }

    function drawCart(ctx, x, trackY, m, v, colDark, colLight, label) {
        const cartW = 60 + m * 8;
        const cartH = 34;
        const cy = trackY - cartH;

        // Thân xe kim loại 3D
        const cGrad = ctx.createLinearGradient(x - cartW/2, cy, x + cartW/2, cy);
        cGrad.addColorStop(0, colDark);
        cGrad.addColorStop(0.5, colLight);
        cGrad.addColorStop(1, colDark);
        ctx.fillStyle = cGrad;
        ctx.beginPath();
        ctx.roundRect(x - cartW/2, cy, cartW, cartH, 4);
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Đệm cao su giảm chấn 2 đầu xe (Bumpers)
        ctx.fillStyle = '#475569';
        ctx.fillRect(x - cartW/2 - 6, cy + 8, 6, cartH - 16);
        ctx.fillRect(x + cartW/2, cy + 8, 6, cartH - 16);

        // Bánh xe trượt
        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        ctx.arc(x - cartW/3, trackY, 5, 0, Math.PI * 2);
        ctx.arc(x + cartW/3, trackY, 5, 0, Math.PI * 2);
        ctx.fill();

        // Nhãn khối lượng
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 12px "Space Grotesk", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`${m.toFixed(1)}kg`, x, cy + cartH/2 + 4);

        // Vector vận tốc v
        PhET.drawVector(ctx, x, cy - 8, v * 14, 0, '#22c55e', `v=${v.toFixed(1)}`, 2.5);
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
// 5. BẢO TOÀN CƠ NĂNG - SKATE PARK (PhET Energy Skate Park)
// ─────────────────────────────────────────────────────────────
(function initEnergySkate() {
    const canvas = document.getElementById('energySkateCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const x0 = 350;
    const y0 = 360;
    const kCurve = 0.0022;

    let sX = x0 - 160;
    let vS = 0;
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
        return y0 - kCurve * Math.pow(x - x0, 2) * -1;
    }

    function getSlopeAngle(x) {
        const slope = 2 * kCurve * (x - x0);
        return Math.atan(slope);
    }

    function update(dt) {
        if (paused) return;
        const p = getParams();

        const angle = getSlopeAngle(sX);
        const aTangent = -p.g * Math.sin(angle) * 32 - p.friction * 40 * vS;

        vS += aTangent * dt;
        sX += vS * Math.cos(angle) * dt * 8;

        if (sX < 80) { sX = 80; vS = -vS * 0.9; }
        if (sX > 620) { sX = 620; vS = -vS * 0.9; }

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
        
        ctx.save();
        ctx.scale(canvas.width / 700, canvas.height / 460);

        PhET.drawLabBackground(ctx, 700, 460, 'ĐƯỜNG TRƯỢT SKATE PARK & BẢO TOÀN CƠ NĂNG');

        const p = getParams();

        // 1. Đường cong máng trượt parabol bằng thép ống (U-Shaped Skate Track)
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 8;
        ctx.lineCap = 'round';
        ctx.beginPath();
        for (let x = 60; x <= 640; x += 4) {
            const y = getY(x);
            if (x === 60) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.stroke();

        // Các cột giàn giáo đỡ máng
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.2)';
        ctx.lineWidth = 2;
        for (let x = 100; x <= 600; x += 45) {
            ctx.beginPath();
            ctx.moveTo(x, getY(x));
            ctx.lineTo(x, 420);
            ctx.stroke();
        }

        // 2. Vận động viên trượt ván
        const curY = getY(sX);
        const angle = getSlopeAngle(sX);

        ctx.save();
        ctx.translate(sX, curY);
        ctx.rotate(angle);

        // Ván trượt
        ctx.fillStyle = '#f59e0b';
        ctx.beginPath();
        ctx.roundRect(-24, -6, 48, 7, 3);
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(-16, 3, 4, 0, Math.PI * 2);
        ctx.arc(16, 3, 4, 0, Math.PI * 2);
        ctx.fill();

        // Người trượt (PhET Skater Mascot)
        ctx.fillStyle = '#38bdf8';
        ctx.beginPath();
        ctx.roundRect(-10, -32, 20, 26, 4);
        ctx.fill();

        // Đầu người trượt có mũ bảo hiểm
        ctx.fillStyle = '#facc15';
        ctx.beginPath();
        ctx.arc(0, -42, 9, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();

        // 3. BIỂU ĐỒ TRÒN NĂNG LƯỢNG NỔI TRÊN ĐẦU NGƯỜI TRƯỢT (PhET Floating Pie Chart!)
        const heightMeters = Math.max(0, (y0 - curY) / 30);
        const speedReal = Math.abs(vS) / 8;
        const Ep = p.m * p.g * heightMeters;
        const Ek = 0.5 * p.m * speedReal * speedReal;
        const Etot = Ep + Ek + thermalEnergy;

        if (Etot > 0) {
            const pieR = 24;
            const pieX = sX;
            const pieY = curY - 70;

            const fEk = (Ek / Etot) * Math.PI * 2;
            const fEp = (Ep / Etot) * Math.PI * 2;
            const fEth = (thermalEnergy / Etot) * Math.PI * 2;

            // Động năng (Xanh lá)
            ctx.fillStyle = '#22c55e';
            ctx.beginPath();
            ctx.moveTo(pieX, pieY);
            ctx.arc(pieX, pieY, pieR, 0, fEk);
            ctx.closePath();
            ctx.fill();

            // Thế năng (Xanh cyan)
            ctx.fillStyle = '#38bdf8';
            ctx.beginPath();
            ctx.moveTo(pieX, pieY);
            ctx.arc(pieX, pieY, pieR, fEk, fEk + fEp);
            ctx.closePath();
            ctx.fill();

            // Nhiệt (Đỏ)
            if (fEth > 0) {
                ctx.fillStyle = '#ef4444';
                ctx.beginPath();
                ctx.moveTo(pieX, pieY);
                ctx.arc(pieX, pieY, pieR, fEk + fEp, Math.PI * 2);
                ctx.closePath();
                ctx.fill();
            }

            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.arc(pieX, pieY, pieR, 0, Math.PI * 2);
            ctx.stroke();
        }

        // 4. Biểu đồ thanh năng lượng khoa học góc phải (Energy Bar Chart)
        PhET.drawEnergyBars(ctx, 480, 45, 195, 160, [
            { label: 'Động năng', shortLabel: 'Đ.Năng', val: Ek, color: '#22c55e' },
            { label: 'Thế năng', shortLabel: 'Thế.Năng', val: Ep, color: '#38bdf8' },
            { label: 'Nhiệt', shortLabel: 'Nhiệt', val: thermalEnergy, color: '#ef4444' },
            { label: 'Cơ năng', shortLabel: 'Cơ.Năng', val: Etot, color: '#f59e0b' }
        ]);

        ctx.restore();
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
            sX = x0 - 160;
            vS = 0;
            thermalEnergy = 0;
        });
    }

    syncLabels();
})();

// ─────────────────────────────────────────────────────────────
// 6. CÂN BẰNG VẬT RẮN & ĐÒN BẨY (PhET Balancing Act)
// ─────────────────────────────────────────────────────────────
(function initBalancingAct() {
    const canvas = document.getElementById('balancingActCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

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
        const torqueCCW = p.m1 * p.d1 * 9.8;
        const torqueCW = p.m2 * p.d2 * 9.8;
        const netTorque = torqueCW - torqueCCW;

        if (locked) {
            targetAngle = 0;
        } else {
            if (Math.abs(netTorque) < 0.1) {
                targetAngle = 0;
            } else {
                targetAngle = Math.sign(netTorque) * 0.20;
            }
        }

        tiltAngle += (targetAngle - tiltAngle) * 0.12;

        const tccwEl = document.getElementById('lever-t-ccw');
        const tcwEl = document.getElementById('lever-t-cw');
        const tnetEl = document.getElementById('lever-t-net');
        const stEl = document.getElementById('lever-status');

        if (tccwEl) tccwEl.textContent = torqueCCW.toFixed(1) + ' N·m';
        if (tcwEl) tcwEl.textContent = torqueCW.toFixed(1) + ' N·m';
        if (tnetEl) tnetEl.textContent = Math.abs(netTorque).toFixed(1) + ' N·m';
        if (stEl) {
            if (Math.abs(netTorque) < 0.1) {
                stEl.textContent = '⚖️ Cân Bằng Hoàn Hảo (Σ M = 0)';
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
        
        ctx.save();
        ctx.scale(canvas.width / 700, canvas.height / 460);

        PhET.drawLabBackground(ctx, 700, 460, 'CÂN BẰNG VẬT RẮN & QUY TẮC MOMEN LỰC');

        const p = getParams();
        const cx = 350;
        const cy = 260;
        const beamLen = 500;
        const stepPx = 22;

        // 1. Trụ đỡ tam giác Fulcrum bằng thép đúc
        ctx.fillStyle = '#475569';
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx - 35, cy + 85);
        ctx.lineTo(cx + 35, cy + 85);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#94a3b8';
        ctx.lineWidth = 2.5;
        ctx.stroke();

        // 2. Chốt khóa an toàn
        if (locked) {
            ctx.fillStyle = '#ef4444';
            ctx.fillRect(cx - 160, cy + 40, 24, 45);
            ctx.fillRect(cx + 136, cy + 40, 24, 45);
        }

        // 3. Thanh bập bênh xoay
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(tiltAngle);

        // Thân thanh gỗ/kim loại bập bênh
        const bGrad = ctx.createLinearGradient(0, -10, 0, 10);
        bGrad.addColorStop(0, '#fef08a');
        bGrad.addColorStop(0.5, '#facc15');
        bGrad.addColorStop(1, '#ca8a04');
        ctx.fillStyle = bGrad;
        ctx.beginPath();
        ctx.roundRect(-beamLen / 2, -10, beamLen, 20, 4);
        ctx.fill();
        ctx.strokeStyle = '#a16207';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Các vạch chia khoảng cách mét
        ctx.fillStyle = '#713f12';
        ctx.font = 'bold 10px monospace';
        ctx.textAlign = 'center';
        for (let i = -10; i <= 10; i++) {
            const vx = i * stepPx;
            ctx.beginPath();
            ctx.moveTo(vx, -10);
            ctx.lineTo(vx, i === 0 ? 10 : 2);
            ctx.stroke();

            if (i !== 0 && Math.abs(i) % 2 === 0) {
                ctx.fillText(Math.abs(i).toString(), vx, 20);
            }
        }

        // Bọt thủy chuẩn cân bằng (Spirit Level) ở giữa
        ctx.fillStyle = '#10b981';
        ctx.beginPath();
        ctx.roundRect(-25, -22, 50, 10, 4);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(-tiltAngle * 100, -17, 3, 0, Math.PI * 2);
        ctx.fill();

        // 4. Các quả tạ chuẩn PhET đặt trên thanh
        function drawWeight(wx, mass, colGradStart, colGradEnd) {
            const wSize = 22 + mass * 1.6;
            const wGrad = ctx.createLinearGradient(wx - wSize/2, -10 - wSize, wx + wSize/2, -10);
            wGrad.addColorStop(0, colGradStart);
            wGrad.addColorStop(1, colGradEnd);
            ctx.fillStyle = wGrad;
            ctx.beginPath();
            ctx.roundRect(wx - wSize / 2, -10 - wSize, wSize, wSize, 4);
            ctx.fill();
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 1.5;
            ctx.stroke();

            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 11px "Space Grotesk", sans-serif';
            ctx.fillText(`${mass}kg`, wx, -10 - wSize / 2 + 4);
        }

        drawWeight(-p.d1 * stepPx, p.m1, '#0284c7', '#38bdf8');
        drawWeight(p.d2 * stepPx, p.m2, '#b45309', '#f59e0b');

        ctx.restore();

        // Bảng HUD momen lực
        const torqueCCW = p.m1 * p.d1 * 9.8;
        const torqueCW = p.m2 * p.d2 * 9.8;
        PhET.drawHUD(ctx, 470, 310, '📊 CÂN BẰNG MOMEN LỰC', [
            { label: 'Momen trái M₁', val: `${torqueCCW.toFixed(1)} N·m`, color: '#38bdf8' },
            { label: 'Momen phải M₂', val: `${torqueCW.toFixed(1)} N·m`, color: '#facc15' },
            { label: 'Hợp momen |ΣM|', val: `${Math.abs(torqueCW - torqueCCW).toFixed(1)} N·m`, color: Math.abs(torqueCW - torqueCCW) < 0.1 ? '#4ade80' : '#ef4444' }
        ], 200);

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
// 7. CHUYỂN ĐỘNG QUAY VÀ MOMEN QUÁN TÍNH (PhET Rotational Inertia)
// ─────────────────────────────────────────────────────────────
(function initRotationalInertia() {
    const canvas = document.getElementById('rotationalInertiaCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    let diskAngle = 0;
    let omega = 4.0;

    function getParams() {
        const rEl = document.getElementById('rot-radius');
        const mEl = document.getElementById('rot-mass');

        return {
            R: rEl ? parseFloat(rEl.value) : 1.0,
            M: mEl ? parseFloat(mEl.value) : 2.0
        };
    }

    function syncLabels() {
        const p = getParams();
        const rVal = document.getElementById('rot-radius-val');
        const mVal = document.getElementById('rot-mass-val');

        if (rVal) rVal.textContent = p.R.toFixed(1) + ' m';
        if (mVal) mVal.textContent = p.M.toFixed(1) + ' kg';

        // Đĩa tròn đồng chất: I = 1/2 * M * R^2
        const I = 0.5 * p.M * p.R * p.R;
        const L = I * omega;
        const Erot = 0.5 * I * omega * omega;

        const iEl = document.getElementById('rot-inertia');
        const wEl = document.getElementById('rot-omega');
        const lEl = document.getElementById('rot-angular-l');
        const eEl = document.getElementById('rot-energy');

        if (iEl) iEl.textContent = I.toFixed(2) + ' kg·m²';
        if (wEl) wEl.textContent = omega.toFixed(2) + ' rad/s';
        if (lEl) lEl.textContent = L.toFixed(2) + ' kg·m²/s';
        if (eEl) eEl.textContent = Erot.toFixed(2) + ' J';
    }

    function update(dt) {
        diskAngle += omega * dt;
    }

    function draw() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        ctx.save();
        ctx.scale(canvas.width / 700, canvas.height / 460);

        PhET.drawLabBackground(ctx, 700, 460, 'MOMEN QUÁN TÍNH & ĐỘNG NĂNG QUAY (I = ½MR²)');

        const p = getParams();
        const cx = 250;
        const cy = 230;
        const rPx = p.R * 110;

        // 1. Đĩa quay 3D kim loại có vân xuyên tâm (Solid Disk)
        ctx.save();
        ctx.translate(cx, cy);

        // Vành ngoài đĩa
        const dGrad = ctx.createRadialGradient(0, 0, 10, 0, 0, rPx);
        dGrad.addColorStop(0, '#0284c7');
        dGrad.addColorStop(0.7, '#38bdf8');
        dGrad.addColorStop(1, '#0c4a6e');
        ctx.fillStyle = dGrad;
        ctx.beginPath();
        ctx.arc(0, 0, rPx, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 3;
        ctx.stroke();

        // Các nan hoa quay hiển thị góc xoay
        ctx.rotate(diskAngle);
        ctx.strokeStyle = '#f8fafc';
        ctx.lineWidth = 2;
        for (let a = 0; a < Math.PI * 2; a += Math.PI / 4) {
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(rPx * Math.cos(a), rPx * Math.sin(a));
            ctx.stroke();
        }

        // Trục quay trung tâm
        ctx.fillStyle = '#f59e0b';
        ctx.beginPath();
        ctx.arc(0, 0, 12, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.restore();

        // 2. Bảng so sánh Momen quán tính các hình dạng chuẩn
        const I_disk = 0.5 * p.M * p.R * p.R;
        const I_ring = p.M * p.R * p.R;
        const I_sphere = 0.4 * p.M * p.R * p.R;

        PhET.drawHUD(ctx, 440, 70, '📊 MOMEN QUÁN TÍNH CÁC VẬT', [
            { label: 'Đĩa tròn đặc (½MR²)', val: `${I_disk.toFixed(2)} kg·m²`, color: '#38bdf8' },
            { label: 'Vành tròn rỗng (MR²)', val: `${I_ring.toFixed(2)} kg·m²`, color: '#ef4444' },
            { label: 'Quả cầu đặc (⅖MR²)', val: `${I_sphere.toFixed(2)} kg·m²`, color: '#4ade80' },
            { label: 'Động năng quay W_đ', val: `${(0.5 * I_disk * omega * omega).toFixed(1)} J`, color: '#facc15' }
        ], 230);

        ctx.restore();
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




/* ============================================================
   🔥 LP.VirtualLab - CHUYÊN ĐỀ 2: NHIỆT HỌC & VẬT LÝ THỐNG KÊ (Thermodynamics)
   Bao gồm 3 bài mô phỏng chuẩn mực PhET siêu trực quan:
   8. Phương trình trạng thái khí lý tưởng P-V-T (Ideal Gas Laws: Boyle, Charles, Gay-Lussac)
   9. Thuyết động học phân tử & Phân bố Maxwell-Boltzmann (Molecular Kinetics & Speed Distribution)
   10. Các quá trình nhiệt động & Chu trình Carnot (Thermodynamic Processes & Carnot Engine)
   Tác giả: Lê Ngọc Phú - SĐT: 0853257289
   ============================================================ */

// ─────────────────────────────────────────────────────────────
// 8. PHƯƠNG TRÌNH TRẠNG THÁI KHÍ LÝ TƯỞNG (P-V-T Gas Chamber PhET)
// ─────────────────────────────────────────────────────────────
(function initGasProperties() {
    const canvas = document.getElementById('gasPropertiesCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    let particles = [];
    let pistonX = 430; // Vị trí piston xác định thể tích V
    let draggingPiston = false;
    let collisionsThisSec = 0;
    let pressureReading = 1.0; // atm
    let lastCollisionReset = performance.now();
    let pumpPlungerY = 0;
    let pumpAnim = 0;

    function getParams() {
        const tEl = document.getElementById('gp-temp');
        const nEl = document.getElementById('gp-particles');

        return {
            tempK: tEl ? parseFloat(tEl.value) : 300,
            particleCount: nEl ? parseInt(nEl.value) : 120
        };
    }

    function syncLabels() {
        const p = getParams();
        const tVal = document.getElementById('gp-temp-val');
        const nVal = document.getElementById('gp-particles-val');
        const pVal = document.getElementById('gp-pressure-val');
        const vVal = document.getElementById('gp-volume-val');
        const keVal = document.getElementById('gp-mean-ke');

        if (tVal) tVal.textContent = p.tempK.toFixed(0) + ' K';
        if (nVal) nVal.textContent = p.particleCount;

        // V tỉ lệ với chiều dài buồng khí (left = 110, pistonX)
        const volLiters = ((pistonX - 110) / 18).toFixed(1);
        if (vVal) vVal.textContent = volLiters + ' L';

        // P = nRT/V (đơn vị atm)
        const vNum = Math.max(0.5, (pistonX - 110) / 18);
        const atm = (p.particleCount * 0.08206 * p.tempK) / (vNum * 80);
        pressureReading = Math.max(0.1, atm);

        if (pVal) pVal.textContent = pressureReading.toFixed(2) + ' atm';

        // Động năng tịnh tiến trung bình: E_k = 3/2 * k_B * T (1.38e-23 J/K)
        const kB = 1.380649e-23;
        const meanKE = 1.5 * kB * p.tempK;
        if (keVal) keVal.textContent = (meanKE * 1e21).toFixed(2) + ' × 10⁻²¹ J';
    }

    function resetParticles() {
        const p = getParams();
        particles = [];
        const left = 115;
        const right = pistonX - 10;
        const top = 80;
        const bottom = 310;
        const speed = Math.sqrt(p.tempK / 300) * 3.5;

        for (let i = 0; i < p.particleCount; i++) {
            const angle = Math.random() * Math.PI * 2;
            const spd = speed * (0.6 + Math.random() * 0.8);
            particles.push({
                x: left + 10 + Math.random() * (right - left - 20),
                y: top + 10 + Math.random() * (bottom - top - 20),
                vx: Math.cos(angle) * spd,
                vy: Math.sin(angle) * spd,
                r: 4.0
            });
        }
    }

    // Kéo piston bằng chuột
    canvas.addEventListener('mousedown', (e) => {
        const rect = canvas.getBoundingClientRect();
        const mx = (e.clientX - rect.left) * (canvas.width / rect.width) * (700 / canvas.width);
        const my = (e.clientY - rect.top) * (canvas.height / rect.height) * (460 / canvas.height);
        
        // Piston handle hit test
        if (Math.abs(mx - pistonX) < 25 && my >= 65 && my <= 325) {
            draggingPiston = true;
        }
    });

    window.addEventListener('mousemove', (e) => {
        if (!draggingPiston) return;
        const rect = canvas.getBoundingClientRect();
        const mx = (e.clientX - rect.left) * (canvas.width / rect.width) * (700 / canvas.width);
        pistonX = Math.max(200, Math.min(520, mx));
        syncLabels();
    });

    window.addEventListener('mouseup', () => { draggingPiston = false; });

    function update(dt) {
        const p = getParams();
        const left = 110;
        const right = pistonX;
        const top = 75;
        const bottom = 315;
        const targetSpeed = Math.sqrt(p.tempK / 300) * 3.5;

        particles.forEach(pt => {
            pt.x += pt.vx * dt * 45;
            pt.y += pt.vy * dt * 45;

            // Va chạm thành xilanh đàn hồi
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

            // Điều chỉnh nhiệt độ
            const curSpd = Math.hypot(pt.vx, pt.vy);
            if (curSpd > 0) {
                const diff = (targetSpeed - curSpd) * 0.05;
                const newSpd = curSpd + diff;
                pt.vx = (pt.vx / curSpd) * newSpd;
                pt.vy = (pt.vy / curSpd) * newSpd;
            }
        });
    }

    function draw() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // HiDPI Scaling
        ctx.save();
        ctx.scale(canvas.width / 700, canvas.height / 460);

        // 1. Phông nền phòng thí nghiệm hiện đại
        PhET.drawLabBackground(ctx, 700, 460, 'PHÒNG THÍ NGHIỆM KHÍ LÝ TƯỞNG (P-V-T)');

        const p = getParams();
        const left = 110;
        const right = pistonX;
        const top = 75;
        const bottom = 315;
        const chamberW = right - left;
        const chamberH = bottom - top;

        // 2. Buồng chứa khí Acrylic trong suốt (Chamber Body)
        // Lớp nền buồng khí phát sáng mờ
        const gasInnerGrad = ctx.createLinearGradient(left, top, left, bottom);
        gasInnerGrad.addColorStop(0, 'rgba(15, 23, 42, 0.95)');
        gasInnerGrad.addColorStop(1, 'rgba(30, 41, 59, 0.9)');
        ctx.fillStyle = gasInnerGrad;
        ctx.fillRect(left, top, chamberW, chamberH);

        // Hiệu ứng phản xạ ánh sáng acrylic trên kính
        const glassReflect = ctx.createLinearGradient(left, top, left + chamberW, top + chamberH);
        glassReflect.addColorStop(0, 'rgba(255, 255, 255, 0.08)');
        glassReflect.addColorStop(0.3, 'rgba(255, 255, 255, 0.02)');
        glassReflect.addColorStop(0.5, 'rgba(56, 189, 248, 0.05)');
        glassReflect.addColorStop(1, 'rgba(255, 255, 255, 0.0)');
        ctx.fillStyle = glassReflect;
        ctx.fillRect(left, top, chamberW, chamberH);

        // Thành xilanh kim loại dày bọc ngoài (Đáy, Đỉnh, Trái)
        ctx.strokeStyle = '#475569';
        ctx.lineWidth = 10;
        ctx.lineCap = 'square';
        ctx.beginPath();
        ctx.moveTo(560, top - 5);
        ctx.lineTo(left - 5, top - 5);
        ctx.lineTo(left - 5, bottom + 5);
        ctx.lineTo(560, bottom + 5);
        ctx.stroke();

        // Viền crom bóng phản quang
        ctx.strokeStyle = '#94a3b8';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(560, top - 10);
        ctx.lineTo(left - 10, top - 10);
        ctx.lineTo(left - 10, bottom + 10);
        ctx.lineTo(560, bottom + 10);
        ctx.stroke();

        // Đinh tán cơ khí trên thành xilanh
        for (let by = top + 10; by < bottom; by += 35) {
            ctx.fillStyle = '#cbd5e1';
            ctx.beginPath();
            ctx.arc(left - 5, by, 3, 0, Math.PI * 2);
            ctx.fill();
        }

        // 3. Các phân tử khí phát sáng (Màu sắc biểu thị động năng)
        particles.forEach(pt => {
            const spd = Math.hypot(pt.vx, pt.vy);
            // Màu từ xanh cyan (lạnh) -> vàng -> đỏ cam (rực nóng)
            let col = '#38bdf8';
            if (p.tempK > 450) col = '#ef4444';
            else if (p.tempK > 350) col = '#f59e0b';
            else if (p.tempK < 200) col = '#60a5fa';

            // Quầng sáng quanh hạt
            ctx.fillStyle = col;
            ctx.shadowColor = col;
            ctx.shadowBlur = 6;
            ctx.beginPath();
            ctx.arc(pt.x, pt.y, pt.r, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;

            // Điểm sáng hạt
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(pt.x - 1, pt.y - 1, 1.2, 0, Math.PI * 2);
            ctx.fill();
        });

        // 4. Piston di động 3D kim loại có gioăng cao su & tay nắm
        const pistonW = 20;
        // Mặt piston tiếp xúc khí
        const pGrad = ctx.createLinearGradient(right - pistonW, 0, right, 0);
        pGrad.addColorStop(0, '#64748b');
        pGrad.addColorStop(0.3, '#94a3b8');
        pGrad.addColorStop(0.7, '#cbd5e1');
        pGrad.addColorStop(1, '#334155');
        ctx.fillStyle = pGrad;
        ctx.beginPath();
        ctx.roundRect(right - pistonW, top - 2, pistonW, chamberH + 4, 3);
        ctx.fill();
        ctx.strokeStyle = '#1e293b';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Gioăng cao su làm kín (O-rings)
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(right - pistonW + 4, top + 6, 4, chamberH - 12);
        ctx.fillRect(right - 8, top + 6, 4, chamberH - 12);

        // Thanh truyền piston dài bằng thép
        const rodH = 22;
        const rodY = top + chamberH / 2 - rodH / 2;
        const rodGrad = ctx.createLinearGradient(0, rodY, 0, rodY + rodH);
        rodGrad.addColorStop(0, '#94a3b8');
        rodGrad.addColorStop(0.4, '#f8fafc');
        rodGrad.addColorStop(1, '#475569');
        ctx.fillStyle = rodGrad;
        ctx.fillRect(right, rodY, 570 - right, rodH);
        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(right, rodY, 570 - right, rodH);

        // Tay nắm cầm kéo piston (Handle)
        ctx.fillStyle = '#eab308';
        ctx.beginPath();
        ctx.roundRect(565, rodY - 18, 14, rodH + 36, 4);
        ctx.fill();
        ctx.strokeStyle = '#a16207';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Mũi tên chỉ dẫn kéo
        ctx.fillStyle = '#0f172a';
        ctx.font = 'bold 9px "Space Grotesk", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('◄ KÉO ►', 572, rodY + rodH / 2 + 3);

        // 5. Đồng hồ đo áp suất Analog gắn nóc xilanh (PhET Pressure Gauge)
        const gaugeX = left + 90;
        const gaugeY = top - 20;
        // Ống đồng nối gauge
        ctx.fillStyle = '#b45309';
        ctx.fillRect(gaugeX - 5, top - 12, 10, 14);
        PhET.drawAnalogGauge(ctx, gaugeX, gaugeY - 32, 38, pressureReading, 0, 5, 'atm', 'ÁP SUẤT P');

        // 6. Nhiệt kế thủy ngân khoa học bên trái (PhET Thermometer)
        PhET.drawThermometer(ctx, left - 45, top + 25, 14, 180, p.tempK, 100, 800);

        // 7. Bếp cấp nhiệt / Làm lạnh ở đáy (PhET Burner)
        const burnerX = left + chamberW / 2;
        const burnerY = bottom + 25;
        const heatState = (p.tempK - 300) / 200; // >0: lửa, <0: băng
        PhET.drawHeaterCooler(ctx, burnerX, burnerY, Math.min(180, chamberW * 0.8), heatState);

        // 8. Bảng dữ liệu HUD Frosted Glass
        const volLiters = ((pistonX - 110) / 18).toFixed(1);
        PhET.drawHUD(ctx, 480, 290, '📊 THÔNG SỐ KHÍ', [
            { label: 'Nhiệt độ T', val: p.tempK.toFixed(0) + ' K (' + (p.tempK - 273.15).toFixed(0) + '°C)', color: '#fef08a' },
            { label: 'Áp suất P', val: pressureReading.toFixed(2) + ' atm', color: '#38bdf8' },
            { label: 'Thể tích V', val: volLiters + ' L', color: '#4ade80' },
            { label: 'Số hạt N', val: p.particleCount.toString(), color: '#f472b6' }
        ], 200);

        ctx.restore();
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
    const numParticles = 160;

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

    function resetSimulation() {
        const p = getParams();
        particles = [];
        const baseSpeed = Math.sqrt((3 * 8.314 * p.tempK) / (p.molarMass * 0.001)) * 0.09;

        for (let i = 0; i < numParticles; i++) {
            // Phân bố vận tốc ngẫu nhiên Maxwell
            const u1 = Math.random();
            const u2 = Math.random();
            const z = Math.sqrt(-2 * Math.log(Math.max(1e-5, u1))) * Math.cos(2 * Math.PI * u2);
            const spd = Math.max(0.5, baseSpeed * (0.6 + 0.45 * Math.abs(z)));
            const angle = Math.random() * Math.PI * 2;

            particles.push({
                x: 35 + Math.random() * 200,
                y: 65 + Math.random() * 290,
                vx: Math.cos(angle) * spd,
                vy: Math.sin(angle) * spd,
                r: p.molarMass > 30 ? 4.5 : (p.molarMass === 4 ? 3 : 3.8)
            });
        }
    }

    function update(dt) {
        const chamberW = 250;
        const chamberH = 390;

        particles.forEach(pt => {
            pt.x += pt.vx * dt * 35;
            pt.y += pt.vy * dt * 35;

            if (pt.x < 30 + pt.r) { pt.x = 30 + pt.r; pt.vx = Math.abs(pt.vx); }
            if (pt.x > chamberW - pt.r) { pt.x = chamberW - pt.r; pt.vx = -Math.abs(pt.vx); }
            if (pt.y < 50 + pt.r) { pt.y = 50 + pt.r; pt.vy = Math.abs(pt.vy); }
            if (pt.y > chamberH - pt.r) { pt.y = chamberH - pt.r; pt.vy = -Math.abs(pt.vy); }
        });

        // Va chạm đàn hồi giữa các phân tử
        for (let i = 0; i < particles.length; i++) {
            for (let j = i + 1; j < particles.length; j++) {
                const p1 = particles[i];
                const p2 = particles[j];
                const dx = p2.x - p1.x;
                const dy = p2.y - p1.y;
                const dist = Math.hypot(dx, dy);
                if (dist < p1.r + p2.r && dist > 0) {
                    const nx = dx / dist;
                    const ny = dy / dist;
                    const kx = p1.vx - p2.vx;
                    const ky = p1.vy - p2.vy;
                    const pComp = nx * kx + ny * ky;
                    p1.vx -= pComp * nx;
                    p1.vy -= pComp * ny;
                    p2.vx += pComp * nx;
                    p2.vy += pComp * ny;
                }
            }
        }
    }

    function draw() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        ctx.save();
        ctx.scale(canvas.width / 700, canvas.height / 460);

        PhET.drawLabBackground(ctx, 700, 460, 'PHÂN BỐ TỐC ĐỘ PHÂN TỬ MAXWELL-BOLTZMANN');

        const p = getParams();
        const M_kg = p.molarMass * 0.001;
        const R = 8.314;
        const v_mp = Math.sqrt((2 * R * p.tempK) / M_kg);
        const v_avg = Math.sqrt((8 * R * p.tempK) / (Math.PI * M_kg));
        const v_rms = Math.sqrt((3 * R * p.tempK) / M_kg);

        // 1. Bình chứa phân tử khí bên trái (Left Box)
        const boxX = 25;
        const boxY = 45;
        const boxW = 230;
        const boxH = 360;

        ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
        ctx.fillRect(boxX, boxY, boxW, boxH);
        ctx.strokeStyle = '#475569';
        ctx.lineWidth = 4;
        ctx.strokeRect(boxX, boxY, boxW, boxH);
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(boxX, boxY, boxW, boxH);

        // Tiêu đề buồng
        ctx.fillStyle = '#94a3b8';
        ctx.font = 'bold 11px "Space Grotesk", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('BUỒNG KHÍ HỖN LOẠN', boxX + boxW / 2, boxY - 8);

        // Vẽ các phân tử khí với màu theo vận tốc
        const speedScale = Math.sqrt((3 * R * p.tempK) / M_kg) / 14;
        particles.forEach(pt => {
            const spd = Math.hypot(pt.vx, pt.vy) * speedScale;
            let col = '#38bdf8'; // vừa
            if (spd > v_rms * 1.15) col = '#ef4444'; // rất nhanh
            else if (spd < v_mp * 0.7) col = '#60a5fa'; // chậm

            ctx.fillStyle = col;
            ctx.shadowColor = col;
            ctx.shadowBlur = 4;
            ctx.beginPath();
            ctx.arc(pt.x, pt.y, pt.r, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;
        });

        // 2. Biểu đồ phân bố Maxwell-Boltzmann bên phải (Right Graph)
        const chartX = 290;
        const chartY = 45;
        const chartW = 385;
        const chartH = 360;

        ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
        ctx.beginPath();
        ctx.roundRect(chartX, chartY, chartW, chartH, 8);
        ctx.fill();
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.3)';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Trục tọa độ
        const ox = chartX + 50;
        const oy = chartY + chartH - 45;
        const aw = chartW - 75;
        const ah = chartH - 85;

        // Lưới tọa độ đồ thị
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
        ctx.lineWidth = 1;
        for (let gx = 0; gx <= 5; gx++) {
            const px = ox + (gx / 5) * aw;
            ctx.beginPath(); ctx.moveTo(px, oy); ctx.lineTo(px, oy - ah); ctx.stroke();
        }
        for (let gy = 0; gy <= 4; gy++) {
            const py = oy - (gy / 4) * ah;
            ctx.beginPath(); ctx.moveTo(ox, py); ctx.lineTo(ox + aw, py); ctx.stroke();
        }

        ctx.strokeStyle = '#94a3b8';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(ox, oy); ctx.lineTo(ox + aw + 15, oy);
        ctx.moveTo(ox, oy); ctx.lineTo(ox, oy - ah - 15);
        ctx.stroke();

        ctx.fillStyle = '#cbd5e1';
        ctx.font = 'bold 11px "Space Grotesk", sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText('Vận tốc v (m/s) ►', ox + aw + 10, oy + 28);
        ctx.textAlign = 'left';
        ctx.fillText('▲ Xác suất f(v)', ox - 40, oy - ah - 6);

        // Max scale trục v
        const maxV = Math.max(1600, v_rms * 2.4);

        // Nhãn trục v
        ctx.fillStyle = '#64748b';
        ctx.font = '10px monospace';
        ctx.textAlign = 'center';
        for (let i = 0; i <= 4; i++) {
            const val = ((i / 4) * maxV).toFixed(0);
            ctx.fillText(val, ox + (i / 4) * aw, oy + 16);
        }

        // Vẽ Histogram thực tế từ mẫu hạt
        const bins = new Array(24).fill(0);
        particles.forEach(pt => {
            const spd = Math.hypot(pt.vx, pt.vy) * speedScale;
            const bIdx = Math.min(23, Math.floor((spd / maxV) * 24));
            bins[bIdx]++;
        });

        const binW = aw / 24;
        ctx.fillStyle = 'rgba(56, 189, 248, 0.18)';
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.4)';
        ctx.lineWidth = 1;
        bins.forEach((cnt, idx) => {
            const barH = (cnt / (numParticles * 0.18)) * ah;
            ctx.fillRect(ox + idx * binW, oy - barH, binW - 2, barH);
            ctx.strokeRect(ox + idx * binW, oy - barH, binW - 2, barH);
        });

        // Vẽ đường cong phân bố lý thuyết Maxwell-Boltzmann
        // f(v) = 4*pi * (M / (2*pi*R*T))^(3/2) * v^2 * exp(-M*v^2 / (2*R*T))
        const A = 4 * Math.PI * Math.pow(M_kg / (2 * Math.PI * R * p.tempK), 1.5);
        const f_max = A * v_mp * v_mp * Math.exp((-M_kg * v_mp * v_mp) / (2 * R * p.tempK));

        // Diện tích gradient dưới đường cong
        const areaGrad = ctx.createLinearGradient(0, oy - ah, 0, oy);
        areaGrad.addColorStop(0, 'rgba(245, 158, 11, 0.35)');
        areaGrad.addColorStop(1, 'rgba(245, 158, 11, 0.02)');

        ctx.beginPath();
        ctx.moveTo(ox, oy);
        for (let vx = 0; vx <= maxV; vx += 15) {
            const fv = A * vx * vx * Math.exp((-M_kg * vx * vx) / (2 * R * p.tempK));
            const px = ox + (vx / maxV) * aw;
            const py = oy - (fv / f_max) * (ah * 0.88);
            ctx.lineTo(px, py);
        }
        ctx.lineTo(ox + aw, oy);
        ctx.closePath();
        ctx.fillStyle = areaGrad;
        ctx.fill();

        // Đường cong lý thuyết chính
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 2.8;
        ctx.beginPath();
        for (let vx = 0; vx <= maxV; vx += 15) {
            const fv = A * vx * vx * Math.exp((-M_kg * vx * vx) / (2 * R * p.tempK));
            const px = ox + (vx / maxV) * aw;
            const py = oy - (fv / f_max) * (ah * 0.88);
            if (vx === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
        }
        ctx.stroke();

        // 3 vạch đứng vận tốc đặc trưng: v_mp (vàng), v_avg (xanh lá), v_rms (đỏ)
        function drawSpeedLine(val, label, col, yOffset) {
            if (val > maxV) return;
            const px = ox + (val / maxV) * aw;
            ctx.strokeStyle = col;
            ctx.setLineDash([4, 3]);
            ctx.lineWidth = 1.8;
            ctx.beginPath();
            ctx.moveTo(px, oy);
            ctx.lineTo(px, oy - ah);
            ctx.stroke();
            ctx.setLineDash([]);

            ctx.fillStyle = col;
            ctx.font = 'bold 10px "Space Grotesk", sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(label, px, oy - ah - yOffset);
            ctx.fillText(val.toFixed(0), px, oy + 14 + (yOffset > 10 ? 10 : 0));
        }

        drawSpeedLine(v_mp, 'v_xs', '#facc15', 5);
        drawSpeedLine(v_avg, 'v_tb', '#4ade80', 18);
        drawSpeedLine(v_rms, 'v_rms', '#ef4444', 5);

        // Chú giải góc trên
        ctx.font = '11px "Space Grotesk", sans-serif';
        ctx.textAlign = 'left';
        ctx.fillStyle = '#f59e0b';
        ctx.fillText('— Đường cong lý thuyết Maxwell', chartX + 16, chartY + 22);

        ctx.restore();
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
// 10. CÁC QUÁ TRÌNH NHIỆT ĐỘNG & CHU TRÌNH CARNOT (Carnot Cycle PhET)
// ─────────────────────────────────────────────────────────────
(function initCarnotCycle() {
    const canvas = document.getElementById('carnotCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    let currentStep = 0; // 0: Đẳng nhiệt TH, 1: Đoạn nhiệt giãn, 2: Đẳng nhiệt TC, 3: Đoạn nhiệt nén
    let progress = 0; // 0.0 -> 1.0
    let flywheelAngle = 0;

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

        const eta = (1 - p.Tc / p.Th) * 100;
        const etaEl = document.getElementById('carnot-eta');
        if (etaEl) etaEl.textContent = eta.toFixed(1) + ' %';
    }

    function update(dt) {
        progress += dt * 0.35;
        flywheelAngle += dt * 2.5;

        if (progress >= 1.0) {
            progress = 0;
            currentStep = (currentStep + 1) % 4;
        }

        const stepNames = [
            '1-2: Giãn đẳng nhiệt ở Th (Thu nhiệt Q_H từ nguồn nóng)',
            '2-3: Giãn đoạn nhiệt (Q = 0, nhiệt độ giảm Th → Tc)',
            '3-4: Nén đẳng nhiệt ở Tc (Nhả nhiệt Q_C ra nguồn lạnh)',
            '4-1: Nén đoạn nhiệt (Q = 0, nhiệt độ tăng Tc → Th)'
        ];

        const stEl = document.getElementById('carnot-step-name');
        if (stEl) stEl.textContent = stepNames[currentStep];
    }

    function draw() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        ctx.save();
        ctx.scale(canvas.width / 700, canvas.height / 460);

        PhET.drawLabBackground(ctx, 700, 460, 'ĐỘNG CƠ NHIỆT & CHU TRÌNH CARNOT');

        const p = getParams();

        // 1. Đồ thị P-V chuẩn xác bên trái
        drawPVDigram(ctx, 25, 45, 340, 360, p);

        // 2. Mô hình động cơ nhiệt cơ khí siêu thực bên phải
        drawEngineAssembly(ctx, 385, 45, 290, 360, p);

        ctx.restore();
    }

    function drawPVDigram(ctx, ox, oy, w, h, p) {
        ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
        ctx.beginPath();
        ctx.roundRect(ox, oy, w, h, 8);
        ctx.fill();
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.3)';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        const xBase = ox + 45;
        const yBase = oy + h - 45;
        const dw = w - 65;
        const dh = h - 75;

        // Trục V và P
        ctx.strokeStyle = '#94a3b8';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(xBase, yBase); ctx.lineTo(xBase + dw + 10, yBase);
        ctx.moveTo(xBase, yBase); ctx.lineTo(xBase, yBase - dh - 10);
        ctx.stroke();

        ctx.fillStyle = '#cbd5e1';
        ctx.font = 'bold 11px "Space Grotesk", sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText('Thể tích V ►', xBase + dw + 10, yBase + 28);
        ctx.textAlign = 'left';
        ctx.fillText('▲ Áp suất P', xBase - 35, yBase - dh - 5);

        // 4 điểm trạng thái Carnot
        const pt1 = { x: xBase + 35, y: yBase - dh * 0.88 };
        const pt2 = { x: xBase + 115, y: yBase - dh * 0.58 };
        const pt3 = { x: xBase + 225, y: yBase - dh * 0.22 };
        const pt4 = { x: xBase + 105, y: yBase - dh * 0.38 };

        // Diện tích công chu trình W = Q_H - Q_C phát sáng
        ctx.fillStyle = 'rgba(56, 189, 248, 0.22)';
        ctx.beginPath();
        ctx.moveTo(pt1.x, pt1.y);
        ctx.quadraticCurveTo((pt1.x + pt2.x) / 2, (pt1.y + pt2.y) / 2 + 10, pt2.x, pt2.y);
        ctx.quadraticCurveTo((pt2.x + pt3.x) / 2, (pt2.y + pt3.y) / 2 + 12, pt3.x, pt3.y);
        ctx.quadraticCurveTo((pt3.x + pt4.x) / 2, (pt3.y + pt4.y) / 2 - 10, pt4.x, pt4.y);
        ctx.quadraticCurveTo((pt4.x + pt1.x) / 2, (pt4.y + pt1.y) / 2 - 12, pt1.x, pt1.y);
        ctx.fill();

        // Chú thích công W ở tâm chu trình
        ctx.fillStyle = '#38bdf8';
        ctx.font = 'bold 12px "Space Grotesk", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Công W sinh ra', (pt1.x + pt3.x) / 2, (pt1.y + pt3.y) / 2 + 4);

        // 4 nhánh đường cong quá trình
        ctx.lineWidth = 3;

        // 1->2 Đẳng nhiệt Th (Đỏ rực)
        ctx.strokeStyle = '#ef4444';
        ctx.beginPath();
        ctx.moveTo(pt1.x, pt1.y);
        ctx.quadraticCurveTo((pt1.x + pt2.x) / 2, (pt1.y + pt2.y) / 2 + 10, pt2.x, pt2.y);
        ctx.stroke();

        // 2->3 Đoạn nhiệt giãn (Vàng cam)
        ctx.strokeStyle = '#f59e0b';
        ctx.beginPath();
        ctx.moveTo(pt2.x, pt2.y);
        ctx.quadraticCurveTo((pt2.x + pt3.x) / 2, (pt2.y + pt3.y) / 2 + 12, pt3.x, pt3.y);
        ctx.stroke();

        // 3->4 Đẳng nhiệt Tc (Xanh cyan)
        ctx.strokeStyle = '#38bdf8';
        ctx.beginPath();
        ctx.moveTo(pt3.x, pt3.y);
        ctx.quadraticCurveTo((pt3.x + pt4.x) / 2, (pt3.y + pt4.y) / 2 - 10, pt4.x, pt4.y);
        ctx.stroke();

        // 4->1 Đoạn nhiệt nén (Tím)
        ctx.strokeStyle = '#c084fc';
        ctx.beginPath();
        ctx.moveTo(pt4.x, pt4.y);
        ctx.quadraticCurveTo((pt4.x + pt1.x) / 2, (pt4.y + pt1.y) / 2 - 12, pt1.x, pt1.y);
        ctx.stroke();

        // Nhãn 4 đỉnh trạng thái 1, 2, 3, 4
        function drawVertex(pt, num) {
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(pt.x, pt.y, 4, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#f8fafc';
            ctx.font = 'bold 12px "Space Grotesk", sans-serif';
            ctx.fillText(num, pt.x + (num === '1' || num === '4' ? -14 : 10), pt.y + 4);
        }
        drawVertex(pt1, '1');
        drawVertex(pt2, '2');
        drawVertex(pt3, '3');
        drawVertex(pt4, '4');

        // Hạt trạng thái động chạy dọc chu trình (Green Pulsing Bead)
        let curX = pt1.x, curY = pt1.y;
        if (currentStep === 0) {
            curX = pt1.x + (pt2.x - pt1.x) * progress;
            curY = pt1.y + (pt2.y - pt1.y) * progress + Math.sin(progress * Math.PI) * 10;
        } else if (currentStep === 1) {
            curX = pt2.x + (pt3.x - pt2.x) * progress;
            curY = pt2.y + (pt3.y - pt2.y) * progress + Math.sin(progress * Math.PI) * 12;
        } else if (currentStep === 2) {
            curX = pt3.x + (pt4.x - pt3.x) * progress;
            curY = pt3.y + (pt4.y - pt3.y) * progress - Math.sin(progress * Math.PI) * 10;
        } else {
            curX = pt4.x + (pt1.x - pt4.x) * progress;
            curY = pt4.y + (pt1.y - pt4.y) * progress - Math.sin(progress * Math.PI) * 12;
        }

        ctx.fillStyle = '#22c55e';
        ctx.shadowColor = '#22c55e';
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(curX, curY, 7, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.stroke();
    }

    function drawEngineAssembly(ctx, ox, oy, w, h, p) {
        ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
        ctx.beginPath();
        ctx.roundRect(ox, oy, w, h, 8);
        ctx.fill();
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.3)';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        ctx.fillStyle = '#38bdf8';
        ctx.font = 'bold 12px "Space Grotesk", sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText('⚙️ CƠ CẤU ĐỘNG CƠ CARNOT', ox + 15, oy + 24);

        // Chuyển động piston dựa theo chu trình
        let pistonDisplace = 0;
        if (currentStep === 0) pistonDisplace = 35 + progress * 35;
        else if (currentStep === 1) pistonDisplace = 70 + progress * 40;
        else if (currentStep === 2) pistonDisplace = 110 - progress * 45;
        else pistonDisplace = 65 - progress * 30;

        const cylX = ox + 25;
        const cylY = oy + 55;
        const cylW = 160;
        const cylH = 95;

        // Khí bên trong xilanh (Đỏ rực khi Th, Xanh khi Tc)
        const gasColor = (currentStep === 0 || currentStep === 3)
            ? 'rgba(239, 68, 68, 0.45)'
            : 'rgba(56, 189, 248, 0.45)';
        ctx.fillStyle = gasColor;
        ctx.fillRect(cylX, cylY, pistonDisplace, cylH);

        // Thành xilanh kim loại
        ctx.strokeStyle = '#94a3b8';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(cylX + cylW, cylY);
        ctx.lineTo(cylX, cylY);
        ctx.lineTo(cylX, cylY + cylH);
        ctx.lineTo(cylX + cylW, cylY + cylH);
        ctx.stroke();

        // Piston kim loại di động
        const pGrad = ctx.createLinearGradient(cylX + pistonDisplace - 12, 0, cylX + pistonDisplace, 0);
        pGrad.addColorStop(0, '#64748b');
        pGrad.addColorStop(0.5, '#cbd5e1');
        pGrad.addColorStop(1, '#334155');
        ctx.fillStyle = pGrad;
        ctx.fillRect(cylX + pistonDisplace - 12, cylY + 2, 12, cylH - 4);
        ctx.strokeStyle = '#1e293b';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(cylX + pistonDisplace - 12, cylY + 2, 12, cylH - 4);

        // Bánh đà quay (Rotating Flywheel)
        const wheelCX = ox + 225;
        const wheelCY = cylY + cylH / 2;
        const wheelR = 45;

        // Vành ngoài bánh đà
        ctx.strokeStyle = '#64748b';
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.arc(wheelCX, wheelCY, wheelR, 0, Math.PI * 2);
        ctx.stroke();

        // Các nan hoa bánh đà quay
        ctx.strokeStyle = '#94a3b8';
        ctx.lineWidth = 2;
        for (let a = 0; a < Math.PI * 2; a += Math.PI / 3) {
            ctx.beginPath();
            ctx.moveTo(wheelCX, wheelCY);
            ctx.lineTo(wheelCX + Math.cos(a + flywheelAngle) * wheelR, wheelCY + Math.sin(a + flywheelAngle) * wheelR);
            ctx.stroke();
        }

        // Chốt thanh truyền trên bánh đà
        const crankPinX = wheelCX + Math.cos(flywheelAngle) * (wheelR * 0.55);
        const crankPinY = wheelCY + Math.sin(flywheelAngle) * (wheelR * 0.55);

        // Thanh truyền thép (Connecting Rod)
        ctx.strokeStyle = '#e2e8f0';
        ctx.lineWidth = 4;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(cylX + pistonDisplace, cylY + cylH / 2);
        ctx.lineTo(crankPinX, crankPinY);
        ctx.stroke();

        // Nguồn nhiệt tiếp xúc đáy xilanh
        const reservoirH = 26;
        const resY = cylY + cylH + 20;

        if (currentStep === 0) {
            // Nguồn nóng Th
            ctx.fillStyle = '#ef4444';
            ctx.beginPath();
            ctx.roundRect(cylX, resY, 90, reservoirH, 4);
            ctx.fill();
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 11px "Space Grotesk", sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(`🔥 Nguồn nóng (${p.Th}K)`, cylX + 45, resY + 17);
        } else if (currentStep === 2) {
            // Nguồn lạnh Tc
            ctx.fillStyle = '#0284c7';
            ctx.beginPath();
            ctx.roundRect(cylX, resY, 90, reservoirH, 4);
            ctx.fill();
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 11px "Space Grotesk", sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(`❄️ Nguồn lạnh (${p.Tc}K)`, cylX + 45, resY + 17);
        } else {
            // Cách nhiệt
            ctx.fillStyle = '#475569';
            ctx.beginPath();
            ctx.roundRect(cylX, resY, 90, reservoirH, 4);
            ctx.fill();
            ctx.fillStyle = '#cbd5e1';
            ctx.font = 'bold 11px "Space Grotesk", sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('🛡️ Cách nhiệt', cylX + 45, resY + 17);
        }

        // Bảng HUD thông số hiệu suất Carnot
        const eta = (1 - p.Tc / p.Th) * 100;
        PhET.drawHUD(ctx, ox + 15, oy + 230, '📊 HIỆU SUẤT ĐỘNG CƠ', [
            { label: 'Nhiệt độ nóng T_H', val: p.Th.toFixed(0) + ' K', color: '#f87171' },
            { label: 'Nhiệt độ lạnh T_C', val: p.Tc.toFixed(0) + ' K', color: '#38bdf8' },
            { label: 'Hiệu suất Carnot η', val: eta.toFixed(1) + ' %', color: '#22c55e' }
        ], w - 30);
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




/* ============================================================
   🌊 LP.VirtualLab - CHUYÊN ĐỀ 3: DAO ĐỘNG & SÓNG CƠ (Oscillations & Waves)
   Bao gồm 3 bài mô phỏng chuẩn mực PhET siêu trực quan:
   11. Dao động điều hòa: Con lắc lò xo & Con lắc đơn (Harmonic Oscillators)
   12. Dao động tắt dần và Hiện tượng Cộng hưởng (Damped & Forced Resonance)
   13. Sóng cơ học, Giao thoa sóng & Sóng dừng trên dây (Mechanical Waves & Standing Waves)
   Tác giả: Lê Ngọc Phú - SĐT: 0853257289
   ============================================================ */

// ─────────────────────────────────────────────────────────────
// 11. DAO ĐỘNG ĐIỀU HÒA (Harmonic Motion: Spring & Pendulum PhET)
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

        let omega = mode === 'spring' ? Math.sqrt(p.k / p.m) : Math.sqrt(p.g / p.L);

        t += dt;
        const x = p.A * Math.cos(omega * t);
        const v = -p.A * omega * Math.sin(omega * t);
        const a = -omega * omega * x;

        waveHistory.push(x);
        if (waveHistory.length > 180) waveHistory.shift();

        const xEl = document.getElementById('hm-disp');
        const vEl = document.getElementById('hm-vel');
        const aEl = document.getElementById('hm-acc');

        if (xEl) xEl.textContent = x.toFixed(3) + ' m';
        if (vEl) vEl.textContent = v.toFixed(3) + ' m/s';
        if (aEl) aEl.textContent = a.toFixed(3) + ' m/s²';
    }

    function draw() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        ctx.save();
        ctx.scale(canvas.width / 700, canvas.height / 460);

        PhET.drawLabBackground(ctx, 700, 460, 'DAO ĐỘNG ĐIỀU HÒA (CON LẮC LÒ XO & ĐƠN)');

        const p = getParams();
        let omega = mode === 'spring' ? Math.sqrt(p.k / p.m) : Math.sqrt(p.g / p.L);
        const x = p.A * Math.cos(omega * t);
        const v = -p.A * omega * Math.sin(omega * t);

        // Năng lượng: Động năng Ek, Thế năng Ep, Toàn phần Etot
        let Ek = 0, Ep = 0, Etot = 0;
        if (mode === 'spring') {
            Ek = 0.5 * p.m * v * v;
            Ep = 0.5 * p.k * x * x;
        } else {
            Ek = 0.5 * p.m * (p.L * v) * (p.L * v);
            // h = L * (1 - cos theta) approx L * 0.5 * theta^2
            const theta = (x / p.L);
            Ep = p.m * p.g * p.L * (1 - Math.cos(theta));
        }
        Etot = Ek + Ep;

        // 1. Bên trái: Cơ hệ dao động cơ học (Lò xo hoặc Con lắc đơn)
        const simW = 320;
        ctx.fillStyle = 'rgba(15, 23, 42, 0.7)';
        ctx.beginPath();
        ctx.roundRect(20, 40, simW, 375, 8);
        ctx.fill();
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.25)';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Thước đo vạch chia bên cạnh
        PhET.drawRuler(ctx, 40, 60, 290, true, 'cm', 'cm');

        if (mode === 'spring') {
            // CON LẮC LÒ XO TREO THẲNG ĐỨNG
            const mountX = 185;
            const mountY = 55;
            const restLen = 130;
            const currentLen = restLen + (x / p.A) * 65;

            // Giá treo kim loại đúc nặng
            ctx.fillStyle = '#475569';
            ctx.beginPath();
            ctx.roundRect(mountX - 45, mountY - 12, 90, 12, 3);
            ctx.fill();
            ctx.strokeStyle = '#94a3b8';
            ctx.lineWidth = 1.5;
            ctx.stroke();

            // Móc treo xoay
            ctx.strokeStyle = '#cbd5e1';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(mountX, mountY + 3, 5, 0, Math.PI);
            ctx.stroke();

            // Lò xo xoắn ốc 3D PhET
            PhET.drawCoiledSpring(ctx, mountX, mountY + 8, mountX, mountY + 8 + currentLen, 14, 18, '#38bdf8');

            // Quả nặng treo kim loại bằng đồng hoặc thép bóng
            const massY = mountY + 8 + currentLen;
            const bW = 46 + p.m * 4;
            const bH = 34 + p.m * 3;

            // Móc quả nặng
            ctx.strokeStyle = '#cbd5e1';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(mountX, massY - 3, 5, Math.PI, Math.PI * 2);
            ctx.stroke();

            // Khối kim loại 3D bo góc
            const massGrad = ctx.createLinearGradient(mountX - bW / 2, 0, mountX + bW / 2, 0);
            massGrad.addColorStop(0, '#0369a1');
            massGrad.addColorStop(0.3, '#38bdf8');
            massGrad.addColorStop(0.7, '#e0f2fe');
            massGrad.addColorStop(1, '#075985');
            ctx.fillStyle = massGrad;
            ctx.beginPath();
            ctx.roundRect(mountX - bW / 2, massY, bW, bH, 5);
            ctx.fill();
            ctx.strokeStyle = '#f8fafc';
            ctx.lineWidth = 1.5;
            ctx.stroke();

            // Nhãn khối lượng in sắc nét trên quả nặng
            ctx.fillStyle = '#0f172a';
            ctx.font = 'bold 12px "Space Grotesk", sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(`${p.m.toFixed(1)} kg`, mountX, massY + bH / 2 + 4);

            // Đường vị trí cân bằng (VTCB)
            const vtcbY = mountY + 8 + restLen + bH / 2;
            ctx.strokeStyle = '#ef4444';
            ctx.setLineDash([5, 4]);
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(85, vtcbY);
            ctx.lineTo(285, vtcbY);
            ctx.stroke();
            ctx.setLineDash([]);
            ctx.fillStyle = '#ef4444';
            ctx.font = 'bold 10px "Space Grotesk", sans-serif';
            ctx.fillText('VTCB (x = 0)', 240, vtcbY - 4);

            // Vector vận tốc v (xanh lá) và lực kéo về F (cam)
            PhET.drawVector(ctx, mountX + bW / 2 + 10, massY + bH / 2, 0, -v * 15, '#22c55e', 'v');
            PhET.drawVector(ctx, mountX - bW / 2 - 10, massY + bH / 2, 0, -x * 80, '#f97316', 'F_kv');

        } else {
            // CON LẮC ĐƠN DAO ĐỘNG
            const pivotX = 175;
            const pivotY = 70;
            const rodLenPx = 140 + p.L * 45;
            const theta = (p.A / p.L) * Math.cos(omega * t);

            const bobX = pivotX + rodLenPx * Math.sin(theta);
            const bobY = pivotY + rodLenPx * Math.cos(theta);

            // Giá treo gắn trần
            ctx.fillStyle = '#475569';
            ctx.beginPath();
            ctx.roundRect(pivotX - 35, pivotY - 12, 70, 12, 3);
            ctx.fill();
            ctx.strokeStyle = '#94a3b8';
            ctx.lineWidth = 1.5;
            ctx.stroke();

            // Trục quay bi ổ đỡ
            ctx.fillStyle = '#cbd5e1';
            ctx.beginPath();
            ctx.arc(pivotX, pivotY, 5, 0, Math.PI * 2);
            ctx.fill();

            // Dây treo con lắc
            ctx.strokeStyle = '#e2e8f0';
            ctx.lineWidth = 2.2;
            ctx.beginPath();
            ctx.moveTo(pivotX, pivotY);
            ctx.lineTo(bobX, bobY);
            ctx.stroke();

            // Vết cung dao động mờ
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
            ctx.setLineDash([3, 3]);
            ctx.beginPath();
            ctx.arc(pivotX, pivotY, rodLenPx, Math.PI / 2 - 0.45, Math.PI / 2 + 0.45);
            ctx.stroke();
            ctx.setLineDash([]);

            // Quả cầu con lắc phản xạ ánh sáng (Glossy Brass Sphere)
            const bobR = 15 + p.m * 2;
            const sphereGrad = ctx.createRadialGradient(bobX - bobR * 0.35, bobY - bobR * 0.35, 2, bobX, bobY, bobR);
            sphereGrad.addColorStop(0, '#fef08a');
            sphereGrad.addColorStop(0.3, '#f59e0b');
            sphereGrad.addColorStop(0.7, '#d97706');
            sphereGrad.addColorStop(1, '#78350f');
            ctx.fillStyle = sphereGrad;
            ctx.beginPath();
            ctx.arc(bobX, bobY, bobR, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 1.5;
            ctx.stroke();

            // Vector vận tốc tiếp tuyến v (xanh lá)
            const tangAngle = theta + Math.PI / 2;
            const vLen = -v * 16;
            PhET.drawVector(ctx, bobX, bobY, Math.cos(tangAngle) * vLen, Math.sin(tangAngle) * vLen, '#22c55e', 'v');
        }

        // 2. Bên phải phía trên: Biểu đồ thanh năng lượng (PhET Energy Bars)
        PhET.drawEnergyBars(ctx, 360, 40, 315, 150, [
            { label: 'Động năng', shortLabel: 'Đ.Năng', val: Ek, color: '#22c55e' },
            { label: 'Thế năng', shortLabel: 'Thế.Năng', val: Ep, color: '#38bdf8' },
            { label: 'Cơ năng', shortLabel: 'Cơ.Năng', val: Etot, color: '#f59e0b' }
        ]);

        // 3. Bên phải phía dưới: Đồ thị li độ x(t) thời gian thực
        const graphX = 360;
        const graphY = 205;
        const graphW = 315;
        const graphH = 210;

        ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
        ctx.beginPath();
        ctx.roundRect(graphX, graphY, graphW, graphH, 8);
        ctx.fill();
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.3)';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        const midY = graphY + graphH / 2 + 10;

        // Trục tọa độ
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(graphX + 15, midY - 60); ctx.lineTo(graphX + graphW - 15, midY - 60);
        ctx.moveTo(graphX + 15, midY + 60); ctx.lineTo(graphX + graphW - 15, midY + 60);
        ctx.stroke();

        ctx.strokeStyle = '#94a3b8';
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.moveTo(graphX + 15, midY);
        ctx.lineTo(graphX + graphW - 15, midY);
        ctx.stroke();

        ctx.fillStyle = '#cbd5e1';
        ctx.font = 'bold 11px "Space Grotesk", sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText('📈 ĐỒ THỊ LI ĐỘ x(t)', graphX + 15, graphY + 22);

        ctx.fillStyle = '#64748b';
        ctx.font = '10px monospace';
        ctx.fillText('+A', graphX + 18, midY - 64);
        ctx.fillText('0', graphX + 18, midY - 4);
        ctx.fillText('-A', graphX + 18, midY + 74);

        // Vẽ đường cong sóng li độ
        if (waveHistory.length > 1) {
            ctx.strokeStyle = '#38bdf8';
            ctx.lineWidth = 2.6;
            ctx.shadowColor = '#38bdf8';
            ctx.shadowBlur = 6;
            ctx.beginPath();
            const stepX = (graphW - 50) / 180;
            waveHistory.forEach((val, i) => {
                const px = (graphX + graphW - 20) - (waveHistory.length - i) * stepX;
                const py = midY - (val / p.A) * 60;
                if (i === 0) ctx.moveTo(px, py);
                else ctx.lineTo(px, py);
            });
            ctx.stroke();
            ctx.shadowBlur = 0;

            // Điểm đầu bút vẽ phát sáng
            const lastVal = waveHistory[waveHistory.length - 1];
            const endPx = graphX + graphW - 20;
            const endPy = midY - (lastVal / p.A) * 60;
            ctx.fillStyle = '#f8fafc';
            ctx.beginPath();
            ctx.arc(endPx, endPy, 4.5, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.restore();
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
// 12. DAO ĐỘNG TẮT DẦN VÀ HIỆN TƯỢNG CỘNG HƯỞNG (Resonance PhET)
// ─────────────────────────────────────────────────────────────
(function initResonanceDamping() {
    const canvas = document.getElementById('resonanceCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    let t = 0;
    let motorAngle = 0;

    function getParams() {
        const omega0El = document.getElementById('res-omega0');
        const gammaEl = document.getElementById('res-gamma');
        const driveOmegaEl = document.getElementById('res-drive-omega');
        const f0El = document.getElementById('res-f0');

        return {
            omega0: omega0El ? parseFloat(omega0El.value) : 5.0, // rad/s
            gamma: gammaEl ? parseFloat(gammaEl.value) : 0.3,    // Hệ số cản tắt dần
            driveOmega: driveOmegaEl ? parseFloat(driveOmegaEl.value) : 5.0, // Tần số cưỡng bức Omega
            F0: f0El ? parseFloat(f0El.value) : 10.0 // Biên độ lực cưỡng bức
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

        // Biên độ xác lập: A = (F0/m) / sqrt((omega0^2 - Omega^2)^2 + 4 * gamma^2 * Omega^2)
        const denom = Math.sqrt(Math.pow(p.omega0 * p.omega0 - p.driveOmega * p.driveOmega, 2) + 4 * p.gamma * p.gamma * p.driveOmega * p.driveOmega);
        const amp = denom > 0 ? (p.F0 / denom) : 0;

        const ampEl = document.getElementById('res-amplitude');
        const stEl = document.getElementById('res-status');

        if (ampEl) ampEl.textContent = amp.toFixed(2) + ' cm';
        if (stEl) {
            const diff = Math.abs(p.driveOmega - p.omega0);
            if (diff < 0.25) {
                stEl.textContent = '🔥 CỘNG HƯỞNG CỰC ĐẠI (Ω ≈ ω₀)! BIÊN ĐỘ ĐẠT ĐỈNH';
                stEl.style.color = '#ef4444';
            } else {
                stEl.textContent = 'Dao động điều hòa xác lập biên độ thường';
                stEl.style.color = '#10b981';
            }
        }
    }

    function draw() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        ctx.save();
        ctx.scale(canvas.width / 700, canvas.height / 460);

        PhET.drawLabBackground(ctx, 700, 460, 'DAO ĐỘNG TẮT DẦN & HIỆN TƯỢNG CỘNG HƯỞNG');

        const p = getParams();
        const denom = Math.sqrt(Math.pow(p.omega0 * p.omega0 - p.driveOmega * p.driveOmega, 2) + 4 * p.gamma * p.gamma * p.driveOmega * p.driveOmega);
        const ampCm = (p.F0 / denom);
        const ampPx = Math.min(85, ampCm * 14);
        const delta = Math.atan2(2 * p.gamma * p.driveOmega, p.omega0 * p.omega0 - p.driveOmega * p.driveOmega);

        // Vị trí con lắc tức thời
        const currentDisp = ampPx * Math.cos(p.driveOmega * t - delta);

        // 1. Bên trái: Bộ máy cơ học cưỡng bức & bình cản nhớt (Viscous Damper Beaker)
        const simW = 270;
        ctx.fillStyle = 'rgba(15, 23, 42, 0.7)';
        ctx.beginPath();
        ctx.roundRect(25, 45, simW, 370, 8);
        ctx.fill();
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.25)';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Động cơ điện cưỡng bức quay bên trên (Electric Motor with Eccentric Crank)
        const motorX = 160;
        const motorY = 85;
        const crankR = 18;

        // Vỏ động cơ điện
        ctx.fillStyle = '#334155';
        ctx.beginPath();
        ctx.roundRect(motorX - 35, motorY - 26, 70, 32, 4);
        ctx.fill();
        ctx.strokeStyle = '#94a3b8';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        ctx.fillStyle = '#f8fafc';
        ctx.font = 'bold 10px "Space Grotesk", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`MOTOR Ω = ${p.driveOmega.toFixed(1)}`, motorX, motorY - 10);

        // Bánh đà lệch tâm quay
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(motorX, motorY + 12, crankR, 0, Math.PI * 2);
        ctx.stroke();

        const crankX = motorX + Math.cos(motorAngle) * crankR;
        const crankY = (motorY + 12) + Math.sin(motorAngle) * crankR;

        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.arc(crankX, crankY, 4, 0, Math.PI * 2);
        ctx.fill();

        // Lò xo treo từ chốt quay xuống vật nặng
        const massTopY = 195 + currentDisp;
        PhET.drawCoiledSpring(ctx, crankX, crankY, motorX, massTopY, 12, 14, '#38bdf8');

        // Khối kim loại dao động (Mass Block)
        const massW = 45;
        const massH = 40;
        const mGrad = ctx.createLinearGradient(motorX - massW / 2, 0, motorX + massW / 2, 0);
        const isResonance = Math.abs(p.driveOmega - p.omega0) < 0.25;
        mGrad.addColorStop(0, isResonance ? '#b91c1c' : '#0369a1');
        mGrad.addColorStop(0.5, isResonance ? '#ef4444' : '#38bdf8');
        mGrad.addColorStop(1, isResonance ? '#7f1d1d' : '#0c4a6e');
        ctx.fillStyle = mGrad;
        ctx.beginPath();
        ctx.roundRect(motorX - massW / 2, massTopY, massW, massH, 4);
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Que giảm chấn cắm xuống cốc dầu bên dưới
        ctx.strokeStyle = '#94a3b8';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(motorX, massTopY + massH);
        ctx.lineTo(motorX, massTopY + massH + 45);
        ctx.stroke();

        // Cánh khuấy giảm chấn
        ctx.fillStyle = '#cbd5e1';
        ctx.fillRect(motorX - 18, massTopY + massH + 40, 36, 6);

        // Cốc thủy tinh đựng dầu giảm xóc (Oil Damping Beaker)
        const beakerX = motorX - 35;
        const beakerY = 275;
        const beakerW = 70;
        const beakerH = 120;

        // Dầu cản nhớt trong suốt
        ctx.fillStyle = 'rgba(56, 189, 248, 0.2)';
        ctx.fillRect(beakerX + 3, beakerY + 20, beakerW - 6, beakerH - 22);

        // Vỏ cốc thủy tinh
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(beakerX, beakerY);
        ctx.lineTo(beakerX, beakerY + beakerH);
        ctx.lineTo(beakerX + beakerW, beakerY + beakerH);
        ctx.lineTo(beakerX + beakerW, beakerY);
        ctx.stroke();

        ctx.fillStyle = '#94a3b8';
        ctx.font = '10px "Space Grotesk", sans-serif';
        ctx.fillText(`Dầu cản (γ = ${p.gamma})`, motorX, beakerY + beakerH - 10);

        // 2. Bên phải: Đồ thị đường cong cộng hưởng A(Ω) chuẩn mực
        const chartX = 315;
        const chartY = 45;
        const chartW = 360;
        const chartH = 370;

        drawResonanceChart(ctx, chartX, chartY, chartW, chartH, p, isResonance);

        ctx.restore();
    }

    function drawResonanceChart(ctx, ox, oy, w, h, p, isResonance) {
        ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
        ctx.beginPath();
        ctx.roundRect(ox, oy, w, h, 8);
        ctx.fill();
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.3)';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        const xBase = ox + 45;
        const yBase = oy + h - 45;
        const dw = w - 65;
        const dh = h - 85;

        // Trục tọa độ
        ctx.strokeStyle = '#94a3b8';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(xBase, yBase); ctx.lineTo(xBase + dw + 10, yBase);
        ctx.moveTo(xBase, yBase); ctx.lineTo(xBase, yBase - dh - 15);
        ctx.stroke();

        ctx.fillStyle = '#cbd5e1';
        ctx.font = 'bold 11px "Space Grotesk", sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText('Tần số ngoại lực Ω (rad/s) ►', xBase + dw + 10, yBase + 28);
        ctx.textAlign = 'left';
        ctx.fillText('▲ Biên độ A', xBase - 35, yBase - dh - 8);

        const maxOmega = 12.0;

        // Vạch chia trục tần số
        ctx.fillStyle = '#64748b';
        ctx.font = '10px monospace';
        ctx.textAlign = 'center';
        for (let i = 0; i <= 6; i++) {
            const val = ((i / 6) * maxOmega).toFixed(0);
            ctx.fillText(val, xBase + (i / 6) * dw, yBase + 16);
        }

        // Vẽ đường cong biên độ A theo Omega
        let maxA = 0;
        for (let wTest = 0.1; wTest <= maxOmega; wTest += 0.1) {
            const d = Math.sqrt(Math.pow(p.omega0 * p.omega0 - wTest * wTest, 2) + 4 * p.gamma * p.gamma * wTest * wTest);
            const a = (p.F0 / d);
            if (a > maxA) maxA = a;
        }

        // Vùng diện tích gradient dưới đường cong cộng hưởng
        const curveGrad = ctx.createLinearGradient(0, yBase - dh, 0, yBase);
        curveGrad.addColorStop(0, 'rgba(239, 68, 68, 0.45)');
        curveGrad.addColorStop(0.5, 'rgba(56, 189, 248, 0.25)');
        curveGrad.addColorStop(1, 'rgba(56, 189, 248, 0.02)');

        ctx.beginPath();
        ctx.moveTo(xBase, yBase);
        for (let wTest = 0.1; wTest <= maxOmega; wTest += 0.08) {
            const d = Math.sqrt(Math.pow(p.omega0 * p.omega0 - wTest * wTest, 2) + 4 * p.gamma * p.gamma * wTest * wTest);
            const a = (p.F0 / d);
            const px = xBase + (wTest / maxOmega) * dw;
            const py = yBase - (a / maxA) * (dh * 0.9);
            ctx.lineTo(px, py);
        }
        ctx.lineTo(xBase + dw, yBase);
        ctx.closePath();
        ctx.fillStyle = curveGrad;
        ctx.fill();

        // Đường cong chính
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 2.8;
        ctx.beginPath();
        for (let wTest = 0.1; wTest <= maxOmega; wTest += 0.08) {
            const d = Math.sqrt(Math.pow(p.omega0 * p.omega0 - wTest * wTest, 2) + 4 * p.gamma * p.gamma * wTest * wTest);
            const a = (p.F0 / d);
            const px = xBase + (wTest / maxOmega) * dw;
            const py = yBase - (a / maxA) * (dh * 0.9);
            if (wTest === 0.1) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
        }
        ctx.stroke();

        // Đỉnh cộng hưởng omega_0
        const peakX = xBase + (p.omega0 / maxOmega) * dw;
        const peakY = yBase - (dh * 0.9);

        ctx.strokeStyle = '#ef4444';
        ctx.setLineDash([4, 3]);
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(peakX, yBase);
        ctx.lineTo(peakX, peakY);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.arc(peakX, peakY, 5.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.font = 'bold 11px "Space Grotesk", sans-serif';
        ctx.fillText('Đỉnh cộng hưởng ω₀', peakX, peakY - 12);

        // Vị trí tần số cưỡng bức hiện tại (Tracer Bead)
        const curPx = xBase + (p.driveOmega / maxOmega) * dw;
        const curD = Math.sqrt(Math.pow(p.omega0 * p.omega0 - p.driveOmega * p.driveOmega, 2) + 4 * p.gamma * p.gamma * p.driveOmega * p.driveOmega);
        const curA = (p.F0 / curD);
        const curPy = yBase - (curA / maxA) * (dh * 0.9);

        ctx.fillStyle = isResonance ? '#ef4444' : '#f59e0b';
        ctx.shadowColor = isResonance ? '#ef4444' : '#f59e0b';
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(curPx, curPy, 7, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Nhãn điểm hiện tại
        ctx.fillStyle = '#f8fafc';
        ctx.font = 'bold 10px "Space Grotesk", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`Ω = ${p.driveOmega.toFixed(1)}`, curPx, curPy - 14);
    }

    let lastTime = performance.now();
    function loop(now) {
        const dt = Math.min((now - lastTime) / 1000, 0.05);
        lastTime = now;
        t += dt;
        motorAngle += dt * p.driveOmega;
        draw();
        requestAnimationFrame(loop);
    }

    let p = getParams();
    function onInput() {
        p = getParams();
        syncLabels();
    }

    ['res-omega0', 'res-gamma', 'res-drive-omega', 'res-f0'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('input', onInput);
    });

    syncLabels();
    requestAnimationFrame(loop);
})();

// ─────────────────────────────────────────────────────────────
// 13. SÓNG CƠ, GIAO THOA VÀ SÓNG DỪNG (Waves & Interference & Standing PhET)
// ─────────────────────────────────────────────────────────────
(function initWavesInterferenceStanding() {
    const canvas = document.getElementById('wavesInterferenceCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    let mode = 'standing'; // 'standing' or 'interference'
    let t = 0;

    function getParams() {
        const harmEl = document.getElementById('wave-harmonics');
        const freqEl = document.getElementById('wave-freq');
        const ampEl = document.getElementById('wave-amp');

        return {
            harmonicN: harmEl ? parseInt(harmEl.value) : 3, // Bậc họa ba n = 1, 2, 3, 4, 5
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
        
        ctx.save();
        ctx.scale(canvas.width / 700, canvas.height / 460);

        PhET.drawLabBackground(ctx, 700, 460, 'SÓNG CƠ HỌC: SÓNG DỪNG & GIAO THOA SÓNG');

        const p = getParams();

        if (mode === 'standing') {
            drawStandingWave(ctx, p);
        } else {
            drawInterferencePattern(ctx, p);
        }

        ctx.restore();
    }

    function drawStandingWave(ctx, p) {
        const startX = 70;
        const endX = 630;
        const len = endX - startX;
        const midY = 230;

        // Hai ngàm kẹp cố định đầu dây bằng gang đúc (Heavy Clamps)
        function drawClamp(cx, cy) {
            ctx.fillStyle = '#334155';
            ctx.beginPath();
            ctx.roundRect(cx - 15, cy - 70, 30, 140, 5);
            ctx.fill();
            ctx.strokeStyle = '#94a3b8';
            ctx.lineWidth = 2;
            ctx.stroke();

            // Đinh ốc vặn cố định
            ctx.fillStyle = '#f59e0b';
            ctx.beginPath();
            ctx.arc(cx, cy - 40, 6, 0, Math.PI * 2);
            ctx.arc(cx, cy + 40, 6, 0, Math.PI * 2);
            ctx.fill();
        }
        drawClamp(startX - 15, midY);
        drawClamp(endX + 15, midY);

        // Trục trung tâm nét đứt
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
        ctx.setLineDash([6, 5]);
        ctx.beginPath();
        ctx.moveTo(startX, midY);
        ctx.lineTo(endX, midY);
        ctx.stroke();
        ctx.setLineDash([]);

        const omega = 2 * Math.PI * p.freq;
        const timeFactor = Math.cos(omega * t);

        // 1. Vùng bao biên độ dao động (Bóng mờ dạ quang)
        ctx.fillStyle = 'rgba(56, 189, 248, 0.08)';
        ctx.beginPath();
        ctx.moveTo(startX, midY);
        for (let x = 0; x <= len; x += 3) {
            const kx = (p.harmonicN * Math.PI * x) / len;
            const envY = midY - p.amplitude * Math.sin(kx);
            ctx.lineTo(startX + x, envY);
        }
        for (let x = len; x >= 0; x -= 3) {
            const kx = (p.harmonicN * Math.PI * x) / len;
            const envY = midY + p.amplitude * Math.sin(kx);
            ctx.lineTo(startX + x, envY);
        }
        ctx.closePath();
        ctx.fill();

        // 2. Đường bao nét đứt trên dưới
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.35)';
        ctx.lineWidth = 1.2;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        for (let x = 0; x <= len; x += 3) {
            const kx = (p.harmonicN * Math.PI * x) / len;
            ctx.lineTo(startX + x, midY - p.amplitude * Math.sin(kx));
        }
        ctx.stroke();
        ctx.beginPath();
        for (let x = 0; x <= len; x += 3) {
            const kx = (p.harmonicN * Math.PI * x) / len;
            ctx.lineTo(startX + x, midY + p.amplitude * Math.sin(kx));
        }
        ctx.stroke();
        ctx.setLineDash([]);

        // 3. Sợi dây sóng đàn hồi đang rung rực rỡ phát sáng
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 4.5;
        ctx.shadowColor = '#38bdf8';
        ctx.shadowBlur = 10;
        ctx.beginPath();
        for (let x = 0; x <= len; x += 2) {
            const kx = (p.harmonicN * Math.PI * x) / len;
            const curY = midY - p.amplitude * Math.sin(kx) * timeFactor;
            if (x === 0) ctx.moveTo(startX + x, curY);
            else ctx.lineTo(startX + x, curY);
        }
        ctx.stroke();
        ctx.shadowBlur = 0;

        // Lõi sáng trắng giữa sợi dây
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        for (let x = 0; x <= len; x += 2) {
            const kx = (p.harmonicN * Math.PI * x) / len;
            const curY = midY - p.amplitude * Math.sin(kx) * timeFactor;
            if (x === 0) ctx.moveTo(startX + x, curY);
            else ctx.lineTo(startX + x, curY);
        }
        ctx.stroke();

        // 4. Đánh dấu các Nút sóng (Nodes - Màu đỏ đứng yên)
        for (let i = 0; i <= p.harmonicN; i++) {
            const nx = startX + (i / p.harmonicN) * len;
            ctx.fillStyle = '#ef4444';
            ctx.shadowColor = '#ef4444';
            ctx.shadowBlur = 8;
            ctx.beginPath();
            ctx.arc(nx, midY, 6.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 2;
            ctx.stroke();

            ctx.fillStyle = '#f87171';
            ctx.font = 'bold 11px "Space Grotesk", sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('Nút', nx, midY + 22);
        }

        // 5. Đánh dấu các Bụng sóng (Antinodes - Màu vàng cực đại)
        for (let i = 0; i < p.harmonicN; i++) {
            const ax = startX + ((i + 0.5) / p.harmonicN) * len;
            ctx.fillStyle = '#facc15';
            ctx.font = 'bold 11px "Space Grotesk", sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('Bụng', ax, midY - p.amplitude - 14);
        }

        // Bảng HUD thông số sóng dừng
        PhET.drawHUD(ctx, 35, 340, '📊 ĐẶC TRƯNG SÓNG DỪNG', [
            { label: 'Bậc họa ba', val: `n = ${p.harmonicN}`, color: '#38bdf8' },
            { label: 'Số nút sóng', val: `${p.harmonicN + 1} nút`, color: '#f87171' },
            { label: 'Số bụng sóng', val: `${p.harmonicN} bụng`, color: '#facc15' },
            { label: 'Bước sóng λ', val: `${((2 * 1.2) / p.harmonicN).toFixed(2)} m`, color: '#4ade80' }
        ], 630);
    }

    function drawInterferencePattern(ctx, p) {
        // Giao thoa sóng nước 2D (Ripple Tank)
        const s1 = { x: 260, y: 210 };
        const s2 = { x: 440, y: 210 };
        const lambda = 36;

        // Vùng chậu nước ripple tank
        ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
        ctx.fillRect(40, 45, 620, 340);
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 2;
        ctx.strokeRect(40, 45, 620, 340);

        // Các vòng sóng đồng tâm lan tỏa
        for (let r = 8; r < 360; r += lambda) {
            const curR = (r + t * 45) % 360;
            const alpha = Math.max(0.05, 0.45 * (1 - curR / 360));
            ctx.strokeStyle = `rgba(56, 189, 248, ${alpha})`;
            ctx.lineWidth = 2;

            ctx.beginPath();
            ctx.arc(s1.x, s1.y, curR, 0, Math.PI * 2);
            ctx.stroke();

            ctx.beginPath();
            ctx.arc(s2.x, s2.y, curR, 0, Math.PI * 2);
            ctx.stroke();
        }

        // 2 đầu cần rung tạo sóng
        function drawSource(s, label) {
            ctx.fillStyle = '#ef4444';
            ctx.shadowColor = '#ef4444';
            ctx.shadowBlur = 10;
            ctx.beginPath();
            ctx.arc(s.x, s.y, 8, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 2;
            ctx.stroke();

            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 12px "Space Grotesk", sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(label, s.x, s.y - 14);
        }
        drawSource(s1, 'Nguồn S₁');
        drawSource(s2, 'Nguồn S₂');

        // Chú giải
        ctx.fillStyle = '#f8fafc';
        ctx.font = 'bold 12px "Space Grotesk", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('🌊 BỂ TẠO SÓNG NƯỚC GIAO THOA 2 NGUỒN KẾT HỢP (d₂ - d₁ = kλ)', 350, 75);
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
// 17. TỪ TRƯỜNG & LỰC LORENTZ (Magnetic Field & Lorentz Force PhET)
// ─────────────────────────────────────────────────────────────
(function initLorentzForce() {
    const canvas = document.getElementById('lorentzCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    let particle = { x: 140, y: 230, vx: 5, vy: 0, q: 1.0, m: 1.0 };
    let trail = [];
    let running = true;

    function getParams() {
        const bEl = document.getElementById('lorentz-b');
        const vEl = document.getElementById('lorentz-v');
        const qEl = document.getElementById('lorentz-q');

        return {
            B: bEl ? parseFloat(bEl.value) : 1.2,
            v0: vEl ? parseFloat(vEl.value) : 25,
            q: qEl ? parseFloat(qEl.value) : 1.0
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

        const R = (1.0 * p.v0) / (Math.abs(p.q) * Math.abs(p.B));
        const T = (2 * Math.PI * 1.0) / (Math.abs(p.q) * Math.abs(p.B));

        const rEl = document.getElementById('lorentz-radius');
        const tEl = document.getElementById('lorentz-period');
        if (rEl) rEl.textContent = R.toFixed(2) + ' m';
        if (tEl) tEl.textContent = T.toFixed(2) + ' s';
    }

    function resetSimulation() {
        const p = getParams();
        particle.x = 160;
        particle.y = 230;
        particle.vx = p.v0 * 2.6;
        particle.vy = 0;
        particle.q = p.q;
        trail = [];
        running = true;
    }

    function update(dt) {
        if (!running) return;
        const p = getParams();

        const B = p.B;
        const q = particle.q;

        const ax = (q * particle.vy * B) / particle.m;
        const ay = (-q * particle.vx * B) / particle.m;

        particle.vx += ax * dt * 4;
        particle.vy += ay * dt * 4;

        particle.x += particle.vx * dt;
        particle.y += particle.vy * dt;

        trail.push({ x: particle.x, y: particle.y });
        if (trail.length > 280) trail.shift();

        if (particle.x < 50 || particle.x > 650 || particle.y < 50 || particle.y > 410) {
            resetSimulation();
        }
    }

    function draw() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        ctx.save();
        ctx.scale(canvas.width / 700, canvas.height / 460);

        PhET.drawLabBackground(ctx, 700, 460, 'LỰC LORENTZ & CHUYỂN ĐỘNG TRONG TỪ TRƯỜNG');

        const p = getParams();

        // 1. Bình ống tia điện tử chân không (Vacuum Chamber)
        ctx.fillStyle = 'rgba(15, 23, 42, 0.75)';
        ctx.beginPath();
        ctx.roundRect(100, 40, 560, 380, 20);
        ctx.fill();
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.35)';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Lưới từ trường B đều hướng vào mặt phẳng ⨂
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.22)';
        ctx.lineWidth = 1.4;
        for (let x = 130; x <= 630; x += 45) {
            for (let y = 70; y <= 390; y += 45) {
                ctx.beginPath();
                ctx.arc(x, y, 8, 0, Math.PI * 2);
                ctx.stroke();

                ctx.beginPath();
                ctx.moveTo(x - 4, y - 4); ctx.lineTo(x + 4, y + 4);
                ctx.moveTo(x + 4, y - 4); ctx.lineTo(x - 4, y + 4);
                ctx.stroke();
            }
        }

        // Nhãn từ trường B
        ctx.fillStyle = '#38bdf8';
        ctx.font = 'bold 12px "Space Grotesk", sans-serif';
        ctx.fillText(`Từ trường đều B = ${p.B.toFixed(1)} T (hướng vào trong ⨂)`, 120, 62);

        // 2. Súng phóng hạt điện tích bên trái
        ctx.fillStyle = '#334155';
        ctx.beginPath();
        ctx.roundRect(40, 205, 90, 50, 4);
        ctx.fill();
        ctx.strokeStyle = '#94a3b8';
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.fillStyle = '#f8fafc';
        ctx.font = 'bold 10px "Space Grotesk", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('SÚNG PHÓNG', 85, 230);
        ctx.fillText(`v₀ = ${p.v0} m/s`, 85, 245);

        ctx.fillStyle = '#eab308';
        ctx.fillRect(130, 222, 15, 16);

        // 3. Vệt quỹ đạo chuyển động phát sáng dạ quang
        if (trail.length > 1) {
            ctx.strokeStyle = '#38bdf8';
            ctx.lineWidth = 3.5;
            ctx.shadowColor = '#38bdf8';
            ctx.shadowBlur = 10;
            ctx.beginPath();
            trail.forEach((pt, i) => {
                if (i === 0) ctx.moveTo(pt.x, pt.y);
                else ctx.lineTo(pt.x, pt.y);
            });
            ctx.stroke();
            ctx.shadowBlur = 0;
        }

        // 4. Hạt mang điện phát sáng rực rỡ
        const isPos = particle.q > 0;
        const col = isPos ? '#ef4444' : '#38bdf8';
        ctx.fillStyle = col;
        ctx.shadowColor = col;
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, 11, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 14px "Space Grotesk", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(isPos ? '+' : '−', particle.x, particle.y + 4.5);

        // Vector vận tốc tiếp tuyến v (xanh lá)
        PhET.drawVector(ctx, particle.x, particle.y, particle.vx * 0.45, particle.vy * 0.45, '#22c55e', 'v', 2.8);

        // Vector lực Lorentz hướng tâm F_L (đỏ)
        const fx = (particle.q * particle.vy * p.B) * 0.55;
        const fy = (-particle.q * particle.vx * p.B) * 0.55;
        PhET.drawVector(ctx, particle.x, particle.y, fx, fy, '#f97316', 'F_L', 2.8);

        // HUD thông số quỹ đạo
        const R = (1.0 * p.v0) / (Math.abs(p.q) * Math.abs(p.B));
        const T = (2 * Math.PI * 1.0) / (Math.abs(p.q) * Math.abs(p.B));
        PhET.drawHUD(ctx, 470, 290, '📊 CHUYỂN ĐỘNG TRÒN CYCLOTRON', [
            { label: 'Bán kính R', val: `${R.toFixed(2)} m`, color: '#38bdf8' },
            { label: 'Chu kỳ quay T', val: `${T.toFixed(2)} s`, color: '#facc15' },
            { label: 'Tần số cyclotron f', val: `${(1 / T).toFixed(2)} Hz`, color: '#4ade80' }
        ], 210);

        ctx.restore();
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
// 18. CẢM ỨNG ĐIỆN TỪ (Faraday & Lenz Induction PhET)
// ─────────────────────────────────────────────────────────────
(function initFaradayInduction() {
    const canvas = document.getElementById('faradayCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    let magnetX = 160;
    let magnetVx = 0;
    let draggingMagnet = false;
    let inducedEMF = 0;

    function getParams() {
        const turnsEl = document.getElementById('faraday-turns');
        return {
            N: turnsEl ? parseInt(turnsEl.value) : 10
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
        const mx = (e.clientX - rect.left) * (canvas.width / rect.width) * (700 / canvas.width);
        if (Math.abs(mx - magnetX) < 70) {
            draggingMagnet = true;
        }
    });

    window.addEventListener('mousemove', (e) => {
        if (!draggingMagnet) return;
        const rect = canvas.getBoundingClientRect();
        const mx = (e.clientX - rect.left) * (canvas.width / rect.width) * (700 / canvas.width);
        const oldX = magnetX;
        magnetX = Math.max(90, Math.min(610, mx));
        magnetVx = (magnetX - oldX) * 60;
    });

    window.addEventListener('mouseup', () => {
        draggingMagnet = false;
        magnetVx = 0;
    });

    function update() {
        const p = getParams();
        const coilCenterX = 450;
        const dist = Math.abs(magnetX - coilCenterX);

        if (dist < 200 && Math.abs(magnetVx) > 1) {
            const grad = (magnetX - coilCenterX) / Math.pow(dist * 0.1 + 10, 2);
            inducedEMF = -p.N * 0.06 * grad * (magnetVx / 45);
        } else {
            inducedEMF *= 0.88;
        }

        syncLabels();
    }

    function draw() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        ctx.save();
        ctx.scale(canvas.width / 700, canvas.height / 460);

        PhET.drawLabBackground(ctx, 700, 460, 'CẢM ỨNG ĐIỆN TỪ FARADAY & ĐỊNH LUẬT LENZ');

        const p = getParams();
        const coilCenterX = 450;
        const coilY = 240;

        // 1. Đường sức từ trường của nam châm
        ctx.save();
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.18)';
        ctx.lineWidth = 1.5;
        for (let rad = 35; rad <= 120; rad += 25) {
            ctx.beginPath();
            ctx.ellipse(magnetX, coilY, rad * 1.5, rad, 0, 0, Math.PI * 2);
            ctx.stroke();
        }
        ctx.restore();

        // 2. Thanh nam châm thẳng N-S siêu thực
        const magW = 120;
        const magH = 42;
        const magY = coilY - magH / 2;

        // Cực Bắc N (Đỏ rực)
        const nGrad = ctx.createLinearGradient(magnetX, 0, magnetX + magW / 2, 0);
        nGrad.addColorStop(0, '#ef4444');
        nGrad.addColorStop(0.5, '#f87171');
        nGrad.addColorStop(1, '#b91c1c');
        ctx.fillStyle = nGrad;
        ctx.beginPath();
        ctx.roundRect(magnetX, magY, magW / 2, magH, [0, 4, 4, 0]);
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 16px "Space Grotesk", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('N', magnetX + magW / 4, magY + 27);

        // Cực Nam S (Xanh lam bóng)
        const sGrad = ctx.createLinearGradient(magnetX - magW / 2, 0, magnetX, 0);
        sGrad.addColorStop(0, '#1d4ed8');
        sGrad.addColorStop(0.5, '#60a5fa');
        sGrad.addColorStop(1, '#2563eb');
        ctx.fillStyle = sGrad;
        ctx.beginPath();
        ctx.roundRect(magnetX - magW / 2, magY, magW / 2, magH, [4, 0, 0, 4]);
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        ctx.fillStyle = '#ffffff';
        ctx.fillText('S', magnetX - magW / 4, magY + 27);

        ctx.fillStyle = '#facc15';
        ctx.font = 'bold 11px "Space Grotesk", sans-serif';
        ctx.fillText('◄ KÉO RÊ NAM CHÂM VÀO/RA CUỘN DÂY ►', magnetX, magY - 14);

        // 3. Cuộn dây Solenoid 3D đồng
        const coilW = 140;
        const step = coilW / p.N;

        ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
        ctx.fillRect(coilCenterX - coilW / 2 - 10, coilY - 35, coilW + 20, 70);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(coilCenterX - coilW / 2 - 10, coilY - 35, coilW + 20, 70);

        for (let i = 0; i < p.N; i++) {
            const cx = (coilCenterX - coilW / 2) + i * step + step / 2;
            const copGrad = ctx.createLinearGradient(cx - 6, 0, cx + 6, 0);
            copGrad.addColorStop(0, '#b45309');
            copGrad.addColorStop(0.4, '#fef08a');
            copGrad.addColorStop(0.8, '#d97706');
            copGrad.addColorStop(1, '#78350f');

            ctx.strokeStyle = copGrad;
            ctx.lineWidth = 5;
            ctx.beginPath();
            ctx.ellipse(cx, coilY, 9, 44, 0, 0, Math.PI * 2);
            ctx.stroke();
        }

        // 4. Bóng đèn sợi đốt phát sáng khi có dòng cảm ứng
        const bulbX = coilCenterX - 45;
        const bulbY = 85;
        const glowIntensity = Math.min(1.0, Math.abs(inducedEMF) * 1.5);

        if (glowIntensity > 0.05) {
            const bulbGlow = ctx.createRadialGradient(bulbX, bulbY, 5, bulbX, bulbY, 55 * glowIntensity);
            bulbGlow.addColorStop(0, 'rgba(254, 240, 138, 0.9)');
            bulbGlow.addColorStop(0.4, 'rgba(245, 158, 11, 0.4)');
            bulbGlow.addColorStop(1, 'rgba(245, 158, 11, 0)');
            ctx.fillStyle = bulbGlow;
            ctx.beginPath();
            ctx.arc(bulbX, bulbY, 55 * glowIntensity, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.fillStyle = glowIntensity > 0.05 ? 'rgba(254, 240, 138, 0.85)' : 'rgba(241, 245, 249, 0.25)';
        ctx.beginPath();
        ctx.arc(bulbX, bulbY, 18, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        ctx.fillStyle = '#64748b';
        ctx.fillRect(bulbX - 8, bulbY + 18, 16, 10);

        // 5. Điện kế nhạy Galvanometer kim 0 ở giữa
        PhET.drawAnalogGauge(ctx, coilCenterX + 65, 85, 38, inducedEMF, -2.5, 2.5, 'V', 'ĐIỆN KẾ G');

        ctx.strokeStyle = '#94a3b8';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(coilCenterX - coilW / 2, coilY + 40);
        ctx.lineTo(coilCenterX - coilW / 2, 140);
        ctx.lineTo(bulbX, 140);
        ctx.lineTo(bulbX, bulbY + 28);

        ctx.moveTo(coilCenterX + coilW / 2, coilY + 40);
        ctx.lineTo(coilCenterX + coilW / 2, 140);
        ctx.lineTo(coilCenterX + 65, 140);
        ctx.lineTo(coilCenterX + 65, 125);
        ctx.stroke();

        ctx.restore();
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
// 19. MẠCH ĐIỆN XOAY CHIỀU A.C. RLC (AC Resonance & Phasor PhET)
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
            R: rEl ? parseFloat(rEl.value) : 40,
            L: lEl ? parseFloat(lEl.value) : 0.2,
            C: cEl ? parseFloat(cEl.value) : 100,
            f: fEl ? parseFloat(fEl.value) : 50
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

        const omega = 2 * Math.PI * p.f;
        const ZL = omega * p.L;
        const ZC = 1 / (omega * p.C * 1e-6);
        const Z = Math.sqrt(p.R * p.R + Math.pow(ZL - ZC, 2));
        const phi = Math.atan2(ZL - ZC, p.R);

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
        
        ctx.save();
        ctx.scale(canvas.width / 700, canvas.height / 460);

        PhET.drawLabBackground(ctx, 700, 460, 'MẠCH ĐIỆN XOAY CHIỀU R-L-C & GIẢN ĐỒ FRESNEL');

        const p = getParams();
        const omega = 2 * Math.PI * p.f;
        const ZL = omega * p.L;
        const ZC = 1 / (omega * p.C * 1e-6);
        const Z = Math.sqrt(p.R * p.R + Math.pow(ZL - ZC, 2));
        const phi = Math.atan2(ZL - ZC, p.R);

        const U0 = 100;
        const I0 = (U0 / Z) * 22;

        drawOscilloscope(ctx, 25, 45, 360, 360, omega, phi, U0, I0);
        drawFresnelDiagram(ctx, 405, 45, 270, 360, p.R, ZL, ZC, phi);

        ctx.restore();
    }

    function drawOscilloscope(ctx, ox, oy, w, h, omega, phi, U0, I0) {
        ctx.fillStyle = '#1e293b';
        ctx.beginPath();
        ctx.roundRect(ox, oy, w, h, 8);
        ctx.fill();
        ctx.strokeStyle = '#475569';
        ctx.lineWidth = 3;
        ctx.stroke();

        const screenMargin = 16;
        const sx = ox + screenMargin;
        const sy = oy + screenMargin + 10;
        const sw = w - screenMargin * 2;
        const sh = h - screenMargin * 2 - 20;

        ctx.fillStyle = '#022c22';
        ctx.fillRect(sx, sy, sw, sh);
        ctx.strokeStyle = 'rgba(16, 185, 129, 0.25)';
        ctx.lineWidth = 1;

        const gridStep = 32;
        for (let gx = sx; gx <= sx + sw; gx += gridStep) {
            ctx.beginPath(); ctx.moveTo(gx, sy); ctx.lineTo(gx, sy + sh); ctx.stroke();
        }
        for (let gy = sy; gy <= sy + sh; gy += gridStep) {
            ctx.beginPath(); ctx.moveTo(sx, gy); ctx.lineTo(sx + sw, gy); ctx.stroke();
        }

        const midY = sy + sh / 2;
        ctx.strokeStyle = 'rgba(16, 185, 129, 0.6)';
        ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(sx, midY); ctx.lineTo(sx + sw, midY); ctx.stroke();

        ctx.strokeStyle = '#facc15';
        ctx.lineWidth = 2.6;
        ctx.shadowColor = '#facc15';
        ctx.shadowBlur = 8;
        ctx.beginPath();
        for (let x = 0; x < sw; x += 2) {
            const timeX = t + x * 0.0006;
            const y = midY - Math.cos(omega * timeX) * 65;
            if (x === 0) ctx.moveTo(sx + x, y);
            else ctx.lineTo(sx + x, y);
        }
        ctx.stroke();
        ctx.shadowBlur = 0;

        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 2.6;
        ctx.shadowColor = '#38bdf8';
        ctx.shadowBlur = 8;
        ctx.beginPath();
        for (let x = 0; x < sw; x += 2) {
            const timeX = t + x * 0.0006;
            const y = midY - Math.cos(omega * timeX - phi) * Math.min(80, I0 * 3.2);
            if (x === 0) ctx.moveTo(sx + x, y);
            else ctx.lineTo(sx + x, y);
        }
        ctx.stroke();
        ctx.shadowBlur = 0;

        ctx.fillStyle = '#facc15';
        ctx.font = 'bold 11px "Space Grotesk", sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText('— Kênh 1: u(t)', sx + 10, sy + 18);
        ctx.fillStyle = '#38bdf8';
        ctx.fillText('— Kênh 2: i(t)', sx + 120, sy + 18);
    }

    function drawFresnelDiagram(ctx, ox, oy, w, h, R, ZL, ZC, phi) {
        ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
        ctx.beginPath();
        ctx.roundRect(ox, oy, w, h, 8);
        ctx.fill();
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.3)';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        ctx.fillStyle = '#38bdf8';
        ctx.font = 'bold 12px "Space Grotesk", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('GIẢN ĐỒ VECTOR FRESNEL', ox + w / 2, oy + 24);

        const cx = ox + 70;
        const cy = oy + h / 2;
        const scale = 1.3;

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(cx - 40, cy); ctx.lineTo(cx + 170, cy);
        ctx.moveTo(cx, cy - 130); ctx.lineTo(cx, cy + 130);
        ctx.stroke();
        ctx.setLineDash([]);

        PhET.drawVector(ctx, cx, cy, R * scale, 0, '#4ade80', 'U_R', 2.8);
        PhET.drawVector(ctx, cx, cy, 0, -ZL * scale * 0.65, '#ef4444', 'U_L', 2.8);
        PhET.drawVector(ctx, cx, cy, 0, ZC * scale * 0.65, '#38bdf8', 'U_C', 2.8);

        const netY = (ZC - ZL) * scale * 0.65;
        PhET.drawVector(ctx, cx, cy, R * scale, netY, '#facc15', 'U_toàn mạch', 3.2);

        ctx.strokeStyle = '#facc15';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(cx, cy, 35, 0, Math.atan2(netY, R * scale));
        ctx.stroke();

        ctx.fillStyle = '#facc15';
        ctx.font = 'bold 11px "Space Grotesk", sans-serif';
        ctx.fillText(`φ = ${(phi * 180 / Math.PI).toFixed(1)}°`, cx + 45, cy + netY / 2);
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




/* ============================================================
   🌈 LP.VirtualLab - CHUYÊN ĐỀ 6: QUANG HỌC (Optics PhET)
   Bao gồm 5 bài mô phỏng chuẩn mực PhET siêu trực quan:
   20. Khúc xạ ánh sáng & Phản xạ toàn phần (Snell's Law & Total Internal Reflection)
   21. Quang hình: Thấu kính mỏng & Gương cầu (Geometric Optics & Lens Formula)
   22. Giao thoa ánh sáng: Khe Young & Vòng tròn Newton (Young's Slits & Newton's Rings)
   23. Nhiễu xạ ánh sáng: Khe hẹp, Lỗ tròn & Cách mạng (Fraunhofer Diffraction & Airy Disk)
   24. Phân cực ánh sáng: Định luật Malus & Góc Brewster (Polarization & Brewster's Angle)
   Tác giả: Lê Ngọc Phú - SĐT: 0853257289
   ============================================================ */

// ─────────────────────────────────────────────────────────────
// 20. KHÚC XẠ & PHẢN XẠ TOÀN PHẦN (Snell's Law & TIR PhET)
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
        
        ctx.save();
        ctx.scale(canvas.width / 700, canvas.height / 460);

        PhET.drawLabBackground(ctx, 700, 460, 'KHÚC XẠ ÁNH SÁNG & ĐỊNH LUẬT SNELL');

        const p = getParams();
        const midX = 350;
        const midY = 220;

        // 1. Phân chia 2 môi trường quang học
        // Môi trường 1 (ở trên): Không khí hoặc chất lỏng 1
        const topGrad = ctx.createLinearGradient(0, 0, 0, midY);
        topGrad.addColorStop(0, '#040d1a');
        topGrad.addColorStop(1, '#07182c');
        ctx.fillStyle = topGrad;
        ctx.fillRect(30, 30, 640, midY - 30);

        // Môi trường 2 (ở dưới): Khối bán trụ thủy tinh / nước trong suốt PhET
        const botGrad = ctx.createLinearGradient(0, midY, 0, 430);
        botGrad.addColorStop(0, 'rgba(56, 189, 248, 0.22)');
        botGrad.addColorStop(1, 'rgba(14, 165, 233, 0.35)');
        ctx.fillStyle = botGrad;
        // Vẽ khối bán nguyệt quang học (Semi-circular Optical Block)
        ctx.beginPath();
        ctx.arc(midX, midY, 180, 0, Math.PI);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.lineWidth = 2.5;
        ctx.stroke();

        // Mặt phân cách giữa 2 môi trường
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(80, midY);
        ctx.lineTo(620, midY);
        ctx.stroke();

        // Thước đo góc tròn quang học 360° (PhET Protractor)
        ctx.save();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(midX, midY, 140, 0, Math.PI * 2);
        ctx.stroke();
        for (let a = 0; a < 360; a += 10) {
            const rad = (a * Math.PI) / 180;
            const isMajor = a % 30 === 0;
            const r1 = isMajor ? 128 : 134;
            ctx.beginPath();
            ctx.moveTo(midX + Math.cos(rad) * r1, midY + Math.sin(rad) * r1);
            ctx.lineTo(midX + Math.cos(rad) * 140, midY + Math.sin(rad) * 140);
            ctx.stroke();
        }
        ctx.restore();

        // Đường pháp tuyến N-N' (vuông góc mặt phân cách)
        ctx.strokeStyle = '#94a3b8';
        ctx.lineWidth = 1.8;
        ctx.setLineDash([5, 4]);
        ctx.beginPath();
        ctx.moveTo(midX, 40);
        ctx.lineTo(midX, 410);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.fillStyle = '#cbd5e1';
        ctx.font = 'bold 11px "Space Grotesk", sans-serif';
        ctx.fillText('Pháp tuyến N', midX + 10, 52);

        // Nhãn môi trường
        ctx.fillStyle = '#f8fafc';
        ctx.font = 'bold 12px "Space Grotesk", sans-serif';
        ctx.fillText(`Môi trường 1 (n₁ = ${p.n1.toFixed(2)})`, 50, 60);
        ctx.fillText(`Môi trường 2 (n₂ = ${p.n2.toFixed(2)})`, 50, midY + 45);

        // 2. Đèn phát Laser quang học 3D (Laser Pointer)
        const iRad = (p.iDeg * Math.PI) / 180;
        const laserDist = 200;
        const laserX = midX - laserDist * Math.sin(iRad);
        const laserY = midY - laserDist * Math.cos(iRad);

        // Vỏ đèn Laser cầm tay
        ctx.save();
        ctx.translate(laserX, laserY);
        ctx.rotate(-iRad + Math.PI / 2);

        ctx.fillStyle = '#1e293b';
        ctx.beginPath();
        ctx.roundRect(-40, -10, 40, 20, 4);
        ctx.fill();
        ctx.strokeStyle = '#94a3b8';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Đầu phát tia laser
        ctx.fillStyle = '#cbd5e1';
        ctx.fillRect(0, -6, 8, 12);
        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.arc(8, 0, 3, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();

        // 3. Tia tới Laser đỏ rực rỡ phát sáng (Incident Ray)
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 3.8;
        ctx.shadowColor = '#ef4444';
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.moveTo(laserX, laserY);
        ctx.lineTo(midX, midY);
        ctx.stroke();
        ctx.shadowBlur = 0;

        // Lõi sáng trắng tia tới
        ctx.strokeStyle = '#fee2e2';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(laserX, laserY);
        ctx.lineTo(midX, midY);
        ctx.stroke();

        // Mũi tên chỉ hướng tia tới
        const arrX = midX - 80 * Math.sin(iRad);
        const arrY = midY - 80 * Math.cos(iRad);
        PhET.drawVector(ctx, arrX, arrY, 15 * Math.sin(iRad), 15 * Math.cos(iRad), '#ffffff', '', 2);

        // Cung đo góc tới i
        ctx.strokeStyle = '#facc15';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(midX, midY, 55, -Math.PI / 2 - iRad, -Math.PI / 2);
        ctx.stroke();
        ctx.fillStyle = '#facc15';
        ctx.font = 'bold 12px "Space Grotesk", sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText(`i = ${p.iDeg}°`, midX - 60 * Math.sin(iRad / 2), midY - 60 * Math.cos(iRad / 2));

        // 4. Tia phản xạ tại điểm tới (Reflected Ray)
        const sinR = (p.n1 * Math.sin(iRad)) / p.n2;
        const isTIR = sinR > 1.0;
        const reflLen = 180;
        const reflX = midX + reflLen * Math.sin(iRad);
        const reflY = midY - reflLen * Math.cos(iRad);

        const reflAlpha = isTIR ? 1.0 : 0.35;
        ctx.strokeStyle = `rgba(239, 68, 68, ${reflAlpha})`;
        ctx.lineWidth = isTIR ? 3.8 : 2.0;
        if (isTIR) {
            ctx.shadowColor = '#ef4444';
            ctx.shadowBlur = 12;
        }
        ctx.beginPath();
        ctx.moveTo(midX, midY);
        ctx.lineTo(reflX, reflY);
        ctx.stroke();
        ctx.shadowBlur = 0;

        // 5. Tia khúc xạ truyền vào môi trường 2 (Refracted Ray)
        if (!isTIR) {
            const rRad = Math.asin(sinR);
            const refrLen = 175;
            const refrX = midX + refrLen * Math.sin(rRad);
            const refrY = midY + refrLen * Math.cos(rRad);

            ctx.strokeStyle = '#ef4444';
            ctx.lineWidth = 3.8;
            ctx.shadowColor = '#ef4444';
            ctx.shadowBlur = 10;
            ctx.beginPath();
            ctx.moveTo(midX, midY);
            ctx.lineTo(refrX, refrY);
            ctx.stroke();
            ctx.shadowBlur = 0;

            // Lõi tia khúc xạ
            ctx.strokeStyle = '#fee2e2';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(midX, midY);
            ctx.lineTo(refrX, refrY);
            ctx.stroke();

            // Cung đo góc khúc xạ r
            ctx.strokeStyle = '#4ade80';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(midX, midY, 65, Math.PI / 2 - rRad, Math.PI / 2);
            ctx.stroke();

            ctx.fillStyle = '#4ade80';
            ctx.font = 'bold 12px "Space Grotesk", sans-serif';
            ctx.textAlign = 'left';
            ctx.fillText(`r = ${(rRad * 180 / Math.PI).toFixed(1)}°`, midX + 70 * Math.sin(rRad / 2), midY + 70 * Math.cos(rRad / 2));
        }

        // Bảng dữ liệu HUD quang học
        PhET.drawHUD(ctx, 470, 280, '📊 ĐỊNH LUẬT SNELL', [
            { label: 'Chiết suất n₁', val: p.n1.toFixed(2), color: '#38bdf8' },
            { label: 'Chiết suất n₂', val: p.n2.toFixed(2), color: '#38bdf8' },
            { label: 'Góc tới i', val: p.iDeg.toFixed(0) + '°', color: '#facc15' },
            { label: 'Góc khúc xạ r', val: isTIR ? 'PHẢN XẠ TP' : (Math.asin(sinR) * 180 / Math.PI).toFixed(1) + '°', color: isTIR ? '#ef4444' : '#4ade80' }
        ], 200);

        ctx.restore();
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
// 21. QUANG HÌNH: THẤU KÍNH MỎNG & GƯƠNG (Geometric Optics PhET)
// ─────────────────────────────────────────────────────────────
(function initGeometricOptics() {
    const canvas = document.getElementById('opticsCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    let objDist = 180; // Khoảng cách từ vật tới thấu kính d (px)
    let objHeight = 55; // Chiều cao vật h (px)
    let draggingObj = false;

    function getParams() {
        const fEl = document.getElementById('optics-f');
        const hEl = document.getElementById('optics-h');
        const typeEl = document.querySelector('input[name="optics-type"]:checked');

        const isConvex = !typeEl || typeEl.value === 'convex'; // Hội tụ f > 0, Phân kỳ f < 0
        const fMag = fEl ? parseFloat(fEl.value) : 100;
        const f = isConvex ? fMag : -fMag;
        const h = hEl ? parseFloat(hEl.value) : 55;

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

        const d = objDist;
        const f = p.f;
        let dPrime = 0;
        let k = 0;
        let isReal = true;

        if (Math.abs(d - f) < 0.1) {
            dPrime = Infinity;
        } else {
            dPrime = (d * f) / (d - f);
            k = -dPrime / d;
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
        const mx = (e.clientX - rect.left) * (canvas.width / rect.width) * (700 / canvas.width);
        const my = (e.clientY - rect.top) * (canvas.height / rect.height) * (460 / canvas.height);
        const midX = 350;
        const ox = midX - objDist;
        const oy = 230;

        if (Math.hypot(mx - ox, my - (oy - objHeight)) < 30 || Math.abs(mx - ox) < 25) {
            draggingObj = true;
        }
    });

    window.addEventListener('mousemove', (e) => {
        if (!draggingObj) return;
        const rect = canvas.getBoundingClientRect();
        const mx = (e.clientX - rect.left) * (canvas.width / rect.width) * (700 / canvas.width);
        const midX = 350;
        objDist = Math.max(30, Math.min(300, midX - mx));
        syncLabels();
    });

    window.addEventListener('mouseup', () => { draggingObj = false; });

    function draw() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        ctx.save();
        ctx.scale(canvas.width / 700, canvas.height / 460);

        PhET.drawLabBackground(ctx, 700, 460, 'QUANG HÌNH HỌC: BĂNG QUANG HỌC & THẤU KÍNH');

        const p = getParams();
        const midX = 350;
        const midY = 230;

        // 1. Băng quang học chia vạch milimet ở đáy (Optical Bench Rail)
        PhET.drawRuler(ctx, 40, 370, 620, false, 'cm', 'cm');

        // 2. Trục chính quang học chính xác
        ctx.strokeStyle = '#64748b';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(30, midY);
        ctx.lineTo(670, midY);
        ctx.stroke();

        // 3. Thấu kính thủy tinh 3D PhET (Glass Lens with Reflections)
        const lensH = 260;
        const lensW = 24;
        const isConvex = p.f > 0;

        ctx.save();
        ctx.fillStyle = 'rgba(56, 189, 248, 0.2)';
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
        ctx.lineWidth = 2.2;

        ctx.beginPath();
        if (isConvex) {
            // Thấu kính hội tụ (Biconvex)
            ctx.moveTo(midX, midY - lensH / 2);
            ctx.quadraticCurveTo(midX + lensW, midY, midX, midY + lensH / 2);
            ctx.quadraticCurveTo(midX - lensW, midY, midX, midY - lensH / 2);
        } else {
            // Thấu kính phân kỳ (Biconcave)
            ctx.moveTo(midX - lensW / 2, midY - lensH / 2);
            ctx.lineTo(midX + lensW / 2, midY - lensH / 2);
            ctx.quadraticCurveTo(midX, midY, midX + lensW / 2, midY + lensH / 2);
            ctx.lineTo(midX - lensW / 2, midY + lensH / 2);
            ctx.quadraticCurveTo(midX, midY, midX - lensW / 2, midY - lensH / 2);
        }
        ctx.fill();
        ctx.stroke();

        // Điểm sáng phản chiếu ánh sáng trên mặt kính
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(midX - 4, midY - 60, 15, Math.PI * 0.8, Math.PI * 1.4);
        ctx.stroke();

        // Giá đỡ thấu kính bằng kim loại gắn trên băng quang học
        ctx.fillStyle = '#475569';
        ctx.fillRect(midX - 12, midY + lensH / 2, 24, 370 - (midY + lensH / 2));
        ctx.fillStyle = '#eab308';
        ctx.beginPath();
        ctx.arc(midX, 370, 7, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();

        // 4. Các tiêu điểm chính F và F'
        const fAbs = Math.abs(p.f);
        function drawFocal(fx, label) {
            ctx.fillStyle = '#ef4444';
            ctx.shadowColor = '#ef4444';
            ctx.shadowBlur = 6;
            ctx.beginPath();
            ctx.arc(fx, midY, 5, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 1.5;
            ctx.stroke();

            ctx.fillStyle = '#f8fafc';
            ctx.font = 'bold 12px "Space Grotesk", sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(label, fx, midY + 18);
        }

        drawFocal(midX - fAbs, isConvex ? 'F' : "F'");
        drawFocal(midX + fAbs, isConvex ? "F'" : 'F');

        // Quang tâm O
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 12px "Space Grotesk", sans-serif';
        ctx.fillText('O', midX + 10, midY - 10);

        // 5. Vật sáng AB (Cây nến phát sáng hoặc Mũi tên đỏ)
        const ax = midX - objDist;
        const ay = midY;
        const bx = ax;
        const by = midY - p.h;

        // Giá đỡ vật sáng
        ctx.fillStyle = '#475569';
        ctx.fillRect(ax - 6, ay, 12, 370 - ay);
        ctx.fillStyle = '#eab308';
        ctx.beginPath(); ctx.arc(ax, 370, 6, 0, Math.PI * 2); ctx.fill();

        // Mũi tên vật sáng AB (Đỏ rực)
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(ax, ay);
        ctx.lineTo(bx, by);
        ctx.stroke();

        // Mũi tên nhọn B
        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.moveTo(bx, by);
        ctx.lineTo(bx - 7, by + 12);
        ctx.lineTo(bx + 7, by + 12);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = '#f8fafc';
        ctx.font = 'bold 12px "Space Grotesk", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('B', bx, by - 8);
        ctx.fillText('A', ax, ay + 16);

        // 6. Tính toán vị trí ảnh A'B'
        const d = objDist;
        const f = p.f;
        if (Math.abs(d - f) > 0.1) {
            const dPrime = (d * f) / (d - f);
            const k = -dPrime / d;
            const aPrimeX = midX + dPrime;
            const bPrimeY = midY - k * p.h;
            const isReal = dPrime > 0;

            // 7. Vẽ 3 tia sáng chuẩn mực của quang hình:
            // TIA 1: Xuất phát từ B song song trục chính tới thấu kính -> ló đi qua tiêu điểm ảnh F'
            ctx.strokeStyle = '#facc15';
            ctx.lineWidth = 2.2;
            ctx.beginPath();
            ctx.moveTo(bx, by);
            ctx.lineTo(midX, by);
            ctx.stroke();

            ctx.beginPath();
            ctx.moveTo(midX, by);
            if (isConvex) {
                // Hội tụ qua F'
                ctx.lineTo(aPrimeX, bPrimeY);
            } else {
                // Phân kỳ: đường kéo dài lùi về F'
                const slope = (by - midY) / (-fAbs);
                ctx.lineTo(midX + 250, by + slope * 250);
            }
            ctx.stroke();

            // TIA 2: Xuất phát từ B qua quang tâm O truyền thẳng không lệch hướng
            ctx.strokeStyle = '#4ade80';
            ctx.lineWidth = 2.2;
            ctx.beginPath();
            ctx.moveTo(bx, by);
            ctx.lineTo(aPrimeX, bPrimeY);
            ctx.stroke();

            // Tia nét đứt kéo dài nếu là ảnh ảo
            if (!isReal) {
                ctx.strokeStyle = 'rgba(250, 204, 21, 0.4)';
                ctx.setLineDash([4, 4]);
                ctx.beginPath();
                ctx.moveTo(midX, by);
                ctx.lineTo(aPrimeX, bPrimeY);
                ctx.stroke();
                ctx.setLineDash([]);
            }

            // Vẽ ảnh A'B'
            ctx.strokeStyle = isReal ? '#4ade80' : '#38bdf8';
            ctx.lineWidth = 4;
            if (!isReal) ctx.setLineDash([5, 4]);
            ctx.beginPath();
            ctx.moveTo(aPrimeX, midY);
            ctx.lineTo(aPrimeX, bPrimeY);
            ctx.stroke();
            ctx.setLineDash([]);

            // Đầu mũi tên B'
            const sign = Math.sign(bPrimeY - midY);
            ctx.fillStyle = isReal ? '#4ade80' : '#38bdf8';
            ctx.beginPath();
            ctx.moveTo(aPrimeX, bPrimeY);
            ctx.lineTo(aPrimeX - 7, bPrimeY - sign * 12);
            ctx.lineTo(aPrimeX + 7, bPrimeY - sign * 12);
            ctx.closePath();
            ctx.fill();

            ctx.fillStyle = '#f8fafc';
            ctx.fillText("B'", aPrimeX, bPrimeY + (sign > 0 ? 16 : -10));
            ctx.fillText("A'", aPrimeX, midY + (sign > 0 ? -10 : 16));

            // Bảng HUD dữ liệu quang học
            PhET.drawHUD(ctx, 470, 45, '📊 CÔNG THỨC THẤU KÍNH', [
                { label: 'Tiêu cự f', val: (p.f / 10).toFixed(1) + ' cm', color: '#facc15' },
                { label: 'Vật d', val: (objDist / 10).toFixed(1) + ' cm', color: '#ef4444' },
                { label: "Ảnh d'", val: isFinite(dPrime) ? (dPrime / 10).toFixed(1) + ' cm' : '∞', color: isReal ? '#4ade80' : '#38bdf8' },
                { label: 'Số phóng đại k', val: isFinite(k) ? k.toFixed(2) : '∞', color: '#c084fc' }
            ], 200);
        }

        ctx.restore();
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
// 22. GIAO THOA ÁNH SÁNG: KHE YOUNG & VÒNG TRÒN NEWTON PhET
// ─────────────────────────────────────────────────────────────
(function initYoungInterference() {
    const canvas = document.getElementById('youngCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    let mode = 'young';

    function getParams() {
        const lambdaEl = document.getElementById('young-lambda');
        const aEl = document.getElementById('young-a');
        const dEl = document.getElementById('young-d');

        return {
            lambdaNm: lambdaEl ? parseFloat(lambdaEl.value) : 632,
            aMm: aEl ? parseFloat(aEl.value) : 0.5,
            dM: dEl ? parseFloat(dEl.value) : 1.5
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

        const i_mm = (p.lambdaNm * 1e-6 * p.dM) / (p.aMm * 1e-3);
        const iEl = document.getElementById('young-fringe-i');
        if (iEl) iEl.textContent = i_mm.toFixed(3) + ' mm';
    }

    function nmToColor(nm) {
        if (nm >= 380 && nm < 440) return '#a855f7';
        if (nm >= 440 && nm < 490) return '#3b82f6';
        if (nm >= 490 && nm < 560) return '#22c55e';
        if (nm >= 560 && nm < 590) return '#eab308';
        if (nm >= 590 && nm < 630) return '#f97316';
        if (nm >= 630 && nm <= 750) return '#ef4444';
        return '#ef4444';
    }

    function draw() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        ctx.save();
        ctx.scale(canvas.width / 700, canvas.height / 460);

        PhET.drawLabBackground(ctx, 700, 460, 'GIAO THOA ÁNH SÁNG KHE YOUNG & VÒNG TRÒN NEWTON');

        const p = getParams();
        const laserColor = nmToColor(p.lambdaNm);

        if (mode === 'young') {
            drawYoungSlits(ctx, p, laserColor);
        } else {
            drawNewtonRings(ctx, p, laserColor);
        }

        ctx.restore();
    }

    function drawYoungSlits(ctx, p, laserColor) {
        const laserX = 40;
        const slitX = 140;
        const screenX = 520;
        const midY = 220;

        // 1. Máy phát Laser khoa học
        ctx.fillStyle = '#334155';
        ctx.beginPath();
        ctx.roundRect(laserX, midY - 20, 60, 40, 5);
        ctx.fill();
        ctx.strokeStyle = '#94a3b8';
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.fillStyle = laserColor;
        ctx.beginPath();
        ctx.arc(laserX + 60, midY, 6, 0, Math.PI * 2);
        ctx.fill();

        // Chùm tia laser chiếu tới khe
        ctx.strokeStyle = laserColor;
        ctx.lineWidth = 4;
        ctx.shadowColor = laserColor;
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.moveTo(laserX + 60, midY);
        ctx.lineTo(slitX, midY);
        ctx.stroke();
        ctx.shadowBlur = 0;

        // 2. Màn chắn kép 2 khe Young (Double Slits)
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(slitX, 40, 10, 360);
        ctx.strokeStyle = '#cbd5e1';
        ctx.lineWidth = 2;
        ctx.strokeRect(slitX, 40, 10, 360);

        const slitGap = p.aMm * 30;
        ctx.clearRect(slitX - 1, midY - slitGap / 2 - 3, 12, 6);
        ctx.clearRect(slitX - 1, midY + slitGap / 2 - 3, 12, 6);

        // Các gợn sóng bán cầu lan tỏa từ 2 khe (Huygens-Fresnel Wavefronts)
        ctx.lineWidth = 1.2;
        for (let r = 15; r < screenX - slitX; r += 20) {
            ctx.strokeStyle = `rgba(56, 189, 248, ${Math.max(0.04, 0.25 * (1 - r / 400))})`;
            ctx.beginPath();
            ctx.arc(slitX + 10, midY - slitGap / 2, r, -Math.PI / 3, Math.PI / 3);
            ctx.stroke();

            ctx.beginPath();
            ctx.arc(slitX + 10, midY + slitGap / 2, r, -Math.PI / 3, Math.PI / 3);
            ctx.stroke();
        }

        // 3. Màn quan sát vân giao thoa thực tế bên phải
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(screenX, 40, 140, 360);
        ctx.strokeStyle = '#64748b';
        ctx.lineWidth = 2;
        ctx.strokeRect(screenX, 40, 140, 360);

        // Vẽ hệ vân sáng tối thực tế
        const scalePx = 18;
        for (let y = 40; y < 400; y += 2) {
            const dy = (y - midY) / scalePx;
            const phase = (Math.PI * p.aMm * dy) / (p.lambdaNm * 1e-6 * p.dM * 1000);
            const intensity = Math.pow(Math.cos(phase), 2);

            ctx.fillStyle = laserColor;
            ctx.globalAlpha = intensity;
            ctx.fillRect(screenX + 5, y, 70, 2);
        }
        ctx.globalAlpha = 1.0;

        // Đồ thị cường độ I(x) bên cạnh màn
        ctx.strokeStyle = laserColor;
        ctx.lineWidth = 2;
        ctx.beginPath();
        for (let y = 40; y < 400; y += 2) {
            const dy = (y - midY) / scalePx;
            const phase = (Math.PI * p.aMm * dy) / (p.lambdaNm * 1e-6 * p.dM * 1000);
            const intensity = Math.pow(Math.cos(phase), 2);
            const px = screenX + 85 + intensity * 45;
            if (y === 40) ctx.moveTo(px, y);
            else ctx.lineTo(px, y);
        }
        ctx.stroke();

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 11px "Space Grotesk", sans-serif';
        ctx.fillText('Màn hứng vân', screenX + 15, 30);
    }

    function drawNewtonRings(ctx, p, laserColor) {
        const cx = 350;
        const cy = 230;
        const R = 2.0;

        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        ctx.roundRect(cx - 160, cy - 160, 320, 320, 8);
        ctx.fill();
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 2;
        ctx.stroke();

        for (let k = 1; k <= 15; k++) {
            const r = Math.sqrt(k * p.lambdaNm * 1e-9 * R) * 5800;
            ctx.strokeStyle = laserColor;
            ctx.lineWidth = 3.2;
            ctx.shadowColor = laserColor;
            ctx.shadowBlur = 6;
            ctx.beginPath();
            ctx.arc(cx, cy, r, 0, Math.PI * 2);
            ctx.stroke();
            ctx.shadowBlur = 0;
        }

        ctx.fillStyle = '#000000';
        ctx.beginPath();
        ctx.arc(cx, cy, 7, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#f8fafc';
        ctx.font = 'bold 12px "Space Grotesk", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('VÒNG TRÒN NEWTON (GIAO THOA BẢN NÊM KHÔNG KHÍ r_k = √(k·λ·R))', cx, 40);
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
// 23. NHIỄU XẠ ÁNH SÁNG: KHE HẸP, LỖ TRÒN & CÁCH MẠNG PhET
// ─────────────────────────────────────────────────────────────
(function initDiffraction() {
    const canvas = document.getElementById('diffractionCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    let mode = 'single-slit';

    function getParams() {
        const slitWEl = document.getElementById('diff-slit-width');
        const lambdaEl = document.getElementById('diff-lambda');

        return {
            bUm: slitWEl ? parseFloat(slitWEl.value) : 10,
            lambdaNm: lambdaEl ? parseFloat(lambdaEl.value) : 550
        };
    }

    function syncLabels() {
        const p = getParams();
        const bVal = document.getElementById('diff-slit-val');
        const lVal = document.getElementById('diff-lambda-val');

        if (bVal) bVal.textContent = p.bUm.toFixed(1) + ' μm';
        if (lVal) lVal.textContent = p.lambdaNm.toFixed(0) + ' nm';

        const thetaRad = (2 * p.lambdaNm * 1e-9) / (p.bUm * 1e-6);
        const thetaDeg = (thetaRad * 180) / Math.PI;

        const thEl = document.getElementById('diff-angle');
        if (thEl) thEl.textContent = thetaDeg.toFixed(2) + '°';
    }

    function draw() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        ctx.save();
        ctx.scale(canvas.width / 700, canvas.height / 460);

        PhET.drawLabBackground(ctx, 700, 460, 'NHIỄU XẠ ÁNH SÁNG & ĐĨA AIRY');

        const p = getParams();
        const cx = 350;
        const cy = 230;

        if (mode === 'single-slit') {
            drawSingleSlit(ctx, cx, cy, p);
        } else if (mode === 'circular') {
            drawAiryDisk(ctx, cx, cy, p);
        } else {
            drawGrating(ctx, cx, cy, p);
        }

        ctx.restore();
    }

    function drawSingleSlit(ctx, cx, cy, p) {
        const barH = 55;
        const screenY = cy - 90;

        for (let x = 40; x < 660; x++) {
            const dx = (x - cx) * 0.08;
            const beta = (Math.PI * p.bUm * 0.2 * dx) / (p.lambdaNm * 0.05);
            const intensity = beta === 0 ? 1 : Math.pow(Math.sin(beta) / beta, 2);

            ctx.fillStyle = '#22c55e';
            ctx.globalAlpha = intensity;
            ctx.fillRect(x, screenY, 1, barH);
        }
        ctx.globalAlpha = 1.0;

        // Đồ thị sinc^2(x)
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 2.8;
        ctx.beginPath();
        for (let x = 40; x < 660; x += 2) {
            const dx = (x - cx) * 0.08;
            const beta = (Math.PI * p.bUm * 0.2 * dx) / (p.lambdaNm * 0.05);
            const intensity = beta === 0 ? 1 : Math.pow(Math.sin(beta) / beta, 2);
            const py = cy + 130 - intensity * 110;
            if (x === 40) ctx.moveTo(x, py);
            else ctx.lineTo(x, py);
        }
        ctx.stroke();

        ctx.fillStyle = '#f8fafc';
        ctx.font = 'bold 12px "Space Grotesk", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Nhiễu xạ Fraunhofer qua 1 khe hẹp: Cực đại trung tâm rộng gấp đôi cực đại phụ', cx, 40);
    }

    function drawAiryDisk(ctx, cx, cy, p) {
        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        ctx.roundRect(cx - 150, cy - 150, 300, 300, 8);
        ctx.fill();
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 2;
        ctx.stroke();

        const rAiry = (1.22 * p.lambdaNm * 1e-9 / (p.bUm * 1e-6)) * 62000;

        const radGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, rAiry);
        radGrad.addColorStop(0, '#22c55e');
        radGrad.addColorStop(0.7, 'rgba(34, 197, 94, 0.6)');
        radGrad.addColorStop(1, 'rgba(34, 197, 94, 0)');
        ctx.fillStyle = radGrad;
        ctx.beginPath();
        ctx.arc(cx, cy, rAiry, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = 'rgba(34, 197, 94, 0.45)';
        ctx.lineWidth = 3.5;
        ctx.beginPath();
        ctx.arc(cx, cy, rAiry * 1.6, 0, Math.PI * 2);
        ctx.stroke();

        ctx.fillStyle = '#f8fafc';
        ctx.font = 'bold 12px "Space Grotesk", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Nhiễu Xạ Lỗ Tròn - Đĩa Airy (Tiêu chuẩn Rayleigh phân giải quang học)', cx, 40);
    }

    function drawGrating(ctx, cx, cy, p) {
        ctx.fillStyle = '#f8fafc';
        ctx.font = 'bold 12px "Space Grotesk", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Cách mạng nhiễu xạ: Tách các vạch quang phổ sắc nét d·sinθ = kλ', cx, 40);

        const colors = ['#a855f7', '#3b82f6', '#22c55e', '#f59e0b', '#ef4444'];
        [-1, 0, 1].forEach(k => {
            colors.forEach((col, idx) => {
                const px = cx + k * (130 + idx * 28);
                ctx.fillStyle = col;
                ctx.shadowColor = col;
                ctx.shadowBlur = 8;
                ctx.fillRect(px - 2.5, cy - 70, 5, 140);
                ctx.shadowBlur = 0;
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
// 24. PHÂN CỰC ÁNH SÁNG: ĐỊNH LUẬT MALUS PhET
// ─────────────────────────────────────────────────────────────
(function initPolarization() {
    const canvas = document.getElementById('polarizationCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    function getParams() {
        const angleEl = document.getElementById('pol-angle');
        return {
            thetaDeg: angleEl ? parseFloat(angleEl.value) : 45
        };
    }

    function syncLabels() {
        const p = getParams();
        const aVal = document.getElementById('pol-angle-val');
        if (aVal) aVal.textContent = p.thetaDeg.toFixed(0) + '°';

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
        
        ctx.save();
        ctx.scale(canvas.width / 700, canvas.height / 460);

        PhET.drawLabBackground(ctx, 700, 460, 'PHÂN CỰC ÁNH SÁNG & ĐỊNH LUẬT MALUS');

        const p = getParams();
        const cy = 230;

        // 1. Chùm sáng tự nhiên chưa phân cực (dao động mọi hướng)
        ctx.strokeStyle = '#facc15';
        ctx.lineWidth = 4.5;
        ctx.shadowColor = '#facc15';
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.moveTo(35, cy);
        ctx.lineTo(170, cy);
        ctx.stroke();
        ctx.shadowBlur = 0;

        ctx.fillStyle = '#facc15';
        ctx.font = 'bold 11px "Space Grotesk", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Ánh sáng tự nhiên I₀', 100, cy - 20);

        // 2. Kính lọc phân cực thứ nhất (Polarizer) - Trục thẳng đứng
        drawPolarizerFilter(ctx, 195, cy, 0, 'Kính Phân Cực P₁ (0°)');

        // Chùm sáng sau P1: Phân cực thẳng I1 = I0 / 2
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(225, cy);
        ctx.lineTo(395, cy);
        ctx.stroke();

        ctx.fillStyle = '#38bdf8';
        ctx.fillText('I₁ = ½ I₀', 310, cy - 16);

        // 3. Kính lọc phân tích thứ hai (Analyzer) - Trục quay góc theta
        drawPolarizerFilter(ctx, 425, cy, p.thetaDeg, `Kính Phân Tích P₂ (${p.thetaDeg}°)`);

        // Chùm sáng sau P2: Cường độ I2 = I1 * cos^2(theta)
        const rad = (p.thetaDeg * Math.PI) / 180;
        const factor = Math.pow(Math.cos(rad), 2);

        if (factor > 0.01) {
            ctx.strokeStyle = `rgba(56, 189, 248, ${factor})`;
            ctx.lineWidth = Math.max(1, factor * 4.5);
            ctx.shadowColor = '#38bdf8';
            ctx.shadowBlur = factor * 10;
            ctx.beginPath();
            ctx.moveTo(455, cy);
            ctx.lineTo(660, cy);
            ctx.stroke();
            ctx.shadowBlur = 0;
        }

        ctx.fillStyle = '#f8fafc';
        ctx.font = 'bold 12px "Space Grotesk", sans-serif';
        ctx.fillText(`I₂ = I₁·cos²(${p.thetaDeg}°) = ${(factor * 100).toFixed(1)}%`, 550, cy - 18);

        ctx.restore();
    }

    function drawPolarizerFilter(ctx, x, y, angleDeg, label) {
        ctx.save();
        ctx.translate(x, y);

        // Khung kính lọc tròn kim loại
        ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
        ctx.beginPath();
        ctx.arc(0, 0, 55, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#94a3b8';
        ctx.lineWidth = 4;
        ctx.stroke();
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Các đường khe song song của trục quang học
        ctx.rotate((angleDeg * Math.PI) / 180);
        ctx.strokeStyle = '#facc15';
        ctx.lineWidth = 2.2;
        for (let i = -35; i <= 35; i += 12) {
            const h = Math.sqrt(Math.max(0, 3025 - i * i));
            ctx.beginPath();
            ctx.moveTo(i, -h);
            ctx.lineTo(i, h);
            ctx.stroke();
        }

        ctx.restore();

        ctx.fillStyle = '#f8fafc';
        ctx.font = 'bold 11px "Space Grotesk", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(label, x, y + 75);
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




/* ============================================================
   ⚛️ LP.VirtualLab - CHUYÊN ĐỀ 7: VẬT LÝ HIỆN ĐẠI (Modern Physics PhET)
   Bao gồm 3 bài mô phỏng chuẩn mực PhET siêu trực quan:
   25. Hiệu ứng quang điện ngoài (Einstein's Photoelectric Effect)
   26. Bức xạ vật đen & Định luật Wien, Stefan-Boltzmann (Blackbody Radiation)
   27. Mô hình nguyên tử Bohr & Tán xạ hạt Alpha Rutherford (Bohr & Rutherford)
   Tác giả: Lê Ngọc Phú - SĐT: 0853257289
   ============================================================ */

// ─────────────────────────────────────────────────────────────
// 25. HIỆU ỨNG QUANG ĐIỆN NGOÀI (Photoelectric Effect PhET)
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
            lambdaNm: lambdaEl ? parseFloat(lambdaEl.value) : 400,
            intensity: intensityEl ? parseFloat(intensityEl.value) : 80,
            voltage: voltEl ? parseFloat(voltEl.value) : 0
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

        const photonEnergy = 1240 / p.lambdaNm; // eV
        const lambda0 = 1240 / p.workFunc;     // nm
        const canEject = photonEnergy >= p.workFunc;
        const kMax = canEject ? (photonEnergy - p.workFunc) : 0;
        const vStop = kMax;

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
        if (nm < 380) return '#c084fc';
        if (nm >= 380 && nm < 440) return '#6366f1';
        if (nm >= 440 && nm < 490) return '#38bdf8';
        if (nm >= 490 && nm < 560) return '#22c55e';
        if (nm >= 560 && nm < 590) return '#eab308';
        if (nm >= 590 && nm < 630) return '#f97316';
        if (nm >= 630 && nm <= 750) return '#ef4444';
        return '#dc2626';
    }

    function update(dt) {
        const p = getParams();
        const photonEnergy = 1240 / p.lambdaNm;
        const canEject = photonEnergy >= p.workFunc;
        const kMax = canEject ? (photonEnergy - p.workFunc) : 0;

        // Sinh electron từ Catot
        if (canEject && Math.random() < (p.intensity / 100) * 0.45) {
            const v0 = Math.sqrt(kMax) * 55;
            electrons.push({
                x: 185,
                y: 110 + Math.random() * 140,
                vx: v0 * (0.6 + 0.4 * Math.random()),
                vy: (Math.random() - 0.5) * 20
            });
        }

        const anodeX = 520;
        const accX = (p.voltage / 0.15) * 8.5;

        for (let i = electrons.length - 1; i >= 0; i--) {
            const el = electrons[i];
            el.vx += accX * dt;
            el.x += el.vx * dt * 4;
            el.y += el.vy * dt * 4;

            if (el.x >= anodeX || el.x < 180 || el.y < 80 || el.y > 280) {
                electrons.splice(i, 1);
            }
        }
    }

    function draw() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        ctx.save();
        ctx.scale(canvas.width / 700, canvas.height / 460);

        PhET.drawLabBackground(ctx, 700, 460, 'HIỆN TƯỢNG QUANG ĐIỆN NGOÀI & THUYẾT LƯỢNG TỬ');

        const p = getParams();
        const lightColor = nmToColor(p.lambdaNm);
        const tubeCX = 350;
        const tubeCY = 180;
        const cathodeX = 180;
        const anodeX = 520;

        // 1. Bình tế bào quang điện chân không bằng thủy tinh 3D PhET (Phototube)
        ctx.save();
        // Ánh sáng chân không mờ bên trong
        const tubeInner = ctx.createRadialGradient(tubeCX, tubeCY, 40, tubeCX, tubeCY, 190);
        tubeInner.addColorStop(0, 'rgba(56, 189, 248, 0.08)');
        tubeInner.addColorStop(1, 'rgba(15, 23, 42, 0.4)');
        ctx.fillStyle = tubeInner;
        ctx.beginPath();
        ctx.roundRect(tubeCX - 190, tubeCY - 95, 380, 190, 85);
        ctx.fill();

        // Vỏ thủy tinh trong suốt phản quang
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.65)';
        ctx.lineWidth = 2.5;
        ctx.stroke();

        // Vết phản xạ thủy tinh (Glass glare)
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(tubeCX - 90, tubeCY - 50, 45, Math.PI * 1.1, Math.PI * 1.6);
        ctx.stroke();
        ctx.restore();

        // 2. Tấm kim loại Catôt bên trái (Cathode Target)
        const catGrad = ctx.createLinearGradient(cathodeX, 0, cathodeX + 16, 0);
        catGrad.addColorStop(0, '#94a3b8');
        catGrad.addColorStop(0.5, '#cbd5e1');
        catGrad.addColorStop(1, '#475569');
        ctx.fillStyle = catGrad;
        ctx.beginPath();
        ctx.roundRect(cathodeX, tubeCY - 70, 16, 140, 3);
        ctx.fill();
        ctx.strokeStyle = '#f8fafc';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        ctx.fillStyle = '#f8fafc';
        ctx.font = 'bold 12px "Space Grotesk", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`Catôt (${p.metalKey})`, cathodeX - 35, tubeCY);

        // 3. Tấm thu điện tích Anôt bên phải (Anode Collector)
        const anGrad = ctx.createLinearGradient(anodeX, 0, anodeX + 16, 0);
        anGrad.addColorStop(0, '#64748b');
        anGrad.addColorStop(0.5, '#94a3b8');
        anGrad.addColorStop(1, '#334155');
        ctx.fillStyle = anGrad;
        ctx.beginPath();
        ctx.roundRect(anodeX, tubeCY - 70, 16, 140, 3);
        ctx.fill();
        ctx.strokeStyle = '#cbd5e1';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        ctx.fillStyle = '#cbd5e1';
        ctx.fillText('Anôt (+/-)', anodeX + 45, tubeCY);

        // 4. Đèn rọi chùm photon đơn sắc (Monochromatic Light Source)
        const lampX = 65;
        const lampY = 65;
        ctx.save();
        ctx.fillStyle = '#334155';
        ctx.beginPath();
        ctx.roundRect(lampX - 35, lampY - 20, 50, 40, 5);
        ctx.fill();
        ctx.strokeStyle = '#94a3b8';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Loa đèn chiếu
        ctx.fillStyle = lightColor;
        ctx.beginPath();
        ctx.moveTo(lampX + 15, lampY - 14);
        ctx.lineTo(lampX + 30, lampY - 25);
        ctx.lineTo(lampX + 30, lampY + 25);
        ctx.lineTo(lampX + 15, lampY + 14);
        ctx.closePath();
        ctx.fill();
        ctx.restore();

        // Chùm tia photon phát sáng chiếu tới catot
        const beamGrad = ctx.createLinearGradient(lampX + 30, lampY, cathodeX, tubeCY);
        beamGrad.addColorStop(0, lightColor);
        beamGrad.addColorStop(1, lightColor + '66');
        ctx.strokeStyle = beamGrad;
        ctx.lineWidth = Math.max(3, (p.intensity / 100) * 12);
        ctx.shadowColor = lightColor;
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.moveTo(lampX + 30, lampY);
        ctx.lineTo(cathodeX + 8, tubeCY - 15);
        ctx.stroke();
        ctx.shadowBlur = 0;

        ctx.fillStyle = lightColor;
        ctx.font = 'bold 11px "Space Grotesk", sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(`Photon hf (λ = ${p.lambdaNm}nm)`, lampX + 45, lampY - 8);

        // 5. Các electron đang bay phát sáng (Photoelectrons)
        electrons.forEach(el => {
            ctx.fillStyle = '#38bdf8';
            ctx.shadowColor = '#38bdf8';
            ctx.shadowBlur = 6;
            ctx.beginPath();
            ctx.arc(el.x, el.y, 4, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;

            // Ký hiệu điện tích âm e-
            ctx.fillStyle = '#0f172a';
            ctx.font = 'bold 8px monospace';
            ctx.textAlign = 'center';
            ctx.fillText('-', el.x, el.y + 2.5);
        });

        // 6. Mạch điện bên ngoài với Vôn kế điện tử & Nguồn U
        ctx.strokeStyle = '#94a3b8';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(cathodeX + 8, tubeCY + 70);
        ctx.lineTo(cathodeX + 8, 350);
        ctx.lineTo(290, 350);

        ctx.moveTo(anodeX + 8, tubeCY + 70);
        ctx.lineTo(anodeX + 8, 350);
        ctx.lineTo(410, 350);
        ctx.stroke();

        // Đồng hồ Vôn kế điện tử LCD
        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        ctx.roundRect(290, 330, 120, 42, 6);
        ctx.fill();
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.fillStyle = '#38bdf8';
        ctx.font = 'bold 14px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(`U = ${p.voltage > 0 ? '+' : ''}${p.voltage.toFixed(2)} V`, 350, 356);

        // Bảng HUD dữ liệu quang điện
        const photonE = 1240 / p.lambdaNm;
        PhET.drawHUD(ctx, 480, 290, '📊 PHƯƠNG TRÌNH EINSTEIN', [
            { label: 'Năng lượng photon', val: `${photonE.toFixed(2)} eV`, color: lightColor },
            { label: 'Công thoát A', val: `${p.workFunc.toFixed(2)} eV`, color: '#facc15' },
            { label: 'Động năng K_max', val: `${Math.max(0, photonE - p.workFunc).toFixed(2)} eV`, color: '#4ade80' },
            { label: 'Điện áp hãm U_h', val: `${Math.max(0, photonE - p.workFunc).toFixed(2)} V`, color: '#ef4444' }
        ], 200);

        ctx.restore();
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
// 26. BỨC XẠ VẬT ĐEN (Blackbody Radiation: Wien & Stefan-Boltzmann PhET)
// ─────────────────────────────────────────────────────────────
(function initBlackbody() {
    const canvas = document.getElementById('blackbodyCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    function getParams() {
        const tEl = document.getElementById('bb-temp');
        return {
            tempK: tEl ? parseFloat(tEl.value) : 5800
        };
    }

    function syncLabels() {
        const p = getParams();
        const tVal = document.getElementById('bb-temp-val');
        if (tVal) tVal.textContent = p.tempK.toFixed(0) + ' K';

        const b = 2.898e-3;
        const lambdaMaxNm = (b / p.tempK) * 1e9;

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
        if (tempK < 2200) return '#ef4444';
        if (tempK < 4000) return '#f59e0b';
        if (tempK < 6500) return '#fef08a';
        return '#38bdf8';
    }

    function draw() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        ctx.save();
        ctx.scale(canvas.width / 700, canvas.height / 460);

        PhET.drawLabBackground(ctx, 700, 460, 'PHỔ BỨC XẠ VẬT ĐEN TUYỆT ĐỐI (PLANCK & WIEN)');

        const p = getParams();
        const glowColor = getBlackbodyGlow(p.tempK);

        // 1. Quả cầu nung nóng vật đen / Ngôi sao bên trái (Thermal Emitter)
        const sphereX = 125;
        const sphereY = 190;
        const r = 52;

        // Quầng nhiệt phát sáng tỏa rộng
        const radGrad = ctx.createRadialGradient(sphereX, sphereY, 5, sphereX, sphereY, r + 45);
        radGrad.addColorStop(0, '#ffffff');
        radGrad.addColorStop(0.4, glowColor);
        radGrad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = radGrad;
        ctx.beginPath();
        ctx.arc(sphereX, sphereY, r + 45, 0, Math.PI * 2);
        ctx.fill();

        // Bề mặt cầu
        ctx.fillStyle = glowColor;
        ctx.beginPath();
        ctx.arc(sphereX, sphereY, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.fillStyle = '#f8fafc';
        ctx.font = 'bold 13px "Space Grotesk", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`VẬT ĐEN T = ${p.tempK} K`, sphereX, sphereY + r + 35);

        // 2. Đồ thị phổ bức xạ Planck u(lambda, T) bên phải
        drawPlanckSpectrum(ctx, 245, 45, 430, 360, p);

        ctx.restore();
    }

    function drawPlanckSpectrum(ctx, ox, oy, w, h, p) {
        ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
        ctx.beginPath();
        ctx.roundRect(ox, oy, w, h, 8);
        ctx.fill();
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.3)';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        const xBase = ox + 45;
        const yBase = oy + h - 45;
        const dw = w - 65;
        const dh = h - 75;

        // Trục tọa độ: Hoành là bước sóng lambda (0 đến 2500 nm)
        ctx.strokeStyle = '#94a3b8';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(xBase, yBase); ctx.lineTo(xBase + dw + 10, yBase);
        ctx.moveTo(xBase, yBase); ctx.lineTo(xBase, yBase - dh - 15);
        ctx.stroke();

        ctx.fillStyle = '#cbd5e1';
        ctx.font = 'bold 11px "Space Grotesk", sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText('Bước sóng λ (nm) ►', xBase + dw + 10, yBase + 28);
        ctx.textAlign = 'left';
        ctx.fillText('▲ Cường độ bức xạ I(λ)', xBase - 35, yBase - dh - 8);

        // Vạch chia trục bước sóng
        ctx.fillStyle = '#64748b';
        ctx.font = '10px monospace';
        ctx.textAlign = 'center';
        for (let i = 0; i <= 5; i++) {
            const val = (i * 500).toString();
            ctx.fillText(val, xBase + (i / 5) * dw, yBase + 16);
        }

        // Vùng ánh sáng nhìn thấy đa sắc Cầu vồng (380 - 750 nm)
        const vMin = xBase + (380 / 2500) * dw;
        const vMax = xBase + (750 / 2500) * dw;
        const visGrad = ctx.createLinearGradient(vMin, 0, vMax, 0);
        visGrad.addColorStop(0, 'rgba(168, 85, 247, 0.35)');
        visGrad.addColorStop(0.25, 'rgba(59, 130, 246, 0.35)');
        visGrad.addColorStop(0.5, 'rgba(34, 197, 94, 0.35)');
        visGrad.addColorStop(0.75, 'rgba(245, 158, 11, 0.35)');
        visGrad.addColorStop(1, 'rgba(239, 68, 68, 0.35)');
        ctx.fillStyle = visGrad;
        ctx.fillRect(vMin, yBase - dh, vMax - vMin, dh);

        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.font = 'bold 9.5px "Space Grotesk", sans-serif';
        ctx.fillText('Ánh sáng khả kiến', (vMin + vMax) / 2, yBase - dh + 14);

        // Đường cong phổ Planck: chuẩn hóa theo đỉnh
        const b = 2.898e-3;
        const lambdaPeak = (b / p.tempK) * 1e9;

        // Vùng gradient dưới đường cong phổ
        const curveGrad = ctx.createLinearGradient(0, yBase - dh, 0, yBase);
        curveGrad.addColorStop(0, 'rgba(245, 158, 11, 0.4)');
        curveGrad.addColorStop(1, 'rgba(245, 158, 11, 0.02)');

        ctx.beginPath();
        ctx.moveTo(xBase, yBase);
        let peakX = 0, peakY = 0;

        for (let l = 40; l <= 2500; l += 15) {
            const xNorm = l / lambdaPeak;
            const f = (1 / Math.pow(xNorm, 5)) / (Math.exp(4.9651 / xNorm) - 1);
            const normF = f / 0.0468;

            const px = xBase + (l / 2500) * dw;
            const py = yBase - Math.min(dh - 10, normF * (dh - 25));

            ctx.lineTo(px, py);

            if (Math.abs(l - lambdaPeak) < 15) {
                peakX = px;
                peakY = py;
            }
        }
        ctx.lineTo(xBase + dw, yBase);
        ctx.closePath();
        ctx.fillStyle = curveGrad;
        ctx.fill();

        // Đường cong phổ chính màu vàng rực
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 2.8;
        ctx.beginPath();
        for (let l = 40; l <= 2500; l += 15) {
            const xNorm = l / lambdaPeak;
            const f = (1 / Math.pow(xNorm, 5)) / (Math.exp(4.9651 / xNorm) - 1);
            const normF = f / 0.0468;

            const px = xBase + (l / 2500) * dw;
            const py = yBase - Math.min(dh - 10, normF * (dh - 25));

            if (l === 40) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
        }
        ctx.stroke();

        // Đánh dấu đỉnh Wien lambda_max
        if (peakX > 0 && peakX < xBase + dw) {
            ctx.fillStyle = '#ef4444';
            ctx.shadowColor = '#ef4444';
            ctx.shadowBlur = 8;
            ctx.beginPath();
            ctx.arc(peakX, peakY, 5.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 1.5;
            ctx.stroke();

            ctx.strokeStyle = '#ef4444';
            ctx.setLineDash([3, 3]);
            ctx.beginPath();
            ctx.moveTo(peakX, peakY);
            ctx.lineTo(peakX, yBase);
            ctx.stroke();
            ctx.setLineDash([]);

            ctx.fillStyle = '#f87171';
            ctx.font = 'bold 11px "Space Grotesk", sans-serif';
            ctx.fillText(`λ_max = ${lambdaPeak.toFixed(0)}nm`, peakX, peakY - 12);
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
// 27. NGUYÊN TỬ BOHR & TÁN XẠ RUTHERFORD (Bohr & Rutherford PhET)
// ─────────────────────────────────────────────────────────────
(function initBohrRutherford() {
    const canvas = document.getElementById('bohrCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    let mode = 'bohr';
    let currentN = 3;
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

        const rn = p.n * p.n * 0.53;
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

        const deltaE = 13.6 * (1 / (toN * toN) - 1 / (currentN * currentN));
        const lambdaNm = 1240 / deltaE;

        emittedPhoton = {
            x: 350,
            y: 230,
            vx: 190,
            vy: -110,
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
                if (emittedPhoton.x > 700 || emittedPhoton.y < 0) {
                    emittedPhoton = null;
                }
            }
        } else {
            // Hạt alpha tán xạ
            if (Math.random() < 0.28) {
                alphaParticles.push({
                    x: 30,
                    y: 90 + Math.random() * 260,
                    vx: 260,
                    vy: 0
                });
            }

            const goldX = 350;
            const goldY = 230;

            for (let i = alphaParticles.length - 1; i >= 0; i--) {
                const pt = alphaParticles[i];
                const dx = pt.x - goldX;
                const dy = pt.y - goldY;
                const dist = Math.hypot(dx, dy);

                if (dist > 8 && dist < 170) {
                    const F = 75000 / (dist * dist);
                    pt.vx += (dx / dist) * F * dt;
                    pt.vy += (dy / dist) * F * dt;
                }

                pt.x += pt.vx * dt;
                pt.y += pt.vy * dt;

                if (pt.x > 700 || pt.x < 0 || pt.y > 460 || pt.y < 0) {
                    alphaParticles.splice(i, 1);
                }
            }
        }
    }

    function draw() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        ctx.save();
        ctx.scale(canvas.width / 700, canvas.height / 460);

        PhET.drawLabBackground(ctx, 700, 460, 'MẪU NGUYÊN TỬ BOHR & TÁN XẠ RUTHERFORD');

        const cx = 350;
        const cy = 230;

        if (mode === 'bohr') {
            drawBohrAtom(ctx, cx, cy);
        } else {
            drawRutherfordScattering(ctx, cx, cy);
        }

        ctx.restore();
    }

    function drawBohrAtom(ctx, cx, cy) {
        const p = getParams();

        // 1. Hạt nhân Proton ở tâm (+e)
        ctx.fillStyle = '#ef4444';
        ctx.shadowColor = '#ef4444';
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.arc(cx, cy, 12, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 11px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('+e', cx, cy + 4);

        // 2. Các quỹ đạo tròn dừng n = 1, 2, 3, 4, 5
        const baseR = 36;
        for (let n = 1; n <= 5; n++) {
            const r = baseR * Math.sqrt(n) * 1.55;
            const isCur = n === p.n;

            ctx.strokeStyle = isCur ? '#38bdf8' : 'rgba(148, 163, 184, 0.25)';
            ctx.lineWidth = isCur ? 2.5 : 1.2;
            ctx.setLineDash(isCur ? [] : [4, 4]);
            ctx.beginPath();
            ctx.arc(cx, cy, r, 0, Math.PI * 2);
            ctx.stroke();
            ctx.setLineDash([]);

            ctx.fillStyle = isCur ? '#38bdf8' : '#64748b';
            ctx.font = 'bold 10.5px "Space Grotesk", sans-serif';
            ctx.fillText(`n=${n}`, cx + r + 5, cy - 4);
        }

        // 3. Electron đang quay trên quỹ đạo lượng tử
        const curR = baseR * Math.sqrt(p.n) * 1.55;
        const ex = cx + curR * Math.cos(electronTheta);
        const ey = cy + curR * Math.sin(electronTheta);

        ctx.fillStyle = '#38bdf8';
        ctx.shadowColor = '#38bdf8';
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(ex, ey, 7, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.stroke();

        // 4. Photon phát xạ bay ra khi chuyển mức
        if (emittedPhoton) {
            ctx.strokeStyle = '#f59e0b';
            ctx.lineWidth = 3.5;
            ctx.shadowColor = '#f59e0b';
            ctx.shadowBlur = 10;
            ctx.beginPath();
            ctx.moveTo(emittedPhoton.x, emittedPhoton.y);
            ctx.lineTo(emittedPhoton.x + 24, emittedPhoton.y - 14);
            ctx.stroke();
            ctx.shadowBlur = 0;

            ctx.fillStyle = '#f59e0b';
            ctx.font = 'bold 12px "Space Grotesk", sans-serif';
            ctx.fillText(`Photon hν (${emittedPhoton.energy.toFixed(1)}eV)`, emittedPhoton.x + 30, emittedPhoton.y - 10);
        }

        // HUD thông số mức năng lượng Bohr
        const En = -13.6 / (p.n * p.n);
        const rn = p.n * p.n * 0.53;
        PhET.drawHUD(ctx, 480, 290, '📊 TRẠNG THÁI DỪNG BOHR', [
            { label: 'Số lượng tử n', val: p.n.toString(), color: '#38bdf8' },
            { label: 'Bán kính r_n', val: `${rn.toFixed(2)} Å`, color: '#facc15' },
            { label: 'Mức năng lượng E_n', val: `${En.toFixed(2)} eV`, color: '#4ade80' }
        ], 200);
    }

    function drawRutherfordScattering(ctx, cx, cy) {
        // Hạt nhân Vàng (Gold Nucleus +79e)
        ctx.fillStyle = '#f59e0b';
        ctx.shadowColor = '#f59e0b';
        ctx.shadowBlur = 15;
        ctx.beginPath();
        ctx.arc(cx, cy, 18, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2.5;
        ctx.stroke();

        ctx.fillStyle = '#0f172a';
        ctx.font = 'bold 11px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('+79e', cx, cy + 4);

        ctx.fillStyle = '#facc15';
        ctx.font = 'bold 11px "Space Grotesk", sans-serif';
        ctx.fillText('Hạt nhân Vàng (Au)', cx, cy + 32);

        // Các hạt alpha bắn tới để lại vệt sáng
        alphaParticles.forEach(pt => {
            ctx.fillStyle = '#ef4444';
            ctx.shadowColor = '#ef4444';
            ctx.shadowBlur = 6;
            ctx.beginPath();
            ctx.arc(pt.x, pt.y, 4.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;
        });

        // Súng bắn hạt alpha bên trái
        ctx.fillStyle = '#334155';
        ctx.fillRect(20, 180, 45, 100);
        ctx.strokeStyle = '#94a3b8';
        ctx.strokeRect(20, 180, 45, 100);
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 10px "Space Grotesk", sans-serif';
        ctx.fillText('Nguồn α', 42, 235);
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
