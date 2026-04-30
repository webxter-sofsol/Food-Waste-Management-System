/**
 * Inline SVG illustrations used across the app.
 * All illustrations are self-contained — no external dependencies.
 */

// ── Food sharing scene (used on dashboard welcome card) ───────────────────────
export const FoodSharingIllustration = ({ width = 220, height = 160, opacity = 0.18 }) => (
  <svg
    width={width}
    height={height}
    viewBox="0 0 220 160"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    {/* Table */}
    <rect x="30" y="110" width="160" height="10" rx="5" fill="white" fillOpacity={opacity * 2} />
    <rect x="50" y="120" width="8" height="28" rx="4" fill="white" fillOpacity={opacity * 1.5} />
    <rect x="162" y="120" width="8" height="28" rx="4" fill="white" fillOpacity={opacity * 1.5} />

    {/* Large bowl */}
    <ellipse cx="110" cy="108" rx="38" ry="12" fill="white" fillOpacity={opacity * 2.5} />
    <path d="M72 100 Q72 80 110 80 Q148 80 148 100" fill="white" fillOpacity={opacity * 2} />
    {/* Steam */}
    <path d="M95 75 Q97 68 95 62" stroke="white" strokeWidth="2" strokeLinecap="round" strokeOpacity={opacity * 3} />
    <path d="M110 72 Q112 65 110 58" stroke="white" strokeWidth="2" strokeLinecap="round" strokeOpacity={opacity * 3} />
    <path d="M125 75 Q127 68 125 62" stroke="white" strokeWidth="2" strokeLinecap="round" strokeOpacity={opacity * 3} />

    {/* Small plate left */}
    <ellipse cx="55" cy="108" rx="18" ry="6" fill="white" fillOpacity={opacity * 2} />
    <path d="M37 104 Q37 94 55 94 Q73 94 73 104" fill="white" fillOpacity={opacity * 1.5} />

    {/* Small plate right */}
    <ellipse cx="165" cy="108" rx="18" ry="6" fill="white" fillOpacity={opacity * 2} />
    <path d="M147 104 Q147 94 165 94 Q183 94 183 104" fill="white" fillOpacity={opacity * 1.5} />

    {/* Fork left */}
    <rect x="28" y="88" width="3" height="22" rx="1.5" fill="white" fillOpacity={opacity * 2} />
    <rect x="24" y="82" width="2" height="10" rx="1" fill="white" fillOpacity={opacity * 2} />
    <rect x="28" y="82" width="2" height="10" rx="1" fill="white" fillOpacity={opacity * 2} />
    <rect x="32" y="82" width="2" height="10" rx="1" fill="white" fillOpacity={opacity * 2} />

    {/* Spoon right */}
    <rect x="190" y="88" width="3" height="22" rx="1.5" fill="white" fillOpacity={opacity * 2} />
    <ellipse cx="191.5" cy="82" rx="5" ry="7" fill="white" fillOpacity={opacity * 2} />

    {/* Heart */}
    <path d="M108 46 C108 43 104 40 101 43 C98 46 101 52 108 56 C115 52 118 46 115 43 C112 40 108 43 108 46Z"
      fill="white" fillOpacity={opacity * 3} />

    {/* Stars */}
    <circle cx="40" cy="50" r="2" fill="white" fillOpacity={opacity * 2} />
    <circle cx="180" cy="40" r="2.5" fill="white" fillOpacity={opacity * 2} />
    <circle cx="170" cy="65" r="1.5" fill="white" fillOpacity={opacity * 1.5} />
    <circle cx="50" cy="70" r="1.5" fill="white" fillOpacity={opacity * 1.5} />
  </svg>
);

// ── Delivery truck (volunteer dashboard) ─────────────────────────────────────
export const DeliveryIllustration = ({ width = 200, height = 140, opacity = 0.18 }) => (
  <svg width={width} height={height} viewBox="0 0 200 140" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    {/* Road */}
    <rect x="0" y="110" width="200" height="8" rx="4" fill="white" fillOpacity={opacity * 2} />
    <rect x="20" y="113" width="20" height="3" rx="1.5" fill="white" fillOpacity={opacity * 3} />
    <rect x="90" y="113" width="20" height="3" rx="1.5" fill="white" fillOpacity={opacity * 3} />
    <rect x="160" y="113" width="20" height="3" rx="1.5" fill="white" fillOpacity={opacity * 3} />

    {/* Truck body */}
    <rect x="30" y="65" width="100" height="45" rx="6" fill="white" fillOpacity={opacity * 2.5} />
    {/* Cab */}
    <rect x="130" y="75" width="45" height="35" rx="6" fill="white" fillOpacity={opacity * 2} />
    {/* Windshield */}
    <rect x="138" y="80" width="28" height="18" rx="3" fill="white" fillOpacity={opacity * 1.5} />
    {/* Wheels */}
    <circle cx="65" cy="112" r="12" fill="white" fillOpacity={opacity * 2} />
    <circle cx="65" cy="112" r="6" fill="white" fillOpacity={opacity * 1} />
    <circle cx="148" cy="112" r="12" fill="white" fillOpacity={opacity * 2} />
    <circle cx="148" cy="112" r="6" fill="white" fillOpacity={opacity * 1} />
    {/* Box on truck */}
    <rect x="45" y="72" width="70" height="32" rx="3" fill="white" fillOpacity={opacity * 1.5} />
    <line x1="80" y1="72" x2="80" y2="104" stroke="white" strokeWidth="1.5" strokeOpacity={opacity * 2} />
    <line x1="45" y1="88" x2="115" y2="88" stroke="white" strokeWidth="1.5" strokeOpacity={opacity * 2} />
    {/* Heart on box */}
    <path d="M76 83 C76 81 73 79 71 81 C69 83 71 87 76 90 C81 87 83 83 81 81 C79 79 76 81 76 83Z"
      fill="white" fillOpacity={opacity * 3} />
    {/* Speed lines */}
    <line x1="5" y1="85" x2="25" y2="85" stroke="white" strokeWidth="2" strokeLinecap="round" strokeOpacity={opacity * 2} />
    <line x1="0" y1="93" x2="22" y2="93" stroke="white" strokeWidth="2" strokeLinecap="round" strokeOpacity={opacity * 2} />
    <line x1="8" y1="101" x2="26" y2="101" stroke="white" strokeWidth="2" strokeLinecap="round" strokeOpacity={opacity * 2} />
  </svg>
);

// ── People / community (receiver dashboard) ───────────────────────────────────
export const CommunityIllustration = ({ width = 200, height = 150, opacity = 0.18 }) => (
  <svg width={width} height={height} viewBox="0 0 200 150" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    {/* Person 1 (left) */}
    <circle cx="50" cy="55" r="18" fill="white" fillOpacity={opacity * 2.5} />
    <path d="M20 120 Q20 90 50 90 Q80 90 80 120" fill="white" fillOpacity={opacity * 2} />
    {/* Person 2 (center) */}
    <circle cx="100" cy="48" r="22" fill="white" fillOpacity={opacity * 3} />
    <path d="M65 120 Q65 85 100 85 Q135 85 135 120" fill="white" fillOpacity={opacity * 2.5} />
    {/* Person 3 (right) */}
    <circle cx="152" cy="55" r="18" fill="white" fillOpacity={opacity * 2.5} />
    <path d="M122 120 Q122 90 152 90 Q182 90 182 120" fill="white" fillOpacity={opacity * 2} />
    {/* Ground line */}
    <rect x="10" y="120" width="180" height="5" rx="2.5" fill="white" fillOpacity={opacity * 2} />
    {/* Hands reaching */}
    <path d="M78 95 Q90 88 100 92" stroke="white" strokeWidth="3" strokeLinecap="round" strokeOpacity={opacity * 3} />
    <path d="M122 95 Q110 88 100 92" stroke="white" strokeWidth="3" strokeLinecap="round" strokeOpacity={opacity * 3} />
    {/* Heart above center */}
    <path d="M98 28 C98 25 94 22 91 25 C88 28 91 34 98 38 C105 34 108 28 105 25 C102 22 98 25 98 28Z"
      fill="white" fillOpacity={opacity * 3.5} />
    {/* Stars */}
    <circle cx="30" cy="30" r="2" fill="white" fillOpacity={opacity * 2} />
    <circle cx="170" cy="28" r="2.5" fill="white" fillOpacity={opacity * 2} />
    <circle cx="185" cy="55" r="1.5" fill="white" fillOpacity={opacity * 1.5} />
  </svg>
);

// ── Admin / shield (admin dashboard) ─────────────────────────────────────────
export const AdminIllustration = ({ width = 200, height = 150, opacity = 0.18 }) => (
  <svg width={width} height={height} viewBox="0 0 200 150" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    {/* Shield */}
    <path d="M100 20 L155 42 L155 90 Q155 125 100 140 Q45 125 45 90 L45 42 Z"
      fill="white" fillOpacity={opacity * 2.5} />
    {/* Shield inner */}
    <path d="M100 32 L143 50 L143 90 Q143 118 100 130 Q57 118 57 90 L57 50 Z"
      fill="white" fillOpacity={opacity * 1.5} />
    {/* Checkmark */}
    <path d="M78 85 L92 99 L122 69" stroke="white" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" strokeOpacity={opacity * 4} />
    {/* Stars around */}
    <circle cx="30" cy="40" r="3" fill="white" fillOpacity={opacity * 2} />
    <circle cx="170" cy="35" r="3" fill="white" fillOpacity={opacity * 2} />
    <circle cx="25" cy="100" r="2" fill="white" fillOpacity={opacity * 1.5} />
    <circle cx="175" cy="105" r="2" fill="white" fillOpacity={opacity * 1.5} />
    <circle cx="40" cy="130" r="2.5" fill="white" fillOpacity={opacity * 1.5} />
    <circle cx="160" cy="128" r="2.5" fill="white" fillOpacity={opacity * 1.5} />
  </svg>
);

// ── Register page left panel illustration ─────────────────────────────────────
export const RegisterIllustration = ({ width = 320, height = 280 }) => (
  <svg width={width} height={height} viewBox="0 0 320 280" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    {/* Background circles */}
    <circle cx="260" cy="40" r="60" fill="white" fillOpacity="0.06" />
    <circle cx="60" cy="240" r="80" fill="white" fillOpacity="0.05" />

    {/* Central plate */}
    <ellipse cx="160" cy="175" rx="70" ry="22" fill="white" fillOpacity="0.15" />
    <path d="M90 155 Q90 115 160 115 Q230 115 230 155" fill="white" fillOpacity="0.12" />
    {/* Plate rim highlight */}
    <ellipse cx="160" cy="155" rx="70" ry="8" fill="white" fillOpacity="0.08" />

    {/* Steam wisps */}
    <path d="M135 108 Q138 96 135 85" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeOpacity="0.4" />
    <path d="M160 103 Q163 91 160 80" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeOpacity="0.4" />
    <path d="M185 108 Q188 96 185 85" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeOpacity="0.4" />

    {/* Food items on plate */}
    <circle cx="145" cy="140" r="12" fill="white" fillOpacity="0.2" />
    <circle cx="170" cy="135" r="10" fill="white" fillOpacity="0.18" />
    <circle cx="158" cy="152" r="8" fill="white" fillOpacity="0.15" />

    {/* Donor figure (left) */}
    <circle cx="68" cy="95" r="20" fill="white" fillOpacity="0.2" />
    <path d="M40 160 Q40 130 68 130 Q96 130 96 160" fill="white" fillOpacity="0.15" />
    {/* Donor arms offering */}
    <path d="M50 145 Q60 135 75 140" stroke="white" strokeWidth="3" strokeLinecap="round" strokeOpacity="0.35" />
    <path d="M86 145 Q76 135 75 140" stroke="white" strokeWidth="3" strokeLinecap="round" strokeOpacity="0.35" />

    {/* Receiver figure (right) */}
    <circle cx="252" cy="95" r="20" fill="white" fillOpacity="0.2" />
    <path d="M224 160 Q224 130 252 130 Q280 130 280 160" fill="white" fillOpacity="0.15" />
    {/* Receiver arms receiving */}
    <path d="M234 145 Q244 138 245 145" stroke="white" strokeWidth="3" strokeLinecap="round" strokeOpacity="0.35" />
    <path d="M270 145 Q260 138 245 145" stroke="white" strokeWidth="3" strokeLinecap="round" strokeOpacity="0.35" />

    {/* Volunteer figure (top center) */}
    <circle cx="160" cy="48" r="18" fill="white" fillOpacity="0.2" />
    <path d="M136 90 Q136 68 160 68 Q184 68 184 90" fill="white" fillOpacity="0.15" />

    {/* Connecting arrows / paths */}
    <path d="M96 148 Q128 140 130 155" stroke="white" strokeWidth="2" strokeLinecap="round" strokeDasharray="4 3" strokeOpacity="0.3" />
    <path d="M224 148 Q192 140 190 155" stroke="white" strokeWidth="2" strokeLinecap="round" strokeDasharray="4 3" strokeOpacity="0.3" />
    <path d="M155 68 Q130 100 130 115" stroke="white" strokeWidth="2" strokeLinecap="round" strokeDasharray="4 3" strokeOpacity="0.3" />
    <path d="M165 68 Q190 100 190 115" stroke="white" strokeWidth="2" strokeLinecap="round" strokeDasharray="4 3" strokeOpacity="0.3" />

    {/* Heart at center top */}
    <path d="M158 28 C158 25 154 22 151 25 C148 28 151 34 158 38 C165 34 168 28 165 25 C162 22 158 25 158 28Z"
      fill="white" fillOpacity="0.5" />

    {/* Sparkles */}
    <circle cx="30" cy="60" r="3" fill="white" fillOpacity="0.25" />
    <circle cx="290" cy="55" r="3" fill="white" fillOpacity="0.25" />
    <circle cx="20" cy="180" r="2" fill="white" fillOpacity="0.2" />
    <circle cx="300" cy="175" r="2" fill="white" fillOpacity="0.2" />
    <circle cx="110" cy="200" r="2.5" fill="white" fillOpacity="0.2" />
    <circle cx="210" cy="205" r="2.5" fill="white" fillOpacity="0.2" />

    {/* Ground */}
    <rect x="20" y="195" width="280" height="5" rx="2.5" fill="white" fillOpacity="0.1" />
  </svg>
);

// ── Stats icons ───────────────────────────────────────────────────────────────
export const UsersIcon = ({ size = 20, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <circle cx="9" cy="7" r="4" stroke={color} strokeWidth="2" />
    <path d="M3 21 C3 17.134 5.686 14 9 14" stroke={color} strokeWidth="2" strokeLinecap="round" />
    <circle cx="17" cy="9" r="3" stroke={color} strokeWidth="2" />
    <path d="M13 21 C13 18.239 14.791 16 17 16 C19.209 16 21 18.239 21 21" stroke={color} strokeWidth="2" strokeLinecap="round" />
  </svg>
);

export const FoodIcon = ({ size = 20, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <path d="M12 2 C8 2 4 6 4 10 C4 14 7 17 11 17.9 L11 22 L13 22 L13 17.9 C17 17 20 14 20 10 C20 6 16 2 12 2Z"
      stroke={color} strokeWidth="2" strokeLinejoin="round" />
    <path d="M8 10 Q10 7 12 10 Q14 13 16 10" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

export const MatchIcon = ({ size = 20, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <path d="M12 21 C12 21 4 16 4 10 C4 7.239 6.239 5 9 5 C10.5 5 11.866 5.685 12.8 6.757 C13.734 5.685 15.1 5 16.6 5 C19.361 5 21.6 7.239 21.6 10 C21.6 16 12 21 12 21Z"
      stroke={color} strokeWidth="2" strokeLinejoin="round" />
  </svg>
);
