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

