import { ArrowUpRight } from 'lucide-react';

const gsearch = (q) => `https://www.google.com/search?q=${encodeURIComponent(q)}`;

const NEWS = [
  { pub: 'The Times of India', img: '/press/toi.jpg', date: '4 Feb 2023', headline: 'Shark Tank India 2: 18-year-old pitcher Shreyaan Daga surprises Sharks as he reveals he became an entrepreneur at the age of eight',
    url: 'https://timesofindia.indiatimes.com/tv/news/hindi/shark-tank-india-2-18-year-old-pitcher-shreyaan-daga-surprises-sharks-as-he-reveals-he-became-an-entrepreneur-at-the-age-of-eight/articleshow/97534754.cms' },
  { pub: 'The Indian Express', img: '/press/ie.jpg', date: '5 Feb 2023', headline: 'Getting featured on Shark Tank India 2 is my formal degree, says 18-year-old entrepreneur Shreyaan Daga',
    url: 'https://indianexpress.com/article/entertainment/television/getting-featured-on-shark-tank-india-2-is-my-formal-degree-says-18-year-old-entrepreneur-shreyaan-daga-8422822/' },
  { pub: 'Moneycontrol', img: '/press/mc.jpg', date: '3 Feb 2023', headline: 'This 18-year-old Shark Tank contestant wants to buy Byju’s one day',
    url: 'https://www.moneycontrol.com/news/trends/shark-tank-india-shreyaan-daga-18-wants-to-buy-byjus-9996381.html' },
  { pub: 'Hindustan Times', img: '/press/ht.jpg', date: '2 Feb 2023', headline: 'Shark Tank: Vineeta Singh, Peyush Bansal shocked as pitcher Shreyaan reveals age, how he earned ₹900',
    url: 'https://www.hindustantimes.com/entertainment/tv/shark-tank-vineeta-singh-peyush-bansal-shocked-as-pitcher-shreyaan-reveals-age-101675322898696.html' },
  { pub: 'YourStory', img: '/press/ys.jpg', date: '4 Jan 2021', headline: 'This 15-year-old has built an edtech marketplace for teachers and students to connect, teach, and learn',
    url: 'https://yourstory.com/2021/01/15-year-old-edtech-marketplace-online-live-learning' },
  { pub: 'Entrackr', img: '/press/entrackr.jpg', date: '8 Sept 2022', headline: 'Softskill focused edtech startup OLL raises seed round',
    url: gsearch('Entrackr Softskill focused edtech startup OLL raises seed round') },
  { pub: 'Vibes of India', img: '/press/voi.jpg', date: '4 Feb 2023', headline: 'Shark Tank Contestant Wants To Buy Byju’s One Day',
    url: gsearch('Vibes of India Shark Tank Contestant Wants To Buy Byju’s One Day') },
  { pub: 'Indianweb2', img: '/press/iw2.jpg', date: '8 Sept 2022', headline: 'Ed-Tech Startup by 17-year Old Dropout OLL Raises $115K in Seed Round from We Founder Circle',
    url: gsearch('Indianweb2 Ed-Tech Startup by 17-year Old Dropout OLL Raises $115K Seed Round We Founder Circle') },
];

const STYLES = `
  @keyframes news-scroll { from { transform: translateX(0); } to { transform: translateX(-50%); } }
  .news-wrap { overflow-x: auto; overflow-y: visible; padding: 18px 0 26px; scrollbar-width: none; mask-image: linear-gradient(to right, transparent, #000 5%, #000 95%, transparent); -webkit-mask-image: linear-gradient(to right, transparent, #000 5%, #000 95%, transparent); }
  .news-wrap::-webkit-scrollbar { display: none; }
  .news-track { display: flex; gap: 1.5rem; width: max-content; padding: 0 1.5rem; animation: news-scroll 70s linear infinite; }
  .news-wrap:hover .news-track, .news-wrap:focus-within .news-track { animation-play-state: paused; }
  .news-card { flex-shrink: 0; width: 320px; min-height: 300px; display: flex; flex-direction: column; text-decoration: none; color: #1B1A17; padding: 18px 20px 16px; border-radius: 4px;
    background: #F6F0E1; background-image: radial-gradient(rgba(60,40,10,0.06) 1px, transparent 1px); background-size: 4px 4px;
    box-shadow: 0 18px 40px rgba(0,0,0,0.38), inset 0 0 40px rgba(120,90,40,0.12); transition: transform 0.25s ease, box-shadow 0.25s ease; }
  .news-card:nth-child(odd) { transform: rotate(-1deg); }
  .news-card:nth-child(even) { transform: rotate(0.8deg); }
  .news-card:hover { transform: rotate(0) translateY(-6px); box-shadow: 0 26px 50px rgba(0,0,0,0.5); }
  .news-mast { font-family: 'Playfair Display', Georgia, serif; font-weight: 900; font-size: 1.15rem; text-align: center; letter-spacing: 0.02em; padding-bottom: 6px; border-bottom: 3px double #1B1A17; }
  .news-meta { display: flex; justify-content: space-between; font-family: Georgia, serif; font-size: 0.66rem; letter-spacing: 0.12em; text-transform: uppercase; color: #5A5244; padding: 5px 0; border-bottom: 1px solid #1B1A17; }
  .news-body { margin: 14px 0 12px; }
  .news-body::after { content: ''; display: block; clear: both; }
  .news-photo { float: right; width: 104px; height: 104px; margin: 2px 0 6px 12px; padding: 3px; background: #fff; border: 1px solid rgba(27,26,23,0.35); box-shadow: 0 2px 6px rgba(0,0,0,0.12); }
  .news-photo img { width: 100%; height: 100%; object-fit: cover; display: block; filter: grayscale(0.85) contrast(1.05) sepia(0.15); transition: filter 0.3s ease; }
  .news-card:hover .news-photo img { filter: none; }
  .news-headline { font-family: 'Playfair Display', Georgia, serif; font-weight: 700; font-size: 1.12rem; line-height: 1.24; }
  .news-lines { display: grid; grid-template-columns: 1fr 1fr; gap: 0 12px; margin-top: auto; }
  .news-lines span { display: block; height: 4px; margin: 4px 0; background: rgba(27,26,23,0.16); border-radius: 2px; }
  .news-read { margin-top: 14px; display: inline-flex; align-items: center; gap: 4px; font-family: 'Proxima Nova','Montserrat',sans-serif; font-weight: 800; font-size: 0.72rem; letter-spacing: 0.14em; text-transform: uppercase; color: #B91C1C; }
  @media (max-width: 640px) { .news-card { width: 270px; min-height: 270px; } .news-headline { font-size: 0.98rem; } .news-photo { width: 84px; height: 84px; } .news-track { animation-duration: 55s; } }
  @media (prefers-reduced-motion: reduce) { .news-track { animation: none; } }
`;

const LINE_WIDTHS = ['100%', '92%', '100%', '78%'];

const NewsCard = ({ n, idx }) => (
  <a className="news-card" href={n.url} target="_blank" rel="noopener noreferrer" data-testid={idx !== undefined ? `homepage-news-card-${idx}` : undefined} aria-hidden={idx === undefined ? 'true' : undefined} tabIndex={idx === undefined ? -1 : undefined}>
    <div className="news-mast">{n.pub}</div>
    <div className="news-meta"><span>{n.date}</span><span>Featured</span></div>
    <div className="news-body">
      <div className="news-photo"><img src={n.img} alt={`${n.pub} coverage`} loading="lazy" /></div>
      <div className="news-headline">{n.headline}</div>
    </div>
    <div className="news-lines">
      {[0, 1].map((c) => <div key={c}>{LINE_WIDTHS.map((w, i) => <span key={i} style={{ width: w }} />)}</div>)}
    </div>
    <span className="news-read">Read article <ArrowUpRight size={13} /></span>
  </a>
);

export const NewsStrip = () => (
  <div data-testid="homepage-news-strip">
    <style>{STYLES}</style>
    <div className="news-wrap">
      <div className="news-track">
        {NEWS.map((n, i) => <NewsCard key={n.pub} n={n} idx={i} />)}
        {NEWS.map((n) => <NewsCard key={`${n.pub}-dup`} n={n} />)}
      </div>
    </div>
  </div>
);
