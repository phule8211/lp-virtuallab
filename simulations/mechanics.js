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
(function initNewtonFriction() {
    const canvas = document.getElementById('newtonFrictionCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    let x = 80; // Tọa độ vật trên mặt phẳng nghiêng (pixel)
    let v = 0;
    let running = false;
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
    }

    function update(dt) {
        if (!running || paused) return;
        const p = getParams();
        const alphaRad = (p.alphaDeg * Math.PI) / 180;

        // Phân tích lực theo hệ quy chiếu mặt nghiêng:
        // Trọng lực: P_parallel = m*g*sin(alpha), P_perp = m*g*cos(alpha)
        // Phản lực pháp tuyến: N = P_perp = m*g*cos(alpha)
        const N = p.m * p.g * Math.cos(alphaRad);
        const P_par = p.m * p.g * Math.sin(alphaRad); // Hướng trượt xuống dốc
        const fMaxStatic = p.muS * N;

        // Tổng ngoại lực song song mặt phẳng không tính ma sát: (F_kéo hướng lên dốc, P_par hướng xuống)
        // Chiều dương quy ước: Hướng lên dốc
        const F_net_no_friction = p.fPull - P_par;

        let a = 0;
        let frictionForce = 0;
        let stateText = 'Đang đứng yên (Ma sát nghỉ)';

        if (Math.abs(v) < 0.001) {
            // Đang đứng yên -> kiểm tra xem có vượt quá ma sát nghỉ cực đại không
            if (Math.abs(F_net_no_friction) <= fMaxStatic) {
                // Đứng yên
                frictionForce = -F_net_no_friction; // Cân bằng hoàn hảo
                a = 0;
                v = 0;
                stateText = 'Đứng yên cân bằng (F_ms nghỉ = ' + Math.abs(frictionForce).toFixed(1) + ' N)';
            } else {
                // Bắt đầu trượt!
                const sign = Math.sign(F_net_no_friction);
                frictionForce = -sign * p.muK * N;
                a = (F_net_no_friction + frictionForce) / p.m;
                stateText = sign > 0 ? 'Trượt lên dốc gia tốc a > 0' : 'Trượt xuống dốc gia tốc a < 0';
            }
        } else {
            // Đang chuyển động -> chịu ma sát trượt ngược chiều vận tốc
            const sign = Math.sign(v);
            frictionForce = -sign * p.muK * N;
            a = (F_net_no_friction + frictionForce) / p.m;
            stateText = v > 0 ? 'Đang trượt lên dốc' : 'Đang trượt xuống dốc';
        }

        v += a * dt;
        x += v * dt * 30; // Scale pixel

        // Giới hạn biên mặt nghiêng (chiều dài dốc khoảng 450 px)
        if (x < 40) {
            x = 40;
            v = 0;
            stateText = 'Chạm chân dốc';
        } else if (x > 500) {
            x = 500;
            v = 0;
            stateText = 'Chạm đỉnh dốc';
        }

        // Cập nhật số liệu
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
        const bgGrad = ctx.createLinearGradient(0, 0, 0, canvas.height);
        bgGrad.addColorStop(0, '#040d1a');
        bgGrad.addColorStop(1, '#091e38');
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        const p = getParams();
        const alphaRad = (p.alphaDeg * Math.PI) / 180;

        // Tọa độ gốc chân dốc
        const baseX = 80;
        const baseY = canvas.height - 60;
        const rampLength = 520;
        const topX = baseX + rampLength * Math.cos(alphaRad);
        const topY = baseY - rampLength * Math.sin(alphaRad);

        // 1. Vẽ nêm mặt phẳng nghiêng
        ctx.fillStyle = '#1e293b';
        ctx.beginPath();
        ctx.moveTo(baseX, baseY);
        ctx.lineTo(topX, topY);
        ctx.lineTo(topX, baseY);
        ctx.closePath();
        ctx.fill();

        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 3;
        ctx.stroke();

        // Đánh dấu cung góc nghiêng alpha
        ctx.strokeStyle = '#fbbf24';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(baseX, baseY, 50, -alphaRad, 0);
        ctx.stroke();
        ctx.fillStyle = '#fbbf24';
        ctx.font = '13px "Space Grotesk", -apple-system, sans-serif';
        ctx.fillText(`α = ${p.alphaDeg}°`, baseX + 60, baseY - 12);

        // 2. Vị trí khối hộp trên dốc
        const boxDist = x;
        const boxSize = 36 + p.m * 2;
        const cx = baseX + boxDist * Math.cos(alphaRad);
        const cy = baseY - boxDist * Math.sin(alphaRad);

        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(-alphaRad);

        // Vẽ khối hộp
        ctx.fillStyle = '#0284c7';
        ctx.fillRect(-boxSize / 2, -boxSize, boxSize, boxSize);
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.strokeRect(-boxSize / 2, -boxSize, boxSize, boxSize);

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 12px "Space Grotesk", -apple-system, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`m = ${p.m}kg`, 0, -boxSize / 2 + 4);

        // 3. Vẽ các vector lực từ tâm vật (tọa độ local: 0, -boxSize/2)
        const ox = 0, oy = -boxSize / 2;
        const scale = 2.0;

        // Phản lực N (hướng lên trên vuông góc dốc: local -y)
        const N = p.m * p.g * Math.cos(alphaRad);
        drawVector(ctx, ox, oy, 0, -N * scale, '#10b981', `N = ${N.toFixed(1)}N`);

        // Lực kéo F_kéo (hướng theo chiều dốc: local +x)
        if (p.fPull > 0) {
            drawVector(ctx, ox, oy, p.fPull * scale, 0, '#f59e0b', `F_kéo = ${p.fPull}N`);
        }

        ctx.restore();

        // Trọng lực P = mg (hướng thẳng đứng xuống dưới: global +y)
        const P = p.m * p.g;
        drawVector(ctx, cx, cy - boxSize / 2, 0, P * scale, '#ef4444', `P = ${P.toFixed(1)}N`);
    }

    function drawVector(ctx, fromX, fromY, dx, dy, color, label) {
        const toX = fromX + dx;
        const toY = fromY + dy;
        const angle = Math.atan2(dy, dx);
        const headlen = 8;

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

        if (label) {
            ctx.fillStyle = color;
            ctx.font = '11px "Space Grotesk", -apple-system, sans-serif';
            ctx.fillText(label, toX + 6, toY + 4);
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

    ['nf-mass', 'nf-alpha', 'nf-mus', 'nf-muk', 'nf-fpull', 'nf-g'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('input', () => { syncLabels(); resetSimulation(); });
    });

    const resetBtn = document.getElementById('nf-reset');
    if (resetBtn) resetBtn.addEventListener('click', resetSimulation);

    const pauseBtn = document.getElementById('nf-pause');
    if (pauseBtn) {
        pauseBtn.addEventListener('click', () => {
            paused = !paused;
            pauseBtn.textContent = paused ? '▶️ Tiếp tục' : '⏸️ Tạm dừng';
        });
    }

    syncLabels();
    resetSimulation();
})();

// ─────────────────────────────────────────────────────────────
// 3. CHUYỂN ĐỘNG TRÒN ĐỀU VÀ LỰC HƯỚNG TÂM (Circular Motion)
// ─────────────────────────────────────────────────────────────
(function initCircularMotion() {
    const canvas = document.getElementById('circularMotionCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    let theta = 0;
    let stringBroken = false;
    let ballX = 0, ballY = 0;
    let flyVx = 0, flyVy = 0;
    let trail = [];
    let paused = false;

    function getParams() {
        const rEl = document.getElementById('cm-radius');
        const omegaEl = document.getElementById('cm-omega');
        const mEl = document.getElementById('cm-mass');

        return {
            r: rEl ? parseFloat(rEl.value) : 140, // pixel
            omega: omegaEl ? parseFloat(omegaEl.value) : 2.5, // rad/s
            m: mEl ? parseFloat(mEl.value) : 1.5 // kg
        };
    }

    function syncLabels() {
        const p = getParams();
        const rVal = document.getElementById('cm-radius-val');
        const wVal = document.getElementById('cm-omega-val');
        const mVal = document.getElementById('cm-mass-val');
        if (rVal) rVal.textContent = (p.r / 50).toFixed(2) + ' m';
        if (wVal) wVal.textContent = p.omega.toFixed(1) + ' rad/s';
        if (mVal) mVal.textContent = p.m.toFixed(1) + ' kg';
    }

    function resetSimulation() {
        theta = 0;
        stringBroken = false;
        trail = [];
    }

    function cutString() {
        if (stringBroken) return;
        const p = getParams();
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        ballX = centerX + p.r * Math.cos(theta);
        ballY = centerY + p.r * Math.sin(theta);

        // Vận tốc tiếp tuyến v = omega * r
        const v = p.omega * (p.r / 50); // m/s
        const vPix = p.omega * p.r; // px/s
        flyVx = -vPix * Math.sin(theta);
        flyVy = vPix * Math.cos(theta);
        stringBroken = true;
    }

    function update(dt) {
        if (paused) return;
        const p = getParams();
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;

        if (!stringBroken) {
            theta += p.omega * dt;
            ballX = centerX + p.r * Math.cos(theta);
            ballY = centerY + p.r * Math.sin(theta);
        } else {
            // Chuyển động thẳng đều theo quán tính (tiếp tuyến)
            ballX += flyVx * dt;
            ballY += flyVy * dt;
        }

        trail.push({ x: ballX, y: ballY });
        if (trail.length > 50) trail.shift();

        // Tính toán các đại lượng vật lý
        const realR = p.r / 50; // mét
        const vLinear = p.omega * realR;
        const aCentripetal = stringBroken ? 0 : (vLinear * vLinear) / realR;
        const fCentripetal = stringBroken ? 0 : p.m * aCentripetal;
        const period = p.omega > 0 ? (2 * Math.PI) / p.omega : 0;

        const vEl = document.getElementById('cm-linear-v');
        const acpEl = document.getElementById('cm-acp');
        const fcpEl = document.getElementById('cm-fcp');
        const tEl = document.getElementById('cm-period');

        if (vEl) vEl.textContent = vLinear.toFixed(2) + ' m/s';
        if (acpEl) acpEl.textContent = aCentripetal.toFixed(2) + ' m/s²';
        if (fcpEl) fcpEl.textContent = fCentripetal.toFixed(2) + ' N';
        if (tEl) tEl.textContent = period.toFixed(2) + ' s';
    }

    function draw() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        const bgGrad = ctx.createLinearGradient(0, 0, 0, canvas.height);
        bgGrad.addColorStop(0, '#040d1a');
        bgGrad.addColorStop(1, '#091e38');
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        const p = getParams();
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;

        // 1. Quỹ đạo tròn (nét đứt)
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.3)';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.arc(centerX, centerY, p.r, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);

        // 2. Vệt quỹ đạo
        if (trail.length > 1) {
            ctx.strokeStyle = stringBroken ? 'rgba(239, 68, 68, 0.4)' : 'rgba(56, 189, 248, 0.4)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            trail.forEach((pt, i) => {
                if (i === 0) ctx.moveTo(pt.x, pt.y);
                else ctx.lineTo(pt.x, pt.y);
            });
            ctx.stroke();
        }

        // 3. Tâm quay & Sợi dây
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(centerX, centerY, 5, 0, Math.PI * 2);
        ctx.fill();

        if (!stringBroken) {
            ctx.strokeStyle = '#94a3b8';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(centerX, centerY);
            ctx.lineTo(ballX, ballY);
            ctx.stroke();
        }

        // 4. Quả nặng
        ctx.fillStyle = '#0284c7';
        ctx.beginPath();
        ctx.arc(ballX, ballY, 12, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.stroke();

        // 5. Các vector khi chưa đứt dây
        if (!stringBroken) {
            // Vector tiếp tuyến v (màu xanh lá)
            const vScale = 15;
            const vx = -Math.sin(theta) * vScale;
            const vy = Math.cos(theta) * vScale;
            drawArrow(ctx, ballX, ballY, ballX + vx, ballY + vy, '#22c55e', 'v (tiếp tuyến)');

            // Vector gia tốc hướng tâm a_ht / lực F_ht (màu đỏ hướng về tâm)
            const aScale = 25;
            const ax = -Math.cos(theta) * aScale;
            const ay = -Math.sin(theta) * aScale;
            drawArrow(ctx, ballX, ballY, ballX + ax, ballY + ay, '#ef4444', 'F_ht (hướng tâm)');
        } else {
            // Sau khi đứt dây: bay theo tiếp tuyến
            const speed = Math.hypot(flyVx, flyVy);
            if (speed > 0) {
                const vx = (flyVx / speed) * 30;
                const vy = (flyVy / speed) * 30;
                drawArrow(ctx, ballX, ballY, ballX + vx, ballY + vy, '#22c55e', 'v (quán tính)');
            }
        }
    }

    function drawArrow(ctx, fromX, fromY, toX, toY, color, label) {
        const headlen = 8;
        const angle = Math.atan2(toY - fromY, toX - fromX);
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
        ctx.fillText(label, toX + 5, toY + 4);
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
        if (el) el.addEventListener('input', () => { syncLabels(); resetSimulation(); });
    });

    const cutBtn = document.getElementById('cm-cut-string');
    if (cutBtn) cutBtn.addEventListener('click', cutString);

    const resetBtn = document.getElementById('cm-reset');
    if (resetBtn) resetBtn.addEventListener('click', resetSimulation);

    syncLabels();
    resetSimulation();
})();

// ─────────────────────────────────────────────────────────────
// 4. VA CHẠM VÀ BẢO TOÀN ĐỘNG LƯỢNG (Collisions Lab)
// ─────────────────────────────────────────────────────────────
(function initCollisionLab() {
    const canvas = document.getElementById('collisionCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    let b1 = { x: 120, y: 220, vx: 4, m: 2, r: 24, color: '#38bdf8' };
    let b2 = { x: 480, y: 220, vx: -2, m: 3, r: 30, color: '#f59e0b' };
    let running = true;
    let restitution = 1.0; // 1 = Đàn hồi, 0 = Va chạm mềm

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
        b1.r = 18 + p.m1 * 3;
        b1.vx = p.v1;
        b1.x = 100;

        b2.m = p.m2;
        b2.r = 18 + p.m2 * 3;
        b2.vx = p.v2;
        b2.x = canvas.width - 120;

        restitution = p.e;
        running = true;
    }

    function update(dt) {
        if (!running) return;

        b1.x += b1.vx * dt * 40;
        b2.x += b2.vx * dt * 40;

        // Va chạm giữa 2 quả cầu
        const dist = Math.abs(b2.x - b1.x);
        const minDist = b1.r + b2.r;

        if (dist <= minDist && (b1.vx - b2.vx) > 0) {
            // Công thức va chạm tổng quát với hệ số hồi phục e:
            // v1' = [m1*v1 + m2*v2 - m2*e*(v1 - v2)] / (m1 + m2)
            // v2' = [m1*v1 + m2*v2 + m1*e*(v1 - v2)] / (m1 + m2)
            const m1 = b1.m, m2 = b2.m;
            const u1 = b1.vx, u2 = b2.vx;
            const e = restitution;

            const v1Prime = (m1 * u1 + m2 * u2 - m2 * e * (u1 - u2)) / (m1 + m2);
            const v2Prime = (m1 * u1 + m2 * u2 + m1 * e * (u1 - u2)) / (m1 + m2);

            b1.vx = v1Prime;
            b2.vx = v2Prime;

            // Chống dính
            const overlap = minDist - dist;
            b1.x -= overlap / 2;
            b2.x += overlap / 2;
        }

        // Va chạm đàn hồi với 2 thành biên
        if (b1.x - b1.r < 20) { b1.x = 20 + b1.r; b1.vx = -b1.vx; }
        if (b2.x + b2.r > canvas.width - 20) { b2.x = canvas.width - 20 - b2.r; b2.vx = -b2.vx; }

        // Tính động lượng & động năng
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
        const bgGrad = ctx.createLinearGradient(0, 0, 0, canvas.height);
        bgGrad.addColorStop(0, '#040d1a');
        bgGrad.addColorStop(1, '#091e38');
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Băng truyền / sàn không ma sát
        const trackY = 220;
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(15, trackY + 35, canvas.width - 30, 20);
        ctx.strokeStyle = '#475569';
        ctx.lineWidth = 2;
        ctx.strokeRect(15, trackY + 35, canvas.width - 30, 20);

        // Hai bức tường biên
        ctx.fillStyle = '#334155';
        ctx.fillRect(0, trackY - 60, 20, 115);
        ctx.fillRect(canvas.width - 20, trackY - 60, 20, 115);

        // Quả bóng 1
        ctx.beginPath();
        ctx.arc(b1.x, trackY + 35 - b1.r, b1.r, 0, Math.PI * 2);
        ctx.fillStyle = b1.color;
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 12px "Space Grotesk", -apple-system, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`m₁=${b1.m}kg`, b1.x, trackY + 35 - b1.r + 4);

        // Quả bóng 2
        ctx.beginPath();
        ctx.arc(b2.x, trackY + 35 - b2.r, b2.r, 0, Math.PI * 2);
        ctx.fillStyle = b2.color;
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.fillText(`m₂=${b2.m}kg`, b2.x, trackY + 35 - b2.r + 4);

        // Vector vận tốc v1 và v2
        drawVector(ctx, b1.x, trackY + 35 - b1.r - b1.r - 10, b1.vx * 8, '#38bdf8', `v₁ = ${b1.vx.toFixed(1)}`);
        drawVector(ctx, b2.x, trackY + 35 - b2.r - b2.r - 10, b2.vx * 8, '#f59e0b', `v₂ = ${b2.vx.toFixed(1)}`);
    }

    function drawVector(ctx, x, y, dx, color, label) {
        if (Math.abs(dx) < 1) return;
        const headlen = 6;
        const sign = Math.sign(dx);
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + dx, y);
        ctx.stroke();

        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.moveTo(x + dx, y);
        ctx.lineTo(x + dx - sign * headlen, y - 4);
        ctx.lineTo(x + dx - sign * headlen, y + 4);
        ctx.fill();

        ctx.font = '11px "Space Grotesk", -apple-system, sans-serif';
        ctx.fillText(label, x + dx / 2, y - 8);
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
// 5. BẢO TOÀN CƠ NĂNG - ĐƯỜNG TRƯỢT SKATE PARK (Energy Conservation)
// ─────────────────────────────────────────────────────────────
(function initEnergySkate() {
    const canvas = document.getElementById('energySkateCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    // Đường trượt hình chữ U dạng parabol: y(x) = A*(x - x0)^2 + y0
    const x0 = canvas.width / 2;
    const y0 = 360; // Đáy lòng máng
    const kCurve = 0.0022; // Độ uốn cong của máng

    let sX = x0 - 150; // Vị trí x của người trượt
    let vS = 0; // Vận tốc tiếp tuyến dọc đường trượt
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
        return y0 - kCurve * Math.pow(x - x0, 2) * -1; // Đỉnh ở trên, lòng máng ở dưới
    }

    function getSlopeAngle(x) {
        // dy/dx = 2 * kCurve * (x - x0)
        const slope = 2 * kCurve * (x - x0);
        return Math.atan(slope);
    }

    function update(dt) {
        if (paused) return;
        const p = getParams();

        const angle = getSlopeAngle(sX);
        // Gia tốc dọc theo tiếp tuyến mặt trượt: a = -g * sin(angle) - friction * v
        const aTangent = -p.g * Math.sin(angle) * 30 - p.friction * 40 * vS;

        vS += aTangent * dt;
        sX += vS * Math.cos(angle) * dt * 8;

        // Giới hạn biên máng trượt
        if (sX < 80) { sX = 80; vS = -vS * 0.9; }
        if (sX > canvas.width - 80) { sX = canvas.width - 80; vS = -vS * 0.9; }

        // Tính năng lượng:
        // Đáy máng y0 là mốc thế năng 0
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
        const bgGrad = ctx.createLinearGradient(0, 0, 0, canvas.height);
        bgGrad.addColorStop(0, '#040d1a');
        bgGrad.addColorStop(1, '#091e38');
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        const p = getParams();

        // 1. Vẽ đường cong máng trượt
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 6;
        ctx.beginPath();
        for (let x = 60; x <= canvas.width - 60; x += 5) {
            const y = getY(x);
            if (x === 60) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.stroke();

        // Chân đế đường trượt
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.2)';
        ctx.lineWidth = 2;
        for (let x = 100; x <= canvas.width - 100; x += 40) {
            ctx.beginPath();
            ctx.moveTo(x, getY(x));
            ctx.lineTo(x, canvas.height - 20);
            ctx.stroke();
        }

        // 2. Vị trí người trượt ván
        const curY = getY(sX);
        const angle = getSlopeAngle(sX);

        ctx.save();
        ctx.translate(sX, curY);
        ctx.rotate(angle);

        // Ván trượt
        ctx.fillStyle = '#f59e0b';
        ctx.fillRect(-20, -5, 40, 6);
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(-14, 3, 3, 0, Math.PI * 2);
        ctx.arc(14, 3, 3, 0, Math.PI * 2);
        ctx.fill();

        // Người trượt (hình nộm cơ bản)
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(0, -5);
        ctx.lineTo(0, -28); // Thân
        ctx.lineTo(-8, -15); // Chân sau
        ctx.moveTo(0, -28);
        ctx.lineTo(8, -15); // Chân trước
        ctx.moveTo(0, -22);
        ctx.lineTo(-12, -26); // Tay trái
        ctx.moveTo(0, -22);
        ctx.lineTo(12, -26); // Tay phải
        ctx.stroke();

        // Đầu
        ctx.fillStyle = '#38bdf8';
        ctx.beginPath();
        ctx.arc(0, -34, 6, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();

        // 3. Thanh năng lượng động (Energy Bar Chart) ở góc phải
        drawEnergyBars(ctx);
    }

    function drawEnergyBars(ctx) {
        const epEl = document.getElementById('skate-ep');
        const ekEl = document.getElementById('skate-ek');
        const ethEl = document.getElementById('skate-eth');

        const ep = epEl ? parseFloat(epEl.textContent) : 0;
        const ek = ekEl ? parseFloat(ekEl.textContent) : 0;
        const eth = ethEl ? parseFloat(ethEl.textContent) : 0;
        const maxE = Math.max(ep + ek + eth, 100);

        const bx = canvas.width - 140;
        const by = 40;
        const barW = 20;
        const barMaxH = 100;

        ctx.fillStyle = 'rgba(15, 23, 42, 0.7)';
        ctx.fillRect(bx - 15, by - 15, 130, 140);
        ctx.strokeStyle = '#475569';
        ctx.strokeRect(bx - 15, by - 15, 130, 140);

        // Ek (Động năng - Xanh lá)
        const hEk = (ek / maxE) * barMaxH;
        ctx.fillStyle = '#22c55e';
        ctx.fillRect(bx, by + barMaxH - hEk, barW, hEk);

        // Ep (Thế năng - Xanh dương)
        const hEp = (ep / maxE) * barMaxH;
        ctx.fillStyle = '#0284c7';
        ctx.fillRect(bx + 30, by + barMaxH - hEp, barW, hEp);

        // Ethermal (Nhiệt - Đỏ)
        const hEth = (eth / maxE) * barMaxH;
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(bx + 60, by + barMaxH - hEth, barW, hEth);

        ctx.fillStyle = '#ffffff';
        ctx.font = '10px "Space Grotesk", -apple-system, sans-serif';
        ctx.fillText('Động năng', bx - 5, by + barMaxH + 15);
        ctx.fillText('Thế năng', bx + 28, by + barMaxH + 15);
        ctx.fillText('Nhiệt', bx + 62, by + barMaxH + 15);
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
            sX = x0 - 150;
            vS = 0;
            thermalEnergy = 0;
        });
    }

    syncLabels();
})();

// ─────────────────────────────────────────────────────────────
// 6. CÂN BẰNG VẬT RẮN VÀ MOMEN LỰC - ĐÒN BẨY (Balancing Act & Torque)
// ─────────────────────────────────────────────────────────────
(function initBalancingAct() {
    const canvas = document.getElementById('balancingActCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    // Thanh bập bênh: chiều dài 500 px, các khấc cách nhau 25px (-10 đến +10)
    let weights = [
        { mass: 5, pos: -6 }, // 5kg ở khấc -6 (bên trái)
        { mass: 10, pos: 3 }  // 10kg ở khấc +3 (bên phải) => 5*6 = 30 = 10*3 => CÂN BẰNG!
    ];
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
        weights = [
            { mass: p.m1, pos: -p.d1 },
            { mass: p.m2, pos: p.d2 }
        ];

        // Momen quay ngược chiều kim đồng hồ: M1 = m1 * d1
        // Momen quay thuận chiều kim đồng hồ: M2 = m2 * d2
        const torqueCCW = p.m1 * p.d1 * 9.8;
        const torqueCW = p.m2 * p.d2 * 9.8;
        const netTorque = torqueCW - torqueCCW;

        if (locked) {
            targetAngle = 0;
        } else {
            if (Math.abs(netTorque) < 0.1) {
                targetAngle = 0; // Cân bằng
            } else {
                targetAngle = Math.sign(netTorque) * 0.22; // Nghiêng sang bên nặng hơn
            }
        }

        // Chuyển động xoay mượt mà
        tiltAngle += (targetAngle - tiltAngle) * 0.1;

        const tccwEl = document.getElementById('lever-t-ccw');
        const tcwEl = document.getElementById('lever-t-cw');
        const tnetEl = document.getElementById('lever-t-net');
        const stEl = document.getElementById('lever-status');

        if (tccwEl) tccwEl.textContent = torqueCCW.toFixed(1) + ' N·m';
        if (tcwEl) tcwEl.textContent = torqueCW.toFixed(1) + ' N·m';
        if (tnetEl) tnetEl.textContent = Math.abs(netTorque).toFixed(1) + ' N·m';
        if (stEl) {
            if (Math.abs(netTorque) < 0.1) {
                stEl.textContent = '⚖️ Cân Bằng Tuyệt Đối (Σ M = 0)';
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
        const bgGrad = ctx.createLinearGradient(0, 0, 0, canvas.height);
        bgGrad.addColorStop(0, '#040d1a');
        bgGrad.addColorStop(1, '#091e38');
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        const cx = canvas.width / 2;
        const cy = 250;
        const beamLen = 460;
        const stepPx = 20;

        // 1. Trụ đỡ tam giác (Fulcrum)
        ctx.fillStyle = '#475569';
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx - 30, cy + 60);
        ctx.lineTo(cx + 30, cy + 60);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#94a3b8';
        ctx.lineWidth = 2;
        ctx.stroke();

        // 2. Chốt khóa an toàn (nếu có)
        if (locked) {
            ctx.fillStyle = '#ef4444';
            ctx.fillRect(cx - 150, cy + 30, 20, 30);
            ctx.fillRect(cx + 130, cy + 30, 20, 30);
        }

        // 3. Vẽ thanh đòn bẩy xoay theo góc tiltAngle
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(tiltAngle);

        // Thân thanh đòn
        ctx.fillStyle = '#0284c7';
        ctx.fillRect(-beamLen / 2, -8, beamLen, 16);
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 2;
        ctx.strokeRect(-beamLen / 2, -8, beamLen, 16);

        // Vạch chia khoảng cách trên thanh
        ctx.fillStyle = '#ffffff';
        ctx.font = '10px "Space Grotesk", -apple-system, sans-serif';
        ctx.textAlign = 'center';
        for (let i = -10; i <= 10; i++) {
            const vx = i * stepPx;
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = i === 0 ? 2 : 1;
            ctx.beginPath();
            ctx.moveTo(vx, -8);
            ctx.lineTo(vx, 8);
            ctx.stroke();

            if (i !== 0 && i % 2 === 0) {
                ctx.fillText(Math.abs(i), vx, 22);
            }
        }

        // 4. Vẽ các quả nặng trên thanh
        weights.forEach((w, idx) => {
            const wx = w.pos * stepPx;
            const wSize = 20 + w.mass * 1.5;
            ctx.fillStyle = idx === 0 ? '#38bdf8' : '#f59e0b';
            ctx.fillRect(wx - wSize / 2, -8 - wSize, wSize, wSize);
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 1.5;
            ctx.strokeRect(wx - wSize / 2, -8 - wSize, wSize, wSize);

            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 11px "Space Grotesk", -apple-system, sans-serif';
            ctx.fillText(`${w.mass}kg`, wx, -8 - wSize / 2 + 4);
        });

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
// 7. CHUYỂN ĐỘNG QUAY VÀ MOMEN QUÁN TÍNH (Rotational Inertia)
// ─────────────────────────────────────────────────────────────
(function initRotationalInertia() {
    const canvas = document.getElementById('rotationalInertiaCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    let angle = 0;
    let omega = 3.0; // rad/s
    let radius = 100; // Khoảng cách quả nặng tới trục quay (px)

    function getParams() {
        const rEl = document.getElementById('rot-radius');
        const mEl = document.getElementById('rot-mass');

        return {
            r: rEl ? parseFloat(rEl.value) : 100, // pixel
            m: mEl ? parseFloat(mEl.value) : 5 // kg
        };
    }

    function syncLabels() {
        const p = getParams();
        const rVal = document.getElementById('rot-radius-val');
        const mVal = document.getElementById('rot-mass-val');
        if (rVal) rVal.textContent = (p.r / 50).toFixed(2) + ' m';
        if (mVal) mVal.textContent = p.m.toFixed(1) + ' kg';
    }

    function update(dt) {
        const p = getParams();
        const newR = p.r;

        // Định luật bảo toàn mômen động lượng: L = I * omega = const
        // I = m * r^2
        // Khi thay đổi bán kính từ r_old sang r_new: omega_new = omega_old * (r_old / r_new)^2
        if (Math.abs(newR - radius) > 0.5) {
            const I_old = p.m * Math.pow(radius / 50, 2);
            const I_new = p.m * Math.pow(newR / 50, 2);
            omega = omega * (I_old / I_new);
            radius = newR;
        }

        angle += omega * dt;

        const realR = radius / 50;
        const I = p.m * realR * realR;
        const L = I * omega;
        const Erot = 0.5 * I * omega * omega;

        const iEl = document.getElementById('rot-inertia');
        const wEl = document.getElementById('rot-omega');
        const lEl = document.getElementById('rot-angular-l');
        const eEl = document.getElementById('rot-energy');

        if (iEl) iEl.textContent = I.toFixed(3) + ' kg·m²';
        if (wEl) wEl.textContent = omega.toFixed(2) + ' rad/s';
        if (lEl) lEl.textContent = L.toFixed(2) + ' J·s (const)';
        if (eEl) eEl.textContent = Erot.toFixed(1) + ' J';
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

        // Trục quay ở tâm
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(cx, cy, 6, 0, Math.PI * 2);
        ctx.fill();

        // Đĩa quay / thanh quay
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(angle);

        // Thanh ngang đỡ 2 quả nặng
        ctx.strokeStyle = '#475569';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(-radius, 0);
        ctx.lineTo(radius, 0);
        ctx.stroke();

        // 2 Quả nặng di động
        ctx.fillStyle = '#38bdf8';
        ctx.beginPath();
        ctx.arc(-radius, 0, 16, 0, Math.PI * 2);
        ctx.arc(radius, 0, 16, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.restore();

        // Vòng tròn đường chạy của 2 quả nặng
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.2)';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);

        // Chú thích
        ctx.fillStyle = '#94a3b8';
        ctx.font = '12px "Space Grotesk", -apple-system, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('💡 Thu hẹp bán kính r → Momen quán tính I giảm → Tốc độ quay ω tăng vọt!', cx, canvas.height - 25);
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

