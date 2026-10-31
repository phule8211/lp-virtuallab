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
