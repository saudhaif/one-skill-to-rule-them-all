// The Laces It icon set (same drawings as the web app): thin rounded lines, a shoelace bow for likes.
import Svg, { Circle, Path } from 'react-native-svg';

type P = { size?: number; color?: string; width?: number; fill?: string };
const base = ({ size = 24, color = '#fff', width = 1.9 }: P) => ({
  width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: color, strokeWidth: width, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const,
});

export const IconRides = (p: P) => (
  <Svg {...base(p)}><Path d="M5 18c1-6 6-3 7-8s5-5 7-6" /><Circle cx="5" cy="18" r="2" /><Path d="M19 4v5M19 4h3l-1 1.2L22 6.5h-3" /></Svg>
);
export const IconClips = (p: P) => (
  <Svg {...base(p)}><Path d="M9 6.5l9 5.5-9 5.5z" /><Path d="M2.5 9h3M2 12h4M2.5 15h3" /></Svg>
);
export const IconMarket = (p: P) => (
  <Svg {...base(p)}><Path d="M3.5 12.5V4h8.5L21 13l-8 8z" /><Circle cx="8" cy="8.5" r="1.4" /></Svg>
);
export const IconBoard = (p: P) => (
  <Svg {...base(p)}><Path d="M3 20v-5h6v5M9 20V9h6v11M15 20v-7h6v7" /><Path d="M12 3.5l.8 1.6 1.7.3-1.2 1.2.3 1.7-1.6-.8-1.6.8.3-1.7-1.2-1.2 1.7-.3z" /></Svg>
);
export const IconRooms = (p: P) => (
  <Svg {...base(p)}><Path d="M3.5 5h11v8H8l-4.5 3z" /><Path d="M14.5 9H20v8.5L17 15h-6v-2" /></Svg>
);
export const IconMe = (p: P) => (
  <Svg {...base(p)}><Circle cx="12" cy="8" r="3.5" /><Path d="M5 20c.8-3.8 3.6-5.5 7-5.5s6.2 1.7 7 5.5" /></Svg>
);
export const IconBike = (p: P) => (
  <Svg {...base(p)}><Circle cx="6" cy="16" r="3.5" /><Circle cx="18" cy="16" r="3.5" /><Path d="M6 16l4-7h5l3 7M10 9l3 7M13 5.5h3" /></Svg>
);
export const IconRun = (p: P) => (
  <Svg {...base(p)}><Circle cx="14.5" cy="4.5" r="2" /><Path d="M8 21l3-6 3 2v5M6 11l3-3 4 1 2 3 3 1M11 15l2-6" /></Svg>
);
export const IconExpand = (p: P) => (
  <Svg {...base(p)}><Path d="M14 4h6v6M20 4l-7 7M10 20H4v-6M4 20l7-7" /></Svg>
);
export const IconClose = (p: P) => (
  <Svg {...base(p)}><Path d="M6 6l12 12M18 6L6 18" /></Svg>
);
export const IconLocate = (p: P) => (
  <Svg {...base(p)}><Path d="M3 11l18-8-8 18-2-8z" /></Svg>
);
export const IconFit = (p: P) => (
  <Svg {...base(p)}><Path d="M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5" /></Svg>
);
