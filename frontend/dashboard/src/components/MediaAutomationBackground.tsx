import React, { useEffect, useRef } from 'react';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  isHub?: boolean;
  pulsePhase?: number;
}

interface DataPacket {
  fromIdx: number;
  toIdx: number;
  progress: number;
  speed: number;
  color: string;
}

interface MediaAutomationBackgroundProps {
  className?: string;
  nodeCount?: number;
  interactive?: boolean;
  showMediaLabels?: boolean;
}

const MEDIA_AUTOMATION_LABELS = [
  'RSS::INGESTION',
  'MULTIMODAL::OCR',
  'TELEMETRY::STREAM',
  'AGENT::FACT_CHECK',
  'GRAPH::RESOLVE',
  'CONSENSUS::98.9%',
  'VECTOR::EMBED',
  'NEWSWIRE::GLOBAL'
];

export const MediaAutomationBackground: React.FC<MediaAutomationBackgroundProps> = ({
  className = '',
  nodeCount = 55,
  interactive = true,
  showMediaLabels = true,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = canvas.parentElement?.clientWidth || window.innerWidth);
    let height = (canvas.height = canvas.parentElement?.clientHeight || window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = canvas.parentElement?.clientWidth || window.innerWidth;
      height = canvas.height = canvas.parentElement?.clientHeight || window.innerHeight;
      initParticles();
    };

    window.addEventListener('resize', handleResize);

    const mouse = {
      x: -1000,
      y: -1000,
      radius: 160,
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      mouse.x = e.clientX - rect.left;
      mouse.y = e.clientY - rect.top;
    };

    const handleMouseLeave = () => {
      mouse.x = -1000;
      mouse.y = -1000;
    };

    if (interactive && canvas.parentElement) {
      canvas.parentElement.addEventListener('mousemove', handleMouseMove);
      canvas.parentElement.addEventListener('mouseleave', handleMouseLeave);
    }

    // Pure Vibrant Orange & Warm Amber palette for clean white theme
    const colors = [
      'rgba(234, 88, 12, ',  // orange-600
      'rgba(249, 115, 22, ', // orange-500
      'rgba(251, 146, 60, ', // orange-400
      'rgba(245, 158, 11, ', // amber-500
    ];

    let particles: Particle[] = [];
    let packets: DataPacket[] = [];
    let labelPositions: { text: string; nodeIdx: number; opacity: number }[] = [];

    const initParticles = () => {
      particles = [];
      packets = [];
      labelPositions = [];

      const count = Math.min(Math.floor((width * height) / 14000), nodeCount);

      for (let i = 0; i < count; i++) {
        const isHub = i % 8 === 0;
        particles.push({
          x: Math.random() * width,
          y: Math.random() * height,
          vx: (Math.random() - 0.5) * (isHub ? 0.3 : 0.5),
          vy: (Math.random() - 0.5) * (isHub ? 0.3 : 0.5),
          radius: isHub ? Math.random() * 2 + 3 : Math.random() * 1.5 + 1.2,
          color: colors[Math.floor(Math.random() * colors.length)],
          isHub: isHub,
          pulsePhase: Math.random() * Math.PI * 2,
        });
      }

      if (showMediaLabels) {
        for (let i = 0; i < Math.min(4, particles.length); i++) {
          labelPositions.push({
            text: MEDIA_AUTOMATION_LABELS[i % MEDIA_AUTOMATION_LABELS.length],
            nodeIdx: i * 3,
            opacity: 0.5,
          });
        }
      }
    };

    initParticles();

    // Periodic Data Packets Spawner
    let lastPacketTime = 0;
    const maxConnectionDistance = 155;

    const render = (time: number) => {
      ctx.clearRect(0, 0, width, height);

      // Spawn packets traveling between connected nodes
      if (time - lastPacketTime > 450 && particles.length > 2) {
        lastPacketTime = time;
        const i1 = Math.floor(Math.random() * particles.length);
        for (let j = 0; j < particles.length; j++) {
          if (i1 === j) continue;
          const dx = particles[i1].x - particles[j].x;
          const dy = particles[i1].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < maxConnectionDistance) {
            packets.push({
              fromIdx: i1,
              toIdx: j,
              progress: 0,
              speed: 0.015 + Math.random() * 0.02,
              color: particles[i1].color,
            });
            break;
          }
        }
      }

      // Update and draw connections
      for (let i = 0; i < particles.length; i++) {
        const p1 = particles[i];

        // Move particle
        p1.x += p1.vx;
        p1.y += p1.vy;

        // Bounce on edges
        if (p1.x < 0 || p1.x > width) p1.vx *= -1;
        if (p1.y < 0 || p1.y > height) p1.vy *= -1;

        // Mouse interaction
        const mdx = mouse.x - p1.x;
        const mdy = mouse.y - p1.y;
        const mdist = Math.sqrt(mdx * mdx + mdy * mdy);
        if (mdist < mouse.radius) {
          const force = (1 - mdist / mouse.radius) * 1.5;
          p1.x -= (mdx / mdist) * force;
          p1.y -= (mdy / mdist) * force;
        }

        // Draw connections to nearby nodes (subtle warm orange lines)
        for (let j = i + 1; j < particles.length; j++) {
          const p2 = particles[j];
          const dx = p1.x - p2.x;
          const dy = p1.y - p2.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < maxConnectionDistance) {
            const alpha = (1 - dist / maxConnectionDistance) * 0.25;
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.strokeStyle = `rgba(251, 146, 60, ${alpha})`;
            ctx.lineWidth = 0.8;
            ctx.stroke();
          }
        }

        // Connection to mouse
        if (mdist < mouse.radius) {
          const mouseAlpha = (1 - mdist / mouse.radius) * 0.45;
          ctx.beginPath();
          ctx.moveTo(p1.x, p1.y);
          ctx.lineTo(mouse.x, mouse.y);
          ctx.strokeStyle = `rgba(234, 88, 12, ${mouseAlpha})`;
          ctx.lineWidth = 1.0;
          ctx.stroke();
        }
      }

      // Update & draw animated Data Packets (NO glowing blur)
      for (let k = packets.length - 1; k >= 0; k--) {
        const pkt = packets[k];
        pkt.progress += pkt.speed;

        if (pkt.progress >= 1) {
          packets.splice(k, 1);
          continue;
        }

        const pFrom = particles[pkt.fromIdx];
        const pTo = particles[pkt.toIdx];
        if (!pFrom || !pTo) continue;

        const curX = pFrom.x + (pTo.x - pFrom.x) * pkt.progress;
        const curY = pFrom.y + (pTo.y - pFrom.y) * pkt.progress;

        // Clean solid crisp orange dot
        ctx.beginPath();
        ctx.arc(curX, curY, 2.4, 0, Math.PI * 2);
        ctx.fillStyle = '#ea580c'; // orange-600
        ctx.shadowBlur = 0;
        ctx.fill();
      }

      // Draw particle nodes & Hub radar waves
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];

        // Draw node
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = p.isHub ? '#ea580c' : `${p.color}0.75)`;
        ctx.shadowBlur = 0;
        ctx.fill();

        // Hub nodes subtle pulse rings
        if (p.isHub) {
          p.pulsePhase = ((p.pulsePhase || 0) + 0.02) % (Math.PI * 2);
          const ringRadius = p.radius + 5 + Math.sin(p.pulsePhase) * 4;
          const ringAlpha = 0.3 * (1 - Math.sin(p.pulsePhase) * 0.5);

          ctx.beginPath();
          ctx.arc(p.x, p.y, ringRadius, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(234, 88, 12, ${ringAlpha})`;
          ctx.lineWidth = 1.0;
          ctx.stroke();
        }
      }

      // Draw subtle online media automation node labels
      if (showMediaLabels) {
        ctx.font = '500 9px monospace';
        for (let l = 0; l < labelPositions.length; l++) {
          const item = labelPositions[l];
          const node = particles[item.nodeIdx % particles.length];
          if (node) {
            ctx.fillStyle = 'rgba(234, 88, 12, 0.65)';
            ctx.fillText(`[${item.text}]`, node.x + 8, node.y - 6);
          }
        }
      }

      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      if (interactive && canvas.parentElement) {
        canvas.parentElement.removeEventListener('mousemove', handleMouseMove);
        canvas.parentElement.removeEventListener('mouseleave', handleMouseLeave);
      }
    };
  }, [nodeCount, interactive, showMediaLabels]);

  return (
    <canvas
      ref={canvasRef}
      className={`absolute inset-0 pointer-events-none z-0 ${className}`}
      style={{ width: '100%', height: '100%' }}
    />
  );
};
