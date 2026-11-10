import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { vh, clamp } from "../../hooks/useResponsive";
import { ScreenLayout } from "../../components/ScreenLayout";
import { useLocation, useNavigate } from "react-router-dom";
import { useWebSocketStore } from "../../store/websocketStore";
import { useSettingsStore } from "../../store/settingsStore";
import { LanguageToggle } from "../../components/LanguageToggle";
import { MuteAllButton } from "../../components/MuteAllButton";
import { audioService } from "../../services/AudioService";

export const FaceExpression = ({ type = "happy" }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const currentExpression = useWebSocketStore(state => state.currentExpression);
  const clearExpression = useWebSocketStore(state => state.clearExpression);
  const activeDelivery = useWebSocketStore(state => state.activeDelivery);
  const sendInterrupt = useWebSocketStore(state => state.sendInterrupt);
  const t = useSettingsStore(state => state.t);
  
  // Force re-render when currentExpression changes
  const [renderKey, setRenderKey] = useState(0);
  
  useEffect(() => {
    if (currentExpression?.timestamp) {
      setRenderKey(prev => prev + 1);
    }
  }, [currentExpression?.timestamp]);
  
  // Handle tap - different behavior based on active delivery
  const handleTap = () => {
    // Stop any playing expression sound when leaving
    audioService.stopAllSounds();

    if (activeDelivery) {
      // If there's an active delivery, send INTERRUPT to initiate cancel flow
      // sendInterrupt() will: 1. Send INTERRUPT message, 2. Open confirm dialog
      // - Confirm -> sends INTERRUPT_CONFIRM
      // - Cancel -> sends INTERRUPT_CANCEL
      sendInterrupt();
    } else {
      // No active delivery - navigate to delivery mode menu (existing behavior)
      clearExpression();
      navigate('/delivery');
    }
  };
  
  // PRIORITIZE currentExpression from WebSocket over location.state
  const expressionType = currentExpression?.type || location.state?.expressionType || type;
  
  // Use timestamp to force re-render
  const expressionKey = currentExpression?.timestamp 
    ? `${expressionType}-${currentExpression.timestamp}`
    : `${expressionType}-${renderKey}`;
  
  // Almost full screen - use viewport width for maximum size
  const sizeValue = 95; // 95% of viewport min dimension

  const transitionVariants = {
    initial: { opacity: 0, scale: 0.8 },
    animate: { opacity: 1, scale: 1, transition: { duration: 0.35 } },
    exit: { opacity: 0, scale: 0.8, transition: { duration: 0.25 } },
  };

  return (
    <ScreenLayout>
      <div 
        className="w-full h-full flex items-center justify-center bg-black cursor-pointer overflow-hidden relative"
        onClick={handleTap}
      >
        {/* Status Overlay - Small badge when there's an active delivery */}
        {activeDelivery && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="absolute top-0 left-0 right-0 z-10 flex flex-col items-center"
            style={{ paddingTop: vh(3) }}
          >
            {/* Status Badge */}
            <div 
              className="bg-white/10 backdrop-blur-sm rounded-full px-6 py-2 flex items-center gap-3"
              style={{ 
                border: '1px solid rgba(255,255,255,0.2)',
              }}
            >
              {/* Pulsing Dot */}
              <motion.div
                animate={{ scale: [1, 1.3, 1], opacity: [1, 0.5, 1] }}
                transition={{ repeat: Infinity, duration: 1.5 }}
                className="w-3 h-3 rounded-full bg-green-400"
              />
              
              {/* Status Text */}
              <span 
                className="text-white font-medium"
                style={{ fontSize: clamp(14, 1.8, 20) }}
              >
                {activeDelivery.movementType === 'HOMEBASE' ? t('Returning home...') :
                 activeDelivery.movementType === 'CHARGE' ? t('Going to charge...') :
                 activeDelivery.movementType === 'GREET' ? `${t('Going to greet at')} ${activeDelivery.destination}` :
                 activeDelivery.movementType === 'SPECIAL' ? `${t('Special delivery to')} ${activeDelivery.destination}` :
                 activeDelivery.movementType === 'CRUISE' ? `${t('Cruising')} ${activeDelivery.destination}` :
                 activeDelivery.movementType === 'DELIVERY' ? `${t('Delivering to')} ${activeDelivery.destination}` :
                 activeDelivery.movementType === 'DIRECT' ? `${t('Direct delivery to')} ${activeDelivery.destination}` :
                 `${t('Moving to')} ${activeDelivery.destination || 'destination'}`}
              </span>
            </div>
            
            {/* Tap to Cancel Hint */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.6 }}
              transition={{ delay: 2 }}
              className="text-white/60 mt-2"
              style={{ fontSize: clamp(10, 1.2, 14) }}
            >
              {t('Tap screen to cancel')}
            </motion.p>
          </motion.div>
        )}

        <AnimatePresence mode="wait">
          <motion.svg
            key={expressionKey}
            {...transitionVariants}
            width="100%"
            height="100%"
            viewBox="0 0 420 200"
            preserveAspectRatio="xMidYMid meet"
          >
            {/* Neon glow filters */}
            <defs>
              <filter id="neonGlow" x="-100%" y="-100%" width="300%" height="300%">
                <feGaussianBlur stdDeviation="4" result="blur1"/>
                <feGaussianBlur stdDeviation="8" result="blur2"/>
                <feMerge>
                  <feMergeNode in="blur2"/>
                  <feMergeNode in="blur1"/>
                  <feMergeNode in="SourceGraphic"/>
                </feMerge>
              </filter>
              <filter id="neonGlowStrong" x="-100%" y="-100%" width="300%" height="300%">
                <feGaussianBlur stdDeviation="6" result="blur1"/>
                <feGaussianBlur stdDeviation="12" result="blur2"/>
                <feGaussianBlur stdDeviation="18" result="blur3"/>
                <feMerge>
                  <feMergeNode in="blur3"/>
                  <feMergeNode in="blur2"/>
                  <feMergeNode in="blur1"/>
                  <feMergeNode in="SourceGraphic"/>
                </feMerge>
              </filter>
              <filter id="neonPulse" x="-100%" y="-100%" width="300%" height="300%">
                <feGaussianBlur stdDeviation="5" result="blur"/>
                <feColorMatrix in="blur" type="saturate" values="3"/>
                <feMerge>
                  <feMergeNode/>
                  <feMergeNode in="SourceGraphic"/>
                </feMerge>
              </filter>
              {/* Inner glow for depth */}
              <radialGradient id="eyeGradient" cx="50%" cy="30%" r="70%">
                <stop offset="0%" stopColor="#FFFFFF" stopOpacity="1"/>
                <stop offset="40%" stopColor="#00FFFF" stopOpacity="0.9"/>
                <stop offset="100%" stopColor="#00CED1" stopOpacity="0.8"/>
              </radialGradient>
              <radialGradient id="eyeGradientGreen" cx="50%" cy="30%" r="70%">
                <stop offset="0%" stopColor="#FFFFFF" stopOpacity="1"/>
                <stop offset="40%" stopColor="#00FF88" stopOpacity="0.9"/>
                <stop offset="100%" stopColor="#00CC66" stopOpacity="0.8"/>
              </radialGradient>
              <radialGradient id="eyeGradientRed" cx="50%" cy="30%" r="70%">
                <stop offset="0%" stopColor="#FFFFFF" stopOpacity="1"/>
                <stop offset="40%" stopColor="#FF6B6B" stopOpacity="0.9"/>
                <stop offset="100%" stopColor="#FF4444" stopOpacity="0.8"/>
              </radialGradient>
              <radialGradient id="eyeGradientPink" cx="50%" cy="30%" r="70%">
                <stop offset="0%" stopColor="#FFFFFF" stopOpacity="1"/>
                <stop offset="40%" stopColor="#FF69B4" stopOpacity="0.9"/>
                <stop offset="100%" stopColor="#FF1493" stopOpacity="0.8"/>
              </radialGradient>
            </defs>

            {/* =================================================
                👀 NEON ROBOT EYES - Interactive & Expressive
                Style: Glowing neon with rich animations
            ================================================== */}
            
            {/* NEUTRAL/IDLE - Blinking rectangle eyes */}
            {expressionType === "neutral" && (
              <motion.g filter="url(#neonGlow)">
                {/* Ambient breathing animation */}
                <motion.g
                  animate={{ 
                    scaleY: [1, 1, 0.1, 1, 1],
                    opacity: [1, 1, 0.8, 1, 1]
                  }}
                  transition={{ 
                    repeat: Infinity, 
                    repeatDelay: 3,
                    duration: 0.3,
                    times: [0, 0.4, 0.5, 0.6, 1]
                  }}
                  style={{ transformOrigin: "120px 100px" }}
                >
                  {/* Left Eye */}
                  <motion.rect 
                    x="85" y="50" width="70" height="100" rx="12" 
                    fill="url(#eyeGradient)"
                    animate={{ 
                      height: [100, 95, 100],
                      y: [50, 52, 50]
                    }}
                    transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
                  />
                </motion.g>
                <motion.g
                  animate={{ 
                    scaleY: [1, 1, 0.1, 1, 1],
                    opacity: [1, 1, 0.8, 1, 1]
                  }}
                  transition={{ 
                    repeat: Infinity, 
                    repeatDelay: 3,
                    duration: 0.3,
                    times: [0, 0.4, 0.5, 0.6, 1]
                  }}
                  style={{ transformOrigin: "300px 100px" }}
                >
                  {/* Right Eye */}
                  <motion.rect 
                    x="265" y="50" width="70" height="100" rx="12" 
                    fill="url(#eyeGradient)"
                    animate={{ 
                      height: [100, 95, 100],
                      y: [50, 52, 50]
                    }}
                    transition={{ repeat: Infinity, duration: 4, ease: "easeInOut", delay: 0.5 }}
                  />
                </motion.g>
              </motion.g>
            )}

            {/* HAPPY - Arc eyes with bouncy animation */}
            {expressionType === "happy" && (
              <motion.g filter="url(#neonGlowStrong)">
                <motion.g
                  animate={{ 
                    y: [0, -5, 0],
                    scaleY: [1, 1.1, 1]
                  }}
                  transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
                >
                  {/* Left Eye - Happy arc */}
                  <motion.path 
                    d="M80 110 Q120 50 160 110" 
                    stroke="#00FFFF" 
                    strokeWidth="20" 
                    strokeLinecap="round"
                    fill="none"
                    animate={{
                      d: [
                        "M80 110 Q120 50 160 110",
                        "M80 105 Q120 40 160 105",
                        "M80 110 Q120 50 160 110"
                      ]
                    }}
                    transition={{ repeat: Infinity, duration: 2 }}
                  />
                  {/* Left sparkle */}
                  <motion.circle
                    cx="90" cy="80"
                    r="8"
                    fill="#FFFFFF"
                    animate={{ opacity: [0, 1, 0], scale: [0.5, 1.2, 0.5] }}
                    transition={{ repeat: Infinity, duration: 1.5, delay: 0.2 }}
                  />
                </motion.g>
                <motion.g
                  animate={{ 
                    y: [0, -5, 0],
                    scaleY: [1, 1.1, 1]
                  }}
                  transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut", delay: 0.1 }}
                >
                  {/* Right Eye - Happy arc */}
                  <motion.path 
                    d="M260 110 Q300 50 340 110" 
                    stroke="#00FFFF" 
                    strokeWidth="20" 
                    strokeLinecap="round"
                    fill="none"
                    animate={{
                      d: [
                        "M260 110 Q300 50 340 110",
                        "M260 105 Q300 40 340 105",
                        "M260 110 Q300 50 340 110"
                      ]
                    }}
                    transition={{ repeat: Infinity, duration: 2 }}
                  />
                  {/* Right sparkle */}
                  <motion.circle
                    cx="330" cy="80"
                    r="8"
                    fill="#FFFFFF"
                    animate={{ opacity: [0, 1, 0], scale: [0.5, 1.2, 0.5] }}
                    transition={{ repeat: Infinity, duration: 1.5, delay: 0.5 }}
                  />
                </motion.g>
              </motion.g>
            )}

            {/* SAD - Droopy tilted eyes with tear drops */}
            {expressionType === "sad" && (
              <motion.g filter="url(#neonGlow)">
                <motion.g
                  animate={{ y: [0, 3, 0] }}
                  transition={{ repeat: Infinity, duration: 3 }}
                >
                  {/* Left Eye - sad tilt */}
                  <motion.rect 
                    x="85" y="60" width="65" height="80" rx="10" 
                    fill="url(#eyeGradient)"
                    style={{ transformOrigin: "117px 100px" }}
                    animate={{ rotate: [-12, -15, -12] }}
                    transition={{ repeat: Infinity, duration: 2 }}
                  />
                  {/* Left tear */}
                  <motion.ellipse
                    cx="100" cy="150"
                    rx="8" ry="12"
                    fill="#00BFFF"
                    initial={{ y: -20, opacity: 0 }}
                    animate={{ 
                      y: [0, 40, 80],
                      opacity: [0, 1, 0],
                      scaleY: [0.8, 1.2, 0.6]
                    }}
                    transition={{ repeat: Infinity, duration: 2.5, delay: 0.5 }}
                  />
                </motion.g>
                <motion.g
                  animate={{ y: [0, 3, 0] }}
                  transition={{ repeat: Infinity, duration: 3, delay: 0.3 }}
                >
                  {/* Right Eye - sad tilt */}
                  <motion.rect 
                    x="270" y="60" width="65" height="80" rx="10" 
                    fill="url(#eyeGradient)"
                    style={{ transformOrigin: "302px 100px" }}
                    animate={{ rotate: [12, 15, 12] }}
                    transition={{ repeat: Infinity, duration: 2 }}
                  />
                  {/* Right tear */}
                  <motion.ellipse
                    cx="320" cy="150"
                    rx="8" ry="12"
                    fill="#00BFFF"
                    initial={{ y: -20, opacity: 0 }}
                    animate={{ 
                      y: [0, 40, 80],
                      opacity: [0, 1, 0],
                      scaleY: [0.8, 1.2, 0.6]
                    }}
                    transition={{ repeat: Infinity, duration: 2.5, delay: 1 }}
                  />
                </motion.g>
              </motion.g>
            )}

            {/* ANGRY - Slanted sharp eyes with shake */}
            {expressionType === "angry" && (
              <motion.g 
                filter="url(#neonGlowStrong)"
                animate={{ x: [-2, 2, -2, 0] }}
                transition={{ repeat: Infinity, duration: 0.15 }}
              >
                {/* Left Eye - angry V shape slant */}
                <motion.rect 
                  x="80" y="65" width="75" height="55" rx="6" 
                  fill="url(#eyeGradientRed)"
                  style={{ transformOrigin: "117px 92px" }}
                  animate={{ 
                    rotate: [18, 22, 18],
                    scaleX: [1, 1.05, 1]
                  }}
                  transition={{ repeat: Infinity, duration: 0.3 }}
                />
                {/* Angry vein effect left */}
                <motion.path
                  d="M75 50 L85 70 L78 75"
                  stroke="#FF4444"
                  strokeWidth="4"
                  fill="none"
                  animate={{ opacity: [0.5, 1, 0.5] }}
                  transition={{ repeat: Infinity, duration: 0.5 }}
                />
                
                {/* Right Eye - angry V shape slant */}
                <motion.rect 
                  x="265" y="65" width="75" height="55" rx="6" 
                  fill="url(#eyeGradientRed)"
                  style={{ transformOrigin: "302px 92px" }}
                  animate={{ 
                    rotate: [-18, -22, -18],
                    scaleX: [1, 1.05, 1]
                  }}
                  transition={{ repeat: Infinity, duration: 0.3 }}
                />
                {/* Angry vein effect right */}
                <motion.path
                  d="M345 50 L335 70 L342 75"
                  stroke="#FF4444"
                  strokeWidth="4"
                  fill="none"
                  animate={{ opacity: [0.5, 1, 0.5] }}
                  transition={{ repeat: Infinity, duration: 0.5, delay: 0.1 }}
                />
              </motion.g>
            )}

            {/* SURPRISED - Big expanding circles */}
            {expressionType === "surprised" && (
              <motion.g filter="url(#neonGlowStrong)">
                {/* Left Eye - big surprise */}
                <motion.circle 
                  cx="120" cy="100" r="50" 
                  fill="url(#eyeGradient)"
                  animate={{ 
                    r: [45, 55, 50, 55, 45],
                    opacity: [0.9, 1, 0.9]
                  }}
                  transition={{ repeat: Infinity, duration: 0.8 }}
                />
                {/* Inner highlight */}
                <motion.circle
                  cx="105" cy="85"
                  r="12"
                  fill="white"
                  animate={{ opacity: [0.6, 1, 0.6] }}
                  transition={{ repeat: Infinity, duration: 0.5 }}
                />
                
                {/* Right Eye */}
                <motion.circle 
                  cx="300" cy="100" r="50" 
                  fill="url(#eyeGradient)"
                  animate={{ 
                    r: [45, 55, 50, 55, 45],
                    opacity: [0.9, 1, 0.9]
                  }}
                  transition={{ repeat: Infinity, duration: 0.8, delay: 0.05 }}
                />
                {/* Inner highlight */}
                <motion.circle
                  cx="285" cy="85"
                  r="12"
                  fill="white"
                  animate={{ opacity: [0.6, 1, 0.6] }}
                  transition={{ repeat: Infinity, duration: 0.5, delay: 0.1 }}
                />
                
                {/* Exclamation effect */}
                <motion.text
                  x="205" y="40"
                  fill="#FFFF00"
                  fontSize="28"
                  fontWeight="bold"
                  textAnchor="middle"
                  animate={{ y: [45, 35, 45], opacity: [0, 1, 0] }}
                  transition={{ repeat: Infinity, duration: 1.5 }}
                >!</motion.text>
              </motion.g>
            )}

            {/* WINK - One open, one curved with sparkle */}
            {expressionType === "wink" && (
              <motion.g filter="url(#neonGlow)">
                {/* Left Eye - open with blink */}
                <motion.rect 
                  x="85" y="50" width="70" height="100" rx="12" 
                  fill="url(#eyeGradient)"
                  animate={{ 
                    scaleY: [1, 1, 0.1, 1, 1]
                  }}
                  transition={{ 
                    repeat: Infinity, 
                    repeatDelay: 4,
                    duration: 0.25,
                    times: [0, 0.4, 0.5, 0.6, 1]
                  }}
                  style={{ transformOrigin: "120px 100px" }}
                />
                
                {/* Right Eye - wink curve */}
                <motion.path 
                  d="M260 100 Q300 70 340 100" 
                  stroke="#00FFFF" 
                  strokeWidth="18" 
                  strokeLinecap="round"
                  fill="none"
                  animate={{
                    d: [
                      "M260 100 Q300 70 340 100",
                      "M260 95 Q300 65 340 95",
                      "M260 100 Q300 70 340 100"
                    ]
                  }}
                  transition={{ repeat: Infinity, duration: 1 }}
                />
                
                {/* Sparkle star near wink */}
                <motion.g
                  animate={{ rotate: 360, scale: [0.8, 1.2, 0.8] }}
                  transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
                  style={{ transformOrigin: "355px 75px" }}
                >
                  <motion.path
                    d="M355 65 L358 73 L367 73 L360 79 L363 88 L355 82 L347 88 L350 79 L343 73 L352 73 Z"
                    fill="#FFFF00"
                    animate={{ opacity: [0.5, 1, 0.5] }}
                    transition={{ repeat: Infinity, duration: 0.8 }}
                  />
                </motion.g>
              </motion.g>
            )}

            {/* TIRED - Heavy droopy half-closed eyes */}
            {expressionType === "tired" && (
              <motion.g 
                filter="url(#neonGlow)"
                animate={{ y: [0, 3, 0] }}
                transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
              >
                {/* Left Eye - half closed */}
                <motion.path 
                  d="M80 85 Q120 70 160 85 L160 120 Q120 140 80 120 Z" 
                  fill="url(#eyeGradient)" 
                  opacity="0.7"
                  animate={{
                    d: [
                      "M80 85 Q120 70 160 85 L160 120 Q120 140 80 120 Z",
                      "M80 90 Q120 75 160 90 L160 115 Q120 135 80 115 Z",
                      "M80 85 Q120 70 160 85 L160 120 Q120 140 80 120 Z"
                    ]
                  }}
                  transition={{ repeat: Infinity, duration: 4 }}
                />
                {/* Eyelid line */}
                <motion.path
                  d="M80 85 Q120 70 160 85"
                  stroke="#00CED1"
                  strokeWidth="6"
                  fill="none"
                />
                
                {/* Right Eye - half closed */}
                <motion.path 
                  d="M260 85 Q300 70 340 85 L340 120 Q300 140 260 120 Z" 
                  fill="url(#eyeGradient)" 
                  opacity="0.7"
                  animate={{
                    d: [
                      "M260 85 Q300 70 340 85 L340 120 Q300 140 260 120 Z",
                      "M260 90 Q300 75 340 90 L340 115 Q300 135 260 115 Z",
                      "M260 85 Q300 70 340 85 L340 120 Q300 140 260 120 Z"
                    ]
                  }}
                  transition={{ repeat: Infinity, duration: 4, delay: 0.5 }}
                />
                <motion.path
                  d="M260 85 Q300 70 340 85"
                  stroke="#00CED1"
                  strokeWidth="6"
                  fill="none"
                />
                
                {/* Z animation */}
                <motion.text
                  x="370" y="70"
                  fill="#00FFFF"
                  fontSize="24"
                  fontWeight="bold"
                  initial={{ opacity: 0, x: 360 }}
                  animate={{ 
                    opacity: [0, 1, 1, 0],
                    x: [360, 375, 390, 400],
                    y: [80, 65, 50, 40]
                  }}
                  transition={{ repeat: Infinity, duration: 3 }}
                >z</motion.text>
                <motion.text
                  x="385" y="55"
                  fill="#00FFFF"
                  fontSize="20"
                  fontWeight="bold"
                  animate={{ 
                    opacity: [0, 0, 1, 1, 0],
                    x: [380, 385, 395, 410, 420],
                    y: [65, 55, 45, 35, 25]
                  }}
                  transition={{ repeat: Infinity, duration: 3, delay: 0.5 }}
                >z</motion.text>
              </motion.g>
            )}

            {/* SLEEPY - Thin closing eyes */}
            {expressionType === "sleepy" && (
              <motion.g 
                filter="url(#neonGlow)"
                animate={{ opacity: [0.5, 0.8, 0.5] }}
                transition={{ repeat: Infinity, duration: 3 }}
              >
                {/* Left Eye - nearly closed */}
                <motion.rect 
                  x="80" y="92" width="80" height="16" rx="8" 
                  fill="url(#eyeGradient)" 
                  animate={{
                    height: [16, 8, 16],
                    y: [92, 96, 92]
                  }}
                  transition={{ repeat: Infinity, duration: 4 }}
                />
                
                {/* Right Eye */}
                <motion.rect 
                  x="260" y="92" width="80" height="16" rx="8" 
                  fill="url(#eyeGradient)"
                  animate={{
                    height: [16, 8, 16],
                    y: [92, 96, 92]
                  }}
                  transition={{ repeat: Infinity, duration: 4, delay: 0.3 }}
                />
                
                {/* Sleepy particles */}
                {[0, 1, 2].map(i => (
                  <motion.circle
                    key={i}
                    cx={370 + i * 15}
                    cy={60 - i * 20}
                    r={4 - i}
                    fill="#00FFFF"
                    animate={{ 
                      opacity: [0, 0.8, 0],
                      y: [-10, -30, -50]
                    }}
                    transition={{ repeat: Infinity, duration: 2.5, delay: i * 0.4 }}
                  />
                ))}
              </motion.g>
            )}

            {/* SMILE - Gentle curved happy eyes */}
            {expressionType === "smile" && (
              <motion.g filter="url(#neonGlow)">
                <motion.g
                  animate={{ scaleY: [1, 0.95, 1] }}
                  transition={{ repeat: Infinity, repeatDelay: 3, duration: 0.3 }}
                  style={{ transformOrigin: "120px 100px" }}
                >
                  {/* Left Eye - smile arc */}
                  <motion.path 
                    d="M80 110 Q120 60 160 110" 
                    stroke="#00FFFF" 
                    strokeWidth="16" 
                    strokeLinecap="round"
                    fill="none"
                    animate={{
                      strokeWidth: [16, 18, 16]
                    }}
                    transition={{ repeat: Infinity, duration: 2 }}
                  />
                </motion.g>
                <motion.g
                  animate={{ scaleY: [1, 0.95, 1] }}
                  transition={{ repeat: Infinity, repeatDelay: 3, duration: 0.3, delay: 0.1 }}
                  style={{ transformOrigin: "300px 100px" }}
                >
                  {/* Right Eye - smile arc */}
                  <motion.path 
                    d="M260 110 Q300 60 340 110" 
                    stroke="#00FFFF" 
                    strokeWidth="16" 
                    strokeLinecap="round"
                    fill="none"
                    animate={{
                      strokeWidth: [16, 18, 16]
                    }}
                    transition={{ repeat: Infinity, duration: 2, delay: 0.2 }}
                  />
                </motion.g>
              </motion.g>
            )}

            {/* LAUGH - Big happy curved eyes with bounce */}
            {expressionType === "laugh" && (
              <motion.g 
                filter="url(#neonGlowStrong)"
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ repeat: Infinity, duration: 0.4 }}
              >
                {/* Left Eye - big curve */}
                <motion.path 
                  d="M70 115 Q120 45 170 115" 
                  stroke="#00FFFF" 
                  strokeWidth="22" 
                  strokeLinecap="round"
                  fill="none"
                  animate={{
                    d: [
                      "M70 115 Q120 45 170 115",
                      "M70 110 Q120 35 170 110",
                      "M70 115 Q120 45 170 115"
                    ]
                  }}
                  transition={{ repeat: Infinity, duration: 0.5 }}
                />
                
                {/* Right Eye - big curve */}
                <motion.path 
                  d="M250 115 Q300 45 350 115" 
                  stroke="#00FFFF" 
                  strokeWidth="22" 
                  strokeLinecap="round"
                  fill="none"
                  animate={{
                    d: [
                      "M250 115 Q300 45 350 115",
                      "M250 110 Q300 35 350 110",
                      "M250 115 Q300 45 350 115"
                    ]
                  }}
                  transition={{ repeat: Infinity, duration: 0.5, delay: 0.05 }}
                />
                
                {/* Joy particles */}
                {[0, 1, 2, 3].map(i => (
                  <motion.circle
                    key={i}
                    cx={80 + i * 90}
                    cy={50}
                    r="6"
                    fill="#FFFF00"
                    animate={{ 
                      y: [-20, -40, -20],
                      opacity: [0, 1, 0],
                      scale: [0.5, 1, 0.5]
                    }}
                    transition={{ repeat: Infinity, duration: 1, delay: i * 0.2 }}
                  />
                ))}
              </motion.g>
            )}

            {/* CONFUSED - Asymmetric tilted eyes with question mark */}
            {expressionType === "confused" && (
              <motion.g filter="url(#neonGlow)">
                {/* Left Eye - normal */}
                <motion.rect 
                  x="85" y="60" width="65" height="80" rx="10" 
                  fill="url(#eyeGradient)"
                  animate={{ 
                    rotate: [0, -5, 0, 5, 0]
                  }}
                  transition={{ repeat: Infinity, duration: 2 }}
                  style={{ transformOrigin: "117px 100px" }}
                />
                
                {/* Right Eye - tilted and higher */}
                <motion.rect 
                  x="270" y="50" width="65" height="80" rx="10" 
                  fill="url(#eyeGradient)"
                  animate={{ 
                    rotate: [-15, -10, -15]
                  }}
                  transition={{ repeat: Infinity, duration: 1.5 }}
                  style={{ transformOrigin: "302px 90px" }}
                />
                
                {/* Question mark */}
                <motion.text
                  x="355" y="85"
                  fill="#FFFF00"
                  fontSize="40"
                  fontWeight="bold"
                  animate={{ 
                    rotate: [-10, 10, -10],
                    y: [85, 75, 85]
                  }}
                  transition={{ repeat: Infinity, duration: 1.5 }}
                >?</motion.text>
              </motion.g>
            )}

            {/* RELIEVED - Peaceful closed eyes with sparkles */}
            {expressionType === "relieved" && (
              <motion.g 
                filter="url(#neonGlow)"
                animate={{ opacity: [0.8, 1, 0.8] }}
                transition={{ repeat: Infinity, duration: 3 }}
              >
                {/* Left Eye - peaceful curve */}
                <motion.path 
                  d="M80 100 Q120 85 160 100" 
                  stroke="#00FFFF" 
                  strokeWidth="14" 
                  strokeLinecap="round"
                  fill="none"
                  animate={{
                    d: [
                      "M80 100 Q120 85 160 100",
                      "M80 98 Q120 80 160 98",
                      "M80 100 Q120 85 160 100"
                    ]
                  }}
                  transition={{ repeat: Infinity, duration: 4 }}
                />
                
                {/* Right Eye */}
                <motion.path 
                  d="M260 100 Q300 85 340 100" 
                  stroke="#00FFFF" 
                  strokeWidth="14" 
                  strokeLinecap="round"
                  fill="none"
                  animate={{
                    d: [
                      "M260 100 Q300 85 340 100",
                      "M260 98 Q300 80 340 98",
                      "M260 100 Q300 85 340 100"
                    ]
                  }}
                  transition={{ repeat: Infinity, duration: 4, delay: 0.3 }}
                />
                
                {/* Peaceful sparkles */}
                <motion.circle
                  cx="50" cy="90" r="5"
                  fill="#FFFFFF"
                  animate={{ opacity: [0, 1, 0], scale: [0.5, 1, 0.5] }}
                  transition={{ repeat: Infinity, duration: 2 }}
                />
                <motion.circle
                  cx="370" cy="90" r="5"
                  fill="#FFFFFF"
                  animate={{ opacity: [0, 1, 0], scale: [0.5, 1, 0.5] }}
                  transition={{ repeat: Infinity, duration: 2, delay: 0.5 }}
                />
              </motion.g>
            )}

            {/* ENERGIZED - Glowing power eyes with lightning */}
            {expressionType === "energized" && (
              <motion.g 
                filter="url(#neonGlowStrong)"
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ repeat: Infinity, duration: 0.3 }}
              >
                {/* Left Eye - power glow */}
                <motion.rect 
                  x="80" y="45" width="80" height="110" rx="14" 
                  fill="url(#eyeGradientGreen)"
                  animate={{ 
                    opacity: [0.85, 1, 0.85],
                    height: [110, 115, 110]
                  }}
                  transition={{ repeat: Infinity, duration: 0.4 }}
                />
                
                {/* Right Eye */}
                <motion.rect 
                  x="260" y="45" width="80" height="110" rx="14" 
                  fill="url(#eyeGradientGreen)"
                  animate={{ 
                    opacity: [0.85, 1, 0.85],
                    height: [110, 115, 110]
                  }}
                  transition={{ repeat: Infinity, duration: 0.4, delay: 0.1 }}
                />
                
                {/* Lightning bolts */}
                <motion.path
                  d="M55 50 L70 85 L60 85 L75 130"
                  stroke="#FFFF00"
                  strokeWidth="6"
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  animate={{ opacity: [0.5, 1, 0.5] }}
                  transition={{ repeat: Infinity, duration: 0.2 }}
                />
                <motion.path
                  d="M365 50 L350 85 L360 85 L345 130"
                  stroke="#FFFF00"
                  strokeWidth="6"
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  animate={{ opacity: [0.5, 1, 0.5] }}
                  transition={{ repeat: Infinity, duration: 0.2, delay: 0.1 }}
                />
                
                {/* Electric sparks */}
                {[0, 1, 2, 3].map(i => (
                  <motion.circle
                    key={i}
                    cx={45 + i * 110}
                    cy={70 + (i % 2) * 30}
                    r="4"
                    fill="#FFFF00"
                    animate={{ 
                      opacity: [0, 1, 0],
                      scale: [0.5, 1.5, 0.5]
                    }}
                    transition={{ repeat: Infinity, duration: 0.4, delay: i * 0.1 }}
                  />
                ))}
              </motion.g>
            )}

            {/* SPARKLE - Star/diamond shaped eyes with rotation */}
            {expressionType === "sparkle" && (
              <motion.g 
                filter="url(#neonGlowStrong)"
              >
                {/* Left Eye - rotating diamond */}
                <motion.path 
                  d="M120 45 L155 100 L120 155 L85 100 Z" 
                  fill="url(#eyeGradient)"
                  animate={{ rotate: [0, 360] }}
                  transition={{ repeat: Infinity, duration: 4, ease: "linear" }}
                  style={{ transformOrigin: "120px 100px" }}
                />
                {/* Inner sparkle */}
                <motion.circle
                  cx="120" cy="100" r="15"
                  fill="#FFFFFF"
                  animate={{ scale: [0.8, 1.2, 0.8], opacity: [0.7, 1, 0.7] }}
                  transition={{ repeat: Infinity, duration: 0.8 }}
                />
                
                {/* Right Eye - rotating diamond */}
                <motion.path 
                  d="M300 45 L335 100 L300 155 L265 100 Z" 
                  fill="url(#eyeGradient)"
                  animate={{ rotate: [0, -360] }}
                  transition={{ repeat: Infinity, duration: 4, ease: "linear" }}
                  style={{ transformOrigin: "300px 100px" }}
                />
                <motion.circle
                  cx="300" cy="100" r="15"
                  fill="#FFFFFF"
                  animate={{ scale: [0.8, 1.2, 0.8], opacity: [0.7, 1, 0.7] }}
                  transition={{ repeat: Infinity, duration: 0.8, delay: 0.2 }}
                />
                
                {/* Floating stars around */}
                {[0, 1, 2, 3, 4, 5].map(i => (
                  <motion.path
                    key={i}
                    d={`M${50 + i * 65} ${40 + (i % 2) * 120} l3 8 l8 0 l-6 5 l2 8 l-7 -5 l-7 5 l2 -8 l-6 -5 l8 0 z`}
                    fill="#FFFFFF"
                    animate={{ 
                      opacity: [0, 1, 0],
                      scale: [0.5, 1.2, 0.5],
                      rotate: [0, 180, 360]
                    }}
                    transition={{ repeat: Infinity, duration: 2, delay: i * 0.3 }}
                    style={{ transformOrigin: `${50 + i * 65}px ${40 + (i % 2) * 120}px` }}
                  />
                ))}
              </motion.g>
            )}

            {/* DIZZY - Spinning X eyes */}
            {expressionType === "dizzy" && (
              <motion.g 
                filter="url(#neonGlow)"
                animate={{ rotate: [0, 5, -5, 0] }}
                transition={{ repeat: Infinity, duration: 0.5 }}
                style={{ transformOrigin: "210px 100px" }}
              >
                {/* Left Eye - spinning X */}
                <motion.g
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
                  style={{ transformOrigin: "120px 100px" }}
                >
                  <path d="M85 65 L155 135" stroke="#00FFFF" strokeWidth="16" strokeLinecap="round" />
                  <path d="M155 65 L85 135" stroke="#00FFFF" strokeWidth="16" strokeLinecap="round" />
                </motion.g>
                
                {/* Right Eye - spinning X opposite */}
                <motion.g
                  animate={{ rotate: -360 }}
                  transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
                  style={{ transformOrigin: "300px 100px" }}
                >
                  <path d="M265 65 L335 135" stroke="#00FFFF" strokeWidth="16" strokeLinecap="round" />
                  <path d="M335 65 L265 135" stroke="#00FFFF" strokeWidth="16" strokeLinecap="round" />
                </motion.g>
                
                {/* Dizzy stars */}
                {[0, 1, 2].map(i => (
                  <motion.text
                    key={i}
                    x={170 + i * 40}
                    y={40}
                    fill="#FFFF00"
                    fontSize="20"
                    animate={{ 
                      rotate: [0, 360],
                      y: [40, 30, 40]
                    }}
                    transition={{ repeat: Infinity, duration: 1, delay: i * 0.2 }}
                  >★</motion.text>
                ))}
              </motion.g>
            )}

            {/* BROKEN - Static X eyes with flicker */}
            {expressionType === "broken" && (
              <motion.g 
                filter="url(#neonGlow)"
                animate={{ opacity: [1, 0.3, 1, 0.5, 1] }}
                transition={{ repeat: Infinity, duration: 0.5 }}
              >
                {/* Left Eye - X error */}
                <path d="M85 65 L155 135" stroke="#FF4444" strokeWidth="16" strokeLinecap="round" />
                <path d="M155 65 L85 135" stroke="#FF4444" strokeWidth="16" strokeLinecap="round" />
                
                {/* Right Eye - X error */}
                <path d="M265 65 L335 135" stroke="#FF4444" strokeWidth="16" strokeLinecap="round" />
                <path d="M335 65 L265 135" stroke="#FF4444" strokeWidth="16" strokeLinecap="round" />
                
                {/* Error text */}
                <motion.text
                  x="210" y="180"
                  fill="#FF4444"
                  fontSize="16"
                  textAnchor="middle"
                  fontFamily="monospace"
                  animate={{ opacity: [0, 1, 0] }}
                  transition={{ repeat: Infinity, duration: 1 }}
                >ERROR</motion.text>
              </motion.g>
            )}

            {/* SCEPTIC - One squint, one normal */}
            {expressionType === "sceptic" && (
              <motion.g filter="url(#neonGlow)">
                {/* Left Eye - squinted */}
                <motion.rect 
                  x="80" y="88" width="80" height="24" rx="12" 
                  fill="url(#eyeGradient)"
                  animate={{ 
                    height: [24, 18, 24],
                    y: [88, 91, 88]
                  }}
                  transition={{ repeat: Infinity, duration: 2 }}
                />
                
                {/* Right Eye - normal but raised eyebrow effect */}
                <motion.rect 
                  x="260" y="55" width="75" height="90" rx="12" 
                  fill="url(#eyeGradient)"
                  animate={{ 
                    y: [55, 50, 55]
                  }}
                  transition={{ repeat: Infinity, duration: 2 }}
                />
                
                {/* Raised eyebrow line */}
                <motion.path
                  d="M255 45 Q297 35 345 50"
                  stroke="#00FFFF"
                  strokeWidth="6"
                  fill="none"
                  strokeLinecap="round"
                  animate={{ d: ["M255 45 Q297 35 345 50", "M255 40 Q297 28 345 45", "M255 45 Q297 35 345 50"] }}
                  transition={{ repeat: Infinity, duration: 2 }}
                />
              </motion.g>
            )}

            {/* CRAZY - Pulsing ring eyes */}
            {expressionType === "crazy" && (
              <motion.g 
                filter="url(#neonGlowStrong)"
                animate={{ scale: [1, 1.08, 1] }}
                transition={{ repeat: Infinity, duration: 0.2 }}
              >
                {/* Left Eye - crazy rings */}
                <motion.circle 
                  cx="120" cy="100" r="50" 
                  stroke="#FF00FF" 
                  strokeWidth="12" 
                  fill="none"
                  animate={{ r: [45, 55, 45] }}
                  transition={{ repeat: Infinity, duration: 0.3 }}
                />
                <motion.circle 
                  cx="120" cy="100" r="25" 
                  fill="#FF00FF"
                  animate={{ r: [20, 30, 20] }}
                  transition={{ repeat: Infinity, duration: 0.3 }}
                />
                
                {/* Right Eye */}
                <motion.circle 
                  cx="300" cy="100" r="50" 
                  stroke="#FF00FF" 
                  strokeWidth="12" 
                  fill="none"
                  animate={{ r: [45, 55, 45] }}
                  transition={{ repeat: Infinity, duration: 0.3, delay: 0.1 }}
                />
                <motion.circle 
                  cx="300" cy="100" r="25" 
                  fill="#FF00FF"
                  animate={{ r: [20, 30, 20] }}
                  transition={{ repeat: Infinity, duration: 0.3, delay: 0.1 }}
                />
                
                {/* Crazy particles */}
                {[0, 1, 2, 3, 4, 5].map(i => (
                  <motion.circle
                    key={i}
                    cx={60 + i * 60}
                    cy={50 + (i % 2) * 100}
                    r="6"
                    fill="#FF00FF"
                    animate={{ 
                      opacity: [0, 1, 0],
                      scale: [0.5, 1.5, 0.5],
                      y: [0, -20, 0]
                    }}
                    transition={{ repeat: Infinity, duration: 0.5, delay: i * 0.1 }}
                  />
                ))}
              </motion.g>
            )}

            {/* LOVE - Pulsing heart eyes */}
            {expressionType === "love" && (
              <motion.g 
                filter="url(#neonGlowStrong)"
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ repeat: Infinity, duration: 0.8, ease: "easeInOut" }}
              >
                {/* Left Heart */}
                <motion.path 
                  d="M120 70 C95 45 55 75 85 115 L120 150 L155 115 C185 75 145 45 120 70" 
                  fill="url(#eyeGradientPink)"
                  animate={{
                    d: [
                      "M120 70 C95 45 55 75 85 115 L120 150 L155 115 C185 75 145 45 120 70",
                      "M120 65 C90 35 45 70 80 115 L120 155 L160 115 C195 70 150 35 120 65",
                      "M120 70 C95 45 55 75 85 115 L120 150 L155 115 C185 75 145 45 120 70"
                    ]
                  }}
                  transition={{ repeat: Infinity, duration: 0.8 }}
                />
                
                {/* Right Heart */}
                <motion.path 
                  d="M300 70 C275 45 235 75 265 115 L300 150 L335 115 C365 75 325 45 300 70" 
                  fill="url(#eyeGradientPink)"
                  animate={{
                    d: [
                      "M300 70 C275 45 235 75 265 115 L300 150 L335 115 C365 75 325 45 300 70",
                      "M300 65 C270 35 225 70 260 115 L300 155 L340 115 C375 70 330 35 300 65",
                      "M300 70 C275 45 235 75 265 115 L300 150 L335 115 C365 75 325 45 300 70"
                    ]
                  }}
                  transition={{ repeat: Infinity, duration: 0.8, delay: 0.1 }}
                />
                
                {/* Floating hearts */}
                {[0, 1, 2].map(i => (
                  <motion.text
                    key={i}
                    x={150 + i * 60}
                    y={30}
                    fill="#FF69B4"
                    fontSize="18"
                    animate={{ 
                      y: [40, 10, 40],
                      opacity: [0, 1, 0],
                      scale: [0.5, 1, 0.5]
                    }}
                    transition={{ repeat: Infinity, duration: 2, delay: i * 0.4 }}
                  >♥</motion.text>
                ))}
              </motion.g>
            )}

            {/* DENYING - Shaking angle eyes */}
            {expressionType === "denying" && (
              <motion.g 
                filter="url(#neonGlow)"
                animate={{ x: [-8, 8, -8] }}
                transition={{ repeat: Infinity, duration: 0.15 }}
              >
                {/* Left Eye - > shape */}
                <motion.path 
                  d="M85 70 L130 100 L85 130" 
                  stroke="#00FFFF" 
                  strokeWidth="18" 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  fill="none"
                />
                
                {/* Right Eye - < shape */}
                <motion.path 
                  d="M335 70 L290 100 L335 130" 
                  stroke="#00FFFF" 
                  strokeWidth="18" 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  fill="none"
                />
              </motion.g>
            )}

          </motion.svg>
        </AnimatePresence>
      </div>
      <LanguageToggle />
      <MuteAllButton />
    </ScreenLayout>
  );
};
