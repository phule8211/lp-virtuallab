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

