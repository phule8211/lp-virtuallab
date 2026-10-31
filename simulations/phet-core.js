/* ============================================================
   🎨 LP.VirtualLab - PhET Scientific Drawing Engine (Core Library)
   Cung cấp các hàm vẽ 3D/Skeuomorphic siêu thực chuẩn PhET:
   - Đồng hồ đo áp suất, vôn kế, ampe kế analog mặt kính
   - Nhiệt kế thủy ngân có cột dâng hạ và vạch đo Kelvin/Celsius
   - Quả pin 3D hình trụ kim loại với cực đồng và thanh đo điện thế
   - Lò xo xoắn ốc 3D kim loại có bóng đổ và độ co giãn
   - Con lắc đơn có thanh treo và quả nặng phản xạ ánh sáng
   - Bơm khí tay piston với xi lanh và ống dẫn khí
   - Ngọn lửa / Băng tuyết làm nóng/lạnh với hiệu ứng hạt
   - Đèn laser quang học với chùm tia phát sáng
   - Thấu kính thủy tinh lồi/lõm có khúc xạ và phản xạ
   - Biểu đồ thanh năng lượng (Động năng, Thế năng, Nhiệt, Toàn phần)
   - Thước đo milimet / centimet khoa học
   - Bảng HUD Frosted Glass hiển thị dữ liệu thời gian thực
   ============================================================ */

window.PhET = {
    // 1. Phông nền phòng thí nghiệm khoa học chuẩn PhET
    drawLabBackground(ctx, w, h, title = '') {
        const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
        bgGrad.addColorStop(0, '#040d1a');
        bgGrad.addColorStop(0.5, '#07172b');
        bgGrad.addColorStop(1, '#0a223f');
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, w, h);

        // Lưới tọa độ phòng thí nghiệm tinh tế
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.04)';
        ctx.lineWidth = 1;
        for (let x = 20; x < w; x += 35) {
            ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
        }
        for (let y = 20; y < h; y += 35) {
            ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
        }

        if (title) {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
            ctx.font = 'bold 11px "Space Grotesk", sans-serif';
            ctx.textAlign = 'right';
            ctx.fillText(title, w - 16, 22);
        }
    },

    // 2. Thước đo khoảng cách khoa học với vạch chia rõ nét
    drawRuler(ctx, x, y, length, isVertical = false, label = '', unit = 'cm') {
        ctx.save();
        ctx.translate(x, y);
        if (isVertical) ctx.rotate(Math.PI / 2);

        // Thân thước nhựa vàng hoặc kim loại
        const rH = 22;
        const rGrad = ctx.createLinearGradient(0, 0, 0, rH);
        rGrad.addColorStop(0, '#fef08a');
        rGrad.addColorStop(0.5, '#fde047');
        rGrad.addColorStop(1, '#ca8a04');
        ctx.fillStyle = rGrad;
        ctx.beginPath();
        ctx.roundRect(0, 0, length, rH, 3);
        ctx.fill();
        ctx.strokeStyle = '#a16207';
        ctx.lineWidth = 1;
        ctx.stroke();

        // Vạch chia độ
        ctx.fillStyle = '#713f12';
        ctx.font = 'bold 9px monospace';
        ctx.textAlign = 'center';

        const step = 10;
        for (let px = 0; px <= length; px += step) {
            const isMajor = px % 50 === 0;
            const isMedium = px % 25 === 0;
            const tickH = isMajor ? 12 : (isMedium ? 8 : 5);

            ctx.beginPath();
            ctx.moveTo(px, 0);
            ctx.lineTo(px, tickH);
            ctx.stroke();

            if (isMajor && px > 0 && px < length) {
                ctx.fillText((px / 10).toString(), px, rH - 3);
            }
        }

        if (label) {
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 11px "Space Grotesk", sans-serif';
            ctx.textAlign = 'left';
            ctx.fillText(label, 6, -6);
        }
        ctx.restore();
    },

    // 3. Đồng hồ đo kim analog mặt kính tròn (Áp suất, Dòng điện, Điện áp)
    drawAnalogGauge(ctx, x, y, radius, value, min, max, unit, label) {
        ctx.save();
        ctx.translate(x, y);

        // Viền kim loại mạ crom
        const rimGrad = ctx.createLinearGradient(-radius, -radius, radius, radius);
        rimGrad.addColorStop(0, '#94a3b8');
        rimGrad.addColorStop(0.3, '#f8fafc');
        rimGrad.addColorStop(0.7, '#64748b');
        rimGrad.addColorStop(1, '#334155');
        ctx.fillStyle = rimGrad;
        ctx.beginPath();
        ctx.arc(0, 0, radius + 5, 0, Math.PI * 2);
        ctx.fill();

        // Mặt đồng hồ
        ctx.fillStyle = '#f8fafc';
        ctx.beginPath();
        ctx.arc(0, 0, radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#cbd5e1';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Vạch chia mặt số (Góc từ -135° đến +135°)
        const startAngle = -Math.PI * 0.75;
        const endAngle = Math.PI * 0.75;
        const totalAngle = endAngle - startAngle;

        ctx.strokeStyle = '#475569';
        ctx.lineWidth = 1.2;
        for (let i = 0; i <= 10; i++) {
            const a = startAngle + (i / 10) * totalAngle;
            const isMajor = i % 2 === 0;
            const len = isMajor ? 8 : 4;

            ctx.beginPath();
            ctx.moveTo(Math.cos(a) * (radius - len - 2), Math.sin(a) * (radius - len - 2));
            ctx.lineTo(Math.cos(a) * (radius - 2), Math.sin(a) * (radius - 2));
            ctx.stroke();
        }

        // Tên đơn vị và nhãn
        ctx.fillStyle = '#0f172a';
        ctx.font = 'bold 10px "Space Grotesk", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(unit, 0, radius * 0.45);
        if (label) {
            ctx.font = '9px "Space Grotesk", sans-serif';
            ctx.fillStyle = '#64748b';
            ctx.fillText(label, 0, -radius * 0.35);
        }

        // Kim chỉ thị màu đỏ phản xạ
        const normVal = Math.max(0, Math.min(1, (value - min) / (max - min)));
        const needleAngle = startAngle + normVal * totalAngle;

        ctx.save();
        ctx.rotate(needleAngle);
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-radius * 0.2, 0);
        ctx.lineTo(radius * 0.82, 0);
        ctx.stroke();

        // Mũi kim nhọn
        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.moveTo(radius * 0.82, 0);
        ctx.lineTo(radius * 0.72, -2.5);
        ctx.lineTo(radius * 0.72, 2.5);
        ctx.closePath();
        ctx.fill();
        ctx.restore();

        // Trục kim tròn trung tâm
        ctx.fillStyle = '#1e293b';
        ctx.beginPath();
        ctx.arc(0, 0, 4.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#f8fafc';
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.restore();
    },

    // 4. Nhiệt kế thủy ngân khoa học (PhET Thermometer)
    drawThermometer(ctx, x, y, width, height, tempK, minK = 100, maxK = 1000) {
        ctx.save();
        ctx.translate(x, y);

        const bulbR = width * 1.3;
        const stemW = width;
        const stemH = height - bulbR;

        // Vỏ thủy tinh trong suốt
        ctx.fillStyle = 'rgba(241, 245, 249, 0.25)';
        ctx.beginPath();
        ctx.roundRect(-stemW / 2, 0, stemW, stemH, stemW / 2);
        ctx.fill();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Cột chất lỏng đỏ dâng hạ theo nhiệt độ
        const normT = Math.max(0.05, Math.min(1, (tempK - minK) / (maxK - minK)));
        const fillH = stemH * normT;

        const liquidGrad = ctx.createLinearGradient(-stemW / 2, 0, stemW / 2, 0);
        liquidGrad.addColorStop(0, '#f87171');
        liquidGrad.addColorStop(0.5, '#ef4444');
        liquidGrad.addColorStop(1, '#b91c1c');
        ctx.fillStyle = liquidGrad;
        ctx.fillRect(-stemW / 2 + 1.5, stemH - fillH, stemW - 3, fillH);

        // Bầu chứa thủy ngân ở đáy
        ctx.beginPath();
        ctx.arc(0, stemH + bulbR * 0.4, bulbR, 0, Math.PI * 2);
        ctx.fillStyle = liquidGrad;
        ctx.fill();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Điểm sáng phản chiếu trên bầu thủy tinh
        ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.beginPath();
        ctx.arc(-bulbR * 0.35, stemH + bulbR * 0.15, bulbR * 0.35, 0, Math.PI * 2);
        ctx.fill();

        // Vạch chia độ bên cạnh
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.lineWidth = 1;
        for (let i = 0; i <= 8; i++) {
            const ty = stemH - (i / 8) * stemH;
            ctx.beginPath();
            ctx.moveTo(stemW / 2 + 2, ty);
            ctx.lineTo(stemW / 2 + (i % 2 === 0 ? 8 : 4), ty);
            ctx.stroke();
        }

        // Nhãn nhiệt độ hiển thị số to rõ
        ctx.fillStyle = '#fef08a';
        ctx.font = 'bold 12px "Space Grotesk", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(tempK.toFixed(0) + ' K', 0, -10);
        ctx.fillStyle = '#94a3b8';
        ctx.font = '10px "Space Grotesk", sans-serif';
        ctx.fillText('(' + (tempK - 273.15).toFixed(0) + '°C)', 0, -24);

        ctx.restore();
    },

    // 5. Nguồn nhiệt / Làm lạnh (PhET Fire/Ice Burner)
    drawHeaterCooler(ctx, x, y, width, heatState) {
        // heatState: > 0 = ngọn lửa, < 0 = băng giá, = 0 = tắt
        ctx.save();
        ctx.translate(x, y);

        // Bệ đỡ bếp lò
        ctx.fillStyle = '#334155';
        ctx.beginPath();
        ctx.roundRect(-width / 2, 0, width, 18, 4);
        ctx.fill();
        ctx.strokeStyle = '#64748b';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        if (heatState > 0.05) {
            // Ngọn lửa bùng cháy rực rỡ
            const flameH = 35 * Math.min(1.5, heatState);
            const numFlames = 5;
            for (let i = 0; i < numFlames; i++) {
                const fx = -width * 0.35 + (i / (numFlames - 1)) * width * 0.7;
                const fh = flameH * (0.7 + 0.3 * Math.sin(Date.now() * 0.015 + i));

                const fGrad = ctx.createRadialGradient(fx, -fh * 0.5, 2, fx, -fh * 0.3, fh * 0.8);
                fGrad.addColorStop(0, '#fef08a');
                fGrad.addColorStop(0.3, '#f59e0b');
                fGrad.addColorStop(0.7, '#ef4444');
                fGrad.addColorStop(1, 'rgba(239, 68, 68, 0)');

                ctx.fillStyle = fGrad;
                ctx.beginPath();
                ctx.moveTo(fx - 10, 0);
                ctx.quadraticCurveTo(fx - 12, -fh * 0.6, fx, -fh);
                ctx.quadraticCurveTo(fx + 12, -fh * 0.6, fx + 10, 0);
                ctx.closePath();
                ctx.fill();
            }
        } else if (heatState < -0.05) {
            // Khối băng tuyết lạnh giá
            const iceCount = 6;
            ctx.fillStyle = '#38bdf8';
            ctx.strokeStyle = '#bae6fd';
            ctx.lineWidth = 1.5;
            for (let i = 0; i < iceCount; i++) {
                const ix = -width * 0.38 + (i / (iceCount - 1)) * width * 0.76;
                const ih = 18 * Math.abs(heatState);
                ctx.beginPath();
                ctx.moveTo(ix, 0);
                ctx.lineTo(ix - 7, -ih * 0.6);
                ctx.lineTo(ix, -ih);
                ctx.lineTo(ix + 7, -ih * 0.6);
                ctx.closePath();
                ctx.fill();
                ctx.stroke();
            }
        }

        ctx.restore();
    },

    // 6. Lò xo xoắn ốc kim loại 3D (PhET Spring)
    drawCoiledSpring(ctx, x1, y1, x2, y2, coils = 14, radius = 16, color = '#94a3b8') {
        ctx.save();
        const dx = x2 - x1;
        const dy = y2 - y1;
        const dist = Math.hypot(dx, dy);
        const angle = Math.atan2(dy, dx);

        ctx.translate(x1, y1);
        ctx.rotate(angle);

        ctx.strokeStyle = color;
        ctx.lineWidth = 3.5;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        // Đoạn thẳng nối đầu lò xo
        const leadLen = 15;
        const coilSpan = Math.max(20, dist - leadLen * 2);

        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(leadLen, 0);

        // Các vòng xoắn lò xo hình sin/zig-zag bo góc
        for (let i = 0; i < coils; i++) {
            const stepX = coilSpan / coils;
            const cx = leadLen + i * stepX;
            const sign = i % 2 === 0 ? 1 : -1;

            ctx.bezierCurveTo(
                cx + stepX * 0.25, sign * radius,
                cx + stepX * 0.75, sign * radius,
                cx + stepX, 0
            );
        }

        ctx.lineTo(dist, 0);
        ctx.stroke();

        // Ánh sáng phản xạ kim loại nổi (Highlight line)
        ctx.strokeStyle = '#f8fafc';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(leadLen, 0);
        for (let i = 0; i < coils; i++) {
            const stepX = coilSpan / coils;
            const cx = leadLen + i * stepX;
            const sign = i % 2 === 0 ? 1 : -1;
            ctx.bezierCurveTo(
                cx + stepX * 0.25, sign * (radius - 3),
                cx + stepX * 0.75, sign * (radius - 3),
                cx + stepX, 0
            );
        }
        ctx.lineTo(dist, 0);
        ctx.stroke();

        ctx.restore();
    },

    // 7. Biểu đồ thanh năng lượng khoa học chuẩn PhET (Energy Bar Chart)
    drawEnergyBars(ctx, x, y, width, height, energies) {
        // energies: [ { label: 'Động năng', val: Ek, color: '#22c55e' }, ... ]
        ctx.save();
        ctx.translate(x, y);

        // Hộp chứa biểu đồ kính mờ Frosted Glass
        ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.35)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.roundRect(0, 0, width, height, 8);
        ctx.fill();
        ctx.stroke();

        // Tiêu đề
        ctx.fillStyle = '#38bdf8';
        ctx.font = 'bold 11px "Space Grotesk", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('⚡ NĂNG LƯỢNG HỆ THỐNG', width / 2, 18);

        // Tìm giá trị max để scale cột
        let maxVal = 10;
        energies.forEach(e => { if (Math.abs(e.val) > maxVal) maxVal = Math.abs(e.val); });

        const barAreaH = height - 52;
        const barW = Math.max(14, (width - 24) / energies.length - 8);

        energies.forEach((item, idx) => {
            const bx = 16 + idx * (barW + 8);
            const normH = Math.min(barAreaH, (Math.max(0, item.val) / maxVal) * barAreaH);
            const by = height - 26 - normH;

            // Cột năng lượng phát sáng
            const colGrad = ctx.createLinearGradient(bx, by, bx + barW, by);
            colGrad.addColorStop(0, item.color);
            colGrad.addColorStop(1, item.color + 'aa');
            ctx.fillStyle = colGrad;
            ctx.beginPath();
            ctx.roundRect(bx, by, barW, normH, [3, 3, 0, 0]);
            ctx.fill();

            // Viền sáng
            ctx.strokeStyle = item.color;
            ctx.lineWidth = 1;
            ctx.stroke();

            // Nhãn viết tắt (K, P, Th, Tot)
            ctx.fillStyle = '#cbd5e1';
            ctx.font = 'bold 9.5px "Space Grotesk", sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(item.shortLabel || item.label.slice(0, 3), bx + barW / 2, height - 10);
        });

        ctx.restore();
    },

    // 8. Vector lực / vận tốc chuẩn mực với mũi tên nhọn và nhãn
    drawVector(ctx, fromX, fromY, dx, dy, color, label = '', lineWidth = 2.5) {
        const len = Math.hypot(dx, dy);
        if (len < 1) return;

        ctx.save();
        ctx.strokeStyle = color;
        ctx.fillStyle = color;
        ctx.lineWidth = lineWidth;
        ctx.shadowColor = color;
        ctx.shadowBlur = 6;

        const toX = fromX + dx;
        const toY = fromY + dy;
        const angle = Math.atan2(dy, dx);
        const headlen = Math.min(12, Math.max(7, len * 0.25));

        // Đường thân vector
        ctx.beginPath();
        ctx.moveTo(fromX, fromY);
        ctx.lineTo(toX, toY);
        ctx.stroke();

        // Mũi tên nhọn chuẩn
        ctx.beginPath();
        ctx.moveTo(toX, toY);
        ctx.lineTo(
            toX - headlen * Math.cos(angle - Math.PI / 6),
            toY - headlen * Math.sin(angle - Math.PI / 6)
        );
        ctx.lineTo(
            toX - headlen * Math.cos(angle + Math.PI / 6),
            toY - headlen * Math.sin(angle + Math.PI / 6)
        );
        ctx.closePath();
        ctx.fill();

        // Nhãn vector
        if (label) {
            ctx.font = 'bold 11px "Space Grotesk", sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            const textOffset = 14;
            const tx = toX + Math.cos(angle) * textOffset;
            const ty = toY + Math.sin(angle) * textOffset;
            ctx.fillText(label, tx, ty);
        }

        ctx.restore();
    },

    // 9. Bảng HUD kính mờ đa năng (Heads-Up Display)
    drawHUD(ctx, x, y, title, items, w = 210) {
        ctx.save();
        const rowH = 18;
        const h = 32 + items.length * rowH;

        ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.4)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.roundRect(x, y, w, h, 8);
        ctx.fill();
        ctx.stroke();

        ctx.font = 'bold 11.5px "Space Grotesk", sans-serif';
        ctx.fillStyle = '#38bdf8';
        ctx.textAlign = 'left';
        ctx.fillText(title, x + 10, y + 18);

        ctx.font = '11px "Space Grotesk", monospace';
        items.forEach((item, idx) => {
            const ry = y + 36 + idx * rowH;
            ctx.fillStyle = '#94a3b8';
            ctx.fillText(item.label + ':', x + 10, ry);
            ctx.fillStyle = item.color || '#f8fafc';
            ctx.textAlign = 'right';
            ctx.fillText(item.val, x + w - 10, ry);
            ctx.textAlign = 'left';
        });

        ctx.restore();
    }
};
