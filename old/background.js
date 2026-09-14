const canvas = document.getElementById("bgCanvas");
if (canvas) {
  const ctx = canvas.getContext("2d");
  const chars = "ｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜﾝ0123456789ABCDEF$#@><{}[]|/\\";
  const fontSize = 18;
  let columns = [];
  let mouseX = -9999;
  let mouseY = -9999;

  function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    const count = Math.ceil(canvas.width / fontSize);
    columns = Array.from({ length: count }, () => ({
      y: Math.random() * canvas.height / fontSize,
      speed: 0.08 + Math.random() * 0.22,
      flicker: Math.random(),
    }));
  }

  window.addEventListener("resize", resizeCanvas);
  window.addEventListener("mousemove", (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
  });
  resizeCanvas();

  function draw() {
    ctx.fillStyle = "rgba(0, 6, 2, 0.22)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.font = `${fontSize}px "JetBrains Mono", monospace`;

    for (let i = 0; i < columns.length; i++) {
      if (i % 2 === 1) continue;

      const col = columns[i];
      const x = i * fontSize;
      const y = col.y * fontSize;
      const nearMouse =
        Math.abs(x - mouseX) < 60 && Math.abs(y - mouseY) < 80;

      const head = chars[Math.floor(Math.random() * chars.length)];
      ctx.fillStyle = nearMouse
        ? "rgba(0, 200, 55, 0.28)"
        : "rgba(0, 160, 45, 0.2)";
      ctx.fillText(head, x, y);

      const trailY = y - fontSize * 1.4;
      if (trailY > 0) {
        ctx.fillStyle = `rgba(0, 120, 35, ${0.03 + col.flicker * 0.02})`;
        ctx.fillText(
          chars[Math.floor(Math.random() * chars.length)],
          x,
          trailY
        );
      }

      col.y += col.speed * (nearMouse ? 1.15 : 1);
      col.flicker = (col.flicker + 0.03) % 1;

      if (y > canvas.height + fontSize * 4) {
        col.y = -Math.random() * 20;
        col.speed = 0.08 + Math.random() * 0.22;
      }
    }

    requestAnimationFrame(draw);
  }

  draw();
}
