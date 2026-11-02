import React from 'react';

interface OfficialKKUNurseSealSVGProps {
  className?: string;
  size?: number | string;
}

export const OfficialKKUNurseSealSVG: React.FC<OfficialKKUNurseSealSVGProps> = ({
  className = '',
  size = '100%'
}) => {
  return (
    <svg
      viewBox="0 0 200 200"
      width={size}
      height={size}
      className={`select-none ${className}`}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        {/* Flame gradient for Phra That Phanom background */}
        <radialGradient id="kkuFlameGrad" cx="50%" cy="35%" r="65%">
          <stop offset="0%" stopColor="#EA4326" />
          <stop offset="50%" stopColor="#F46633" />
          <stop offset="85%" stopColor="#FBA465" />
          <stop offset="100%" stopColor="#FFF1E8" />
        </radialGradient>

        {/* Text curve paths */}
        {/* Top arc for คณะพยาบาลศาสตร์ */}
        <path
          id="topArcPath"
          d="M 23 100 A 77 77 0 1 1 177 100"
          fill="none"
        />

        {/* Bottom arc for มหาวิทยาลัยขอนแก่น */}
        <path
          id="bottomArcPath"
          d="M 177 100 A 77 77 0 0 1 23 100"
          fill="none"
        />

        {/* 4-pointed star motif */}
        <g id="starMotif">
          <path
            d="M 0 -6.5 Q 0.5 -1.5 5 0 Q 0.5 1.5 0 6.5 Q -0.5 1.5 -5 0 Q -0.5 -1.5 0 -6.5 Z"
            fill="#ffffff"
          />
          <circle cx="0" cy="-9" r="1.2" fill="#ffffff" />
          <circle cx="0" cy="9" r="1.2" fill="#ffffff" />
        </g>
      </defs>

      {/* 1. Base Outer Blue Circle */}
      <circle cx="100" cy="100" r="98" fill="#2E92CE" />

      {/* 2. Concentric Outer White Rings */}
      <circle cx="100" cy="100" r="94.5" fill="none" stroke="#ffffff" strokeWidth="1.2" />
      <circle cx="100" cy="100" r="92.5" fill="none" stroke="#ffffff" strokeWidth="0.8" />

      {/* 3. Concentric Inner White Rings around center */}
      <circle cx="100" cy="100" r="63.5" fill="none" stroke="#ffffff" strokeWidth="0.8" />
      <circle cx="100" cy="100" r="61.5" fill="none" stroke="#ffffff" strokeWidth="1.2" />

      {/* 4. Upper Thai Text: คณะพยาบาลศาสตร์ */}
      <text
        fill="#ffffff"
        fontFamily="'Sarabun', 'Noto Serif Thai', 'Prompt', sans-serif"
        fontSize="15"
        fontWeight="600"
        letterSpacing="0.8px"
      >
        <textPath href="#topArcPath" startOffset="50%" textAnchor="middle">
          คณะพยาบาลศาสตร์
        </textPath>
      </text>

      {/* 5. Lower Thai Text: มหาวิทยาลัยขอนแก่น */}
      <text
        fill="#ffffff"
        fontFamily="'Sarabun', 'Noto Serif Thai', 'Prompt', sans-serif"
        fontSize="14"
        fontWeight="600"
        letterSpacing="0.8px"
      >
        <textPath href="#bottomArcPath" startOffset="50%" textAnchor="middle">
          มหาวิทยาลัยขอนแก่น
        </textPath>
      </text>

      {/* 6. Left & Right Stars */}
      <use href="#starMotif" x="20" y="100" />
      <use href="#starMotif" x="180" y="100" />

      {/* 7. Center White Circular Medallion */}
      <circle cx="100" cy="100" r="60" fill="#ffffff" />

      {/* 8. Flame-shaped Arched Shrine (ซุ้มเปลวเพลิงเรือนแก้ว) */}
      <path
        d="M 100 48 
           C 114 62, 126 80, 126 102
           C 126 122, 122 135, 118 140
           L 82 140
           C 78 135, 74 122, 74 102
           C 74 80, 86 62, 100 48 Z"
        fill="url(#kkuFlameGrad)"
        stroke="#222222"
        strokeWidth="1.2"
      />

      {/* Inner decorative arch rim */}
      <path
        d="M 100 52 
           C 112 64, 122 80, 122 101
           C 122 119, 118 131, 115 137
           L 85 137
           C 82 131, 78 119, 78 101
           C 78 80, 88 64, 100 52 Z"
        fill="none"
        stroke="#ffffff"
        strokeWidth="0.8"
        strokeOpacity="0.8"
      />

      {/* 9. Phra That Phanom Stupa Illustration (องค์พระธาตุพนม) */}
      <g stroke="#222222" strokeWidth="0.8" fill="#ffffff">
        {/* Pinnacle Spire & Tiered Parasol (ฉัตรยอดและยอดพระธาตุ) */}
        <polygon points="100,53 98.8,59 101.2,59" fill="#FCE794" stroke="#443300" strokeWidth="0.5" />
        <rect x="99.2" y="59" width="1.6" height="4" fill="#ffffff" />
        
        {/* Upper Lotus Bud Top (บัวคอเสื้อและยอดธาตุ) */}
        <path d="M 98 63 Q 100 60 102 63 L 102.5 73 Q 100 75 97.5 73 Z" fill="#ffffff" />
        <line x1="97" y1="67" x2="103" y2="67" strokeWidth="0.5" />
        <line x1="97" y1="70" x2="103" y2="70" strokeWidth="0.5" />

        {/* Middle Tier (องค์เรือนธาตุชั้นกลาง ลายกระหนก) */}
        <path d="M 96.5 73.5 L 103.5 73.5 L 105 87 L 95 87 Z" fill="#ffffff" />
        <rect x="97.5" y="75" width="5" height="10" fill="#FFF9DF" stroke="#443300" strokeWidth="0.4" />
        <line x1="100" y1="75" x2="100" y2="85" stroke="#443300" strokeWidth="0.4" />

        {/* Lower Arch & Stupa Base (ซุ้มประตูกลางพระธาตุและฐานบัว) */}
        <path d="M 94 87.5 L 106 87.5 L 108 106 L 92 106 Z" fill="#ffffff" />
        {/* Sacred Doorway Arch */}
        <path d="M 97.5 106 L 97.5 95 Q 100 93 102.5 95 L 102.5 106 Z" fill="#E65100" stroke="#222222" strokeWidth="0.6" />
        
        {/* Multi-tiered Platform (ฐานเขียงลดหลั่น) */}
        <rect x="90" y="106" width="20" height="4" fill="#ffffff" />
        <rect x="88" y="110" width="24" height="4.5" fill="#ffffff" />
        <rect x="85" y="114.5" width="30" height="5.5" fill="#ffffff" />
        
        {/* Base Lotus Petals (ฐานบัวคว่ำบัวหงาย) */}
        <path d="M 83 120 L 117 120 L 118 128 L 82 128 Z" fill="#ffffff" />
        <line x1="86" y1="124" x2="114" y2="124" strokeWidth="0.5" />
      </g>

      {/* 10. Left Angel (เทวดาด้านซ้าย ถวายสักการะ) */}
      <g stroke="#222222" strokeWidth="0.6" fill="#ffffff">
        {/* Angel Crown */}
        <polygon points="86,92 84.5,86 87.5,86" fill="#FCE794" stroke="#443300" strokeWidth="0.4" />
        {/* Head */}
        <circle cx="86" cy="95" r="2.5" />
        {/* Praying hands */}
        <path d="M 87 97 Q 90 98 88 102" fill="none" strokeWidth="0.6" />
        {/* Kneeling Body & Robes */}
        <path d="M 84 97 Q 82 104 81 113 L 88 113 Q 88 104 86 97 Z" />
      </g>

      {/* 11. Right Angel (เทวดาด้านขวา ถวายสักการะ) */}
      <g stroke="#222222" strokeWidth="0.6" fill="#ffffff">
        {/* Angel Crown */}
        <polygon points="114,92 112.5,86 115.5,86" fill="#FCE794" stroke="#443300" strokeWidth="0.4" />
        {/* Head */}
        <circle cx="114" cy="95" r="2.5" />
        {/* Praying hands */}
        <path d="M 113 97 Q 110 98 112 102" fill="none" strokeWidth="0.6" />
        {/* Kneeling Body & Robes */}
        <path d="M 116 97 Q 118 104 119 113 L 112 113 Q 112 104 114 97 Z" />
      </g>

      {/* 12. Bottom Banner: มหาวิทยาลัยขอนแก่น (แถบแพรชื่อสถาบัน) */}
      <g>
        {/* White Scroll Banner */}
        <path
          d="M 72 131 
             L 128 131 
             L 125 141 
             L 75 141 Z"
          fill="#ffffff"
          stroke="#222222"
          strokeWidth="0.9"
        />
        {/* Small folded ribbon ends */}
        <polygon points="72,131 75,136 71,139" fill="#eeeeee" stroke="#222222" strokeWidth="0.6" />
        <polygon points="128,131 125,136 129,139" fill="#eeeeee" stroke="#222222" strokeWidth="0.6" />

        {/* Inscription Text */}
        <text
          x="100"
          y="138"
          fill="#111111"
          fontFamily="'Sarabun', 'Noto Serif Thai', sans-serif"
          fontSize="5.2"
          fontWeight="700"
          textAnchor="middle"
          letterSpacing="0.2px"
        >
          มหาวิทยาลัยขอนแก่น
        </text>
      </g>
    </svg>
  );
};
