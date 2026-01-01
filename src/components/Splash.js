import { useEffect, useState, useRef } from "react";

/**
 * Premium Full-page Splash Screen
 * - Advanced animations and visual effects
 * - Smooth transitions and micro-interactions
 * - Responsive design with mobile optimization
 * - Performance optimized with reduced motion support
 */
export default function Splash({
  title = "RGP System",
  subtitle = "Returnable Gate Pass for Garments",
  duration = 2000,
  onDone,
  logoSrc,
  brandColor = "#0ea5e9",
  secondaryColor = "#22d3ee"
}) {
  const [phase, setPhase] = useState("show");
  const [progress, setProgress] = useState(0);
  const progressRef = useRef();

  // Scroll lock and body class for splash state
  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.body.classList.add("splash-active");
    
    return () => {
      document.body.style.overflow = prevOverflow;
      document.body.classList.remove("splash-active");
    };
  }, []);

  // Progress animation
  useEffect(() => {
    if (phase !== "show") return;
    
    const startTime = Date.now();
    const animateProgress = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min((elapsed / duration) * 100, 100);
      setProgress(progress);
      
      if (progress < 100) {
        progressRef.current = requestAnimationFrame(animateProgress);
      }
    };
    
    progressRef.current = requestAnimationFrame(animateProgress);
    
    return () => {
      if (progressRef.current) {
        cancelAnimationFrame(progressRef.current);
      }
    };
  }, [phase, duration]);

  // Phase transitions
  useEffect(() => {
    const t1 = setTimeout(() => setPhase("fade"), duration);
    const t2 = setTimeout(() => {
      setPhase("hidden");
      onDone?.();
    }, duration + 500);
    
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [duration, onDone]);

  if (phase === "hidden") return null;

  return (
    <>
      <div 
        className={`splash-premium ${phase === "fade" ? "splash-premium--fade" : ""}`}
        role="status"
        aria-label="Loading application"
      >
        {/* Animated gradient background with particles */}
        <div className="bg-gradient" />
        <div className="bg-particles">
          {[...Array(15)].map((_, i) => (
            <div key={i} className="particle" style={{
              '--delay': `${i * 0.3}s`,
              '--size': `${Math.random() * 4 + 2}px`,
              '--x': `${Math.random() * 100}%`,
              '--y': `${Math.random() * 100}%`,
            }} />
          ))}
        </div>

        {/* Floating background elements */}
        <div className="bg-orb orb-1" />
        <div className="bg-orb orb-2" />
        <div className="bg-orb orb-3" />

        {/* Main content container */}
        <div className="splash-content">
          {/* Logo/Brand section */}
          <div className="brand-section">
            {logoSrc && (
              <div className="logo-container">
                <img 
                  className="logo" 
                  src={logoSrc} 
                  alt="" 
                  onError={(e) => {
                    e.target.style.display = 'none';
                  }}
                />
                <div className="logo-glow" />
              </div>
            )}
            
            <h1 className="title">
              {title.split('').map((letter, index) => (
                <span 
                  key={index} 
                  className="title-letter"
                  style={{ '--delay': `${index * 0.05}s` }}
                >
                  {letter === ' ' ? '\u00A0' : letter}
                </span>
              ))}
            </h1>
            
            <p className="subtitle">
              {subtitle}
            </p>
          </div>

          {/* Loading indicators */}
          <div className="loading-section">
            {/* Advanced spinner */}
            <div className="spinner-advanced" aria-hidden="true">
              <div className="spinner-core" />
              <div className="spinner-orbit orbit-1" />
              <div className="spinner-orbit orbit-2" />
              <div className="spinner-orbit orbit-3" />
            </div>

            {/* Animated progress bar */}
            <div className="progress-container">
              <div className="progress-track">
                <div 
                  className="progress-fill"
                  style={{ 
                    width: `${progress}%`,
                    '--brand': brandColor,
                    '--secondary': secondaryColor
                  }}
                />
                <div className="progress-glow" />
              </div>
              <div className="progress-text">
                {Math.round(progress)}%
              </div>
            </div>
          </div>

          {/* Feature highlights */}
          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon">📄</div>
              <span className="feature-text">Issue & Print</span>
            </div>
            <div className="feature-card">
              <div className="feature-icon">📱</div>
              <span className="feature-text">Scan & Receive</span>
            </div>
            <div className="feature-card">
              <div className="feature-icon">📊</div>
              <span className="feature-text">Audit & Logs</span>
            </div>
          </div>
        </div>
      </div>

      {/* Embedded CSS */}
      <style>{`
        :root {
          --brand: ${brandColor};
          --secondary: ${secondaryColor};
          --bg-dark: #0b1220;
          --bg-darker: #070b14;
          --text-primary: #f1f5f9;
          --text-secondary: #94a3b8;
          --text-muted: #64748b;
          --glass: rgba(255, 255, 255, 0.05);
          --glass-border: rgba(255, 255, 255, 0.1);
        }

        /* Base splash container */
        .splash-premium {
          position: fixed;
          inset: 0;
          z-index: 9999;
          background: linear-gradient(135deg, var(--bg-darker) 0%, var(--bg-dark) 100%);
          overflow: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .splash-premium--fade {
          opacity: 0;
          transform: scale(1.05);
          pointer-events: none;
        }

        /* Animated background gradient */
        .bg-gradient {
          position: absolute;
          inset: 0;
          background: 
            radial-gradient(ellipse at 20% 20%, rgba(14, 165, 233, 0.15) 0%, transparent 50%),
            radial-gradient(ellipse at 80% 80%, rgba(34, 211, 238, 0.15) 0%, transparent 50%),
            radial-gradient(ellipse at 40% 80%, rgba(139, 92, 246, 0.1) 0%, transparent 50%);
          animation: gradientShift 8s ease-in-out infinite;
        }

        @keyframes gradientShift {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }

        /* Floating particles */
        .bg-particles {
          position: absolute;
          inset: 0;
        }

        .particle {
          position: absolute;
          background: var(--brand);
          border-radius: 50%;
          opacity: 0.3;
          animation: floatParticle 3s ease-in-out infinite;
          animation-delay: var(--delay);
          left: var(--x);
          top: var(--y);
          width: var(--size);
          height: var(--size);
        }

        @keyframes floatParticle {
          0%, 100% { 
            transform: translate(0, 0) scale(1);
            opacity: 0.2;
          }
          50% { 
            transform: translate(20px, -20px) scale(1.2);
            opacity: 0.4;
          }
        }

        /* Background orbs */
        .bg-orb {
          position: absolute;
          border-radius: 50%;
          filter: blur(40px);
          opacity: 0.1;
          animation: orbFloat 15s ease-in-out infinite;
        }

        .orb-1 {
          width: 300px;
          height: 300px;
          background: var(--brand);
          top: 10%;
          left: 10%;
          animation-delay: 0s;
        }

        .orb-2 {
          width: 400px;
          height: 400px;
          background: var(--secondary);
          bottom: 10%;
          right: 10%;
          animation-delay: -5s;
        }

        .orb-3 {
          width: 200px;
          height: 200px;
          background: #8b5cf6;
          top: 50%;
          right: 20%;
          animation-delay: -10s;
        }

        @keyframes orbFloat {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(30px, -30px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
        }

        /* Main content */
        .splash-content {
          text-align: center;
          padding: 2rem;
          width: min(800px, 90vw);
          position: relative;
          z-index: 2;
        }

        /* Brand section */
        .brand-section {
          margin-bottom: 3rem;
        }

        .logo-container {
          position: relative;
          display: inline-block;
          margin-bottom: 1.5rem;
        }

        .logo {
          width: 80px;
          height: 80px;
          border-radius: 20px;
          object-fit: cover;
          background: var(--glass);
          border: 1px solid var(--glass-border);
          backdrop-filter: blur(10px);
          position: relative;
          z-index: 2;
          animation: logoGlow 2s ease-in-out infinite alternate;
        }

        .logo-glow {
          position: absolute;
          inset: -8px;
          background: var(--brand);
          border-radius: 28px;
          filter: blur(20px);
          opacity: 0.3;
          z-index: 1;
        }

        @keyframes logoGlow {
          from { box-shadow: 0 0 20px rgba(14, 165, 233, 0.3); }
          to { box-shadow: 0 0 40px rgba(14, 165, 233, 0.6); }
        }

        /* Title with letter animation */
        .title {
          font-size: 3.5rem;
          font-weight: 800;
          margin: 0 0 0.5rem 0;
          background: linear-gradient(135deg, var(--text-primary) 0%, var(--text-secondary) 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .title-letter {
          display: inline-block;
          animation: titleReveal 0.6s cubic-bezier(0.4, 0, 0.2, 1) both;
          animation-delay: var(--delay);
        }

        @keyframes titleReveal {
          from {
            opacity: 0;
            transform: translateY(20px) rotateX(90deg);
          }
          to {
            opacity: 1;
            transform: translateY(0) rotateX(0);
          }
        }

        .subtitle {
          font-size: 1.25rem;
          color: var(--text-secondary);
          margin: 0;
          opacity: 0;
          animation: subtitleReveal 0.8s ease-out 0.3s both;
        }

        @keyframes subtitleReveal {
          to {
            opacity: 1;
            transform: translateY(0);
          }
          from {
            opacity: 0;
            transform: translateY(10px);
          }
        }

        /* Loading section */
        .loading-section {
          margin-bottom: 3rem;
        }

        /* Advanced spinner */
        .spinner-advanced {
          position: relative;
          width: 80px;
          height: 80px;
          margin: 0 auto 2rem;
        }

        .spinner-core {
          position: absolute;
          inset: 0;
          border-radius: 50%;
          background: conic-gradient(from 0deg, var(--brand), var(--secondary), var(--brand));
          animation: spin 2s linear infinite;
          filter: blur(8px);
          opacity: 0.7;
        }

        .spinner-orbit {
          position: absolute;
          border-radius: 50%;
          border: 2px solid transparent;
          animation: orbitSpin 2s linear infinite;
        }

        .orbit-1 {
          inset: 0;
          border-top-color: var(--brand);
          animation-delay: 0s;
        }

        .orbit-2 {
          inset: 8px;
          border-right-color: var(--secondary);
          animation-delay: -0.4s;
        }

        .orbit-3 {
          inset: 16px;
          border-bottom-color: var(--brand);
          animation-delay: -0.8s;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        @keyframes orbitSpin {
          0% { transform: rotate(0deg) scale(1); }
          50% { transform: rotate(180deg) scale(1.1); }
          100% { transform: rotate(360deg) scale(1); }
        }

        /* Progress bar */
        .progress-container {
          width: min(400px, 90vw);
          margin: 0 auto;
        }

        .progress-track {
          position: relative;
          height: 6px;
          background: var(--glass);
          border-radius: 3px;
          overflow: hidden;
          margin-bottom: 0.5rem;
        }

        .progress-fill {
          height: 100%;
          border-radius: 3px;
          background: linear-gradient(90deg, var(--brand), var(--secondary));
          transition: width 0.1s ease-out;
          position: relative;
        }

        .progress-glow {
          position: absolute;
          top: 0;
          right: 0;
          bottom: 0;
          left: 0;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent);
          animation: progressShine 2s ease-in-out infinite;
        }

        @keyframes progressShine {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }

        .progress-text {
          color: var(--text-secondary);
          font-size: 0.875rem;
          font-variant-numeric: tabular-nums;
        }

        /* Features grid */
        .features-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 1rem;
          max-width: 400px;
          margin: 0 auto;
        }

        .feature-card {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.5rem;
          padding: 1rem;
          background: var(--glass);
          border: 1px solid var(--glass-border);
          border-radius: 12px;
          backdrop-filter: blur(10px);
          transition: all 0.3s ease;
          opacity: 0;
          animation: featureReveal 0.6s ease-out 0.8s both;
        }

        .feature-card:nth-child(2) { animation-delay: 1s; }
        .feature-card:nth-child(3) { animation-delay: 1.2s; }

        .feature-card:hover {
          transform: translateY(-2px);
          border-color: var(--brand);
        }

        .feature-icon {
          font-size: 1.5rem;
          filter: grayscale(1) brightness(1.5);
        }

        .feature-text {
          font-size: 0.75rem;
          color: var(--text-secondary);
          text-align: center;
        }

        @keyframes featureReveal {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        /* Responsive design */
        @media (max-width: 768px) {
          .title {
            font-size: 2.5rem;
          }
          
          .subtitle {
            font-size: 1.1rem;
          }
          
          .features-grid {
            grid-template-columns: 1fr;
            max-width: 250px;
          }
          
          .logo {
            width: 64px;
            height: 64px;
          }
        }

        @media (max-width: 480px) {
          .title {
            font-size: 2rem;
          }
          
          .splash-content {
            padding: 1rem;
          }
        }

        /* Reduced motion support */
        @media (prefers-reduced-motion: reduce) {
          * {
            animation-duration: 0.01ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: 0.01ms !important;
          }
          
          .progress-fill {
            transition: none;
          }
        }
      `}</style>
    </>
  );
}