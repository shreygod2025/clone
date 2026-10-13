export const STI_LOGO = '/sti6-logo.png';
export const STI_YF_LOGO = '/sti6-yf-logo.png';
export const STI_CONTACT = { phone: '9920188188', email: 'info@oll.co' };

export const STI = {
  blue: '#0B3FB0', deep: '#06247A', sky: '#1E9BD0', yellow: '#FFE14D', cream: '#FFF8DC',
  orange: '#FF6A00', pink: '#D6007F', green: '#00D45A', ink: '#0A1F5C',
};
export const STI_ACCENTS = [STI.yellow, STI.orange, STI.pink, STI.green, STI.sky];
export const STI_DISPLAY_FONT = "'Anton', 'Bebas Neue', Impact, sans-serif";

const doodle = `<svg xmlns='http://www.w3.org/2000/svg' width='260' height='260' fill='none' stroke='white' stroke-width='2' stroke-linecap='round' stroke-linejoin='round' opacity='0.13'><path d='M40 70a22 22 0 1 1 30 0c-4 4-6 8-6 13H46c0-5-2-9-6-13z'/><path d='M47 90h16M49 97h12'/><path d='M150 40c20-6 40 4 46 22'/><path d='M190 56l6 7 4-9'/><circle cx='205' cy='170' r='16'/><path d='M205 146v-6M205 200v-6M181 170h-6M235 170h-6M188 153l-4-4M226 191l-4-4M188 187l-4 4M226 149l-4 4'/><path d='M60 190l22-40 22 40-22-8z'/><path d='M74 200l8 18 8-18'/><path d='M130 120q10-14 20 0t20 0t20 0'/><path d='M20 240l10-10 10 10 10-10'/><path d='M120 220l4 9 10 1-7 7 2 10-9-5-9 5 2-10-7-7 10-1z'/><path d='M110 20h30v20h-30z M118 40v8'/></svg>`;

export const STI_DOODLE = `url("data:image/svg+xml,${encodeURIComponent(doodle)}")`;

export const STI_BG = {
  backgroundColor: STI.blue,
  backgroundImage: `radial-gradient(ellipse at 50% 38%, rgba(255,240,170,0.32) 0%, rgba(80,140,255,0.18) 30%, transparent 62%), ${STI_DOODLE}, radial-gradient(circle at 50% 0%, #1B5BE0 0%, ${STI.blue} 45%, ${STI.deep} 100%)`,
  backgroundSize: 'auto, 260px 260px, auto',
};
