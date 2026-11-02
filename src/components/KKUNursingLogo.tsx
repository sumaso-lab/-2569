import React, { useState, useEffect } from 'react';
import officialSealRaster from '../assets/images/kku_nursing_seal_1791045430418.jpg';
import { OfficialKKUNurseSealSVG } from './OfficialKKUNurseSealSVG';

interface KKUNursingLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
}

export const KKUNursingLogo: React.FC<KKUNursingLogoProps> = ({
  className = '',
  size = 'md',
  showText = false
}) => {
  const [customLogoSrc, setCustomLogoSrc] = useState<string | null>(null);

  useEffect(() => {
    try {
      const custom = localStorage.getItem('kku_nursing_custom_logo');
      if (custom) {
        setCustomLogoSrc(custom);
      }
    } catch {}
  }, []);

  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-24 h-24 sm:w-28 sm:h-28',
    xl: 'w-32 h-32 sm:w-36 sm:h-36'
  };

  return (
    <div className={`inline-flex items-center gap-3 ${className}`}>
      <div className={`relative rounded-full p-0.5 bg-gradient-to-b from-[#2E92CE] via-amber-300 to-[#1b5d89] shadow-lg shadow-sky-950/40 shrink-0 ${sizeClasses[size]}`}>
        {customLogoSrc ? (
          <img
            src={customLogoSrc}
            alt="ตราสัญลักษณ์ คณะพยาบาลศาสตร์ มหาวิทยาลัยขอนแก่น"
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover rounded-full bg-white"
            onError={() => setCustomLogoSrc(null)}
          />
        ) : (
          <div className="w-full h-full rounded-full overflow-hidden bg-white flex items-center justify-center">
            {/* Exact Vector SVG from logonuthaiS-2.png */}
            <OfficialKKUNurseSealSVG className="w-full h-full" />
          </div>
        )}
        <div className="absolute inset-0 rounded-full border border-amber-300/40 pointer-events-none" />
      </div>

      {showText && (
        <div className="text-left">
          <span className="font-serif-thai font-bold text-amber-200 text-base sm:text-lg block leading-tight">
            คณะพยาบาลศาสตร์ มหาวิทยาลัยขอนแก่น
          </span>
          <span className="text-[10px] tracking-wider text-sky-200 block uppercase">
            FACULTY OF NURSING · KHON KAEN UNIVERSITY
          </span>
        </div>
      )}
    </div>
  );
};
