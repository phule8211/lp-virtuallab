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
