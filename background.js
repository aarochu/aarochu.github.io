const canvas = document.getElementById("bgCanvas");
const ctx = canvas.getContext("2d");

let particles = [];

function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
window.addEventListener("resize", resizeCanvas);
resizeCanvas();

function spawnParticle(x, y) {
  const life = 50 + Math.random() * 40;
  particles.push({
    x,
    y,
    vx: (Math.random() - 0.5) * 1.6,
    vy: (Math.random() - 0.5) * 1.6,
    size: 6 + Math.random() * 8,
    life,
    ttl: life
  });
  if (particles.length > 600) particles.splice(0, particles.length - 600);
}

// Spawn particles on mouse move / touch
let isTouch = false;
window.addEventListener('mousemove', (e) => {
  isTouch = false;
  spawnParticle(e.clientX, e.clientY);
});
window.addEventListener('touchmove', (e) => {
  isTouch = true;
  for (let t of e.touches) spawnParticle(t.clientX, t.clientY);
}, {passive: true});

function animate() {
  // Slight trail to create glow fade
  ctx.fillStyle = 'rgba(5,5,5,0.18)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.globalCompositeOperation = 'lighter';

  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    const alpha = Math.max(p.life / p.ttl, 0);

    // draw glow (now icy/white, smaller bubbles)
    const grd = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 1.5);
    grd.addColorStop(0, `rgba(255,255,255,${alpha * 0.95})`);
    grd.addColorStop(0.6, `rgba(220,230,255,${alpha * 0.35})`);
    grd.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grd;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size * 1.5, 0, Math.PI * 2);
    ctx.fill();

    // core (bright white)
    ctx.fillStyle = `rgba(255,255,255,${alpha})`;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size * 0.6, 0, Math.PI * 2);
    ctx.fill();

    p.x += p.vx;
    p.y += p.vy;
    p.vx += (Math.random() - 0.5) * 0.06;
    p.vy += (Math.random() - 0.5) * 0.06;
    p.life -= 1;

    if (p.life <= 0) particles.splice(i, 1);
  }

  ctx.globalCompositeOperation = 'source-over';

  requestAnimationFrame(animate);
}

animate();
