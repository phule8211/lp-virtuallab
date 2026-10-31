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
