import { useEffect, useRef, useState } from "react";

export default function BoxingStateGame() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  const [leftCount, setLeftCount] = useState(0);
  const [rightCount, setRightCount] = useState(0);
  const [timeLeft, setTimeLeft] = useState(15);
  const [gameStatus, setGameStatus] = useState("IDLE");
  const [readyCountdown, setReadyCountdown] = useState(5);
  const [total, setTotal] = useState(0);

  const statusRef = useRef("IDLE");
  const countsRef = useRef({ left: 0, right: 0 });
  const anchorPosRef = useRef({ left: null, right: null });
  const isOutRef = useRef({ left: false, right: false });

  const startGame = () => {
    setLeftCount(0); setRightCount(0); setTimeLeft(15); setReadyCountdown(5); setTotal(0);
    countsRef.current = { left: 0, right: 0 };
    isOutRef.current = { left: false, right: false };
    anchorPosRef.current = { left: null, right: null };
    setGameStatus("READY");
    statusRef.current = "READY";
  };

  const onResults = (results) => {
    if (!canvasRef.current || !results) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    canvas.width = width;
    canvas.height = height;

    ctx.save();
    ctx.scale(-1, 1);
    ctx.translate(-width, 0);
    ctx.clearRect(0, 0, width, height);
    if (results.image) ctx.drawImage(results.image, 0, 0, width, height);

    if (results.poseLandmarks) {
      const lm = results.poseLandmarks;
      const lw = lm[16]; 
      const rw = lm[15];

      if (statusRef.current === "READY" && lw && rw) {
        anchorPosRef.current.left = { x: rw.x, y: rw.y };
        anchorPosRef.current.right = { x: lw.x, y: lw.y };
      }

      const drawUI = (point, color, side) => {
        if (!point || point.visibility < 0.6) return;
        ctx.beginPath();
        ctx.arc(point.x * width, point.y * height, 15, 0, 2 * Math.PI);
        ctx.fillStyle = isOutRef.current[side] ? color : "#FFF";
        ctx.fill();
        ctx.strokeStyle = "white"; ctx.lineWidth = 2; ctx.stroke();
      };

      drawUI(rw, "#FF2E63", "left");
      drawUI(lw, "#08D9D6", "right");

      if (statusRef.current === "GO") {
        detectPunch(rw, "left", lm[12], lm[11], width, height);
        detectPunch(lw, "right", lm[12], lm[11], width, height);
      }
    }
    ctx.restore();
  };

  const detectPunch = (wrist, side, ls, rs, w, h) => {
    if (!wrist || !ls || !rs || wrist.visibility < 0.7) return;
    if (!anchorPosRef.current[side]) return;
    
    const shoulderWidthPx = Math.abs(ls.x - rs.x) * w;
    const oneCm = (shoulderWidthPx / 40) || 1;
    const dx = (wrist.x - anchorPosRef.current[side].x) * w;
    const dy = (wrist.y - anchorPosRef.current[side].y) * h;
    const distFromAnchor = Math.sqrt(dx * dx + dy * dy) / oneCm;

    if (distFromAnchor > 14 && !isOutRef.current[side]) {
      isOutRef.current[side] = true;
    } else if (distFromAnchor < 8 && isOutRef.current[side]) {
      countsRef.current[side] += 1;
      if (side === "left") setLeftCount(countsRef.current.left);
      else setRightCount(countsRef.current.right);
      isOutRef.current[side] = false;
    }
  };

  useEffect(() => {
    if (gameStatus === "READY" && readyCountdown > 0) {
      const t = setTimeout(() => setReadyCountdown(readyCountdown - 1), 1000);
      return () => clearTimeout(t);
    } else if (gameStatus === "READY") { setGameStatus("GO"); statusRef.current = "GO"; }
    if (gameStatus === "GO" && timeLeft > 0) {
      const t = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
      return () => clearInterval(t);
    } else if (gameStatus === "GO") {
      setTotal(countsRef.current.left + countsRef.current.right);
      setGameStatus("IDLE"); statusRef.current = "IDLE";
    }
  }, [gameStatus, readyCountdown, timeLeft]);

  useEffect(() => {
    const initCamera = () => {
      if (!window.Pose || !window.Camera) {
        setTimeout(initCamera, 100);
        return;
      }
      
      const pose = new window.Pose({ locateFile: (f) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${f}` });
      pose.setOptions({ modelComplexity: 1, minDetectionConfidence: 0.6, minTrackingConfidence: 0.6 });
      pose.onResults(onResults);
      if (videoRef.current) {
        new window.Camera(videoRef.current, {
          onFrame: async () => await pose.send({ image: videoRef.current }),
          width: 1280, height: 720,
        }).start();
      }
    };
    
    initCamera();
  }, []);

  return (
    <div style={s.pageWrapper}>
      <div style={s.mainFrame}>
        
        <div style={s.arena}>
          <div style={s.videoWrapper}>
            <video ref={videoRef} style={{ display: "none" }} />
            <canvas ref={canvasRef} style={s.canvas} />

            {/* Title Section */}
            <div style={s.innerTitleBox}>
              <span style={s.muaythaiText}>MUAYTHAI</span>
              <span style={s.speedText}>SPEED</span>
            </div>

            {/* คะแนน */}
            <div style={s.scoreOverlay}>
              <div style={s.scoreBox}>
                <div style={s.scoreLabel}>LEFT</div>
                <div style={{...s.scoreValue, color: "#FF2E63"}}>{leftCount}</div>
              </div>
              <div style={s.scoreBox}>
                <div style={s.scoreLabel}>RIGHT</div>
                <div style={{...s.scoreValue, color: "#08D9D6"}}>{rightCount}</div>
              </div>
            </div>

            {/* เวลาจับเวลา (15s) */}
            {gameStatus === "GO" && <div style={s.timerTag}>{timeLeft}s</div>}

            {/* Overlay ต่างๆ */}
            {(gameStatus === "READY" || gameStatus === "IDLE") && (
              <div style={s.overlay}>
                {gameStatus === "READY" ? (
                  <div style={s.readyGroup}>
                    <div style={s.readyLabel}>GET READY</div>
                    <div style={s.countdownText}>{readyCountdown}</div>
                  </div>
                ) : (
                  <div style={s.resultGroup}>
                    {total > 0 ? (
                      <>
                        <div style={s.resBox}>
                          <div style={s.resLabel}>TOTAL SCORE</div>
                          <div style={s.resTotal}>{total}</div>
                        </div>
                        <button onClick={startGame} style={s.btnAgain}>PLAY AGAIN</button>
                      </>
                    ) : (
                      <button onClick={startGame} style={s.btnStart}>START GAME</button>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer ภายใน Frame */}
        <div style={s.footerContainer}>
          <div style={s.ruleSection}>
            <p style={s.ruleCyan}><span style={s.highlightCyan}>ตั้งการ์ด</span> ต่อยให้ไวใน 15 วินาที</p>
          </div>
          <div style={s.divider} />
          <div style={s.ruleSection}>
            <p style={s.ruleMagenta}>做好防守姿势，15秒内全力快打！</p>
          </div>
        </div>

      </div>
    </div>
  );
}

const s = {
  pageWrapper: {
    backgroundColor: "#000", 
    height: "100vh", 
    width: "100vw",
    display: "flex", 
    justifyContent: "center", 
    alignItems: "center",
    overflow: "hidden", 
    padding: "10px",
    boxSizing: "border-box",
  },
  mainFrame: {
    backgroundColor: "#0a0a0a", 
    color: "#fff", 
    width: "100%", 
    height: "100%",
    maxWidth: "480px", 
    display: "flex", 
    flexDirection: "column",
    alignItems: "center", 
    padding: "50px 20px 20px 20px", // เพิ่ม padding บนเพื่อหลีกเลี่ยงกล้องติดขอบ
    fontFamily: "'Segoe UI', Roboto, sans-serif",
    position: "relative",
    borderRadius: "45px", 
    border: "4px solid transparent",
    backgroundImage: "linear-gradient(#0a0a0a, #0a0a0a), linear-gradient(135deg, #FF2E63, #08D9D6)",
    backgroundOrigin: "border-box",
    backgroundClip: "content-box, border-box",
    boxShadow: "0 0 30px rgba(255, 46, 99, 0.4), 0 0 30px rgba(8, 217, 214, 0.4)",
    boxSizing: "border-box",
  },
  innerTitleBox: {
    position: "absolute", 
    top: "15px", 
    width: "100%",
    display: "flex", 
    justifyContent: "center", 
    alignItems: "center",
    gap: "10px", 
    zIndex: 6,
  },
  muaythaiText: {
    fontSize: "1.6rem", 
    fontWeight: "900", 
    color: "#fff",
    textShadow: "0 0 5px #FF2E63, 0 0 10px #FF2E63, 0 0 15px #FF2E63",
    WebkitTextStroke: "1px #FF2E63",
    letterSpacing: "1px",
  },
  speedText: {
    fontSize: "1.6rem", 
    fontWeight: "900", 
    color: "#fff",
    fontStyle: "italic",
    textShadow: "0 0 10px rgba(255,255,255,0.4)",
  },
  arena: { 
    width: "100%", 
    flex: 1, 
    display: "flex", 
    flexDirection: "column",
    justifyContent: "center", 
    minHeight: 0,
  },
  videoWrapper: {
    position: "relative", 
    width: "100%", 
    height: "100%",
    backgroundColor: "#000", 
    borderRadius: "30px", 
    overflow: "hidden",
    border: "1px solid rgba(255,255,255,0.1)",
  },
  canvas: { width: "100%", height: "100%", objectFit: "cover" },
  scoreOverlay: {
    position: "absolute", 
    bottom: "0", 
    left: "0", 
    right: "0",
    display: "flex", 
    justifyContent: "space-between", 
    padding: "20px 30px",
    background: "linear-gradient(transparent, rgba(0,0,0,0.9))", 
    zIndex: 5,
  },
  scoreBox: { textAlign: "center" },
  scoreLabel: { fontSize: "0.75rem", color: "#aaa", fontWeight: "bold" },
  scoreValue: { fontSize: "clamp(2.8rem, 9vw, 3.8rem)", fontWeight: "900", lineHeight: "1" },
  timerTag: { 
    position: "absolute", 
    top: "70px", 
    left: "50%", 
    transform: "translateX(-50%)", 
    background: "#FF2E63", 
    padding: "4px 18px", 
    borderRadius: "10px", 
    fontWeight: "bold", 
    fontSize: "1.1rem", 
    boxShadow: "0 0 15px #FF2E63", 
    zIndex: 6
  },
  overlay: { 
    position: "absolute", 
    inset: 0, 
    background: "rgba(0,0,0,0.85)", 
    display: "flex", 
    justifyContent: "center", 
    alignItems: "center", 
    zIndex: 10 
  },
  readyGroup: { 
    textAlign: "center", 
    transform: "translateY(-60px)",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "20px" // เว้นช่องว่างระหว่าง GET READY กับตัวเลข
  }, 
  readyLabel: { 
    color: "#FFF9C4", // สีเหลืองอ่อนนีออน
    fontSize: "1.5rem", 
    fontWeight: "900", 
    letterSpacing: "3px",
    textShadow: "0 0 10px #FFF9C4, 0 0 20px #FFEB3B",
  },
  countdownText: { 
    fontSize: "3.5rem", // ปรับขนาดตัวเลขให้น่ารักขึ้น ไม่ทับส่วนอื่น
    fontWeight: "900", 
    color: "#fff",
    lineHeight: "1"
  },
  resultGroup: { 
    display: "flex", 
    flexDirection: "column", 
    alignItems: "center", 
    gap: "35px", 
    width: "100%" 
  },
  resBox: { textAlign: "center" },
  resLabel: { color: "#08D9D6", fontSize: "1.1rem", fontWeight: "bold" },
  resTotal: { fontSize: "6.5rem", fontWeight: "900", color: "#FFD700", lineHeight: "1", margin: "10px 0" },
  btnStart: { 
    padding: "16px 45px", 
    fontSize: "1.3rem", 
    fontWeight: "bold", 
    background: "#08D9D6", 
    border: "none", 
    borderRadius: "50px", 
    color: "#000", 
    cursor: "pointer", 
    boxShadow: "0 0 20px rgba(8, 217, 214, 0.4)"
  },
  btnAgain: { 
    padding: "16px 45px", 
    fontSize: "1.3rem", 
    fontWeight: "bold", 
    background: "transparent", 
    border: "3px solid #FFD700", 
    borderRadius: "50px", 
    color: "#FFD700", 
    cursor: "pointer",
  },
  footerContainer: {
    width: "100%", 
    paddingTop: "20px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    flexShrink: 0,
  },
  ruleSection: { margin: "2px 0" },
  ruleCyan: { color: "#08D9D6", fontSize: "0.9rem", fontWeight: "600" },
  ruleMagenta: { color: "#FF2E63", fontSize: "0.85rem", margin: "3px 0" },
  highlightCyan: { fontWeight: "900", textTransform: "uppercase" },
  divider: { height: "1px", width: "30%", margin: "10px auto", background: "rgba(255,255,255,0.1)" },
};