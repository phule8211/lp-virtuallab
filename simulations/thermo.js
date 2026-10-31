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
