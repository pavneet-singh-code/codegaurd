const PATHS = {
  home: 'M3 11.5L12 4l9 7.5M5 10v9a1 1 0 001 1h4v-6h4v6h4a1 1 0 001-1v-9',
  book: 'M5 4h11a3 3 0 013 3v13H8a3 3 0 01-3-3V4zM5 17a3 3 0 013-3h11',
  upload: 'M12 16V4m0 0L7 9m5-5l5 5M4 16v3a1 1 0 001 1h14a1 1 0 001-1v-3',
  shield: 'M12 3l8 3v6c0 4.5-3.2 8-8 9-4.8-1-8-4.5-8-9V6l8-3zM9 12l2 2 4-4',
  chart: 'M4 20h16M7 17v-6m5 6V6m5 11v-8',
  users: 'M16 19v-1a4 4 0 00-4-4H8a4 4 0 00-4 4v1M10 11a3.5 3.5 0 100-7 3.5 3.5 0 000 7zm10 8v-1a4 4 0 00-3-3.9M15 4.2a3.5 3.5 0 010 6.6',
  clock: 'M12 21a9 9 0 100-18 9 9 0 000 18zm0-14v5l3 2',
  sliders: 'M4 7h10m4 0h2M4 17h2m4 0h10M14 5v4m-4 6v4',
  help: 'M12 21a9 9 0 100-18 9 9 0 000 18zm-2.2-11a2.3 2.3 0 114 1.3c-.9.7-1.8 1.2-1.8 2.4M12 16.8v.1',
  bell: 'M6 17v-6a6 6 0 1112 0v6l1.5 2h-15L6 17zm4 4h4',
  search: 'M11 18a7 7 0 100-14 7 7 0 000 14zm9 3l-4.3-4.3',
  menu: 'M4 6h16M4 12h16M4 18h16',
  x: 'M6 6l12 12M18 6L6 18',
  logout: 'M10 5H6a1 1 0 00-1 1v12a1 1 0 001 1h4m5-4l4-4-4-4m4 4H9',
  plus: 'M12 5v14M5 12h14',
  flag: 'M5 21V4m0 0h11l-2 4 2 4H5',
  trend: 'M3 17l6-6 4 4 8-8m0 0h-5m5 0v5',
  file: 'M7 3h7l5 5v13H7V3zm7 0v5h5',
  code: 'M8 8l-5 4 5 4m8-8l5 4-5 4M14 4l-4 16',
  check: 'M5 13l4 4L19 7',
  lock: 'M7 11V8a5 5 0 0110 0v3M6 11h12v9H6z',
  eye: 'M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12zm10 3a3 3 0 100-6 3 3 0 000 6z',
  layers: 'M12 3l9 5-9 5-9-5 9-5zm-9 9l9 5 9-5M3 16l9 5 9-5',
};

export default function Icon({ name, className = 'h-5 w-5' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={PATHS[name] || PATHS.file} />
    </svg>
  );
}
