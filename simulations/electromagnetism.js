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

