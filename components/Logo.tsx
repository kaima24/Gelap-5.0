import React, { useEffect, useState } from 'react';

interface LogoProps {
  className?: string;
  src?: string | null;
}

export const Logo: React.FC<LogoProps> = ({ className = "", src }) => {
  const [error, setError] = useState(false);
  const [currentSrc, setCurrentSrc] = useState(src);

  useEffect(() => {
    // If a new source is provided, reset error state
    setError(false);
    setCurrentSrc(src);
  }, [src]);

  // If a custom source exists and hasn't errored, render it
  if (currentSrc && !error) {
    return (
      <img 
        src={currentSrc} 
        alt="Gelap 5.0 Logo" 
        className={`object-cover rounded-xl ${className}`}
        onError={() => setError(true)}
      />
    );
  }

  // DEFAULT PERMANENT LOGO
  // This serves as the fixed default for the app.
  // Note: Since I cannot access external Drive links, I have created a 
  // professional "G" logo that matches the Gelap 5.0 Dark/Gradient aesthetic.
  // You can replace the <svg> block below with your specific SVG code if needed.
  return (
    <div 
      className={`relative flex items-center justify-center bg-zinc-950 text-white rounded-xl overflow-hidden border border-zinc-800 shadow-lg ${className}`} 
      style={{ aspectRatio: '1/1' }}
    >
      <svg width="1760" height="1740" viewBox="0 0 1760 1740" fill="none" xmlns="http://www.w3.org/2000/svg">
<g clip-path="url(#clip0_1427_16)">
<path d="M713.31 304.042C715 319.193 738.33 397.724 748.25 405.353C830.287 416.307 971.521 441.267 1014.15 520.997C1035.24 560.508 1033.44 588.084 1070.56 622.635C1086.86 637.84 1144.48 666.888 1148.57 681.275C1152.93 696.698 1138.21 738.443 1131.83 755.01C1075.03 902.808 981.987 853.542 863.102 895.069C514.132 1016.93 470.743 1510.73 788.097 1700.82L866.045 1739.95C471.124 1740.05 108.8 1442.99 22.6754 1059.98C-159.55 250.035 802.269 -319.083 1440.85 197.936C1982.18 636.26 1804.15 1517.32 1138.48 1704.63C698.483 1828.45 430.133 1293.61 745.961 1007.01C752.448 1001.12 800.906 961.502 805.976 966.243C587.775 1222.6 811.209 1599.94 1139.79 1558.8C1348.51 1532.64 1515.85 1293.66 1417.41 1093.28C1357.5 971.366 1154.13 950.602 1124.53 1091.15C1112.97 1146.19 1146.17 1208.48 1206.67 1206.25C1235.78 1205.21 1273.94 1186.74 1283.48 1232.95C1297.16 1299.44 1200.84 1303.15 1155.98 1289.2C956.531 1227.18 1015.46 927.005 1222.97 906.241C1404.93 888.039 1527.08 1023.14 1536.57 1197.53C1538.91 1241.13 1526.05 1282.66 1528.17 1325.82C1800.66 953.273 1687.94 436.908 1296.07 200.933C779.702 -110.031 119.212 237.828 86.5059 838.174C80.8915 941.174 106.674 1042.98 135.564 1140.58L146.303 1137.91C140.416 1131.64 142.651 1126.08 143.25 1119C159.003 926.405 205.718 775.719 334.415 628.194C373.716 583.125 425.882 544.813 465.51 503.122C552.943 411.185 597.695 282.461 710.693 214.121C727.319 212.65 713.31 220.007 713.31 222.241C713.31 247.746 710.584 279.736 713.31 303.988V304.042ZM991.308 639.148C967.215 574.351 949.335 556.312 876.838 573.86C870.024 580.345 912.269 612.717 918.592 616.532C940.069 629.611 965.797 638.985 991.308 639.148Z" fill="white"/>
<path d="M855.035 388.568L770.927 377.287C724.921 315.868 824.019 267.529 865.882 235.975C855.525 286.657 852.854 336.741 855.035 388.568Z" fill="white"/>
</g>
<defs>
<clipPath id="clip0_1427_16">
<rect width="1760" height="1740" fill="white"/>
</clipPath>
</defs>
</svg>
    </div>
  );
};

export default Logo;