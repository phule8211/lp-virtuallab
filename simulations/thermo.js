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

