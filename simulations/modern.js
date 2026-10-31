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

