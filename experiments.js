/* ============================================================
   experiments.js – Physics Simulation Engines
   Each experiment: setup(), update(), draw(), getControls(), getData(), getTheory()
   ============================================================ */

const Experiments = {};

// ─────────────────────────────────────────────
// 1. CON LẮC ĐƠN (Simple Pendulum)
// ─────────────────────────────────────────────
Experiments['pendulum'] = {
    title: 'Con Lắc Đơn',
    params: { length: 1.5, gravity: 9.81, damping: 0.001, angle0: 30 },
    state: {},

    setup(p) {
        this.params = { ...this.params, ...p };
        const a0 = this.params.angle0 * Math.PI / 180;
        this.state = { angle: a0, angularVel: 0, time: 0, trail: [] };
    },

    update(dt) {
        const { length, gravity, damping } = this.params;
        const s = this.state;
        const angularAcc = -(gravity / length) * Math.sin(s.angle) - damping * s.angularVel;
        s.angularVel += angularAcc * dt;
        s.angle += s.angularVel * dt;
        s.time += dt;
        // trail for graph
        if (s.trail.length > 300) s.trail.shift();
        s.trail.push({ t: s.time, a: s.angle * 180 / Math.PI });
    },

    draw(ctx, w, h) {
        const { length } = this.params;
        const s = this.state;
        const scale = Math.min(w, h) * 0.32 / length;
        const pivotX = w / 2, pivotY = h * 0.15;
        const bobX = pivotX + Math.sin(s.angle) * length * scale;
        const bobY = pivotY + Math.cos(s.angle) * length * scale;

        // Background grid
        ctx.strokeStyle = 'rgba(255,255,255,0.04)';
        ctx.lineWidth = 1;
        for (let i = 0; i < w; i += 40) { ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, h); ctx.stroke(); }
        for (let i = 0; i < h; i += 40) { ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(w, i); ctx.stroke(); }

        // Pivot bracket
        ctx.fillStyle = '#4a5568';
        ctx.fillRect(pivotX - 40, pivotY - 10, 80, 12);
        ctx.fillStyle = '#718096';
        for (let i = -3; i <= 3; i++) {
            ctx.beginPath();
            ctx.moveTo(pivotX + i * 10 - 5, pivotY - 10);
            ctx.lineTo(pivotX + i * 10 + 5, pivotY - 10);
            ctx.lineTo(pivotX + i * 10, pivotY - 18);
            ctx.fill();
        }

        // String
        ctx.beginPath();
        ctx.moveTo(pivotX, pivotY);
        ctx.lineTo(bobX, bobY);
        ctx.strokeStyle = 'rgba(255,255,255,0.6)';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Bob shadow
        ctx.beginPath();
        ctx.arc(bobX + 4, bobY + 4, 22, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.fill();

        // Bob
        const grad = ctx.createRadialGradient(bobX - 5, bobY - 5, 4, bobX, bobY, 22);
        grad.addColorStop(0, '#ff6b81');
        grad.addColorStop(1, '#c41e3a');
        ctx.beginPath();
        ctx.arc(bobX, bobY, 20, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.3)';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Mini graph at bottom
        this.drawGraph(ctx, w, h);
    },

    drawGraph(ctx, w, h) {
        const trail = this.state.trail;
        if (trail.length < 2) return;
        const gx = 30, gy = h - 120, gw = w - 60, gh = 80;

        // Graph bg
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.strokeStyle = 'rgba(255,255,255,0.1)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(gx - 10, gy - 10, gw + 20, gh + 30, 8);
        ctx.fill();
        ctx.stroke();

        // Label
        ctx.fillStyle = 'rgba(255,255,255,0.5)';
        ctx.font = '12px "Times New Roman"';
        ctx.fillText('Góc (°) theo thời gian', gx, gy - 16);

        // Axis
        ctx.strokeStyle = 'rgba(255,255,255,0.15)';
        ctx.beginPath();
        ctx.moveTo(gx, gy + gh / 2);
        ctx.lineTo(gx + gw, gy + gh / 2);
        ctx.stroke();

        // Plot
        const maxA = Math.max(this.params.angle0 * 1.1, 10);
        ctx.beginPath();
        ctx.strokeStyle = '#D4A843';
        ctx.lineWidth = 2;
        for (let i = 0; i < trail.length; i++) {
            const x = gx + (i / trail.length) * gw;
            const y = gy + gh / 2 - (trail[i].a / maxA) * (gh / 2);
            i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
        ctx.stroke();
    },

    getControls() {
        return [
            { id: 'length', label: 'Chiều dài dây (m)', min: 0.3, max: 3, step: 0.1, value: this.params.length, unit: 'm' },
            { id: 'gravity', label: 'Gia tốc trọng trường (m/s²)', min: 1, max: 20, step: 0.1, value: this.params.gravity, unit: 'm/s²' },
            { id: 'angle0', label: 'Góc ban đầu (°)', min: 5, max: 80, step: 1, value: this.params.angle0, unit: '°' },
            { id: 'damping', label: 'Hệ số tắt dần', min: 0, max: 0.1, step: 0.001, value: this.params.damping, unit: '' }
        ];
    },

    getData() {
        const T = 2 * Math.PI * Math.sqrt(this.params.length / this.params.gravity);
        return [
            { label: 'Góc hiện tại', value: (this.state.angle * 180 / Math.PI).toFixed(1) + '°' },
            { label: 'Vận tốc góc', value: this.state.angularVel.toFixed(3) + ' rad/s' },
            { label: 'Chu kỳ lý thuyết', value: T.toFixed(3) + ' s' },
            { label: 'Thời gian', value: this.state.time.toFixed(1) + ' s' }
        ];
    },

    getTheory() {
        return `<p>Con lắc đơn gồm vật nhỏ khối lượng m treo bằng sợi dây không giãn, khối lượng không đáng kể, chiều dài l.</p>
        <div class="formula">T = 2π√(l/g)</div>
        <p>Với góc lệch nhỏ (< 15°), dao động của con lắc là dao động điều hòa. Chu kỳ chỉ phụ thuộc l và g, không phụ thuộc biên độ hay khối lượng.</p>`;
    }
};

// ─────────────────────────────────────────────
// 2. CHUYỂN ĐỘNG NÉM XIÊN (Projectile Motion)
// ─────────────────────────────────────────────
Experiments['projectile'] = {
    title: 'Chuyển Động Ném Xiên',
    params: { velocity: 30, angle: 45, gravity: 9.81 },
    state: {},

    setup(p) {
        this.params = { ...this.params, ...p };
        const rad = this.params.angle * Math.PI / 180;
        this.state = {
            x: 0, y: 0,
            vx: this.params.velocity * Math.cos(rad),
            vy: this.params.velocity * Math.sin(rad),
            time: 0, trail: [], landed: false
        };
    },

    update(dt) {
        if (this.state.landed) return;
        const s = this.state;
        s.vx = s.vx; // no air resistance
        s.vy -= this.params.gravity * dt;
        s.x += s.vx * dt;
        s.y += s.vy * dt;
        s.time += dt;
        s.trail.push({ x: s.x, y: s.y });
        if (s.y < 0 && s.time > 0.1) {
            s.y = 0;
            s.landed = true;
        }
    },

    draw(ctx, w, h) {
        const s = this.state;
        const { velocity, angle, gravity } = this.params;
        const rad = angle * Math.PI / 180;
        const maxRange = (velocity * velocity * Math.sin(2 * rad)) / gravity;
        const maxH = (velocity * velocity * Math.sin(rad) * Math.sin(rad)) / (2 * gravity);
        const scaleX = (w - 100) / Math.max(maxRange * 1.1, 1);
        const scaleY = (h - 180) / Math.max(maxH * 1.3, 1);
        const scale = Math.min(scaleX, scaleY);
        const originX = 50, originY = h - 80;

        // Grid
        ctx.strokeStyle = 'rgba(255,255,255,0.04)';
        ctx.lineWidth = 1;
        for (let i = 0; i < w; i += 40) { ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, h); ctx.stroke(); }
        for (let i = 0; i < h; i += 40) { ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(w, i); ctx.stroke(); }

        // Ground
        ctx.fillStyle = 'rgba(76,175,80,0.15)';
        ctx.fillRect(0, originY, w, h - originY);
        ctx.strokeStyle = 'rgba(76,175,80,0.5)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, originY);
        ctx.lineTo(w, originY);
        ctx.stroke();

        // Distance markers
        ctx.fillStyle = 'rgba(255,255,255,0.3)';
        ctx.font = '12px "Times New Roman"';
        for (let d = 0; d <= maxRange * 1.1; d += Math.ceil(maxRange / 5)) {
            const mx = originX + d * scale;
            if (mx < w - 20) {
                ctx.fillText(d.toFixed(0) + 'm', mx - 10, originY + 16);
                ctx.strokeStyle = 'rgba(255,255,255,0.05)';
                ctx.beginPath(); ctx.moveTo(mx, 0); ctx.lineTo(mx, originY); ctx.stroke();
            }
        }

        // Launch angle arc
        ctx.beginPath();
        ctx.arc(originX, originY, 40, -Math.PI / 2, -(Math.PI / 2 - rad), true);
        ctx.strokeStyle = 'rgba(212,168,67,0.5)';
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.fillStyle = 'rgba(212,168,67,0.7)';
        ctx.fillText(angle + '°', originX + 45, originY - 15);

        // Cannon / launcher
        ctx.save();
        ctx.translate(originX, originY);
        ctx.rotate(-rad);
        ctx.fillStyle = '#4a5568';
        ctx.fillRect(-5, -8, 50, 16);
        ctx.beginPath();
        ctx.arc(0, 0, 14, 0, Math.PI * 2);
        ctx.fillStyle = '#718096';
        ctx.fill();
        ctx.restore();

        // Trail
        if (s.trail.length > 1) {
            ctx.beginPath();
            ctx.strokeStyle = 'rgba(196,30,58,0.6)';
            ctx.lineWidth = 2;
            ctx.setLineDash([6, 4]);
            for (let i = 0; i < s.trail.length; i++) {
                const px = originX + s.trail[i].x * scale;
                const py = originY - s.trail[i].y * scale;
                i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
            }
            ctx.stroke();
            ctx.setLineDash([]);
        }

        // Ideal parabola
        ctx.beginPath();
        ctx.strokeStyle = 'rgba(212,168,67,0.25)';
        ctx.lineWidth = 1;
        const totalT = (2 * velocity * Math.sin(rad)) / gravity;
        for (let t = 0; t <= totalT; t += totalT / 100) {
            const ix = velocity * Math.cos(rad) * t;
            const iy = velocity * Math.sin(rad) * t - 0.5 * gravity * t * t;
            const px = originX + ix * scale;
            const py = originY - iy * scale;
            t === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
        }
        ctx.stroke();

        // Projectile
        if (!s.landed || s.trail.length === 0) {
            const px = originX + s.x * scale;
            const py = originY - s.y * scale;
            // glow
            ctx.beginPath();
            ctx.arc(px, py, 20, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(196,30,58,0.2)';
            ctx.fill();
            // ball
            const grad = ctx.createRadialGradient(px - 3, py - 3, 2, px, py, 12);
            grad.addColorStop(0, '#ff6b81');
            grad.addColorStop(1, '#c41e3a');
            ctx.beginPath();
            ctx.arc(px, py, 10, 0, Math.PI * 2);
            ctx.fillStyle = grad;
            ctx.fill();
        }

        // Max height marker
        if (s.trail.length > 5) {
            const highest = s.trail.reduce((best, p) => p.y > best.y ? p : best, s.trail[0]);
            const hx = originX + highest.x * scale;
            const hy = originY - highest.y * scale;
            ctx.setLineDash([4, 4]);
            ctx.strokeStyle = 'rgba(255,255,255,0.2)';
            ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(hx, originY); ctx.stroke();
            ctx.setLineDash([]);
            ctx.fillStyle = 'rgba(212,168,67,0.8)';
            ctx.fillText('H = ' + highest.y.toFixed(1) + 'm', hx + 6, hy - 6);
        }
    },

    getControls() {
        return [
            { id: 'velocity', label: 'Vận tốc ban đầu (m/s)', min: 5, max: 60, step: 1, value: this.params.velocity, unit: 'm/s' },
            { id: 'angle', label: 'Góc ném (°)', min: 5, max: 85, step: 1, value: this.params.angle, unit: '°' },
            { id: 'gravity', label: 'Gia tốc trọng trường', min: 1, max: 20, step: 0.1, value: this.params.gravity, unit: 'm/s²' }
        ];
    },

    getData() {
        const { velocity, angle, gravity } = this.params;
        const rad = angle * Math.PI / 180;
        const R = (velocity * velocity * Math.sin(2 * rad)) / gravity;
        const H = (velocity * velocity * Math.sin(rad) * Math.sin(rad)) / (2 * gravity);
        const T = (2 * velocity * Math.sin(rad)) / gravity;
        return [
            { label: 'Tầm xa lý thuyết', value: R.toFixed(2) + ' m' },
            { label: 'Độ cao cực đại', value: H.toFixed(2) + ' m' },
            { label: 'Thời gian bay', value: T.toFixed(2) + ' s' },
            { label: 'Vị trí hiện tại', value: `(${this.state.x.toFixed(1)}, ${this.state.y.toFixed(1)}) m` },
            { label: 'Trạng thái', value: this.state.landed ? 'Đã chạm đất' : 'Đang bay' }
        ];
    },

    getTheory() {
        return `<p>Chuyển động ném xiên là tổng hợp của chuyển động thẳng đều theo phương ngang và rơi tự do theo phương thẳng đứng.</p>
        <div class="formula">x = v₀·cos(α)·t</div>
        <div class="formula">y = v₀·sin(α)·t – ½gt²</div>
        <p>Tầm xa cực đại đạt được khi α = 45°.</p>
        <div class="formula">R = v₀²·sin(2α) / g</div>`;
    }
};

// ─────────────────────────────────────────────
// 3. SÓNG DỪNG TRÊN DÂY (Standing Wave)
// ─────────────────────────────────────────────
Experiments['standing-wave'] = {
    title: 'Sóng Dừng Trên Dây',
    params: { frequency: 3, amplitude: 40, harmonics: 3, speed: 200 },
    state: {},

    setup(p) {
        this.params = { ...this.params, ...p };
        this.state = { time: 0 };
    },

    update(dt) {
        this.state.time += dt;
    },

    draw(ctx, w, h) {
        const { frequency, amplitude, harmonics } = this.params;
        const t = this.state.time;

        // Grid
        ctx.strokeStyle = 'rgba(255,255,255,0.04)';
        for (let i = 0; i < w; i += 40) { ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, h); ctx.stroke(); }
        for (let i = 0; i < h; i += 40) { ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(w, i); ctx.stroke(); }

        const cy = h / 2;
        const margin = 60;
        const waveLen = w - 2 * margin;
        const n = harmonics;
        const omega = 2 * Math.PI * frequency;
        const k = n * Math.PI / waveLen;

        // Fixed ends
        ctx.fillStyle = '#4a5568';
        ctx.fillRect(margin - 8, cy - 40, 10, 80);
        ctx.fillRect(w - margin - 2, cy - 40, 10, 80);

        // Envelope
        ctx.beginPath();
        ctx.strokeStyle = 'rgba(212,168,67,0.2)';
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);
        for (let x = 0; x <= waveLen; x++) {
            const y = amplitude * Math.sin(k * x);
            x === 0 ? ctx.moveTo(margin + x, cy - y) : ctx.lineTo(margin + x, cy - y);
        }
        ctx.stroke();
        ctx.beginPath();
        for (let x = 0; x <= waveLen; x++) {
            const y = amplitude * Math.sin(k * x);
            x === 0 ? ctx.moveTo(margin + x, cy + y) : ctx.lineTo(margin + x, cy + y);
        }
        ctx.stroke();
        ctx.setLineDash([]);

        // Standing wave
        ctx.beginPath();
        ctx.strokeStyle = '#c41e3a';
        ctx.lineWidth = 3;
        for (let x = 0; x <= waveLen; x++) {
            const y = amplitude * Math.sin(k * x) * Math.cos(omega * t);
            const px = margin + x;
            const py = cy - y;
            x === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
        }
        ctx.stroke();

        // Glow effect
        ctx.beginPath();
        ctx.strokeStyle = 'rgba(196,30,58,0.25)';
        ctx.lineWidth = 8;
        for (let x = 0; x <= waveLen; x++) {
            const y = amplitude * Math.sin(k * x) * Math.cos(omega * t);
            x === 0 ? ctx.moveTo(margin + x, cy - y) : ctx.lineTo(margin + x, cy - y);
        }
        ctx.stroke();

        // Node & antinode markers
        for (let i = 0; i <= n; i++) {
            const nx = margin + (i / n) * waveLen;
            ctx.beginPath();
            ctx.arc(nx, cy, 6, 0, Math.PI * 2);
            ctx.fillStyle = '#00bcd4';
            ctx.fill();
            ctx.fillStyle = 'rgba(0,188,212,0.7)';
            ctx.font = '11px "Times New Roman"';
            ctx.fillText('N', nx - 3, cy + 20);
        }
        for (let i = 0; i < n; i++) {
            const ax = margin + ((i + 0.5) / n) * waveLen;
            ctx.beginPath();
            ctx.arc(ax, cy, 5, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(212,168,67,0.8)';
            ctx.fill();
            ctx.fillStyle = 'rgba(212,168,67,0.7)';
            ctx.fillText('B', ax - 3, cy + 20);
        }

        // Center line
        ctx.strokeStyle = 'rgba(255,255,255,0.1)';
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 8]);
        ctx.beginPath();
        ctx.moveTo(margin, cy);
        ctx.lineTo(w - margin, cy);
        ctx.stroke();
        ctx.setLineDash([]);

        // Labels
        ctx.fillStyle = 'rgba(255,255,255,0.6)';
        ctx.font = '14px "Times New Roman"';
        ctx.fillText(`Họa ba bậc ${n}  |  ${n} nút sóng  |  ${n > 0 ? n - 1 : 0} bụng sóng (bên trong)`, margin, h - 30);
    },

    getControls() {
        return [
            { id: 'harmonics', label: 'Bậc họa ba (n)', min: 1, max: 8, step: 1, value: this.params.harmonics, unit: '' },
            { id: 'frequency', label: 'Tần số (Hz)', min: 0.5, max: 10, step: 0.5, value: this.params.frequency, unit: 'Hz' },
            { id: 'amplitude', label: 'Biên độ (px)', min: 10, max: 80, step: 5, value: this.params.amplitude, unit: 'px' }
        ];
    },

    getData() {
        const n = this.params.harmonics;
        const f = this.params.frequency;
        return [
            { label: 'Bậc họa ba', value: n },
            { label: 'Số nút sóng', value: n + 1 },
            { label: 'Số bụng sóng', value: n },
            { label: 'Tần số', value: f.toFixed(1) + ' Hz' },
            { label: 'Chu kỳ', value: (1 / f).toFixed(3) + ' s' }
        ];
    },

    getTheory() {
        return `<p>Sóng dừng hình thành khi hai sóng cùng tần số, cùng biên độ truyền ngược chiều nhau giao thoa.</p>
        <div class="formula">y = 2A·sin(kx)·cos(ωt)</div>
        <p><b>Nút sóng (N):</b> Điểm luôn đứng yên. <b>Bụng sóng (B):</b> Điểm dao động cực đại.</p>
        <p>Với dây có hai đầu cố định: λₙ = 2L/n và fₙ = n·f₁</p>`;
    }
};

// ─────────────────────────────────────────────
// 4. GIAO THOA ÁNH SÁNG (Young's Double Slit)
// ─────────────────────────────────────────────
Experiments['interference'] = {
    title: 'Giao Thoa Ánh Sáng (Young)',
    params: { wavelength: 550, slitSep: 0.5, screenDist: 2 },
    state: {},

    setup(p) {
        this.params = { ...this.params, ...p };
        this.state = { time: 0 };
    },

    update(dt) {
        this.state.time += dt;
    },

    draw(ctx, w, h) {
        const { wavelength, slitSep, screenDist } = this.params;
        const lambda = wavelength * 1e-9;
        const d = slitSep * 1e-3;
        const D = screenDist;

        // Grid
        ctx.strokeStyle = 'rgba(255,255,255,0.03)';
        for (let i = 0; i < w; i += 40) { ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, h); ctx.stroke(); }

        // Laser source on the left
        const srcX = 40, srcY = h / 2;
        ctx.fillStyle = '#333';
        ctx.fillRect(10, srcY - 20, 35, 40);
        ctx.fillStyle = this.wavelengthToColor(wavelength);
        ctx.fillRect(45, srcY - 3, 15, 6);

        // Barrier with slits
        const barrierX = w * 0.3;
        const slitGap = 50;
        ctx.fillStyle = '#2d3748';
        ctx.fillRect(barrierX - 4, 0, 8, h / 2 - slitGap / 2 - 8);
        ctx.fillRect(barrierX - 4, h / 2 - slitGap / 2 + 8, 8, slitGap - 16);
        ctx.fillRect(barrierX - 4, h / 2 + slitGap / 2, 8, h / 2 - slitGap / 2);

        // Slit labels
        ctx.fillStyle = 'rgba(255,255,255,0.5)';
        ctx.font = '11px "Times New Roman"';
        ctx.fillText('S₁', barrierX + 12, h / 2 - slitGap / 2 - 2);
        ctx.fillText('S₂', barrierX + 12, h / 2 + slitGap / 2 + 12);

        // Light beams from source to slits
        const col = this.wavelengthToColor(wavelength);
        ctx.strokeStyle = col.replace(')', ',0.3)').replace('rgb', 'rgba');
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(55, srcY);
        ctx.lineTo(barrierX - 4, h / 2 - slitGap / 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(55, srcY);
        ctx.lineTo(barrierX - 4, h / 2 + slitGap / 2);
        ctx.stroke();

        // Spreading waves from slits
        const t = this.state.time;
        const slit1Y = h / 2 - slitGap / 2;
        const slit2Y = h / 2 + slitGap / 2;
        for (let r = 10; r < w * 0.7; r += 25) {
            const fade = Math.max(0, 1 - r / (w * 0.7));
            ctx.strokeStyle = col.replace(')', `,${fade * 0.12})`).replace('rgb', 'rgba');
            ctx.lineWidth = 1.5;
            const phase = (r / 20 - t * 3) % (2 * Math.PI);
            const a = Math.abs(Math.cos(phase));
            ctx.globalAlpha = a;
            ctx.beginPath();
            ctx.arc(barrierX, slit1Y, r, -0.6, 0.6);
            ctx.stroke();
            ctx.beginPath();
            ctx.arc(barrierX, slit2Y, r, -0.6, 0.6);
            ctx.stroke();
        }
        ctx.globalAlpha = 1;

        // Screen on the right
        const screenX = w - 60;
        const screenH = h - 40;
        const screenTop = 20;

        // Interference pattern on screen
        const fringeSpacing = (lambda * D) / d;
        const scaleY = (screenH / 2) / (6 * fringeSpacing);

        for (let py = 0; py < screenH; py++) {
            const y = (py - screenH / 2) / scaleY;
            const pathDiff = d * y / D;
            const phase = (2 * Math.PI * pathDiff) / lambda;
            const intensity = Math.pow(Math.cos(phase / 2), 2);
            const r = parseInt(col.match(/\d+/g)[0]);
            const g = parseInt(col.match(/\d+/g)[1]);
            const b = parseInt(col.match(/\d+/g)[2]);
            ctx.fillStyle = `rgba(${r},${g},${b},${intensity * 0.95})`;
            ctx.fillRect(screenX - 15, screenTop + py, 30, 1);
        }

        // Screen border
        ctx.strokeStyle = 'rgba(255,255,255,0.3)';
        ctx.lineWidth = 1;
        ctx.strokeRect(screenX - 16, screenTop - 1, 32, screenH + 2);

        // Labels
        ctx.fillStyle = 'rgba(255,255,255,0.4)';
        ctx.font = '12px "Times New Roman"';
        ctx.fillText('Nguồn sáng', 10, srcY - 28);
        ctx.fillText('Khe đôi', barrierX - 15, 20);
        ctx.fillText('Màn hứng', screenX - 25, screenTop - 8);

        // Fringe spacing info
        const fringeSpacingMm = fringeSpacing * 1000;
        ctx.fillStyle = 'rgba(212,168,67,0.8)';
        ctx.font = '14px "Times New Roman"';
        ctx.fillText(`Khoảng vân: i = ${fringeSpacingMm.toFixed(2)} mm`, w / 2 - 80, h - 15);
    },

    wavelengthToColor(wl) {
        let r, g, b;
        if (wl >= 380 && wl < 440) { r = -(wl - 440) / 60; g = 0; b = 1; }
        else if (wl >= 440 && wl < 490) { r = 0; g = (wl - 440) / 50; b = 1; }
        else if (wl >= 490 && wl < 510) { r = 0; g = 1; b = -(wl - 510) / 20; }
        else if (wl >= 510 && wl < 580) { r = (wl - 510) / 70; g = 1; b = 0; }
        else if (wl >= 580 && wl < 645) { r = 1; g = -(wl - 645) / 65; b = 0; }
        else if (wl >= 645 && wl <= 780) { r = 1; g = 0; b = 0; }
        else { r = 0; g = 0; b = 0; }
        return `rgb(${Math.round(r * 255)},${Math.round(g * 255)},${Math.round(b * 255)})`;
    },

    getControls() {
        return [
            { id: 'wavelength', label: 'Bước sóng (nm)', min: 380, max: 700, step: 10, value: this.params.wavelength, unit: 'nm' },
            { id: 'slitSep', label: 'Khoảng cách khe (mm)', min: 0.1, max: 2, step: 0.05, value: this.params.slitSep, unit: 'mm' },
            { id: 'screenDist', label: 'Khoảng cách màn (m)', min: 0.5, max: 5, step: 0.1, value: this.params.screenDist, unit: 'm' }
        ];
    },

    getData() {
        const lambda = this.params.wavelength * 1e-9;
        const d = this.params.slitSep * 1e-3;
        const D = this.params.screenDist;
        const i = (lambda * D) / d * 1000;
        return [
            { label: 'Bước sóng', value: this.params.wavelength + ' nm' },
            { label: 'Khoảng cách khe', value: this.params.slitSep + ' mm' },
            { label: 'Khoảng cách màn', value: D + ' m' },
            { label: 'Khoảng vân i', value: i.toFixed(2) + ' mm' }
        ];
    },

    getTheory() {
        return `<p>Thí nghiệm Young chứng minh bản chất sóng của ánh sáng qua hiện tượng giao thoa.</p>
        <div class="formula">i = λD / a</div>
        <p>Trong đó: i là khoảng vân, λ là bước sóng, D là khoảng cách khe tới màn, a là khoảng cách giữa hai khe.</p>
        <p>Vân sáng: d₂ – d₁ = kλ (k ∈ ℤ)<br>Vân tối: d₂ – d₁ = (k + ½)λ</p>`;
    }
};

// ─────────────────────────────────────────────
// 5. DAO ĐỘNG LÒ XO (Spring Oscillation)
// ─────────────────────────────────────────────
Experiments['spring'] = {
    title: 'Dao Động Lò Xo',
    params: { mass: 1, k: 20, x0: 80, damping: 0.01 },
    state: {},

    setup(p) {
        this.params = { ...this.params, ...p };
        this.state = { x: this.params.x0, v: 0, time: 0, trail: [] };
    },

    update(dt) {
        const { mass, k, damping } = this.params;
        const s = this.state;
        const a = (-k * s.x / mass) - damping * s.v;
        s.v += a * dt;
        s.x += s.v * dt;
        s.time += dt;
        if (s.trail.length > 300) s.trail.shift();
        s.trail.push({ t: s.time, x: s.x });
    },

    draw(ctx, w, h) {
        const s = this.state;
        const cy = h * 0.4;
        const anchorX = 60;
        const equilibriumX = w / 2;
        const bobX = equilibriumX + s.x;

        // Grid
        ctx.strokeStyle = 'rgba(255,255,255,0.04)';
        for (let i = 0; i < w; i += 40) { ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, h); ctx.stroke(); }
        for (let i = 0; i < h; i += 40) { ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(w, i); ctx.stroke(); }

        // Wall
        ctx.fillStyle = '#4a5568';
        ctx.fillRect(anchorX - 10, cy - 50, 14, 100);
        // hatch marks
        ctx.strokeStyle = '#718096';
        ctx.lineWidth = 1.5;
        for (let i = -4; i <= 4; i++) {
            ctx.beginPath();
            ctx.moveTo(anchorX - 10, cy + i * 10);
            ctx.lineTo(anchorX + 4, cy + i * 10 - 8);
            ctx.stroke();
        }

        // Equilibrium line
        ctx.setLineDash([6, 6]);
        ctx.strokeStyle = 'rgba(255,255,255,0.15)';
        ctx.beginPath();
        ctx.moveTo(equilibriumX, cy - 60);
        ctx.lineTo(equilibriumX, cy + 60);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = 'rgba(255,255,255,0.3)';
        ctx.font = '12px "Times New Roman"';
        ctx.fillText('VTCB', equilibriumX - 15, cy - 65);

        // Draw spring (zigzag)
        const springStartX = anchorX + 4;
        const springEndX = bobX - 22;
        const coils = 14;
        const coilWidth = (springEndX - springStartX) / coils;
        const springAmplitude = 12;

        ctx.beginPath();
        ctx.moveTo(springStartX, cy);
        for (let i = 0; i < coils; i++) {
            const x1 = springStartX + (i + 0.25) * coilWidth;
            const x2 = springStartX + (i + 0.75) * coilWidth;
            const x3 = springStartX + (i + 1) * coilWidth;
            ctx.lineTo(x1, cy - springAmplitude);
            ctx.lineTo(x2, cy + springAmplitude);
            ctx.lineTo(x3, cy);
        }
        ctx.strokeStyle = 'rgba(100,200,255,0.8)';
        ctx.lineWidth = 2.5;
        ctx.stroke();

        // Mass block
        const blockW = 44, blockH = 44;
        ctx.fillStyle = 'rgba(0,0,0,0.2)';
        ctx.fillRect(bobX - blockW / 2 + 3, cy - blockH / 2 + 3, blockW, blockH);

        const grad = ctx.createLinearGradient(bobX - blockW / 2, cy - blockH / 2, bobX + blockW / 2, cy + blockH / 2);
        grad.addColorStop(0, '#ff6b81');
        grad.addColorStop(1, '#c41e3a');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.roundRect(bobX - blockW / 2, cy - blockH / 2, blockW, blockH, 6);
        ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.3)';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // m label on block
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 14px "Times New Roman"';
        ctx.textAlign = 'center';
        ctx.fillText('m', bobX, cy + 5);
        ctx.textAlign = 'start';

        // Displacement arrow
        if (Math.abs(s.x) > 5) {
            const arrowY = cy + 55;
            ctx.strokeStyle = 'rgba(212,168,67,0.7)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(equilibriumX, arrowY);
            ctx.lineTo(bobX, arrowY);
            ctx.stroke();
            // arrowhead
            const dir = s.x > 0 ? -1 : 1;
            ctx.beginPath();
            ctx.moveTo(bobX, arrowY);
            ctx.lineTo(bobX + dir * 8, arrowY - 5);
            ctx.lineTo(bobX + dir * 8, arrowY + 5);
            ctx.fill();
            ctx.fillStyle = 'rgba(212,168,67,0.8)';
            ctx.font = '12px "Times New Roman"';
            ctx.fillText(`x = ${s.x.toFixed(1)}`, (equilibriumX + bobX) / 2 - 15, arrowY - 8);
        }

        // Energy bars
        this.drawEnergyBars(ctx, w, h);

        // Graph
        this.drawGraph(ctx, w, h);
    },

    drawEnergyBars(ctx, w, h) {
        const { mass, k } = this.params;
        const s = this.state;
        const KE = 0.5 * mass * s.v * s.v;
        const PE = 0.5 * k * (s.x / 100) * (s.x / 100); // scale x to meters-ish
        const TE = KE + PE;
        const barW = 80, barH = 14;
        const bx = w - barW - 30;
        const by = 30;
        const maxE = Math.max(TE, 1);

        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.beginPath();
        ctx.roundRect(bx - 15, by - 10, barW + 30, 100, 8);
        ctx.fill();

        ctx.fillStyle = 'rgba(255,255,255,0.5)';
        ctx.font = '12px "Times New Roman"';

        // KE
        ctx.fillText('Eđ', bx - 10, by + 11);
        ctx.fillStyle = '#2d3748';
        ctx.fillRect(bx + 16, by, barW, barH);
        ctx.fillStyle = '#4fc3f7';
        ctx.fillRect(bx + 16, by, barW * (KE / maxE), barH);

        // PE
        ctx.fillStyle = 'rgba(255,255,255,0.5)';
        ctx.fillText('Et', bx - 10, by + 41);
        ctx.fillStyle = '#2d3748';
        ctx.fillRect(bx + 16, by + 30, barW, barH);
        ctx.fillStyle = '#ff7043';
        ctx.fillRect(bx + 16, by + 30, barW * (PE / maxE), barH);

        // TE
        ctx.fillStyle = 'rgba(255,255,255,0.5)';
        ctx.fillText('E', bx - 10, by + 71);
        ctx.fillStyle = '#2d3748';
        ctx.fillRect(bx + 16, by + 60, barW, barH);
        ctx.fillStyle = '#D4A843';
        ctx.fillRect(bx + 16, by + 60, barW * (TE / maxE), barH);
    },

    drawGraph(ctx, w, h) {
        const trail = this.state.trail;
        if (trail.length < 2) return;
        const gx = 30, gy = h - 110, gw = w - 60, gh = 70;

        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.beginPath();
        ctx.roundRect(gx - 10, gy - 10, gw + 20, gh + 25, 8);
        ctx.fill();

        ctx.fillStyle = 'rgba(255,255,255,0.5)';
        ctx.font = '12px "Times New Roman"';
        ctx.fillText('Li độ x theo thời gian', gx, gy - 14);

        ctx.strokeStyle = 'rgba(255,255,255,0.1)';
        ctx.beginPath();
        ctx.moveTo(gx, gy + gh / 2);
        ctx.lineTo(gx + gw, gy + gh / 2);
        ctx.stroke();

        const maxX = Math.max(this.params.x0 * 1.1, 30);
        ctx.beginPath();
        ctx.strokeStyle = '#c41e3a';
        ctx.lineWidth = 2;
        for (let i = 0; i < trail.length; i++) {
            const x = gx + (i / trail.length) * gw;
            const y = gy + gh / 2 - (trail[i].x / maxX) * (gh / 2);
            i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
        ctx.stroke();
    },

    getControls() {
        return [
            { id: 'k', label: 'Độ cứng lò xo k (N/m)', min: 5, max: 100, step: 1, value: this.params.k, unit: 'N/m' },
            { id: 'mass', label: 'Khối lượng m (kg)', min: 0.1, max: 5, step: 0.1, value: this.params.mass, unit: 'kg' },
            { id: 'x0', label: 'Li độ ban đầu (px)', min: 10, max: 150, step: 5, value: this.params.x0, unit: 'px' },
            { id: 'damping', label: 'Hệ số tắt dần', min: 0, max: 0.5, step: 0.01, value: this.params.damping, unit: '' }
        ];
    },

    getData() {
        const { mass, k } = this.params;
        const omega = Math.sqrt(k / mass);
        const T = 2 * Math.PI / omega;
        const s = this.state;
        return [
            { label: 'Li độ x', value: s.x.toFixed(1) + ' px' },
            { label: 'Vận tốc v', value: s.v.toFixed(2) + ' px/s' },
            { label: 'Tần số góc ω', value: omega.toFixed(2) + ' rad/s' },
            { label: 'Chu kỳ T', value: T.toFixed(3) + ' s' },
            { label: 'Thời gian', value: s.time.toFixed(1) + ' s' }
        ];
    },

    getTheory() {
        return `<p>Hệ lò xo – vật nặng dao động điều hòa khi không có ma sát.</p>
        <div class="formula">x = A·cos(ωt + φ)</div>
        <div class="formula">ω = √(k/m) ; T = 2π/ω</div>
        <p>Năng lượng dao động: E = ½kA² = ½mv² + ½kx²</p>
        <p>Eđ = ½mv² (động năng), Et = ½kx² (thế năng đàn hồi)</p>`;
    }
};

// ─────────────────────────────────────────────
// 6. MẠCH DAO ĐỘNG RLC
// ─────────────────────────────────────────────
Experiments['rlc'] = {
    title: 'Mạch Dao Động RLC',
    params: { R: 10, L: 0.1, C: 100, V0: 5, freqSrc: 50 },
    state: {},

    setup(p) {
        this.params = { ...this.params, ...p };
        const C_F = this.params.C * 1e-6;
        this.state = {
            q: this.params.V0 * C_F, // initial charge
            i: 0, // current
            time: 0,
            trailV: [],
            trailI: []
        };
    },

    update(dt) {
        const { R, L } = this.params;
        const C_F = this.params.C * 1e-6;
        const s = this.state;

        // RLC equation: L·di/dt + R·i + q/C = V(t)
        // V(t) = V0·sin(2π·f·t)
        const V = this.params.V0 * Math.sin(2 * Math.PI * this.params.freqSrc * s.time);
        const di = (V - R * s.i - s.q / C_F) / L;
        s.i += di * dt;
        s.q += s.i * dt;
        s.time += dt;

        if (s.trailV.length > 400) s.trailV.shift();
        if (s.trailI.length > 400) s.trailI.shift();
        s.trailV.push({ t: s.time, v: s.q / C_F });
        s.trailI.push({ t: s.time, i: s.i });
    },

    draw(ctx, w, h) {
        const s = this.state;
        const { R, L, C, freqSrc } = this.params;
        const C_F = C * 1e-6;

        // Grid
        ctx.strokeStyle = 'rgba(255,255,255,0.04)';
        for (let x = 0; x < w; x += 40) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
        for (let y = 0; y < h; y += 40) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }

        // Draw circuit schematic
        this.drawCircuit(ctx, w, h);

        // Draw oscilloscope-style graphs
        this.drawScope(ctx, w, h);
    },

    drawCircuit(ctx, w, h) {
        const cx = w / 2, cy = 130;
        const bw = 280, bh = 120;
        const left = cx - bw / 2, right = cx + bw / 2;
        const top = cy - bh / 2, bot = cy + bh / 2;

        // Wires
        ctx.strokeStyle = 'rgba(100,200,255,0.6)';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        // Top wire
        ctx.moveTo(left, top);
        ctx.lineTo(right, top);
        // Right wire
        ctx.lineTo(right, bot);
        // Bottom wire
        ctx.lineTo(left, bot);
        // Left wire
        ctx.lineTo(left, top);
        ctx.stroke();

        // Current direction arrow
        const arrowPhase = this.state.i;
        const arrowColor = arrowPhase > 0 ? 'rgba(76,175,80,0.8)' : 'rgba(255,107,129,0.8)';
        ctx.fillStyle = arrowColor;
        ctx.beginPath();
        ctx.moveTo(cx + 15, top - 8);
        ctx.lineTo(cx + 25, top);
        ctx.lineTo(cx + 15, top + 8);
        ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.5)';
        ctx.font = '11px "Times New Roman"';
        ctx.fillText('i', cx + 30, top + 4);

        // Component symbols with boxes
        const compStyle = (label, x, y, color) => {
            ctx.fillStyle = 'rgba(0,0,0,0.4)';
            ctx.beginPath();
            ctx.roundRect(x - 28, y - 16, 56, 32, 6);
            ctx.fill();
            ctx.strokeStyle = color;
            ctx.lineWidth = 2;
            ctx.stroke();
            ctx.fillStyle = '#fff';
            ctx.font = 'bold 14px "Times New Roman"';
            ctx.textAlign = 'center';
            ctx.fillText(label, x, y + 5);
            ctx.textAlign = 'start';
        };

        // R on top
        compStyle('R', cx - 80, top, 'rgba(255,107,67,0.8)');
        // L on top
        compStyle('L', cx + 80, top, 'rgba(100,200,255,0.8)');
        // C on right
        compStyle('C', right, cy, 'rgba(212,168,67,0.8)');
        // Source on left
        ctx.fillStyle = 'rgba(0,0,0,0.4)';
        ctx.beginPath();
        ctx.arc(left, cy, 18, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = 'rgba(76,175,80,0.8)';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.fillStyle = '#fff';
        ctx.font = '12px "Times New Roman"';
        ctx.textAlign = 'center';
        ctx.fillText('~', left, cy + 5);
        ctx.textAlign = 'start';

        // Values
        ctx.fillStyle = 'rgba(255,255,255,0.45)';
        ctx.font = '11px "Times New Roman"';
        ctx.fillText(`${this.params.R}Ω`, cx - 95, top + 28);
        ctx.fillText(`${this.params.L}H`, cx + 65, top + 28);
        ctx.fillText(`${this.params.C}µF`, right + 20, cy + 4);
    },

    drawScope(ctx, w, h) {
        const gx = 40, gy = h * 0.45, gw = w - 80, gh = h * 0.22;

        // Voltage scope
        ctx.fillStyle = 'rgba(0,0,0,0.35)';
        ctx.beginPath();
        ctx.roundRect(gx - 15, gy - 15, gw + 30, gh + 30, 8);
        ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.1)';
        ctx.stroke();

        ctx.fillStyle = 'rgba(255,255,255,0.5)';
        ctx.font = '12px "Times New Roman"';
        ctx.fillText('Điện áp tụ U_C (V)', gx, gy - 18);

        // center line
        ctx.strokeStyle = 'rgba(255,255,255,0.1)';
        ctx.beginPath();
        ctx.moveTo(gx, gy + gh / 2);
        ctx.lineTo(gx + gw, gy + gh / 2);
        ctx.stroke();

        // Plot voltage
        const trV = this.state.trailV;
        if (trV.length > 1) {
            const maxV = Math.max(this.params.V0 * 2, ...trV.map(p => Math.abs(p.v))) || 1;
            ctx.beginPath();
            ctx.strokeStyle = '#D4A843';
            ctx.lineWidth = 2;
            for (let j = 0; j < trV.length; j++) {
                const x = gx + (j / trV.length) * gw;
                const y = gy + gh / 2 - (trV[j].v / maxV) * (gh / 2);
                j === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
            }
            ctx.stroke();
        }

        // Current scope
        const gy2 = gy + gh + 50;
        ctx.fillStyle = 'rgba(0,0,0,0.35)';
        ctx.beginPath();
        ctx.roundRect(gx - 15, gy2 - 15, gw + 30, gh + 30, 8);
        ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.1)';
        ctx.stroke();

        ctx.fillStyle = 'rgba(255,255,255,0.5)';
        ctx.fillText('Cường độ dòng điện i (A)', gx, gy2 - 18);

        ctx.strokeStyle = 'rgba(255,255,255,0.1)';
        ctx.beginPath();
        ctx.moveTo(gx, gy2 + gh / 2);
        ctx.lineTo(gx + gw, gy2 + gh / 2);
        ctx.stroke();

        const trI = this.state.trailI;
        if (trI.length > 1) {
            const maxI = Math.max(1, ...trI.map(p => Math.abs(p.i))) || 1;
            ctx.beginPath();
            ctx.strokeStyle = '#4fc3f7';
            ctx.lineWidth = 2;
            for (let j = 0; j < trI.length; j++) {
                const x = gx + (j / trI.length) * gw;
                const y = gy2 + gh / 2 - (trI[j].i / maxI) * (gh / 2);
                j === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
            }
            ctx.stroke();
        }

        // Resonance info
        const C_F = this.params.C * 1e-6;
        const f0 = 1 / (2 * Math.PI * Math.sqrt(this.params.L * C_F));
        const isResonance = Math.abs(this.params.freqSrc - f0) / f0 < 0.05;
        ctx.fillStyle = isResonance ? 'rgba(76,175,80,0.9)' : 'rgba(255,255,255,0.4)';
        ctx.font = '14px "Times New Roman"';
        ctx.fillText(
            isResonance ? '★ CỘNG HƯỞNG! ★' : `f₀ = ${f0.toFixed(1)} Hz`,
            gx, gy2 + gh + 30
        );
    },

    getControls() {
        return [
            { id: 'R', label: 'Điện trở R (Ω)', min: 1, max: 200, step: 1, value: this.params.R, unit: 'Ω' },
            { id: 'L', label: 'Độ tự cảm L (H)', min: 0.01, max: 1, step: 0.01, value: this.params.L, unit: 'H' },
            { id: 'C', label: 'Điện dung C (µF)', min: 1, max: 500, step: 1, value: this.params.C, unit: 'µF' },
            { id: 'freqSrc', label: 'Tần số nguồn f (Hz)', min: 5, max: 500, step: 1, value: this.params.freqSrc, unit: 'Hz' },
            { id: 'V0', label: 'Điện áp nguồn V₀ (V)', min: 1, max: 20, step: 0.5, value: this.params.V0, unit: 'V' }
        ];
    },

    getData() {
        const C_F = this.params.C * 1e-6;
        const f0 = 1 / (2 * Math.PI * Math.sqrt(this.params.L * C_F));
        const ZL = 2 * Math.PI * this.params.freqSrc * this.params.L;
        const ZC = 1 / (2 * Math.PI * this.params.freqSrc * C_F);
        const Z = Math.sqrt(this.params.R * this.params.R + (ZL - ZC) * (ZL - ZC));
        return [
            { label: 'Tần số cộng hưởng f₀', value: f0.toFixed(1) + ' Hz' },
            { label: 'Cảm kháng Z_L', value: ZL.toFixed(1) + ' Ω' },
            { label: 'Dung kháng Z_C', value: ZC.toFixed(1) + ' Ω' },
            { label: 'Tổng trở Z', value: Z.toFixed(1) + ' Ω' },
            { label: 'Dòng điện i', value: this.state.i.toFixed(4) + ' A' },
            { label: 'Điện áp tụ', value: (this.state.q / C_F).toFixed(3) + ' V' }
        ];
    },

    getTheory() {
        return `<p>Mạch dao động RLC nối tiếp gồm điện trở R, cuộn cảm L và tụ điện C mắc nối tiếp với nguồn xoay chiều.</p>
        <div class="formula">Z = √(R² + (Z_L – Z_C)²)</div>
        <p>Hiện tượng cộng hưởng xảy ra khi Z_L = Z_C, tức là:</p>
        <div class="formula">f₀ = 1 / (2π√(LC))</div>
        <p>Khi cộng hưởng, tổng trở Z = R (cực tiểu), dòng điện đạt cực đại I₀ = V₀/R.</p>`;
    }
};

