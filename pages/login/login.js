/**
 * ============================================================================
 * BRIDGEWAY AUTHENTICATION & PHYSICS BADGE ENGINE (login.js)
 * ============================================================================
 * Features:
 * 1. 3D Damped-Spring Pendulum Physics Simulation
 * 2. Dynamic Curving SVG Lanyard Follow-Through & Swivel Clip
 * 3. 3D Tilt, Parallax & Specular Glare Tracking
 * 4. Drop-In Entrance Animation on Load
 * 5. Interactive Mouse Drag & Restitution Release Impulse
 * 6. 3D Card Flip on Password Focus & Padlock Shackle Lift on Visibility Toggle
 * 7. Error Shake Kick with Red Edge Glow
 * 8. 4-Tier Role Switcher (Student, Supervisor, Company, Admin)
 * 9. Coherent Dark / Light Theme Sync
 * ============================================================================
 */
(function () {
  'use strict';
  // CONFIGURATION & DOM REFERENCES
  const CONFIG = {
    idleSwayDeg: 0.8,
    idleSwayPeriodS: 6,
    tiltMaxDeg: 8,
    tiltLerp: 0.08,
    springK: 12,
    springC: 2.0,
    followK: 9,
    followC: 1.6,
    dragMaxDeg: 25,
    dropMs: 1000,
    parallaxPx: 6,
    floatPx: 4,
    floatPeriodS: 7,
    swingSign: -1
  };
  const SWING_SIGN = CONFIG.swingSign;

  // DOM Elements — Badge Physics
  const badgePanel = document.querySelector('.lb-badge-panel');
  const badgeAssembly = document.getElementById('badgeAssembly');
  const badgeTilt = document.getElementById('badgeTilt');
  const badgeCard = document.getElementById('badgeCard');
  const badgeShadow = document.getElementById('badgeShadow');
  const badgeName = document.getElementById('badgeName');
  const badgeRole = document.getElementById('badgeRole');
  const badgeInitials = document.getElementById('badgeInitials');
  const badgeIdSerial = document.getElementById('badgeIdSerial');
  const lanyardLeftStrap = document.getElementById('lanyardLeftStrap');
  const lanyardRightStrap = document.getElementById('lanyardRightStrap');
  const lanyardClip = document.getElementById('lanyardClip');
  const padlockShackle = document.getElementById('padlockShackle');

  // DOM Elements — Form & Roles
  const loginForm = document.getElementById('hrLoginForm');
  const emailInput = document.getElementById('loginEmail');
  const emailLabel = document.getElementById('loginEmailLabel');
  const emailHint = document.getElementById('loginEmailHint');
  const passwordInput = document.getElementById('loginPassword');
  const togglePasswordBtn = document.getElementById('togglePasswordBtn');
  const toggleIcon = document.getElementById('toggleIcon');
  const emailError = document.getElementById('emailError');
  const passwordError = document.getElementById('passwordError');
  const loginSubmitBtn = document.getElementById('loginSubmitBtn');
  const loginSubmitBtnText = document.getElementById('loginSubmitBtnText');
  const loginToast = document.getElementById('loginToast');
  const loginToastMsg = document.getElementById('loginToastMsg');

  if (!badgePanel || !badgeAssembly || !badgeCard) return;

  // Media Query Checks
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
  const phoneLayout = window.matchMedia('(max-width: 767px)');

  // 5 Role Definitions & Metadata
  const ROLES = {
    student: {
      key: 'student',
      title: 'Student',
      label: 'Student Institutional Email',
      hint: 'Domain: <code>bau.edu.jo</code> or <code>oca.jo</code>',
      defaultEmail: 'student@bau.edu.jo',
      btnText: 'Sign In as Student',
      badgeName: 'Ghaith Al-Student',
      badgeRole: 'Student Intern • Al-Balqa Applied Univ.',
      badgeInitials: 'GA',
      badgeSerial: '#STU-2026-BAU',
      avatarBg: 'linear-gradient(135deg, #2563EB, #1D4ED8)'
    },
    supervisor: {
      key: 'supervisor',
      title: 'Supervisor',
      label: 'Academic Supervisor Institutional Email',
      hint: 'Domain: <code>bau.edu.jo</code> (Faculty of IT)',
      defaultEmail: 'dr.ahmad@bau.edu.jo',
      btnText: 'Sign In as Supervisor',
      badgeName: 'Dr. Ahmad S.',
      badgeRole: 'Academic Supervisor • SE Dept',
      badgeInitials: 'AS',
      badgeSerial: '#SUP-2026-OCA',
      avatarBg: 'linear-gradient(135deg, #059669, #047857)'
    },
    company: {
      key: 'company',
      title: 'Partner Company',
      label: 'Corporate HR / Mentor Email',
      hint: 'Domain: <code>techcorp.com</code> / Partner Org',
      defaultEmail: 'hr@techcorp.com',
      btnText: 'Sign In as Partner Company',
      badgeName: 'Tech Corp HR',
      badgeRole: 'Host Partner • Tech Corp Inc.',
      badgeInitials: 'TC',
      badgeSerial: '#CMP-2026-TC',
      avatarBg: 'linear-gradient(135deg, #4F46E5, #3730A3)'
    },
    platform_admin: {
      key: 'platform_admin', title: 'Platform Admin', label: 'Platform Administrator Email',
      hint: 'Platform account provided by Bridgeway', defaultEmail: 'platform@bridgeway.edu',
      btnText: 'Sign In as Platform Admin', badgeName: 'Platform Admin',
      badgeRole: 'Bridgeway Platform Administration', badgeInitials: 'PA',
      badgeSerial: '#PLT-2026-001', avatarBg: 'linear-gradient(135deg, #4338CA, #6366F1)'
    },
    admin: {
      key: 'admin',
      title: 'College Admin',
      label: 'University Administrator Email',
      hint: 'Domain: <code>uni.edu</code> or <code>bau.edu.jo</code>',
      defaultEmail: 'admin@uni.edu',
      btnText: 'Sign In as Administrator',
      badgeName: 'College Admin',
      badgeRole: 'College Administration',
      badgeInitials: 'UA',
      badgeSerial: '#ADM-2026-001',
      avatarBg: 'linear-gradient(135deg, #4338CA, #6366F1)'
    }
  };

  let activeRole = 'student';
  let pending = false;
  // PHYSICS SIMULATION STATE
  let angle = 0;              // Badge pendulum angle (deg, capped ±10°)
  let velocity = 0;           // Badge angular velocity (deg/s, capped ±30 deg/s)
  let lanyardAngle = 0;       // Lanyard follow angle
  let lanyardVelocity = 0;    // Lanyard follow velocity
  let tiltX = 0;
  let tiltY = 0;
  let targetTiltX = 0;
  let targetTiltY = 0;
  let parallaxX = 0;
  let parallaxY = 0;
  let targetParallaxX = 0;
  let targetParallaxY = 0;

  const fixedDt = 1 / 60;
  let isDragging = false;
  let isPointerOverPanel = false;
  let isFirstSample = false;
  let lastPointerX = 0;
  let lastPointerY = 0;
  let lastPointerTime = performance.now();
  let smoothedVx = 0;

  let cachedPivotX = 0;
  let cachedPivotY = 0;
  let cachedPanelCenterX = 0;
  let cachedPanelCenterY = 0;
  let cachedPanelHalfWidth = 1;
  let cachedPanelHalfHeight = 1;

  let rafId = null;
  let isLoopActive = false;

  // Cached Geometry Updates
  function updateCachedMetrics() {
    if (!badgeAssembly || !badgePanel) return;
    const panelRect = badgePanel.getBoundingClientRect();
    const assemblyRect = badgeAssembly.getBoundingClientRect();

    cachedPivotX = assemblyRect.left + assemblyRect.width / 2;
    cachedPivotY = assemblyRect.top;

    cachedPanelCenterX = panelRect.left + panelRect.width / 2;
    cachedPanelCenterY = panelRect.top + panelRect.height / 2;
    cachedPanelHalfWidth = panelRect.width / 2 || 1;
    cachedPanelHalfHeight = panelRect.height / 2 || 1;
  }

  if (window.ResizeObserver) {
    const ro = new ResizeObserver(updateCachedMetrics);
    ro.observe(badgePanel);
    ro.observe(badgeAssembly);
  }
  window.addEventListener('resize', updateCachedMetrics, { passive: true });
  window.addEventListener('scroll', updateCachedMetrics, { passive: true });
  updateCachedMetrics();
  // LANYARD SVG PATH GENERATOR
  function updateLanyardVisual(currentLanyardAngle) {
    if (!lanyardLeftStrap || !lanyardRightStrap || !lanyardClip) return;
    const anchorCenterX = 200;
    const anchorY = 0;
    const leftAnchorX = anchorCenterX - 48;
    const rightAnchorX = anchorCenterX + 48;

    const swingDeg = SWING_SIGN * currentLanyardAngle;
    const length = 98;
    const rad = (swingDeg * Math.PI) / 180;
    const clipX = anchorCenterX + length * Math.sin(rad);
    const clipY = length * Math.cos(rad);

    const midY = clipY * 0.52;
    const bendOffset = swingDeg * 0.35;

    const leftD = `M ${leftAnchorX} ${anchorY} Q ${anchorCenterX - 24 + bendOffset} ${midY} ${clipX - 4} ${clipY}`;
    const rightD = `M ${rightAnchorX} ${anchorY} Q ${anchorCenterX + 24 + bendOffset} ${midY} ${clipX + 4} ${clipY}`;

    lanyardLeftStrap.setAttribute('d', leftD);
    lanyardRightStrap.setAttribute('d', rightD);
    lanyardClip.setAttribute('transform', `translate(${clipX.toFixed(1)}, ${clipY.toFixed(1)}) rotate(${swingDeg.toFixed(1)})`);
  }
  // PHYSICS SIMULATION LOOP
  function tickPhysics() {
    if (document.hidden || phoneLayout.matches || prefersReducedMotion.matches) {
      isLoopActive = false;
      return;
    }

    if (!isDragging) {
      // 1. Primary Damped Spring Pendulum
      const acceleration = -CONFIG.springK * angle - CONFIG.springC * velocity;
      velocity += acceleration * fixedDt;
      angle += velocity * fixedDt;
      velocity = Math.max(-30, Math.min(30, velocity));
      angle = Math.max(-10, Math.min(10, angle));
    }

    // 2. Lanyard Follow-Through Spring
    const followAccel = -CONFIG.followK * (lanyardAngle - angle) - CONFIG.followC * lanyardVelocity;
    lanyardVelocity += followAccel * fixedDt;
    lanyardAngle += lanyardVelocity * fixedDt;

    // 3. 3D Tilt Gliding
    tiltX += (targetTiltX - tiltX) * CONFIG.tiltLerp;
    tiltY += (targetTiltY - tiltY) * CONFIG.tiltLerp;

    // 4. Parallax Shift
    parallaxX += (targetParallaxX - parallaxX) * CONFIG.tiltLerp;
    parallaxY += (targetParallaxY - parallaxY) * CONFIG.tiltLerp;

    if (badgePanel) {
      badgePanel.style.setProperty('--p-x', `${parallaxX.toFixed(2)}px`);
      badgePanel.style.setProperty('--p-y', `${parallaxY.toFixed(2)}px`);
    }

    // 5. Update Soft Elliptical Shadow
    if (badgeShadow) {
      const normX = targetTiltY / CONFIG.tiltMaxDeg;
      const normY = -targetTiltX / CONFIG.tiltMaxDeg;
      const shadowX = -normX * 10;
      const shadowY = -normY * 6;
      const shadowBlur = 8 + (Math.abs(normX) + Math.abs(normY)) * 2;
      const shadowScale = 1 + (Math.abs(normX) + Math.abs(normY)) * 0.05;
      badgeShadow.style.transform = `translate(${shadowX.toFixed(1)}px, ${shadowY.toFixed(1)}px) scale(${shadowScale.toFixed(2)})`;
      badgeShadow.style.filter = `blur(${shadowBlur.toFixed(1)}px)`;
    }

    // 6. Apply Layered Transforms
    if (!prefersReducedMotion.matches) {
      badgeAssembly.style.transform = `rotate(${angle.toFixed(2)}deg)`;
      if (badgeTilt) {
        badgeTilt.style.transform = (tiltX === 0 && tiltY === 0)
          ? ''
          : `rotateX(${tiltX.toFixed(2)}deg) rotateY(${tiltY.toFixed(2)}deg)`;
      }
      updateLanyardVisual(lanyardAngle);
    }

    // 7. Stop Condition
    const isPhysicsSettled = Math.abs(angle) < 0.05 && Math.abs(velocity) < 0.5;
    const isLanyardSettled = Math.abs(lanyardAngle - angle) < 0.05 && Math.abs(lanyardVelocity) < 0.5;
    const isTiltSettled = Math.abs(targetTiltX - tiltX) < 0.05 && Math.abs(targetTiltY - tiltY) < 0.05;
    const isParallaxSettled = Math.abs(targetParallaxX - parallaxX) < 0.08 && Math.abs(targetParallaxY - parallaxY) < 0.08;
    const isPointerIdle = (performance.now() - lastPointerTime) > 80;

    if (!isDragging && isPhysicsSettled && isLanyardSettled && isTiltSettled && isParallaxSettled && (!isPointerOverPanel || isPointerIdle)) {
      angle = 0;
      velocity = 0;
      lanyardAngle = 0;
      lanyardVelocity = 0;
      tiltX = targetTiltX;
      tiltY = targetTiltY;
      parallaxX = targetParallaxX;
      parallaxY = targetParallaxY;

      if (!prefersReducedMotion.matches) {
        badgeAssembly.style.transform = 'rotate(0deg)';
        if (badgeTilt) {
          badgeTilt.style.transform = (tiltX === 0 && tiltY === 0)
            ? ''
            : `rotateX(${tiltX.toFixed(2)}deg) rotateY(${tiltY.toFixed(2)}deg)`;
        }
        updateLanyardVisual(0);
      }
      isLoopActive = false;
      return;
    }

    rafId = requestAnimationFrame(tickPhysics);
  }

  function startPhysicsLoop() {
    if (!isLoopActive && !prefersReducedMotion.matches && !phoneLayout.matches) {
      isLoopActive = true;
      rafId = requestAnimationFrame(tickPhysics);
    }
  }
  // DROP-IN ENTRANCE ANIMATION (Keyframe drop + touchdown content reveal)
  let hasDropped = false;
  function triggerDropIn() {
    if (hasDropped) return;
    hasDropped = true;

    if (prefersReducedMotion.matches || phoneLayout.matches) {
      updateLanyardVisual(0);
      badgeCard.classList.add('is-landed');
      return;
    }

    badgeAssembly.classList.add('is-dropping');

    // Reveal names & content as card lands
    const revealDelay = Math.min(480, Math.round(CONFIG.dropMs * 0.48));
    setTimeout(() => {
      badgeCard.classList.add('is-landed');
    }, revealDelay);

    setTimeout(() => {
      badgeAssembly.classList.remove('is-dropping');
      badgeCard.classList.add('is-landed');
      velocity = SWING_SIGN * -18.0;
      startPhysicsLoop();
    }, CONFIG.dropMs);
  }
  // POINTER INTERACTIONS (3D Tilt, Sheen, Glare, Velocity Impulse, Drag)
  function onPointerMove(e) {
    if (prefersReducedMotion.matches || !finePointer.matches) return;

    const rect = badgePanel.getBoundingClientRect();
    const isInside = (e.clientX >= rect.left && e.clientX <= rect.right &&
      e.clientY >= rect.top && e.clientY <= rect.bottom);

    const nowTime = e.timeStamp || performance.now();

    if (isInside && !isPointerOverPanel) {
      isPointerOverPanel = true;
      badgePanel.classList.add('is-pointer-inside');
      lastPointerX = e.clientX;
      lastPointerY = e.clientY;
      lastPointerTime = nowTime;
      smoothedVx = 0;
      velocity = 0;
      isFirstSample = true;
      return;
    }

    if (!isInside && isPointerOverPanel) {
      isPointerOverPanel = false;
      badgePanel.classList.remove('is-pointer-inside');
      velocity = 0;
      targetTiltX = 0;
      targetTiltY = 0;
      targetParallaxX = 0;
      targetParallaxY = 0;
      smoothedVx = 0;
      startPhysicsLoop();
      return;
    }

    if (!isInside && !isDragging) {
      targetTiltX = 0;
      targetTiltY = 0;
      targetParallaxX = 0;
      targetParallaxY = 0;
      return;
    }

    const dtMs = Math.max(8, nowTime - lastPointerTime);
    const dtSec = dtMs / 1000;
    const rawVx = (e.clientX - lastPointerX) / dtSec;

    lastPointerX = e.clientX;
    lastPointerY = e.clientY;
    lastPointerTime = nowTime;

    if (isFirstSample) {
      isFirstSample = false;
      smoothedVx = 0;
      return;
    }

    smoothedVx = 0.2 * rawVx + 0.8 * smoothedVx;
    const clampedVx = Math.max(-800, Math.min(800, smoothedVx));
    const effectiveVx = Math.abs(clampedVx) >= 40 ? clampedVx : 0;

    if (isDragging) {
      const dx = e.clientX - cachedPivotX;
      const dy = Math.max(20, e.clientY - cachedPivotY);
      const rawAngle = Math.atan2(dx, dy) * (180 / Math.PI);
      angle = Math.max(-CONFIG.dragMaxDeg, Math.min(CONFIG.dragMaxDeg, SWING_SIGN * rawAngle));
      velocity = 0;
      startPhysicsLoop();
    } else if (isPointerOverPanel) {
      const normX = Math.max(-1, Math.min(1, (e.clientX - cachedPanelCenterX) / cachedPanelHalfWidth));
      const normY = Math.max(-1, Math.min(1, (e.clientY - cachedPanelCenterY) / cachedPanelHalfHeight));

      targetTiltY = normX * CONFIG.tiltMaxDeg;
      targetTiltX = -normY * CONFIG.tiltMaxDeg;
      targetParallaxX = -normX * CONFIG.parallaxPx;
      targetParallaxY = -normY * CONFIG.parallaxPx;

      if (effectiveVx !== 0) {
        velocity += SWING_SIGN * effectiveVx * 0.015;
        velocity = Math.max(-30, Math.min(30, velocity));
      }

      const sheenX = Math.max(10, Math.min(90, 50 + normX * 35));
      const sheenY = Math.max(10, Math.min(90, 40 + normY * 30));
      badgeCard.style.setProperty('--gx', `${sheenX}%`);
      badgeCard.style.setProperty('--gy', `${sheenY}%`);
      badgeCard.style.setProperty('--glare-x', `${sheenX}%`);
      badgeCard.style.setProperty('--glare-y', `${sheenY}%`);

      startPhysicsLoop();
    }
  }

  badgePanel.addEventListener('pointerenter', (e) => {
    if (e.pointerType === 'touch' || !finePointer.matches) return;
    isPointerOverPanel = true;
    badgePanel.classList.add('is-pointer-inside');
    lastPointerX = e.clientX;
    lastPointerY = e.clientY;
    lastPointerTime = e.timeStamp || performance.now();
    smoothedVx = 0;
    velocity = 0;
    isFirstSample = true;
  });

  badgePanel.addEventListener('pointerleave', () => {
    if (!finePointer.matches) return;
    isPointerOverPanel = false;
    badgePanel.classList.remove('is-pointer-inside');
    velocity = 0;
    targetTiltX = 0;
    targetTiltY = 0;
    targetParallaxX = 0;
    targetParallaxY = 0;
    smoothedVx = 0;
    startPhysicsLoop();
  });

  // Drag Handlers
  badgeAssembly.addEventListener('pointerdown', (e) => {
    if (e.button !== 0 || prefersReducedMotion.matches || e.pointerType === 'touch') return;
    isDragging = true;
    badgeAssembly.classList.add('is-dragging');
    try { badgeAssembly.setPointerCapture(e.pointerId); } catch (_) {}
    updateCachedMetrics();
    startPhysicsLoop();
  });

  badgeAssembly.addEventListener('pointerup', (e) => {
    if (!isDragging) return;
    isDragging = false;
    badgeAssembly.classList.remove('is-dragging');
    try { badgeAssembly.releasePointerCapture(e.pointerId); } catch (_) {}
    const releaseImpulse = Math.max(-30, Math.min(30, SWING_SIGN * smoothedVx * 0.035));
    velocity = releaseImpulse;
    startPhysicsLoop();
  });

  badgeAssembly.addEventListener('pointercancel', () => {
    if (isDragging) {
      isDragging = false;
      badgeAssembly.classList.remove('is-dragging');
      startPhysicsLoop();
    }
  });

  window.addEventListener('pointermove', onPointerMove, { passive: true });
  // PASSWORD FOCUS 3D FLIP & PADLOCK UNLOCK REACTION
  function syncBadgeFlipState() {
    if (!badgeCard) return;
    const isPassFocused = document.activeElement === passwordInput ||
      document.activeElement === togglePasswordBtn;
    badgeCard.classList.toggle('is-flipped', isPassFocused);
  }

  if (passwordInput) {
    passwordInput.addEventListener('focus', syncBadgeFlipState);
    passwordInput.addEventListener('blur', syncBadgeFlipState);
  }

  if (togglePasswordBtn) {
    togglePasswordBtn.addEventListener('focus', syncBadgeFlipState);
    togglePasswordBtn.addEventListener('blur', syncBadgeFlipState);

    togglePasswordBtn.addEventListener('click', (e) => {
      e.preventDefault();
      if (!passwordInput) return;
      const isText = passwordInput.type === 'text';
      passwordInput.type = isText ? 'password' : 'text';

      if (toggleIcon) {
        toggleIcon.className = isText ? 'bi bi-eye-slash' : 'bi bi-eye text-primary';
      }

      // Lift & unlock padlock shackle on badge back face
      if (badgeCard) {
        badgeCard.classList.toggle('is-password-revealed', !isText);
      }
    });
  }
  // ERROR SHAKE REACTION
  let errorKickSign = 1;
  let errorGlowTimer = null;

  function triggerBadgeErrorShake() {
    velocity = SWING_SIGN * errorKickSign * 26.0;
    errorKickSign = -errorKickSign;
    startPhysicsLoop();

    if (badgeCard) {
      badgeCard.classList.remove('is-error-kick');
      void badgeCard.offsetWidth; // Force reflow
      badgeCard.classList.add('is-error-kick');

      clearTimeout(errorGlowTimer);
      errorGlowTimer = setTimeout(() => {
        badgeCard.classList.remove('is-error-kick');
      }, 620);
    }
  }
  // 5-ROLE SELECTOR & BADGE IDENTITY SYNCHRONIZATION
  function selectRole(roleKey) {
    if (!ROLES[roleKey] || pending) return;
    activeRole = roleKey;
    const roleData = ROLES[roleKey];

    // Update Role Cards Active State
    document.querySelectorAll('.lb-role-card').forEach(btn => {
      const isCurrent = btn.getAttribute('data-role') === roleKey;
      btn.classList.toggle('is-active', isCurrent);
      btn.setAttribute('aria-checked', isCurrent ? 'true' : 'false');
    });

    // Update Inputs & Hints
    if (emailInput) {
      emailInput.placeholder = roleData.defaultEmail;
      emailInput.value = roleData.defaultEmail;
      emailInput.classList.remove('is-invalid');
    }
    if (emailLabel) {
      emailLabel.innerHTML = `<i class="bi bi-envelope me-1"></i> ${roleData.label}`;
    }
    if (emailHint) {
      emailHint.innerHTML = `<i class="bi bi-info-circle me-1"></i> ${roleData.hint}`;
    }
    if (loginSubmitBtnText) {
      loginSubmitBtnText.textContent = roleData.btnText;
    }
    if (emailError) emailError.style.display = 'none';
    if (passwordError) passwordError.style.display = 'none';

    // Synchronize Badge Details
    if (badgeName) badgeName.textContent = roleData.badgeName;
    if (badgeRole) badgeRole.textContent = roleData.badgeRole;
    if (badgeInitials) badgeInitials.textContent = roleData.badgeInitials;
    if (badgeIdSerial) badgeIdSerial.textContent = roleData.badgeSerial;

    const avatarWrap = document.querySelector('.lb-avatar-wrap');
    if (avatarWrap && roleData.avatarBg) {
      avatarWrap.style.background = roleData.avatarBg;
    }

    // Playful gentle swing to celebrate role switch
    velocity = SWING_SIGN * -12.0;
    startPhysicsLoop();
  }

  // Bind Role Buttons
  document.querySelectorAll('.lb-role-card').forEach(card => {
    card.addEventListener('click', () => {
      const roleKey = card.getAttribute('data-role');
      selectRole(roleKey);
    });
  });

  // Live Email Typing Sync
  if (emailInput) {
    emailInput.addEventListener('input', () => {
      const val = emailInput.value.trim();
      if (val && badgeName) {
        const usernamePart = val.split('@')[0];
        const formatted = usernamePart.replace(/[._]/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        badgeName.textContent = formatted || ROLES[activeRole].badgeName;

        if (badgeInitials) {
          const initials = formatted.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
          badgeInitials.textContent = initials || ROLES[activeRole].badgeInitials;
        }
      } else if (!val) {
        if (badgeName) badgeName.textContent = ROLES[activeRole].badgeName;
        if (badgeInitials) badgeInitials.textContent = ROLES[activeRole].badgeInitials;
      }
    });
  }
  // FORM SUBMISSION & ROUTING
  if (loginForm) {
    loginForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const email = emailInput ? emailInput.value.trim() : '';
      const password = passwordInput ? passwordInput.value : '';

      let hasError = false;
      if (!email || !email.includes('@')) {
        if (emailError) {
          emailError.textContent = 'Please enter a valid official email address.';
          emailError.style.display = 'block';
        }
        if (emailInput) emailInput.classList.add('is-invalid');
        hasError = true;
      } else {
        if (emailError) emailError.style.display = 'none';
        if (emailInput) emailInput.classList.remove('is-invalid');
      }

      if (!password) {
        if (passwordError) {
          passwordError.textContent = 'Please enter your password.';
          passwordError.style.display = 'block';
        }
        if (passwordInput) passwordInput.classList.add('is-invalid');
        hasError = true;
      } else {
        if (passwordError) passwordError.style.display = 'none';
        if (passwordInput) passwordInput.classList.remove('is-invalid');
      }

      if (hasError) {
        triggerBadgeErrorShake();
        return;
      }

      pending = true;
      // Diagonal Light Sweep on Badge
      if (badgeCard) badgeCard.classList.add('is-pending');

      if (loginSubmitBtn) {
        loginSubmitBtn.disabled = true;
        loginSubmitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status"></span> Opening workspace...';
      }

      setTimeout(() => {
        const roleData = ROLES[activeRole];
        showToast(`Opening ${roleData.title} workspace...`);

        setTimeout(() => {
          const dashboardMap = {
            student: '../student-dashboard/student-dashboard.html',
            supervisor: '../supervisor-dashboard/supervisor-dashboard.html',
            company: '../company-dashboard/company-dashboard.html',
            admin: '../admin-dashboard/admin-dashboard.html',
            platform_admin: '../platform-admin/platform-admin.html'
          };
          let destination=dashboardMap[activeRole]||'../student-dashboard/student-dashboard.html';
          if(activeRole==='student'){const accounts=window.BridgewayLocal.read('bridgeway:managed-accounts:v1',[]),model=window.BridgewayLocal.read('bridgeway:partner-model:v1',{});const student=[...accounts,...(model.students||[])].find(a=>(!a.type||a.type==='student')&&a.email?.toLowerCase()===email.toLowerCase());if(student?.status==='Suspended'){showToast('This account is suspended. Contact your college administrator.');loginSubmitBtn.disabled=false;loginSubmitBtn.textContent='Sign in';pending=false;return;}destination+='?student='+encodeURIComponent(student?.id||(email.toLowerCase()==='lina@bau.edu.jo'?'lina':'ghaith'));}
          window.location.href=destination;
        }, 1200);
      }, 700);
    });
  }

  function showToast(message) {
    if (loginToast && loginToastMsg) {
      loginToastMsg.textContent = message;
      loginToast.style.display = 'flex';
      setTimeout(() => {
        loginToast.style.display = 'none';
      }, 3500);
    }
  }
  // FORGOT PASSWORD MODAL
  const forgotPasswordLink = document.getElementById('forgotPasswordLink');
  const forgotModal = document.getElementById('forgotPasswordModal');
  const closeForgotModalBtn = document.getElementById('closeForgotModalBtn');
  const forgotPasswordForm = document.getElementById('forgotPasswordForm');
  const resetEmailInput = document.getElementById('resetEmail');

  function openForgotModal() {
    if (!forgotModal) return;
    if (emailInput && resetEmailInput) {
      resetEmailInput.value = emailInput.value.trim();
    }
    forgotModal.style.display = 'block';
    setTimeout(() => forgotModal.classList.add('show'), 10);
  }

  function closeForgotModal() {
    if (!forgotModal) return;
    forgotModal.classList.remove('show');
    setTimeout(() => forgotModal.style.display = 'none', 200);
  }

  if (forgotPasswordLink) forgotPasswordLink.addEventListener('click', (e) => { e.preventDefault(); openForgotModal(); });
  if (closeForgotModalBtn) closeForgotModalBtn.addEventListener('click', closeForgotModal);
  if (forgotModal) {
    forgotModal.addEventListener('click', (e) => {
      if (e.target === forgotModal) closeForgotModal();
    });
  }

  if (forgotPasswordForm) {
    forgotPasswordForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const resetAlert = document.getElementById('resetSuccessAlert');
      const submitBtn = document.getElementById('resetSubmitBtn');
      if (resetAlert) resetAlert.classList.remove('d-none');
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="bi bi-check-circle me-1"></i> Verification Dispatched';
      }
      setTimeout(closeForgotModal, 1800);
    });
  }
  // DARK / LIGHT THEME CONTROLLER
  const loginThemeToggle = document.getElementById('loginThemeToggle');
  const loginThemeIcon = document.getElementById('loginThemeIcon');

  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    if (loginThemeToggle) {
      const label = theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode';
      loginThemeToggle.setAttribute('aria-label', label);loginThemeToggle.title = label;
    }

    const isDark = theme === 'dark';
    if (loginThemeIcon) {
      loginThemeIcon.className = isDark ? 'bi bi-sun-fill text-warning' : 'bi bi-moon-stars';
    }
  }

  const savedTheme =
    'light';
  applyTheme(savedTheme);

  if (loginThemeToggle) {
    loginThemeToggle.addEventListener('click', () => {
      const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
      applyTheme(isDark ? 'light' : 'dark');
    });
  }
  // INITIALIZATION & LIFECYCLE
  function init() {
    updateCachedMetrics();
    selectRole('student');
    triggerDropIn();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
