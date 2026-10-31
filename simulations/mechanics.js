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
// 2. ĐỊNH LUẬT NEWTON & MA SÁT TRÊN MẶT PHẲNG NGHIÊNG (PhET Friction Ramp)
// ─────────────────────────────────────────────────────────────
(function initNewtonFriction() {
    const canvas = document.getElementById('newtonFrictionCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    let x = 80;
    let v = 0;
    let running = true;
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
        paused = false;
    }

    function update(dt) {
        if (!running || paused) return;
        const p = getParams();
        const alphaRad = (p.alphaDeg * Math.PI) / 180;

        const N = p.m * p.g * Math.cos(alphaRad);
        const P_par = p.m * p.g * Math.sin(alphaRad);
        const fMaxStatic = p.muS * N;
        const F_net_no_friction = p.fPull - P_par;

        let a = 0;
        let frictionForce = 0;
        let stateText = 'Đang đứng yên (Ma sát nghỉ)';

        if (Math.abs(v) < 0.001) {
            if (Math.abs(F_net_no_friction) <= fMaxStatic) {
                frictionForce = -F_net_no_friction;
                a = 0;
                v = 0;
                stateText = 'Đứng yên cân bằng (F_ms nghỉ = ' + Math.abs(frictionForce).toFixed(1) + ' N)';
            } else {
                const sign = Math.sign(F_net_no_friction);
                frictionForce = -sign * p.muK * N;
                a = (F_net_no_friction + frictionForce) / p.m;
                stateText = sign > 0 ? 'Trượt lên dốc gia tốc a > 0' : 'Trượt xuống dốc gia tốc a < 0';
            }
        } else {
            const sign = Math.sign(v);
            frictionForce = -sign * p.muK * N;
            a = (F_net_no_friction + frictionForce) / p.m;
            stateText = v > 0 ? 'Đang trượt lên dốc' : 'Đang trượt xuống dốc';
        }

        v += a * dt;
        x += v * dt * 25;

        if (x < 50) { x = 50; v = 0; stateText = 'Chạm chân dốc'; }
        else if (x > 500) { x = 500; v = 0; stateText = 'Chạm đỉnh dốc'; }

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
        
        ctx.save();
        ctx.scale(canvas.width / 700, canvas.height / 460);

        PhET.drawLabBackground(ctx, 700, 460, 'MẶT PHẲNG NGHIÊNG & MA SÁT NEWTON');

        const p = getParams();
        const alphaRad = (p.alphaDeg * Math.PI) / 180;

        const baseX = 80;
        const baseY = 390;
        const rampLength = 540;
        const topX = baseX + rampLength * Math.cos(alphaRad);
        const topY = baseY - rampLength * Math.sin(alphaRad);

        // 1. Nêm mặt phẳng nghiêng bằng gỗ/kim loại cao cấp
        const rampGrad = ctx.createLinearGradient(baseX, baseY, topX, topY);
        rampGrad.addColorStop(0, '#334155');
        rampGrad.addColorStop(0.5, '#1e293b');
        rampGrad.addColorStop(1, '#0f172a');
        ctx.fillStyle = rampGrad;
        ctx.beginPath();
        ctx.moveTo(baseX, baseY);
        ctx.lineTo(topX, topY);
        ctx.lineTo(topX, baseY);
        ctx.closePath();
        ctx.fill();

        // Bề mặt dốc có lớp trượt phản quang
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(baseX, baseY);
        ctx.lineTo(topX, topY);
        ctx.stroke();

        // Cung đo góc nghiêng alpha với thước đo
        ctx.strokeStyle = '#facc15';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(baseX, baseY, 65, -alphaRad, 0);
        ctx.stroke();

        ctx.fillStyle = '#facc15';
        ctx.font = 'bold 13px "Space Grotesk", sans-serif';
        ctx.fillText(`α = ${p.alphaDeg}°`, baseX + 80, baseY - 16);

        // 2. Khối gỗ ma sát trượt trên dốc (Textured Wooden/Brass Block)
        const boxDist = x;
        const boxSize = 42 + p.m * 2;
        const cx = baseX + boxDist * Math.cos(alphaRad);
        const cy = baseY - boxDist * Math.sin(alphaRad);

        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(-alphaRad);

        // Thân khối hộp gỗ 3D
        const bGrad = ctx.createLinearGradient(-boxSize/2, -boxSize, boxSize/2, 0);
        bGrad.addColorStop(0, '#d97706');
        bGrad.addColorStop(0.5, '#f59e0b');
        bGrad.addColorStop(1, '#b45309');
        ctx.fillStyle = bGrad;
        ctx.beginPath();
        ctx.roundRect(-boxSize / 2, -boxSize, boxSize, boxSize, 4);
        ctx.fill();
        ctx.strokeStyle = '#fef3c7';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        ctx.fillStyle = '#0f172a';
        ctx.font = 'bold 12px "Space Grotesk", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`${p.m}kg`, 0, -boxSize / 2 + 4);

        // Các vector lực: N, F_keo, F_ms
        const ox = 0, oy = -boxSize / 2;
        const scale = 1.6;
        const N = p.m * p.g * Math.cos(alphaRad);

        // Phản lực N vuông góc lên trên
        PhET.drawVector(ctx, ox, oy, 0, -N * scale, '#4ade80', `N = ${N.toFixed(1)}N`, 2.5);

        // Lực kéo F_kéo hướng lên theo mặt nghiêng (+x)
        if (p.fPull > 0) {
            PhET.drawVector(ctx, ox, oy, p.fPull * scale, 0, '#facc15', `F_kéo = ${p.fPull}N`, 2.5);
        }

        ctx.restore();

        // Trọng lực P = mg hướng thẳng đứng xuống đất
        const P = p.m * p.g;
        PhET.drawVector(ctx, cx, cy - boxSize / 2, 0, P * 1.6, '#ef4444', `P = ${P.toFixed(1)}N`, 2.5);

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

    ['nf-mass', 'nf-alpha', 'nf-mus', 'nf-muk', 'nf-fpull', 'nf-g'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('input', () => { syncLabels(); });
    });

    const resetBtn = document.getElementById('nf-reset');
    if (resetBtn) resetBtn.addEventListener('click', resetSimulation);

    const pauseBtn = document.getElementById('nf-pause');
    if (pauseBtn) {
        pauseBtn.addEventListener('click', () => {
            paused = !paused;
            pauseBtn.textContent = paused ? 'Tiếp tục' : 'Tạm dừng';
        });
    }

    syncLabels();
})();

// ─────────────────────────────────────────────────────────────
// 3. CHUYỂN ĐỘNG TRÒN ĐỀU & LỰC HƯỚNG TÂM (PhET Circular Motion)
// ─────────────────────────────────────────────────────────────
(function initCircularMotion() {
    const canvas = document.getElementById('circularMotionCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    let theta = 0;
    let trail = [];
    let isStringCut = false;
    let cutPos = { x: 0, y: 0, vx: 0, vy: 0 };

    function getParams() {
        const rEl = document.getElementById('cm-radius');
        const wEl = document.getElementById('cm-omega');
        const mEl = document.getElementById('cm-mass');

        return {
            R: rEl ? parseFloat(rEl.value) : 1.5,
            omega: wEl ? parseFloat(wEl.value) : 3.0,
            m: mEl ? parseFloat(mEl.value) : 1.0
        };
    }

    function syncLabels() {
        const p = getParams();
        const rVal = document.getElementById('cm-radius-val');
        const wVal = document.getElementById('cm-omega-val');
        const mVal = document.getElementById('cm-mass-val');

        if (rVal) rVal.textContent = p.R.toFixed(1) + ' m';
        if (wVal) wVal.textContent = p.omega.toFixed(1) + ' rad/s';
        if (mVal) mVal.textContent = p.m.toFixed(1) + ' kg';

        const vLinear = p.omega * p.R;
        const acp = p.omega * p.omega * p.R;
        const Fcp = p.m * acp;
        const period = (2 * Math.PI) / p.omega;

        const vEl = document.getElementById('cm-linear-v');
        const aEl = document.getElementById('cm-acp');
        const fEl = document.getElementById('cm-fcp');
        const tEl = document.getElementById('cm-period');

        if (vEl) vEl.textContent = vLinear.toFixed(2) + ' m/s';
        if (aEl) aEl.textContent = acp.toFixed(2) + ' m/s²';
        if (fEl) fEl.textContent = Fcp.toFixed(2) + ' N';
        if (tEl) tEl.textContent = period.toFixed(2) + ' s';
    }

    function update(dt) {
        const p = getParams();
        if (!isStringCut) {
            theta += p.omega * dt;
        } else {
            cutPos.x += cutPos.vx * dt * 45;
            cutPos.y += cutPos.vy * dt * 45;
        }
    }

    function draw() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        ctx.save();
        ctx.scale(canvas.width / 700, canvas.height / 460);

        PhET.drawLabBackground(ctx, 700, 460, 'CHUYỂN ĐỘNG TRÒN ĐỀU & LỰC HƯỚNG TÂM');

        const p = getParams();
        const cx = 350;
        const cy = 230;
        const rPx = p.R * 85;

        // 1. Bàn quay tròn / Quỹ đạo tròn (Turntable Track)
        ctx.fillStyle = 'rgba(15, 23, 42, 0.7)';
        ctx.beginPath();
        ctx.arc(cx, cy, rPx + 25, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.25)';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Đường quỹ đạo nét đứt
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([5, 4]);
        ctx.beginPath();
        ctx.arc(cx, cy, rPx, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);

        // Trục quay trung tâm (Pivot Axis)
        ctx.fillStyle = '#64748b';
        ctx.beginPath(); ctx.arc(cx, cy, 10, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#e2e8f0'; ctx.lineWidth = 2; ctx.stroke();
        ctx.fillStyle = '#f59e0b'; ctx.beginPath(); ctx.arc(cx, cy, 4, 0, Math.PI * 2); ctx.fill();

        // 2. Tọa độ vật
        let bx = 0, by = 0;
        if (!isStringCut) {
            bx = cx + rPx * Math.cos(theta);
            by = cy + rPx * Math.sin(theta);

            // Dây treo thép nối từ tâm tới vật
            ctx.strokeStyle = '#cbd5e1';
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            ctx.moveTo(cx, cy);
            ctx.lineTo(bx, by);
            ctx.stroke();
        } else {
            bx = cutPos.x;
            by = cutPos.y;
        }

        // 3. Quả cầu kim loại chuyển động
        const bobR = 14 + p.m * 2.5;
        const ballGrad = ctx.createRadialGradient(bx - 4, by - 4, 2, bx, by, bobR);
        ballGrad.addColorStop(0, '#fef08a');
        ballGrad.addColorStop(0.3, '#f59e0b');
        ballGrad.addColorStop(1, '#b45309');
        ctx.fillStyle = ballGrad;
        ctx.beginPath();
        ctx.arc(bx, by, bobR, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.fillStyle = '#0f172a';
        ctx.font = 'bold 11px "Space Grotesk", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`${p.m}kg`, bx, by + 4);

        if (!isStringCut) {
            // Vector vận tốc tiếp tuyến v (xanh lá)
            const vxLen = -Math.sin(theta) * (p.omega * p.R * 14);
            const vyLen = Math.cos(theta) * (p.omega * p.R * 14);
            PhET.drawVector(ctx, bx, by, vxLen, vyLen, '#22c55e', 'v', 2.8);

            // Vector lực hướng tâm F_cp (đỏ hướng về tâm)
            const fxLen = -Math.cos(theta) * (p.m * p.omega * p.omega * 5.5);
            const fyLen = -Math.sin(theta) * (p.m * p.omega * p.omega * 5.5);
            PhET.drawVector(ctx, bx, by, fxLen, fyLen, '#ef4444', 'F_ht', 2.8);
        }

        // Bảng HUD thông số
        const vLinear = p.omega * p.R;
        const acp = p.omega * p.omega * p.R;
        const Fcp = p.m * acp;
        PhET.drawHUD(ctx, 480, 290, '📊 CHUYỂN ĐỘNG TRÒN ĐỀU', [
            { label: 'Vận tốc dài v', val: `${vLinear.toFixed(2)} m/s`, color: '#22c55e' },
            { label: 'Gia tốc hướng tâm', val: `${acp.toFixed(2)} m/s²`, color: '#facc15' },
            { label: 'Lực hướng tâm F_ht', val: `${Fcp.toFixed(2)} N`, color: '#ef4444' }
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

    ['cm-radius', 'cm-omega', 'cm-mass'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('input', () => { syncLabels(); });
    });

    const cutBtn = document.getElementById('cm-cut-string');
    if (cutBtn) {
        cutBtn.addEventListener('click', () => {
            if (!isStringCut) {
                const p = getParams();
                const rPx = p.R * 85;
                isStringCut = true;
                cutPos = {
                    x: 350 + rPx * Math.cos(theta),
                    y: 230 + rPx * Math.sin(theta),
                    vx: -Math.sin(theta) * (p.omega * p.R),
                    vy: Math.cos(theta) * (p.omega * p.R)
                };
            }
        });
    }

    const resetBtn = document.getElementById('cm-reset');
    if (resetBtn) {
        resetBtn.addEventListener('click', () => {
            isStringCut = false;
            theta = 0;
        });
    }

    syncLabels();
})();

// ─────────────────────────────────────────────────────────────
// 4. VA CHẠM & BẢO TOÀN ĐỘNG LƯỢNG (PhET Collision Lab)
// ─────────────────────────────────────────────────────────────
(function initCollisionLab() {
    const canvas = document.getElementById('collisionCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    let b1 = { x: 140, y: 230, vx: 4, m: 2, r: 28, color: '#38bdf8' };
    let b2 = { x: 520, y: 230, vx: -2, m: 3, r: 34, color: '#f59e0b' };
    let running = true;
    let restitution = 1.0;

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
        b1.r = 22 + p.m1 * 3.5;
        b1.vx = p.v1;
        b1.x = 140;

        b2.m = p.m2;
        b2.r = 22 + p.m2 * 3.5;
        b2.vx = p.v2;
        b2.x = 520;

        restitution = p.e;
        running = true;
    }

    function update(dt) {
        if (!running) return;

        b1.x += b1.vx * dt * 45;
        b2.x += b2.vx * dt * 45;

        const dist = Math.abs(b2.x - b1.x);
        const minDist = b1.r + b2.r;

        if (dist <= minDist && (b1.vx - b2.vx) > 0) {
            const m1 = b1.m, m2 = b2.m;
            const u1 = b1.vx, u2 = b2.vx;
            const e = restitution;

            const v1Prime = (m1 * u1 + m2 * u2 - m2 * e * (u1 - u2)) / (m1 + m2);
            const v2Prime = (m1 * u1 + m2 * u2 + m1 * e * (u1 - u2)) / (m1 + m2);

            b1.vx = v1Prime;
            b2.vx = v2Prime;

            const overlap = minDist - dist;
            b1.x -= overlap / 2;
            b2.x += overlap / 2;
        }

        if (b1.x - b1.r < 50) { b1.x = 50 + b1.r; b1.vx = -b1.vx; }
        if (b2.x + b2.r > 650) { b2.x = 650 - b2.r; b2.vx = -b2.vx; }

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
        
        ctx.save();
        ctx.scale(canvas.width / 700, canvas.height / 460);

        PhET.drawLabBackground(ctx, 700, 460, 'PHÒNG THÍ NGHIỆM VA CHẠM & BẢO TOÀN ĐỘNG LƯỢNG');

        const trackY = 250;

        // 1. Đệm không khí (Air Track Rail)
        PhET.drawRuler(ctx, 45, trackY + 30, 610, false, 'cm', 'cm');

        // Băng ray kim loại dẫn hướng
        ctx.fillStyle = '#334155';
        ctx.fillRect(40, trackY, 620, 24);
        ctx.strokeStyle = '#94a3b8';
        ctx.lineWidth = 2;
        ctx.strokeRect(40, trackY, 620, 24);

        // Hai đệm cản hai đầu
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(35, trackY - 20, 15, 50);
        ctx.fillRect(650, trackY - 20, 15, 50);

        // 2. Xe trượt 1 (Cart 1 - Xanh cyan)
        drawCart(ctx, b1.x, trackY, b1.m, b1.vx, '#0284c7', '#38bdf8', 'Xe 1');

        // 3. Xe trượt 2 (Cart 2 - Cam vàng)
        drawCart(ctx, b2.x, trackY, b2.m, b2.vx, '#b45309', '#f59e0b', 'Xe 2');

        // 4. Biểu đồ thanh năng lượng & động lượng phía trên
        const p1 = b1.m * b1.vx;
        const p2 = b2.m * b2.vx;
        const pTot = p1 + p2;
        const keTot = 0.5 * b1.m * b1.vx * b1.vx + 0.5 * b2.m * b2.vx * b2.vx;

        PhET.drawHUD(ctx, 470, 310, '📊 ĐỊNH LUẬT BẢO TOÀN', [
            { label: 'Động lượng p_tổng', val: `${pTot.toFixed(2)} kg·m/s`, color: '#38bdf8' },
            { label: 'Động năng K_tổng', val: `${keTot.toFixed(2)} J`, color: '#4ade80' }
        ], 195);

        ctx.restore();
    }

    function drawCart(ctx, x, trackY, m, v, colDark, colLight, label) {
        const cartW = 60 + m * 8;
        const cartH = 34;
        const cy = trackY - cartH;

        // Thân xe kim loại 3D
        const cGrad = ctx.createLinearGradient(x - cartW/2, cy, x + cartW/2, cy);
        cGrad.addColorStop(0, colDark);
        cGrad.addColorStop(0.5, colLight);
        cGrad.addColorStop(1, colDark);
        ctx.fillStyle = cGrad;
        ctx.beginPath();
        ctx.roundRect(x - cartW/2, cy, cartW, cartH, 4);
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Đệm cao su giảm chấn 2 đầu xe (Bumpers)
        ctx.fillStyle = '#475569';
        ctx.fillRect(x - cartW/2 - 6, cy + 8, 6, cartH - 16);
        ctx.fillRect(x + cartW/2, cy + 8, 6, cartH - 16);

        // Bánh xe trượt
        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        ctx.arc(x - cartW/3, trackY, 5, 0, Math.PI * 2);
        ctx.arc(x + cartW/3, trackY, 5, 0, Math.PI * 2);
        ctx.fill();

        // Nhãn khối lượng
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 12px "Space Grotesk", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`${m.toFixed(1)}kg`, x, cy + cartH/2 + 4);

        // Vector vận tốc v
        PhET.drawVector(ctx, x, cy - 8, v * 14, 0, '#22c55e', `v=${v.toFixed(1)}`, 2.5);
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
// 5. BẢO TOÀN CƠ NĂNG - SKATE PARK (PhET Energy Skate Park)
// ─────────────────────────────────────────────────────────────
(function initEnergySkate() {
    const canvas = document.getElementById('energySkateCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const x0 = 350;
    const y0 = 360;
    const kCurve = 0.0022;

    let sX = x0 - 160;
    let vS = 0;
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
        return y0 - kCurve * Math.pow(x - x0, 2) * -1;
    }

    function getSlopeAngle(x) {
        const slope = 2 * kCurve * (x - x0);
        return Math.atan(slope);
    }

    function update(dt) {
        if (paused) return;
        const p = getParams();

        const angle = getSlopeAngle(sX);
        const aTangent = -p.g * Math.sin(angle) * 32 - p.friction * 40 * vS;

        vS += aTangent * dt;
        sX += vS * Math.cos(angle) * dt * 8;

        if (sX < 80) { sX = 80; vS = -vS * 0.9; }
        if (sX > 620) { sX = 620; vS = -vS * 0.9; }

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
        
        ctx.save();
        ctx.scale(canvas.width / 700, canvas.height / 460);

        PhET.drawLabBackground(ctx, 700, 460, 'ĐƯỜNG TRƯỢT SKATE PARK & BẢO TOÀN CƠ NĂNG');

        const p = getParams();

        // 1. Đường cong máng trượt parabol bằng thép ống (U-Shaped Skate Track)
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 8;
        ctx.lineCap = 'round';
        ctx.beginPath();
        for (let x = 60; x <= 640; x += 4) {
            const y = getY(x);
            if (x === 60) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.stroke();

        // Các cột giàn giáo đỡ máng
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.2)';
        ctx.lineWidth = 2;
        for (let x = 100; x <= 600; x += 45) {
            ctx.beginPath();
            ctx.moveTo(x, getY(x));
            ctx.lineTo(x, 420);
            ctx.stroke();
        }

        // 2. Vận động viên trượt ván
        const curY = getY(sX);
        const angle = getSlopeAngle(sX);

        ctx.save();
        ctx.translate(sX, curY);
        ctx.rotate(angle);

        // Ván trượt
        ctx.fillStyle = '#f59e0b';
        ctx.beginPath();
        ctx.roundRect(-24, -6, 48, 7, 3);
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(-16, 3, 4, 0, Math.PI * 2);
        ctx.arc(16, 3, 4, 0, Math.PI * 2);
        ctx.fill();

        // Người trượt (PhET Skater Mascot)
        ctx.fillStyle = '#38bdf8';
        ctx.beginPath();
        ctx.roundRect(-10, -32, 20, 26, 4);
        ctx.fill();

        // Đầu người trượt có mũ bảo hiểm
        ctx.fillStyle = '#facc15';
        ctx.beginPath();
        ctx.arc(0, -42, 9, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();

        // 3. BIỂU ĐỒ TRÒN NĂNG LƯỢNG NỔI TRÊN ĐẦU NGƯỜI TRƯỢT (PhET Floating Pie Chart!)
        const heightMeters = Math.max(0, (y0 - curY) / 30);
        const speedReal = Math.abs(vS) / 8;
        const Ep = p.m * p.g * heightMeters;
        const Ek = 0.5 * p.m * speedReal * speedReal;
        const Etot = Ep + Ek + thermalEnergy;

        if (Etot > 0) {
            const pieR = 24;
            const pieX = sX;
            const pieY = curY - 70;

            const fEk = (Ek / Etot) * Math.PI * 2;
            const fEp = (Ep / Etot) * Math.PI * 2;
            const fEth = (thermalEnergy / Etot) * Math.PI * 2;

            // Động năng (Xanh lá)
            ctx.fillStyle = '#22c55e';
            ctx.beginPath();
            ctx.moveTo(pieX, pieY);
            ctx.arc(pieX, pieY, pieR, 0, fEk);
            ctx.closePath();
            ctx.fill();

            // Thế năng (Xanh cyan)
            ctx.fillStyle = '#38bdf8';
            ctx.beginPath();
            ctx.moveTo(pieX, pieY);
            ctx.arc(pieX, pieY, pieR, fEk, fEk + fEp);
            ctx.closePath();
            ctx.fill();

            // Nhiệt (Đỏ)
            if (fEth > 0) {
                ctx.fillStyle = '#ef4444';
                ctx.beginPath();
                ctx.moveTo(pieX, pieY);
                ctx.arc(pieX, pieY, pieR, fEk + fEp, Math.PI * 2);
                ctx.closePath();
                ctx.fill();
            }

            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.arc(pieX, pieY, pieR, 0, Math.PI * 2);
            ctx.stroke();
        }

        // 4. Biểu đồ thanh năng lượng khoa học góc phải (Energy Bar Chart)
        PhET.drawEnergyBars(ctx, 480, 45, 195, 160, [
            { label: 'Động năng', shortLabel: 'Đ.Năng', val: Ek, color: '#22c55e' },
            { label: 'Thế năng', shortLabel: 'Thế.Năng', val: Ep, color: '#38bdf8' },
            { label: 'Nhiệt', shortLabel: 'Nhiệt', val: thermalEnergy, color: '#ef4444' },
            { label: 'Cơ năng', shortLabel: 'Cơ.Năng', val: Etot, color: '#f59e0b' }
        ]);

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

    ['skate-mass', 'skate-friction', 'skate-g'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('input', () => { syncLabels(); });
    });

    const resetBtn = document.getElementById('skate-reset');
    if (resetBtn) {
        resetBtn.addEventListener('click', () => {
            sX = x0 - 160;
            vS = 0;
            thermalEnergy = 0;
        });
    }

    syncLabels();
})();

// ─────────────────────────────────────────────────────────────
// 6. CÂN BẰNG VẬT RẮN & ĐÒN BẨY (PhET Balancing Act)
// ─────────────────────────────────────────────────────────────
(function initBalancingAct() {
    const canvas = document.getElementById('balancingActCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

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
        const torqueCCW = p.m1 * p.d1 * 9.8;
        const torqueCW = p.m2 * p.d2 * 9.8;
        const netTorque = torqueCW - torqueCCW;

        if (locked) {
            targetAngle = 0;
        } else {
            if (Math.abs(netTorque) < 0.1) {
                targetAngle = 0;
            } else {
                targetAngle = Math.sign(netTorque) * 0.20;
            }
        }

        tiltAngle += (targetAngle - tiltAngle) * 0.12;

        const tccwEl = document.getElementById('lever-t-ccw');
        const tcwEl = document.getElementById('lever-t-cw');
        const tnetEl = document.getElementById('lever-t-net');
        const stEl = document.getElementById('lever-status');

        if (tccwEl) tccwEl.textContent = torqueCCW.toFixed(1) + ' N·m';
        if (tcwEl) tcwEl.textContent = torqueCW.toFixed(1) + ' N·m';
        if (tnetEl) tnetEl.textContent = Math.abs(netTorque).toFixed(1) + ' N·m';
        if (stEl) {
            if (Math.abs(netTorque) < 0.1) {
                stEl.textContent = '⚖️ Cân Bằng Hoàn Hảo (Σ M = 0)';
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
        
        ctx.save();
        ctx.scale(canvas.width / 700, canvas.height / 460);

        PhET.drawLabBackground(ctx, 700, 460, 'CÂN BẰNG VẬT RẮN & QUY TẮC MOMEN LỰC');

        const p = getParams();
        const cx = 350;
        const cy = 260;
        const beamLen = 500;
        const stepPx = 22;

        // 1. Trụ đỡ tam giác Fulcrum bằng thép đúc
        ctx.fillStyle = '#475569';
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx - 35, cy + 85);
        ctx.lineTo(cx + 35, cy + 85);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#94a3b8';
        ctx.lineWidth = 2.5;
        ctx.stroke();

        // 2. Chốt khóa an toàn
        if (locked) {
            ctx.fillStyle = '#ef4444';
            ctx.fillRect(cx - 160, cy + 40, 24, 45);
            ctx.fillRect(cx + 136, cy + 40, 24, 45);
        }

        // 3. Thanh bập bênh xoay
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(tiltAngle);

        // Thân thanh gỗ/kim loại bập bênh
        const bGrad = ctx.createLinearGradient(0, -10, 0, 10);
        bGrad.addColorStop(0, '#fef08a');
        bGrad.addColorStop(0.5, '#facc15');
        bGrad.addColorStop(1, '#ca8a04');
        ctx.fillStyle = bGrad;
        ctx.beginPath();
        ctx.roundRect(-beamLen / 2, -10, beamLen, 20, 4);
        ctx.fill();
        ctx.strokeStyle = '#a16207';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Các vạch chia khoảng cách mét
        ctx.fillStyle = '#713f12';
        ctx.font = 'bold 10px monospace';
        ctx.textAlign = 'center';
        for (let i = -10; i <= 10; i++) {
            const vx = i * stepPx;
            ctx.beginPath();
            ctx.moveTo(vx, -10);
            ctx.lineTo(vx, i === 0 ? 10 : 2);
            ctx.stroke();

            if (i !== 0 && Math.abs(i) % 2 === 0) {
                ctx.fillText(Math.abs(i).toString(), vx, 20);
            }
        }

        // Bọt thủy chuẩn cân bằng (Spirit Level) ở giữa
        ctx.fillStyle = '#10b981';
        ctx.beginPath();
        ctx.roundRect(-25, -22, 50, 10, 4);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(-tiltAngle * 100, -17, 3, 0, Math.PI * 2);
        ctx.fill();

        // 4. Các quả tạ chuẩn PhET đặt trên thanh
        function drawWeight(wx, mass, colGradStart, colGradEnd) {
            const wSize = 22 + mass * 1.6;
            const wGrad = ctx.createLinearGradient(wx - wSize/2, -10 - wSize, wx + wSize/2, -10);
            wGrad.addColorStop(0, colGradStart);
            wGrad.addColorStop(1, colGradEnd);
            ctx.fillStyle = wGrad;
            ctx.beginPath();
            ctx.roundRect(wx - wSize / 2, -10 - wSize, wSize, wSize, 4);
            ctx.fill();
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 1.5;
            ctx.stroke();

            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 11px "Space Grotesk", sans-serif';
            ctx.fillText(`${mass}kg`, wx, -10 - wSize / 2 + 4);
        }

        drawWeight(-p.d1 * stepPx, p.m1, '#0284c7', '#38bdf8');
        drawWeight(p.d2 * stepPx, p.m2, '#b45309', '#f59e0b');

        ctx.restore();

        // Bảng HUD momen lực
        const torqueCCW = p.m1 * p.d1 * 9.8;
        const torqueCW = p.m2 * p.d2 * 9.8;
        PhET.drawHUD(ctx, 470, 310, '📊 CÂN BẰNG MOMEN LỰC', [
            { label: 'Momen trái M₁', val: `${torqueCCW.toFixed(1)} N·m`, color: '#38bdf8' },
            { label: 'Momen phải M₂', val: `${torqueCW.toFixed(1)} N·m`, color: '#facc15' },
            { label: 'Hợp momen |ΣM|', val: `${Math.abs(torqueCW - torqueCCW).toFixed(1)} N·m`, color: Math.abs(torqueCW - torqueCCW) < 0.1 ? '#4ade80' : '#ef4444' }
        ], 200);

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
// 7. CHUYỂN ĐỘNG QUAY VÀ MOMEN QUÁN TÍNH (PhET Rotational Inertia)
// ─────────────────────────────────────────────────────────────
(function initRotationalInertia() {
    const canvas = document.getElementById('rotationalInertiaCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    let diskAngle = 0;
    let omega = 4.0;

    function getParams() {
        const rEl = document.getElementById('rot-radius');
        const mEl = document.getElementById('rot-mass');

        return {
            R: rEl ? parseFloat(rEl.value) : 1.0,
            M: mEl ? parseFloat(mEl.value) : 2.0
        };
    }

    function syncLabels() {
        const p = getParams();
        const rVal = document.getElementById('rot-radius-val');
        const mVal = document.getElementById('rot-mass-val');

        if (rVal) rVal.textContent = p.R.toFixed(1) + ' m';
        if (mVal) mVal.textContent = p.M.toFixed(1) + ' kg';

        // Đĩa tròn đồng chất: I = 1/2 * M * R^2
        const I = 0.5 * p.M * p.R * p.R;
        const L = I * omega;
        const Erot = 0.5 * I * omega * omega;

        const iEl = document.getElementById('rot-inertia');
        const wEl = document.getElementById('rot-omega');
        const lEl = document.getElementById('rot-angular-l');
        const eEl = document.getElementById('rot-energy');

        if (iEl) iEl.textContent = I.toFixed(2) + ' kg·m²';
        if (wEl) wEl.textContent = omega.toFixed(2) + ' rad/s';
        if (lEl) lEl.textContent = L.toFixed(2) + ' kg·m²/s';
        if (eEl) eEl.textContent = Erot.toFixed(2) + ' J';
    }

    function update(dt) {
        diskAngle += omega * dt;
    }

    function draw() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        ctx.save();
        ctx.scale(canvas.width / 700, canvas.height / 460);

        PhET.drawLabBackground(ctx, 700, 460, 'MOMEN QUÁN TÍNH & ĐỘNG NĂNG QUAY (I = ½MR²)');

        const p = getParams();
        const cx = 250;
        const cy = 230;
        const rPx = p.R * 110;

        // 1. Đĩa quay 3D kim loại có vân xuyên tâm (Solid Disk)
        ctx.save();
        ctx.translate(cx, cy);

        // Vành ngoài đĩa
        const dGrad = ctx.createRadialGradient(0, 0, 10, 0, 0, rPx);
        dGrad.addColorStop(0, '#0284c7');
        dGrad.addColorStop(0.7, '#38bdf8');
        dGrad.addColorStop(1, '#0c4a6e');
        ctx.fillStyle = dGrad;
        ctx.beginPath();
        ctx.arc(0, 0, rPx, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 3;
        ctx.stroke();

        // Các nan hoa quay hiển thị góc xoay
        ctx.rotate(diskAngle);
        ctx.strokeStyle = '#f8fafc';
        ctx.lineWidth = 2;
        for (let a = 0; a < Math.PI * 2; a += Math.PI / 4) {
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(rPx * Math.cos(a), rPx * Math.sin(a));
            ctx.stroke();
        }

        // Trục quay trung tâm
        ctx.fillStyle = '#f59e0b';
        ctx.beginPath();
        ctx.arc(0, 0, 12, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.restore();

        // 2. Bảng so sánh Momen quán tính các hình dạng chuẩn
        const I_disk = 0.5 * p.M * p.R * p.R;
        const I_ring = p.M * p.R * p.R;
        const I_sphere = 0.4 * p.M * p.R * p.R;

        PhET.drawHUD(ctx, 440, 70, '📊 MOMEN QUÁN TÍNH CÁC VẬT', [
            { label: 'Đĩa tròn đặc (½MR²)', val: `${I_disk.toFixed(2)} kg·m²`, color: '#38bdf8' },
            { label: 'Vành tròn rỗng (MR²)', val: `${I_ring.toFixed(2)} kg·m²`, color: '#ef4444' },
            { label: 'Quả cầu đặc (⅖MR²)', val: `${I_sphere.toFixed(2)} kg·m²`, color: '#4ade80' },
            { label: 'Động năng quay W_đ', val: `${(0.5 * I_disk * omega * omega).toFixed(1)} J`, color: '#facc15' }
        ], 230);

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

    ['rot-radius', 'rot-mass'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('input', () => { syncLabels(); });
    });

    syncLabels();
})();
