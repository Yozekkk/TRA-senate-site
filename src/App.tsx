import { createContext, type FormEvent, type ReactNode, useContext, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  Link,
  NavLink,
  Route,
  Routes,
  useLocation,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip as ChartTooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Activity,
  Archive,
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Bell,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  Clock3,
  FileCheck2,
  Home,
  LayoutDashboard,
  Menu,
  PanelLeftClose,
  Plus,
  ShieldCheck,
  SlidersHorizontal,
  Users,
  X,
} from "lucide-react";
import {
  TODAY_MSK,
  formatDate,
  formatShortDate,
  type Period,
  PERIODS,
} from "./data/mockData";
import {
  Badge,
  Button,
  Card,
  ChartCard,
  DataTable,
  Dropdown,
  EmptyState,
  FilterSelect,
  IconButton,
  MeetingCard,
  Modal,
  SearchInput,
  SenateMark,
  SenateSculpture,
  StatCard,
  StatusBadge,
  Tabs,
  Toast,
  Tooltip,
} from "./components/UI";
import { MeetingEditor } from "./components/MeetingEditor";
import { DecisionEditor } from "./components/DecisionEditor";
import { Reveal } from "./animations/Reveal";
import { motionTokens } from "./animations/motion";
import { useDataStore } from "./services/mockStore";
import { useAuth } from "./services/auth";
import { getAnalytics, getPeriodComparison } from "./lib/analytics";

const nav = [
  { to: "/dashboard", label: "Обзор", icon: LayoutDashboard },
  { to: "/schedule", label: "Расписание", icon: CalendarDays },
  { to: "/archive", label: "Архив заседаний", icon: Archive },
  { to: "/analytics", label: "Аналитика", icon: Activity },
  { to: "/decisions", label: "Решения", icon: FileCheck2 },
  { to: "/about", label: "О Сенате", icon: CircleHelp },
];
const routeTitles: Record<string, string> = {
  "/dashboard": "Обзор",
  "/schedule": "Расписание",
  "/archive": "Архив заседаний",
  "/analytics": "Аналитика",
  "/decisions": "Решения",
  "/about": "О Сенате",
  "/admin": "Управление",
};
const weekDays = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];
const monthNames = [
  "январь",
  "февраль",
  "март",
  "апрель",
  "май",
  "июнь",
  "июль",
  "август",
  "сентябрь",
  "октябрь",
  "ноябрь",
  "декабрь",
];
const plural = (n: number, one: string, few: string, many: string) =>
  n % 10 === 1 && n % 100 !== 11
    ? one
    : [2, 3, 4].includes(n % 10) && !(n % 100 >= 12 && n % 100 <= 14)
    ? few
    : many;
const PeriodContext = createContext<
  { period: Period; setPeriod: (period: Period) => void }
>({ period: "Год", setPeriod: () => {} });
const iso = (d: Date) =>
  `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${
    String(d.getUTCDate()).padStart(2, "0")
  }`;
const dateObj = (s: string) => new Date(`${s}T12:00:00Z`);
const addDays = (date: string, days: number) => {
  const d = dateObj(date);
  d.setUTCDate(d.getUTCDate() + days);
  return iso(d);
};
const monthStart = (year: number, month: number) =>
  new Date(Date.UTC(year, month, 1, 12));
const monthLabel = (year: number, month: number) =>
  `${monthNames[month][0].toUpperCase()}${monthNames[month].slice(1)} ${year}`;
const inMonth = (date: string, year: number, month: number) =>
  date.startsWith(`${year}-${String(month + 1).padStart(2, "0")}`);
const calendarDays = (year: number, month: number) => {
  const first = monthStart(year, month);
  const offset = (first.getUTCDay() + 6) % 7;
  return Array.from({
    length: Math.ceil(
      (offset + new Date(Date.UTC(year, month + 1, 0)).getUTCDate()) / 7,
    ) * 7,
  }, (_, i) => {
    const d = new Date(first);
    d.setUTCDate(i - offset + 1);
    return iso(d);
  });
};

function Brand({ small = false }: { small?: boolean }) {
  return (
    <Link
      to="/"
      className={`brand ${small ? "brand-small" : ""}`}
      aria-label="ARGENTI — главная"
    >
      <span className="brand-mark">
        <SenateMark size={small ? 32 : 40} />
      </span>
      <span className="brand-name">
        ARGENTI <small>SENATE</small>
      </span>
    </Link>
  );
}

function PublicHeader() {
  const [open, setOpen] = useState(false);
  return (
    <header className="public-header wrap">
      <Brand />
      <nav
        className={open ? "public-nav open" : "public-nav"}
        aria-label="Основная навигация"
      >
        <NavLink to="/" end onClick={() => setOpen(false)}>Главная</NavLink>
        <NavLink to="/schedule" onClick={() => setOpen(false)}>
          Заседания
        </NavLink>
        <NavLink to="/archive" onClick={() => setOpen(false)}>Архив</NavLink>
        <NavLink to="/analytics" onClick={() => setOpen(false)}>
          Аналитика
        </NavLink>
        <NavLink to="/about" onClick={() => setOpen(false)}>О Сенате</NavLink>
      </nav>
      <div className="public-header-actions">
        <Link className="button button-outline" to="/dashboard">
          Открыть панель <ArrowUpRight size={16} />
        </Link>
        <IconButton
          label={open ? "Закрыть меню" : "Открыть меню"}
          className="mobile-menu-button"
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X size={21} /> : <Menu size={21} />}
        </IconButton>
      </div>
    </header>
  );
}

function Landing() {
  const { meetings, decisions, mode, loading, error } = useDataStore();
  const publicMeetings = meetings.filter((m) => m.published !== false);
  const publicDecisions = decisions.filter((d) => d.published !== false && publicMeetings.some((m) => m.id === d.meetingId));
  const pastMeetings = publicMeetings.filter((m) => m.status === "Завершено");
  const futureMeetings = publicMeetings.filter((m) => m.status === "Запланировано" && m.date >= TODAY_MSK).sort((a, b) => a.date.localeCompare(b.date));
  const reduced = useReducedMotion();
  return (
    <div className="landing">
      <a className="skip-link" href="#main-content">К основному содержимому</a>
      <PublicHeader />
      <main id="main-content">
        {(mode === "unavailable" || error) && <div className="data-alert wrap" role="status"><ShieldCheck size={19} /><span>{error ?? "Реестр Сената пока не подключён. Публичные данные станут доступны после настройки базы."}</span></div>}
        {loading && <div className="data-alert wrap" role="status">Загружаем опубликованные сведения…</div>}
        <section className="landing-hero wrap">
          <div className="hero-kicker">
            <span className="hero-kicker-line" />Официальный цифровой портал ·
            ТРА <span className="hero-kicker-line" />
          </div>
          <div className="hero-orbit orbit-left" />
          <div className="hero-orbit orbit-right" />
          <span className="hero-star star-one" aria-hidden="true">✳</span>
          <span className="hero-star star-two" aria-hidden="true">✦</span>
          <span className="hero-star star-three" aria-hidden="true">✧</span>
          <h1>
            <motion.span className="hero-line" initial={reduced ? false : { opacity: 0, y: 32 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .7, ease: motionTokens.ease }}>Решения <em>сегодня.</em></motion.span>
            <motion.span className="hero-line" initial={reduced ? false : { opacity: 0, y: 32 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .7, delay: .11, ease: motionTokens.ease }}>Будущее <em>Республики</em> завтра.</motion.span>
          </h1>
          <p className="hero-intro">
            Официальный цифровой портал Сената Технологической Республики
            Аргенти. Заседания, решения и деятельность законодательного органа в
            едином пространстве.
          </p>
          <div className="hero-actions">
            <Link className="button button-primary" to="/schedule">
              Расписание заседаний <ArrowUpRight size={18} />
            </Link>
            <Link className="button button-outline" to="/archive">
              Открыть архив <ArrowRight size={18} />
            </Link>
          </div>
          <motion.div className="hero-composition" initial={reduced ? false : { opacity: 0, y: 28 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .8, delay: .25, ease: motionTokens.ease }}>
            <div className="hero-floating left">
              <span className="eyebrow">ТЕКУЩИЙ СТАТУС</span>
              <div className="floating-status">
                <span className="pulse-dot" /> Портал открыт для просмотра
              </div>
              <span className="microcopy">{mode === "mock" ? "Демонстрационный режим" : mode === "unavailable" ? "Подключение к реестру ожидается" : "Публичные сведения Сената"}</span>
            </div>
            <div className="hero-seal">
              <span className="seal-corner">ARGENTI / 01</span>
              <SenateSculpture />
              <span className="seal-caption"><SenateMark size={23} /> СЕНАТ РЕСПУБЛИКИ</span>
            </div>
            <div className="hero-floating right">
              <span className="eyebrow">СЛЕДУЮЩЕЕ ЗАСЕДАНИЕ</span>
              <strong>
                {futureMeetings[0] ? `${formatShortDate(futureMeetings[0].date)} · ${futureMeetings[0].time} МСК` : "Не запланировано"}
              </strong>
              <Link to={futureMeetings[0] ? `/meetings/${futureMeetings[0].id}` : "/schedule"}>
                {futureMeetings[0]?.title ?? "Открыть расписание"} <ArrowUpRight size={15} />
              </Link>
            </div>
            <Link className="hero-mini-card" to="/decisions">
              <span>01 / ОТКРЫТОСТЬ</span>
              <strong>
                Каждое решение<br />на виду.
              </strong>
              <ArrowUpRight size={19} />
            </Link>
          </motion.div>
        </section>
        <section className="landing-band">
          <div className="wrap band-inner">
            <span>СЕНАТ В ЦИФРАХ</span>
            <div>
              <strong>{mode === "unavailable" ? "—" : pastMeetings.length}</strong>
              <small>проведено заседаний</small>
            </div>
            <div>
              <strong>{mode === "unavailable" ? "—" : publicDecisions.length}</strong>
              <small>решений в реестре</small>
            </div>
            <div>
              <strong>{mode === "unavailable" ? "—" : futureMeetings.length}</strong>
              <small>в расписании</small>
            </div>
            <span className="band-index">01 — 04</span>
          </div>
        </section>
        <Reveal><section className="landing-feature wrap" aria-label="Ближайшее заседание">
          <div className="feature-index"><span>СЛЕДУЮЩЕЕ В ПОВЕСТКЕ</span><strong>{futureMeetings[0] ? futureMeetings[0].date.slice(-2) : "—"}</strong><small>{futureMeetings[0] ? formatDate(futureMeetings[0].date, { month: "long" }) : "Дата уточняется"}</small></div>
          <div className="feature-content"><span className="eyebrow accent">ОТКРЫТАЯ ПОВЕСТКА · {futureMeetings[0]?.time ?? "—"} МСК</span><h2>{futureMeetings[0]?.title ?? "Следующее заседание пока не назначено"}</h2><p>{futureMeetings[0] ? "Материалы и вопросы повестки доступны в карточке заседания." : "После публикации заседания анонс появится здесь автоматически."} {mode === "mock" && "Данные демонстрационные."}</p><Link to={futureMeetings[0] ? `/meetings/${futureMeetings[0].id}` : "/schedule"} className="text-link">{futureMeetings[0] ? "Открыть заседание" : "Открыть расписание"} <ArrowUpRight size={18}/></Link></div>
          <div className="feature-emblem"><SenateMark size={125}/><span>ARGENTI / SENATE</span></div>
        </section></Reveal>
        <Reveal><section className="landing-section wrap">
          <div className="section-heading">
            <div>
              <span className="eyebrow accent">01 / ПОВЕСТКА</span>
              <h2>Ближайшие заседания</h2>
            </div>
            <Link className="text-link" to="/schedule">
              Всё расписание <ArrowUpRight size={18} />
            </Link>
          </div>
          <div className="landing-meetings">
            {futureMeetings.slice(0, 3).map((m) => (
              <MeetingCard key={m.id} meeting={m} />
            ))}
            {!futureMeetings.length && <EmptyState title="Заседания пока не запланированы" description="Расписание появится после публикации первого заседания." />}
          </div>
        </section></Reveal>
        <Reveal><section className="landing-section decisions-section wrap">
          <div className="section-heading">
            <div>
              <span className="eyebrow accent">02 / РЕШЕНИЯ</span>
              <h2>Последние решения</h2>
            </div>
            <Link className="text-link" to="/decisions">
              Все решения <ArrowUpRight size={18} />
            </Link>
          </div>
          <div className="landing-decision-list">
            {publicDecisions.slice(-4).reverse().map((d, i) => (
              <Link
                to={`/decisions?item=${d.id}`}
                key={d.id}
                className="landing-decision"
              >
                <span className="index">0{i + 1}</span>
                <div>
                  <small>{d.number} · {formatShortDate(d.date)}</small>
                  <strong>{d.title}</strong>
                </div>
                <StatusBadge status={d.status} />
                <ArrowUpRight size={19} />
              </Link>
            ))}
            {!publicDecisions.length && <EmptyState title="Решения Сената пока не опубликованы" description="Принятые решения будут доступны в этом разделе." />}
          </div>
        </section></Reveal>
        <Reveal><section className="landing-about wrap">
          <div>
            <span className="eyebrow accent">03 / ИНСТИТУТ</span>
            <h2>
              Порядок в работе.<br />
              <span>Ясность в решениях.</span>
            </h2>
          </div>
          <div>
            <p>
              Сенат Республики — пространство обсуждения, согласования и
              публикации результатов работы. Портал собирает открытые
              материалы в едином пространстве по мере их появления.
            </p>
            <Link className="button button-secondary" to="/about">
              Узнать о Сенате <ArrowUpRight size={17} />
            </Link>
          </div>
        </section></Reveal>
        <Reveal><section className="landing-principles wrap"><div className="section-heading"><div><span className="eyebrow accent">04 / ПРИНЦИПЫ</span><h2>Открыто. Структурно. По существу.</h2></div></div><div className="principle-grid"><div><span>01</span><h3>Прозрачная повестка</h3><p>Тема, время и статус каждого заседания собраны в одном месте.</p></div><div><span>02</span><h3>Понятные итоги</h3><p>Краткие пересказы помогают быстро увидеть, что обсуждалось.</p></div><div><span>03</span><h3>История решений</h3><p>Реестр показывает связь решений с заседаниями и ход исполнения.</p></div></div></section></Reveal>
      </main>
      <footer className="public-footer wrap">
        <Brand small />
        <p>{mode === "mock" ? "Демонстрационный режим. Сведения не являются официальными." : mode === "unavailable" ? "Реестр пока не подключён. Сведения недоступны." : "Официальный цифровой портал Сената Республики."}</p>
        <div>
          <Link to="/archive">Архив</Link>
          <Link to="/analytics">Аналитика</Link>
          <Link to="/about">О Сенате</Link>
        </div>
        <span>© 2026 ARGENTI</span>
      </footer>
    </div>
  );
}

function AppLayout({ children }: { children: ReactNode }) {
  const { meetings, decisions, mode, error, loading, canEdit } = useDataStore();
  const { session, role, signOut } = useAuth();
  const futureMeetings = meetings.filter((m) => m.status === "Запланировано" && m.date >= TODAY_MSK).sort((a, b) => a.date.localeCompare(b.date));
  const location = useLocation();
  const navigate = useNavigate();
  const [mobile, setMobile] = useState(false);
  const [search, setSearch] = useState("");
  const { period, setPeriod } = useContext(PeriodContext);
  const title = location.pathname.startsWith("/meetings/")
    ? "Заседание"
    : routeTitles[location.pathname] ?? "Обзор";
  const results = search.trim()
    ? [
      ...meetings.filter((m) =>
        m.title.toLowerCase().includes(search.toLowerCase())
      ).slice(0, 4).map((m) => ({
        label: m.title,
        sub: `Заседание №${m.number}`,
        path: `/meetings/${m.id}`,
      })),
      ...decisions.filter((d) =>
        d.title.toLowerCase().includes(search.toLowerCase())
      ).slice(0, 3).map((d) => ({
        label: d.title,
        sub: `Решение ${d.number}`,
        path: `/decisions?item=${d.id}`,
      })),
    ]
    : [];
  return (
      <div className="app-shell">
        <a className="skip-link" href="#main-content">К основному содержимому</a>
        <aside className={`sidebar ${mobile ? "sidebar-open" : ""}`}>
          <div className="sidebar-top">
            <Brand small />
            <IconButton
              label="Закрыть меню"
              className="sidebar-close"
              onClick={() => setMobile(false)}
            >
              <PanelLeftClose size={19} />
            </IconButton>
          </div>
          <div className="sidebar-caption">РАБОЧЕЕ ПРОСТРАНСТВО</div>
          <nav aria-label="Разделы панели">
            {nav.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => setMobile(false)}
                className={({ isActive }) =>
                  `side-link ${isActive ? "active" : ""}`}
              >
                <item.icon size={18} />
                <span>{item.label}</span>
                {item.to === "/schedule" && <b>{futureMeetings.length}</b>}
              </NavLink>
            ))}
            {canEdit && <NavLink to="/admin" onClick={() => setMobile(false)} className={({ isActive }) => `side-link ${isActive ? "active" : ""}`}><ShieldCheck size={18}/><span>Управление</span></NavLink>}
          </nav>
          <div className="sidebar-bottom">
            {session ? <button type="button" className="chair-card" onClick={() => void signOut()}><div className="chair-avatar">{session.user.email?.slice(0,1).toUpperCase() ?? "А"}</div><div><strong>{session.user.email ?? "Участник"}</strong><span>{role ?? "Читатель"} · Выйти</span></div><ChevronDown size={16}/></button>
              : <Link className="chair-card" to="/login"><div className="chair-avatar">↗</div><div><strong>Вход для участников</strong><span>Управление материалами</span></div><ArrowUpRight size={16}/></Link>}
            <div className="system-status">
              <span className="pulse-dot" /> {mode === "supabase" ? "Реестр подключён" : mode === "mock" ? "Демонстрационный режим" : "Реестр не подключён"}{" "}
              <Tooltip text={mode === "mock" ? "Локальные демонстрационные записи" : mode === "supabase" ? "Сведения из базы Supabase" : "Настройте Supabase для публикации данных"}>
                <CircleHelp size={14} />
              </Tooltip>
            </div>
            <Link className="back-home" to="/">
              <Home size={17} /> На главную <ArrowUpRight size={15} />
            </Link>
          </div>
        </aside>
        {mobile && (
          <button
            type="button"
            className="sidebar-overlay"
            aria-label="Закрыть меню"
            onClick={() => setMobile(false)}
          />
        )}
        <div className="workspace">
          <header className="toolbar">
            <div className="toolbar-left">
              <IconButton
                label="Открыть меню"
                className="toolbar-menu"
                onClick={() => setMobile(true)}
              >
                <Menu size={21} />
              </IconButton>
              <span className="toolbar-title">{title}</span>
              <span className="toolbar-divider" />
              <span className="toolbar-subtitle">ARGENTI / SENATE</span>
            </div>
            <div className="toolbar-right">
              <div className="global-search">
                <SearchInput
                  value={search}
                  onChange={setSearch}
                  placeholder="Поиск по порталу"
                />
                {search && (
                  <div className="global-results">
                    {results.length
                      ? results.map((r, i) => (
                        <button
                          type="button"
                          key={`${r.path}-${i}`}
                          onClick={() => {
                            navigate(r.path);
                            setSearch("");
                          }}
                        >
                          <span>{r.label}</span>
                          <small>{r.sub}</small>
                        </button>
                      ))
                      : <span>Совпадений нет</span>}
                  </div>
                )}
              </div>
              {(location.pathname === "/dashboard" ||
                location.pathname === "/analytics") && (
                <Dropdown
                  label="Период аналитики"
                  trigger={
                    <span className="toolbar-period">
                      <CalendarDays size={16} />
                      {period}
                      <ChevronDown size={14} />
                    </span>
                  }
                >
                  {PERIODS.map((p) => (
                    <button
                      type="button"
                      key={p}
                      className="dropdown-item"
                      onClick={() => setPeriod(p)}
                    >
                      {p}
                      {period === p && <Check size={14} />}
                    </button>
                  ))}
                </Dropdown>
              )}
              <Dropdown
                label="Уведомления"
                trigger={
                  <span className="toolbar-bell">
                    <Bell size={19} />
                    <i />
                  </span>
                }
              >
                <div className="notification">
                  <strong>Уведомления</strong>
                  <p>
                    Напоминание: следующее заседание — {futureMeetings[0] ? `${formatShortDate(futureMeetings[0].date)}, ${futureMeetings[0].time} МСК` : "уточняется"}.
                  </p>
                  <Link to="/schedule">
                    Открыть расписание <ArrowRight size={14} />
                  </Link>
                </div>
              </Dropdown>
              <Dropdown label="Профиль" trigger={<span className="profile-avatar">{session?.user.email?.slice(0,1).toUpperCase() ?? "↗"}</span>}>
                <div className="profile-menu">
                  <strong>{session?.user.email ?? "Публичный просмотр"}</strong>
                  <span>{role ?? "Вход не выполнен"}</span>
                  {session ? <button type="button" onClick={() => void signOut()}>Выйти</button> : <Link to="/login">Войти для управления</Link>}
                </div>
              </Dropdown>
            </div>
          </header>
          <motion.main id="main-content" className="workspace-content" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: motionTokens.standard, ease: motionTokens.ease }}>
            <div className="demo-strip">
              <ShieldCheck size={14} />{" "}
              {mode === "mock" ? "Демонстрационный режим · данные локальные" : mode === "unavailable" ? "Реестр не подключён · данные недоступны" : "Данные из реестра Сената"}{" "}
              <span>{formatDate(TODAY_MSK)}</span>
            </div>
            {error && <div className="data-alert" role="alert">{error}</div>}
            {loading && <div className="data-alert" role="status">Загружаем сведения Сената…</div>}
            {children}
          </motion.main>
        </div>
      </div>
  );
}

function PageHeading(
  { eyebrow, title, description, right }: {
    eyebrow: string;
    title: string;
    description: string;
    right?: ReactNode;
  },
) {
  return (
    <div className="page-heading">
      <div>
        <span className="eyebrow accent">{eyebrow}</span>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {right}
    </div>
  );
}

function CalendarWidget({ compact = false }: { compact?: boolean }) {
  const { meetings } = useDataStore();
  const [cursor, setCursor] = useState(() => ({ year: Number(TODAY_MSK.slice(0, 4)), month: Number(TODAY_MSK.slice(5, 7)) - 1 }));
  const [selected, setSelected] = useState(TODAY_MSK);
  const days = calendarDays(cursor.year, cursor.month);
  const selectedMeetings = meetings.filter((m) => m.date === selected);
  const nearbyMeetings = selectedMeetings.length ? selectedMeetings : meetings.filter((m) => m.date > selected && inMonth(m.date, cursor.year, cursor.month)).sort((a, b) => a.date.localeCompare(b.date)).slice(0, 2);
  const shift = (n: number) => {
    const d = monthStart(cursor.year, cursor.month + n);
    setCursor({ year: d.getUTCFullYear(), month: d.getUTCMonth() });
    setSelected(iso(d));
  };
  return (
    <Card className={`calendar-widget ${compact ? "compact" : ""}`}>
      <div className="calendar-head">
        <div>
          <span className="eyebrow">КАЛЕНДАРЬ СЕНАТА</span>
          <h3>{monthLabel(cursor.year, cursor.month)}</h3>
        </div>
        <div className="calendar-arrows">
          <IconButton label="Предыдущий месяц" onClick={() => shift(-1)}>
            <ChevronLeft size={17} />
          </IconButton>
          <IconButton label="Следующий месяц" onClick={() => shift(1)}>
            <ChevronRight size={17} />
          </IconButton>
        </div>
      </div>
      <div className="calendar-grid">
        {weekDays.map((d) => <span className="weekday" key={d}>{d}</span>)}
        {days.map((date) => (
          <button
            type="button"
            key={date}
            className={`calendar-day ${
              !inMonth(date, cursor.year, cursor.month) ? "muted" : ""
            } ${date === selected ? "selected" : ""} ${
              meetings.some((m) => m.date === date) ? "has-event" : ""
            }`}
            onClick={() => setSelected(date)}
            aria-label={formatDate(date)}
          >
            {Number(date.slice(-2))}
          </button>
        ))}
      </div>
      <div className="calendar-events">
        <div className="calendar-events-title">
          {selectedMeetings.length ? formatDate(selected, { day: "numeric", month: "long" }) : "Ближайшие заседания"}
        </div>
        {nearbyMeetings.length
          ? nearbyMeetings.map((m) => (
            <Link
              to={`/meetings/${m.id}`}
              key={m.id}
              className="calendar-event"
            >
              <span className={`event-line ${m.priority.toLowerCase()}`} />
              <span>
                <strong>{m.title}</strong>
                <small>{formatShortDate(m.date)} · {m.time} МСК · {m.type}</small>
              </span>
              <ArrowUpRight size={15} />
            </Link>
          ))
          : <p className="calendar-empty">Заседаний на эту дату нет.</p>}
      </div>
    </Card>
  );
}

function ActivityHeatmap({ weeks = 12 }: { weeks?: number }) {
  const { meetings } = useDataStore();
  const start = addDays(TODAY_MSK, -(weeks * 7 - 1));
  const dates = Array.from({ length: weeks * 7 }, (_, i) => addDays(start, i));
  const meetingDates = new Set(meetings.filter((m) => m.status === "Завершено").map((m) => m.date));
  return (
    <div className="heatmap-wrap" role="img" aria-label={`${dates.filter((date) => meetingDates.has(date)).length} дат заседаний за последние ${weeks} недель. Салатовые ячейки обозначают дни заседаний.`}>
      <div className="heatmap-days">
        <span>Пн</span>
        <span>Ср</span>
        <span>Пт</span>
      </div>
      <div
        className="heatmap-grid"
        style={{ gridTemplateColumns: `repeat(${weeks}, minmax(0,1fr))` }}
      >
        {dates.map((date) => <span key={date} title={`${formatDate(date)}: ${meetingDates.has(date) ? "заседание" : "без заседаний"}`} className={`heat-cell ${meetingDates.has(date) ? "active" : ""}`} />)}
      </div>
      <div className="heatmap-legend">
        <span>Без заседаний</span>
        <i />
        <i className="active" />
        <span>Заседание</span>
      </div>
    </div>
  );
}

function Dashboard() {
  const { meetings, decisions, mode } = useDataStore();
  const futureMeetings = meetings.filter((m) => m.status === "Запланировано" && m.date >= TODAY_MSK);
  const { period } = useContext(PeriodContext);
  const stats = getAnalytics(period, meetings, decisions);
  const reduced = useReducedMotion();
  return (
    <>
      <div className="welcome">
        <div>
          <span className="eyebrow accent">ПАНЕЛЬ УПРАВЛЕНИЯ / {TODAY_MSK.slice(0, 4)}</span>
          <h1>
            Добро пожаловать в Сенат<span>.</span>
          </h1>
          <p>Обзор заседаний, решений и текущей деятельности Республики.</p>
        </div>
        <div className="welcome-date">
          <span>СЕГОДНЯ</span>
          <strong>{formatDate(TODAY_MSK)}</strong>
          <small>{formatDate(TODAY_MSK, { weekday: "long" })} · МСК</small>
        </div>
      </div>
      <div className="dashboard-top">
        <div className="dashboard-side-stats">
          <StatCard
            label="Проведено заседаний"
            value={mode === "unavailable" ? "—" : stats.meetings}
            note={stats.label}
            icon={<CalendarDays size={19} />}
          />
          <StatCard
            label="Предстоящие заседания"
            value={mode === "unavailable" ? "—" : futureMeetings.length}
            note={futureMeetings.length ? `Ближайшее · ${formatShortDate(futureMeetings[0].date)}` : "Пока не запланированы"}
            icon={<Clock3 size={19} />}
            accent="yellow"
          />
        </div>
        <Link className="card senate-feature" to="/about">
          <div className="feature-top">
            <span className="eyebrow">ИНСТИТУТ / 001</span>
            <ArrowUpRight size={20} />
          </div>
          <div className="feature-center">
            <SenateSculpture compact />
            <h2>
              ARGENTI<br />
              <span>SENATE</span>
            </h2>
          </div>
          <div className="feature-bottom">
            <p>
              Цифровое пространство<br />законодательной деятельности.
            </p>
            <span>ТЕХНОЛОГИЧЕСКАЯ РЕСПУБЛИКА АРГЕНТИ</span>
          </div>
        </Link>
        <CalendarWidget compact />
      </div>
      <div className="dashboard-stats">
        <StatCard
          label="Принято решений"
          value={mode === "unavailable" ? "—" : stats.decisions}
          note="За выбранный период"
          icon={<FileCheck2 size={18} />}
          accent="critical"
        />
        <StatCard
          label="Средняя посещаемость"
          value={stats.attendance === null ? "Нет данных" : `${stats.attendance}%`}
          note="Доля присутствовавших от ожидаемых"
          icon={<Users size={18} />}
          accent="green"
        />
        <StatCard
          label="Выполнение повестки"
          value={stats.agendaTotal ? `${Math.round(stats.agendaConsidered / stats.agendaTotal * 100)}%` : "Нет данных"}
          note={`${stats.agendaConsidered} из ${stats.agendaTotal} пунктов рассмотрено`}
          icon={<Check size={18} />}
          accent="yellow"
        />
        <StatCard
          label="Активность Сената"
          value={stats.meetings === 0 ? "Нет данных" : stats.meetings >= 4 ? "Высокая" : "Стабильная"}
          note={`${stats.meetings} ${
            plural(stats.meetings, "заседание", "заседания", "заседаний")
          } за период`}
          icon={<Activity size={18} />}
        />
      </div>
      <div className="dashboard-bottom">
        <ChartCard
          title="Динамика заседаний"
          subtitle={`Количество по месяцам · ${TODAY_MSK.slice(0, 4)}`}
        >
          {stats.chart.length ? <div className="chart-box" role="img" aria-label="Количество заседаний по месяцам выбранного периода">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={stats.chart}
                margin={{ top: 10, right: 0, left: -25, bottom: 0 }}
              >
                <CartesianGrid
                  vertical={false}
                  stroke="#343f35"
                  strokeDasharray="3 5"
                />
                <XAxis
                  dataKey="month"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: "#9eab9e", fontSize: 11 }}
                />
                <YAxis
                  allowDecimals={false}
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: "#9eab9e", fontSize: 11 }}
                />
                <ChartTooltip
                  contentStyle={{
                    background: "#252d26",
                    border: "1px solid #343f35",
                    borderRadius: 12,
                    color: "#f2f5ef",
                  }}
                />
                <Bar
                  dataKey="meetings"
                  name="Заседания"
                  fill="#b8f36a"
                  radius={[5, 5, 0, 0]}
                  maxBarSize={32}
                  isAnimationActive={!reduced}
                  animationDuration={550}
                />
              </BarChart>
            </ResponsiveContainer>
          </div> : <EmptyState title="Для диаграммы пока нет данных" description="Проведённые заседания появятся на графике после публикации." />}
        </ChartCard>
        <ChartCard title="Посещаемость" subtitle="Средняя за период">
          {stats.attendance !== null ? <div className="attendance-panel">
            <div className="attendance-number">
              {stats.attendance ?? "—"}
              {stats.attendance !== null && <span>%</span>}
            </div>
            <div
              className="attendance-ring"
              style={{ ["--progress" as string]: `${stats.attendance ?? 0}%` }}
            >
              <span>{stats.attendance === null ? "нет данных" : "участие"}</span>
            </div>
            <p>
              Доля присутствовавших участников на заседаниях выбранного периода.
            </p>
          </div> : <EmptyState title="Посещаемость пока не рассчитана" description="Для расчёта нужны данные об ожидаемых и присутствовавших участниках." />}
        </ChartCard>
        <ChartCard title="Дни заседаний" subtitle="Последние 12 недель">
          <ActivityHeatmap />
        </ChartCard>
      </div>
      <Card className="recent-card">
        <div className="card-heading">
          <div>
            <h3>Последние решения</h3>
            <p>{mode === "mock" ? "Локальный демонстрационный реестр" : "Опубликованные документы"}</p>
          </div>
          <Link className="text-link" to="/decisions">
            Смотреть все <ArrowUpRight size={17} />
          </Link>
        </div>
        <div className="recent-list">
          {decisions.slice(-4).reverse().map((d) => (
            <Link
              key={d.id}
              to={`/decisions?item=${d.id}`}
              className="recent-row"
            >
              <span className="recent-number">{d.number}</span>
              <strong>{d.title}</strong>
              <span>{formatShortDate(d.date)}</span>
              <StatusBadge status={d.status} />
              <ArrowUpRight size={17} />
            </Link>
          ))}
          {!decisions.length && <EmptyState title="Решений пока нет" description="После публикации решения появятся в реестре." />}
        </div>
      </Card>
    </>
  );
}

function Schedule() {
  const { meetings, saveMeeting, canEdit, mode } = useDataStore();
  const [view, setView] = useState<"Неделя" | "Месяц" | "Список">("Неделя");
  const [offset, setOffset] = useState(0);
  const [status, setStatus] = useState("Все статусы");
  const [selected, setSelected] = useState(TODAY_MSK);
  const [form, setForm] = useState(false);
  const [toast, setToast] = useState("");
  const baseMonday = addDays(TODAY_MSK, -((dateObj(TODAY_MSK).getUTCDay() + 6) % 7));
  const monday = addDays(baseMonday, offset * 7);
  const week = Array.from({ length: 7 }, (_, i) => addDays(monday, i));
  const monthDate = monthStart(Number(TODAY_MSK.slice(0, 4)), Number(TODAY_MSK.slice(5, 7)) - 1 + offset);
  const year = monthDate.getUTCFullYear();
  const month = monthDate.getUTCMonth();
  const filtered = meetings.filter((m) =>
    status === "Все статусы" || m.status === status
  );
  const visible = view === "Неделя"
    ? filtered.filter((m) => week.includes(m.date))
    : view === "Месяц"
    ? filtered.filter((m) => inMonth(m.date, year, month))
    : filtered.filter((m) => m.date >= TODAY_MSK);
  const navLabel = view === "Неделя"
    ? `${formatShortDate(week[0])} — ${formatShortDate(week[6])} ${week[6].slice(0, 4)}`
    : view === "Месяц"
    ? monthLabel(year, month)
    : "Ближайшие заседания";
  const navigateDate = (direction: number) => {
    const next = offset + direction;
    setOffset(next);
    if (view === "Неделя") setSelected(addDays(baseMonday, next * 7));
    if (view === "Месяц") setSelected(iso(monthStart(Number(TODAY_MSK.slice(0, 4)), Number(TODAY_MSK.slice(5, 7)) - 1 + next)));
  };
  return (
    <>
      <PageHeading
        eyebrow="02 / КАЛЕНДАРЬ"
        title="Расписание заседаний"
        description="Планируйте работу и следите за повесткой Сената. Время указано по МСК."
        right={canEdit ?
          <Button onClick={() => setForm(true)}>
            <Plus size={17} /> Добавить заседание
          </Button>
        : undefined}
      />
      <Card className="schedule-card">
        <div className="schedule-controls">
          <Tabs
            items={["Неделя", "Месяц", "Список"] as const}
            value={view}
            onChange={(v) => {
              setView(v);
              setOffset(0);
              setSelected(TODAY_MSK);
            }}
            ariaLabel="Режим расписания"
          />
          <div className="schedule-controls-right">
            <FilterSelect
              label="Фильтр по статусу"
              value={status}
              onChange={setStatus}
              options={[
                "Все статусы",
                "Запланировано",
                "Завершено",
                "Отменено",
              ]}
            />
            <div className="date-nav">
              <IconButton label="Назад" onClick={() => navigateDate(-1)}>
                <ChevronLeft size={18} />
              </IconButton>
              <span>{navLabel}</span>
              <IconButton
                label="Вперёд"
                onClick={() => navigateDate(1)}
              >
                <ChevronRight size={18} />
              </IconButton>
            </div>
          </div>
        </div>
        {view === "Неделя" && (
          <>
            <p className="week-hint">Проведите в сторону, чтобы увидеть остальные дни недели.</p>
            <div className="week-scroll">
              <div className="week-grid">
                <div className="week-corner">МСК</div>
                {week.map((date, i) => (
                  <button
                    type="button"
                    key={date}
                    className={`week-header ${
                      selected === date ? "selected" : ""
                    }`}
                    onClick={() => setSelected(date)}
                  >
                    <span>{weekDays[i]}</span>
                    <strong>{Number(date.slice(-2))}</strong>
                  </button>
                ))}
                {[17, 18, 19, 20, 21].map((hour) => (
                  <div className="week-row" key={hour}>
                    <div className="week-time">{hour}:00</div>
                    {week.map((date) => {
                      const slot = visible.filter((m) =>
                        m.date === date && Number(m.time.slice(0, 2)) === hour
                      );
                      return (
                        <div className="week-cell" key={date}>
                          {slot.map((m) => (
                            <Link
                              to={`/meetings/${m.id}`}
                              key={m.id}
                              className={`week-event priority-${m.priority.toLowerCase()}`}
                            >
                              <span>{m.time} · {m.type}</span>
                              <strong>{m.title}</strong>
                              <small>{m.priority} · {m.status}</small>
                            </Link>
                          ))}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
            <div className="selected-day">
              <strong>
                {formatDate(selected, {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                })}
              </strong>
              <span>
                {filtered.filter((m) => m.date === selected).length
                  ? `${filtered.filter((m) => m.date === selected).length} ${
                    plural(
                      filtered.filter((m) => m.date === selected).length,
                      "событие",
                      "события",
                      "событий",
                    )
                  }`
                  : "Нет заседаний"}
              </span>
            </div>
          </>
        )}
        {view === "Месяц" && (
          <div className="month-view">
            <div className="month-grid">
              {weekDays.map((d) => (
                <span className="month-weekday" key={d}>{d}</span>
              ))}
              {calendarDays(year, month).map((date) => {
                const dayEvents = filtered.filter((m) => m.date === date);
                return (
                  <button
                    type="button"
                    key={date}
                    onClick={() => setSelected(date)}
                    className={`month-cell ${
                      !inMonth(date, year, month) ? "muted" : ""
                    } ${selected === date ? "selected" : ""}`}
                  >
                    <span>{Number(date.slice(-2))}</span>
                    {dayEvents.slice(0, 2).map((m) => (
                      <small key={m.id}>{m.time} {m.title}</small>
                    ))}
                    {dayEvents.length > 2 && <em>+{dayEvents.length - 2}</em>}
                  </button>
                );
              })}
            </div>
            <div className="month-selected">
              <h3>{formatDate(selected)}</h3>
              {filtered.filter((m) => m.date === selected).length
                ? filtered.filter((m) => m.date === selected).map((m) => (
                  <MeetingCard meeting={m} compact key={m.id} />
                ))
                : <p>На выбранную дату заседаний нет.</p>}
            </div>
          </div>
        )}
        {view === "Список" && (
          <div className="schedule-list">
            {visible.length
              ? visible.sort((a, b) => a.date.localeCompare(b.date)).map(
                (m) => <MeetingCard key={m.id} meeting={m} compact />,
              )
              : <EmptyState />}
          </div>
        )}
      </Card>
      {form && canEdit && <Modal title="Новое заседание" onClose={() => setForm(false)}><MeetingEditor onSave={async (meeting) => { await saveMeeting(meeting); setForm(false); setToast(mode === "mock" ? "Заседание сохранено локально." : "Заседание сохранено в реестре."); }} /></Modal>}
      {toast && <Toast message={toast} onClose={() => setToast("")} />}
    </>
  );
}

function ArchivePage() {
  const { meetings } = useDataStore();
  const pastMeetings = meetings.filter((m) => m.status === "Завершено");
  const [query, setQuery] = useState("");
  const [month, setMonth] = useState("Все месяцы");
  const [year, setYear] = useState("Все годы");
  const [type, setType] = useState("Все типы");
  const [status, setStatus] = useState("Все статусы");
  const [view, setView] = useState<"Карточки" | "Таблица">("Карточки");
  const filtered = [...pastMeetings].reverse().filter((m) =>
    m.title.toLowerCase().includes(query.toLowerCase()) &&
    (month === "Все месяцы" ||
      monthNames[Number(m.date.slice(5, 7)) - 1] === month) &&
    (year === "Все годы" || m.date.startsWith(year)) &&
    (type === "Все типы" || m.type === type) &&
    (status === "Все статусы" || m.status === status)
  );
  return (
    <>
      <PageHeading
        eyebrow="03 / ИСТОРИЯ"
        title="Архив заседаний"
        description="История парламентской деятельности, обсуждений и принятых решений."
        right={
          <div className="page-count">
            <strong>{filtered.length}</strong>
            <span>
              {plural(
                filtered.length,
                "запись найдена",
                "записи найдены",
                "записей найдено",
              )}
            </span>
          </div>
        }
      />
      <Card className="archive-panel">
        <div className="filter-row">
          <SearchInput
            value={query}
            onChange={setQuery}
            placeholder="Поиск по названию"
          />
          <FilterSelect
            value={month}
            onChange={setMonth}
            label="Месяц"
            options={["Все месяцы", ...monthNames.slice(4, 11)]}
          />
          <FilterSelect
            value={year}
            onChange={setYear}
            label="Год"
            options={["Все годы", "2026"]}
          />
          <FilterSelect
            value={type}
            onChange={setType}
            label="Тип"
            options={["Все типы", "Пленарное", "Комитет", "Совещание"]}
          />
          <FilterSelect
            value={status}
            onChange={setStatus}
            label="Статус"
            options={["Все статусы", "Завершено"]}
          />
        </div>
        <div className="archive-toolbar">
          <span>
            <SlidersHorizontal size={16} /> Показано {filtered.length} из{" "}
            {pastMeetings.length}
          </span>
          <Tabs
            items={["Карточки", "Таблица"] as const}
            value={view}
            onChange={setView}
            ariaLabel="Вид архива"
          />
        </div>
        {filtered.length
          ? view === "Карточки"
            ? (
              <div className="archive-grid">
                {filtered.map((m) => (
                  <div className="archive-card" key={m.id}>
                    <div className="archive-card-head">
                      <span>ЗАСЕДАНИЕ № {m.number}</span>
                      <StatusBadge status={m.status} />
                    </div>
                    <h3>{m.title}</h3>
                    <p>{m.summary}</p>
                    <div className="archive-meta">
                      <span>
                        <CalendarDays size={15} />
                        {formatDate(m.date)}
                      </span>
                      <span>
                        <Clock3 size={15} />
                        {m.time} МСК · {m.duration} мин
                      </span>
                      <span>
                        <Users size={15} />
                        {m.participants === null ? "Посещаемость не указана" : `${m.participants} участников`}
                      </span>
                    </div>
                    <div className="archive-card-foot">
                      <span>{m.type}</span>
                      <Link to={`/meetings/${m.id}`}>
                        Подробнее <ArrowUpRight size={17} />
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )
            : (
              <DataTable
                headers={[
                  "№",
                  "Дата",
                  "Заседание",
                  "Тип",
                  "Длительность",
                  "Участники",
                  "Статус",
                  "",
                ]}
                rows={filtered.map(
                  (m) => [
                    m.number,
                    formatShortDate(m.date),
                    <strong key={`title-${m.id}`}>{m.title}</strong>,
                    m.type,
                    `${m.duration} мин`,
                    m.participants ?? "—",
                    <StatusBadge key={`status-${m.id}`} status={m.status} />,
                    <Link
                      key={`link-${m.id}`}
                      className="table-link"
                      to={`/meetings/${m.id}`}
                    >
                      Открыть <ArrowUpRight size={15} />
                    </Link>,
                  ],
                )}
              />
            )
          : <EmptyState title={pastMeetings.length ? "Ничего не найдено" : "В архиве ещё нет записей"} description={pastMeetings.length ? "Попробуйте изменить поиск или фильтры." : "Завершённые опубликованные заседания появятся здесь."} />}
      </Card>
    </>
  );
}

function MeetingPage() {
  const { meetings, decisions, saveMeeting, canEdit, mode } = useDataStore();
  const [editing, setEditing] = useState(false);
  const [toast, setToast] = useState("");
  const { id } = useParams();
  const m = meetings.find((meeting) => meeting.id === id);
  if (!m) {
    return (
      <Card className="not-found">
        <EmptyState
          title="Заседание не найдено"
          description="Проверьте ссылку или вернитесь в архив."
        />
        <Link className="button button-secondary" to="/archive">
          Открыть архив
        </Link>
      </Card>
    );
  }
  const linkedDecisions = decisions.filter((decision) => decision.meetingId === m.id);
  const agendaPercent = m.status === "Завершено" && m.agenda.length
    ? Math.round(m.agenda.filter((item) => item.status === "Рассмотрено").length / m.agenda.length * 100) : null;
  return (
    <>
      <Link
        className="back-link"
        to={m.status === "Завершено" ? "/archive" : "/schedule"}
      >
        <ArrowLeft size={16} /> {m.status === "Завершено"
          ? "Вернуться в архив"
          : "Вернуться к расписанию"}
      </Link>
      <div className="meeting-detail-head">
        <span className="eyebrow accent">
          ЗАСЕДАНИЕ №{m.number} / {m.type.toUpperCase()}
        </span>
        <h1>{m.title}</h1>
        <div className="detail-meta">
          <span>
            <CalendarDays size={17} />
            {formatDate(m.date)}
          </span>
          <span>
            <Clock3 size={17} />
            {m.time} МСК · {m.duration} мин
          </span>
          <StatusBadge status={m.status} />
          <StatusBadge status={m.priority} />
        </div>
        {canEdit && <Button variant="secondary" onClick={() => setEditing(true)}>Изменить заседание</Button>}
      </div>
      <div className="meeting-detail-grid">
        <div className="detail-main">
          <Card className="summary-card">
            <span className="eyebrow accent">КРАТКО О ЗАСЕДАНИИ</span>
            <p>{m.summary || "Краткий итог пока не опубликован."}</p>
          </Card>
          <Card className="agenda-card">
            <div className="card-heading">
              <div>
                <h3>Повестка</h3>
                <p>{m.agenda.length} вопроса</p>
              </div>
            </div>
            <div className="agenda-list">
              {m.agenda.map((a, i) => (
                <div className="agenda-item" key={i}>
                  <span>{String(i + 1).padStart(2, "0")}</span>
                  <div>
                    <h4>{a.title}</h4>
                    <p>{a.result}</p>
                  </div>
                  <Badge tone={a.status === "Рассмотрено" ? "green" : "yellow"}>
                    {a.status}
                  </Badge>
                </div>
              ))}
              {!m.agenda.length && <EmptyState title="Повестка пока не опубликована" description="Вопросы появятся после подготовки материалов." />}
            </div>
          </Card>
          <Card className="detail-decisions">
            <div className="card-heading">
              <div>
                <h3>Принятые решения</h3>
                <p>Результаты обсуждения</p>
              </div>
            </div>
            {linkedDecisions.length
              ? linkedDecisions.map((d) => (
                <div className="detail-decision" key={d.id}>
                  <span>
                    <Check size={17} />
                  </span>
                  <p><Link to={`/decisions?item=${d.id}`}>{d.title} <ArrowUpRight size={14} /></Link><small>{d.description}</small></p>
                </div>
              ))
              : (
                <EmptyState
                  title="Решений пока нет"
                  description="Информация появится после проведения заседания."
                />
              )}
          </Card>
        </div>
        <div className="detail-aside">
          <Card className="detail-stats">
            <span className="eyebrow">СТАТИСТИКА ЗАСЕДАНИЯ</span>
            <div className="detail-stat">
              <strong>{m.status === "Завершено" ? m.participants ?? "—" : "—"}</strong>
              <span>участников</span>
            </div>
            <div className="detail-stat">
              <strong>{m.agenda.length}</strong>
              <span>вопроса в повестке</span>
            </div>
            <div className="detail-stat">
              <strong>{linkedDecisions.length}</strong>
              <span>решения</span>
            </div>
            <div className="detail-stat">
              <strong>
                {m.duration}
                <small>мин</small>
              </strong>
              <span>длительность</span>
            </div>
            <div className="detail-progress">
              <span>
                Выполнение повестки{" "}
                <strong>{agendaPercent === null ? "Нет данных" : `${agendaPercent}%`}</strong>
              </span>
              <i>
                <b
                  style={{ width: `${agendaPercent ?? 0}%` }}
                />
              </i>
            </div>
          </Card>
          <Card className="timeline-card">
            <div className="card-heading">
              <div>
                <h3>Хронология</h3>
                <p>Время по МСК</p>
              </div>
            </div>
            <div className="timeline-item"><span>{m.time}</span><i/><p>{m.status === "Завершено" ? "Начало заседания" : "Планируемое начало"}</p></div>
            {m.status === "Завершено" && <p className="calendar-empty">Подробная хронология пока не опубликована.</p>}
          </Card>
        </div>
      </div>
      <Card className="document-card"><div><span className="eyebrow accent">МАТЕРИАЛЫ</span><h3>Связанные документы</h3><p>Документы к этому заседанию пока не опубликованы.</p></div><ShieldCheck size={35} /></Card>
      {editing && canEdit && <Modal title="Редактировать заседание" onClose={() => setEditing(false)}><MeetingEditor meeting={m} onSave={async (updated) => { await saveMeeting(updated); setEditing(false); setToast(mode === "mock" ? "Изменения сохранены локально." : "Изменения сохранены в реестре."); }} /></Modal>}
      {toast && <Toast message={toast} onClose={() => setToast("")} />}
    </>
  );
}

function Analytics() {
  const { meetings, decisions, mode } = useDataStore();
  const pastMeetings = meetings.filter((m) => m.status === "Завершено");
  const { period, setPeriod } = useContext(PeriodContext);
  const stats = getAnalytics(period, meetings, decisions);
  const comparison = getPeriodComparison(period, meetings);
  const reduced = useReducedMotion();
  const typeCounts = [{
    name: "Пленарные",
    value: pastMeetings.filter((m) => m.type === "Пленарное").length,
    color: "#b8f36a",
  }, {
    name: "Комитеты",
    value: pastMeetings.filter((m) => m.type === "Комитет").length,
    color: "#e98b8b",
  }, {
    name: "Совещания",
    value: pastMeetings.filter((m) => m.type === "Совещание").length,
    color: "#85b86c",
  }];
  const execution = [
    { label: "Исполнено", count: decisions.filter((d) => d.status === "Исполнено").length, color: "#85b86c" },
    { label: "На исполнении", count: decisions.filter((d) => d.status === "На исполнении").length, color: "#d0ff91" },
    { label: "Принято", count: decisions.filter((d) => d.status === "Принято").length, color: "#b8f36a" },
    { label: "Отложено", count: decisions.filter((d) => d.status === "Отложено").length, color: "#9eab9e" },
  ];
  return (
    <>
      <PageHeading
        eyebrow="04 / ПОКАЗАТЕЛИ"
        title="Аналитика Сената"
        description={mode === "mock" ? "Показатели по локальным демонстрационным записям." : "Показатели по опубликованным сведениям Сената."}
        right={
          <Tabs
            items={PERIODS}
            value={period}
            onChange={setPeriod}
            ariaLabel="Период аналитики"
          />
        }
      />
      <div className="analytics-period">{stats.label}</div>
      {comparison && <div className="analytics-comparison"><span>СРАВНЕНИЕ ПЕРИОДОВ</span><strong>{comparison.current} <small>заседаний сейчас</small></strong><i /> <strong>{comparison.previous} <small>за предыдущие {comparison.length} дней</small></strong><b className={comparison.difference > 0 ? "positive" : ""}>{comparison.difference > 0 ? "+" : ""}{comparison.difference} к предыдущему периоду</b></div>}
      <div className="analytics-stats">
        <StatCard
          label="Всего заседаний"
          value={mode === "unavailable" ? "—" : pastMeetings.length}
          note={`Все доступные записи ${TODAY_MSK.slice(0, 4)} года`}
          icon={<Archive size={18} />}
        />
        <StatCard
          label="Заседаний за период"
          value={mode === "unavailable" ? "—" : stats.meetings}
          note="Проведённые встречи"
          icon={<CalendarDays size={18} />}
        />
        <StatCard
          label="Средняя посещаемость"
          value={stats.attendance === null ? "Нет данных" : `${stats.attendance}%`}
          note="От ожидаемых участников"
          icon={<Users size={18} />}
          accent="green"
        />
        <StatCard
          label="Принято решений"
          value={mode === "unavailable" ? "—" : stats.decisions}
          note="По заседаниям периода"
          icon={<FileCheck2 size={18} />}
          accent="critical"
        />
        <StatCard
          label="Доля выполненных решений"
          value={stats.decisions ? `${Math.round(stats.completed / stats.decisions * 100)}%` : "Нет данных"}
          note={`${stats.completed} из ${stats.decisions} решений периода`}
          icon={<Check size={18} />}
          accent="green"
        />
        <StatCard
          label="Средняя длительность"
          value={stats.duration === null ? "Нет данных" : `${stats.duration} мин`}
          note="На одно заседание"
          icon={<Clock3 size={18} />}
          accent="yellow"
        />
      </div>
      <div className="analytics-chart-grid">
        <ChartCard
          title="Активность заседаний"
          subtitle="Количество заседаний по месяцам"
          className="analytics-wide"
        >
          {stats.chart.length ? <div className="chart-box tall" role="img" aria-label="Количество заседаний по месяцам выбранного периода">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={stats.chart}
                margin={{ top: 15, right: 5, left: -25, bottom: 0 }}
              >
                <CartesianGrid
                  vertical={false}
                  stroke="#343f35"
                  strokeDasharray="3 5"
                />
                <XAxis
                  dataKey="month"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: "#9eab9e", fontSize: 11 }}
                />
                <YAxis
                  allowDecimals={false}
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: "#9eab9e", fontSize: 11 }}
                />
                <ChartTooltip
                  contentStyle={{
                    background: "#252d26",
                    border: "1px solid #343f35",
                    borderRadius: 12,
                    color: "#f2f5ef",
                  }}
                />
                <Bar
                  dataKey="meetings"
                  name="Заседания"
                  fill="#b8f36a"
                  radius={[6, 6, 0, 0]}
                  maxBarSize={44}
                  isAnimationActive={!reduced}
                  animationDuration={550}
                />
              </BarChart>
            </ResponsiveContainer>
          </div> : <EmptyState title="Для диаграммы пока нет данных" description="Активность появится после проведения заседаний." />}
        </ChartCard>
        <ChartCard title="Посещаемость" subtitle="Средний процент по месяцам">
          {stats.chart.some((row) => row.attendance !== null) ? <div className="chart-box tall" role="img" aria-label="Средняя посещаемость по месяцам, от 0 до 100 процентов">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={stats.chart}
                margin={{ top: 20, right: 10, left: -20, bottom: 0 }}
              >
                <CartesianGrid
                  vertical={false}
                  stroke="#343f35"
                  strokeDasharray="3 5"
                />
                <XAxis
                  dataKey="month"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: "#9eab9e", fontSize: 11 }}
                />
                <YAxis
                  domain={[0, 100]}
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: "#9eab9e", fontSize: 11 }}
                />
                <ChartTooltip
                  contentStyle={{
                    background: "#252d26",
                    border: "1px solid #343f35",
                    borderRadius: 12,
                    color: "#f2f5ef",
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="attendance"
                  name="Посещаемость"
                  stroke="#85b86c"
                  strokeWidth={3}
                  isAnimationActive={!reduced}
                  animationDuration={550}
                  dot={{
                    r: 4,
                    fill: "#85b86c",
                    stroke: "#171d18",
                    strokeWidth: 2,
                  }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div> : <EmptyState title="Посещаемость пока не рассчитана" description="Нужны данные об ожидаемых и присутствовавших участниках." />}
        </ChartCard>
        <ChartCard title="Типы заседаний" subtitle="Все доступные записи">
          {pastMeetings.length ? <div className="donut-layout">
            <div className="donut" role="img" aria-label={`Распределение ${pastMeetings.length} заседаний по типам`}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={typeCounts}
                    dataKey="value"
                    nameKey="name"
                    innerRadius="58%"
                    outerRadius="78%"
                    paddingAngle={3}
                    stroke="none"
                    isAnimationActive={!reduced}
                    animationDuration={550}
                  >
                    {typeCounts.map((item) => (
                      <Cell key={item.name} fill={item.color} />
                    ))}
                  </Pie>
                  <ChartTooltip
                    contentStyle={{
                      background: "#252d26",
                      border: "1px solid #343f35",
                      borderRadius: 12,
                      color: "#f2f5ef",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="donut-center">
                <strong>{pastMeetings.length}</strong>
                <small>всего</small>
              </div>
            </div>
            <div className="donut-legend">
              {typeCounts.map((item) => (
                <div key={item.name}>
                  <i style={{ background: item.color }} />
                  {item.name}
                  <strong>{item.value}</strong>
                </div>
              ))}
            </div>
          </div> : <EmptyState title="Типы заседаний пока неизвестны" description="Распределение появится после первого завершённого заседания." />}
        </ChartCard>
        <ChartCard title="Исполнение решений" subtitle={`Статусы ${decisions.length} решений`}>
          {decisions.length ? <div className="progress-list">
            {execution.map((item) => (
              <div key={item.label}>
                <div>
                  <span>{item.label}</span>
                    <strong>{item.count} / {decisions.length}</strong>
                </div>
                <i>
                  <b
                    style={{
                      width: `${decisions.length ? item.count / decisions.length * 100 : 0}%`,
                      background: item.color,
                    }}
                  />
                </i>
              </div>
            ))}
          </div> : <EmptyState title="Решений пока нет" description="Исполнение решений отобразится после их публикации." />}
        </ChartCard>
        <ChartCard
          title="Календарь активности"
          subtitle="Дни проведённых заседаний"
        >
          {pastMeetings.length ? <ActivityHeatmap weeks={16} /> : <EmptyState title="Календарь активности пуст" description="Дни проведённых заседаний будут отмечены здесь." />}
          <p className="chart-footnote">
            Отмечены только даты заседаний. Остальные рабочие действия не
            учитываются.
          </p>
        </ChartCard>
      </div>
      <details className="analytics-table"><summary>Показать данные графиков в таблице</summary><DataTable headers={["Месяц", "Заседания", "Решения", "Посещаемость"]} rows={stats.chart.map((row) => [row.month, row.meetings, row.decisions, row.attendance === null ? "Нет данных" : `${row.attendance}%`])} /></details>
    </>
  );
}

function DecisionsPage() {
  const { decisions, meetings, saveDecision, canEdit, mode } = useDataStore();
  const [searchParams, setSearchParams] = useSearchParams();
  const itemId = searchParams.get("item");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("Все статусы");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [creating, setCreating] = useState(false);
  const [toast, setToast] = useState("");
  const selected = decisions.find((d) => d.id === (itemId ?? selectedId)) ??
    null;
  const filtered = [...decisions].reverse().filter((d) =>
    d.title.toLowerCase().includes(query.toLowerCase()) &&
    (status === "Все статусы" || d.status === status)
  );
  return (
    <>
      <PageHeading
        eyebrow="05 / РЕЕСТР"
        title="Решения и постановления"
        description="Единый обзор результатов работы Сената и статуса исполнения."
        right={canEdit ? <Button onClick={() => setCreating(true)}><Plus size={17} /> Добавить решение</Button> : undefined}
      />
      <div className="decision-stats">
        <StatCard
          label="Всего решений"
          value={decisions.length}
          note="В опубликованном реестре"
        />
        <StatCard
          label="Исполнено"
          value={decisions.filter((d) => d.status === "Исполнено").length}
          note="Завершённые задачи"
          accent="green"
        />
        <StatCard
          label="На исполнении"
          value={decisions.filter((d) => d.status === "На исполнении").length}
          note="Текущая работа"
          accent="yellow"
        />
      </div>
      <Card className="decisions-panel">
        <div className="filter-row">
          <SearchInput
            value={query}
            onChange={setQuery}
            placeholder="Поиск по решениям"
          />
          <FilterSelect
            label="Статус решения"
            value={status}
            onChange={setStatus}
            options={[
              "Все статусы",
              "Принято",
              "На исполнении",
              "Исполнено",
              "Отложено",
            ]}
          />
          <span className="results-count">Найдено: {filtered.length}</span>
        </div>
        {filtered.length
          ? (
            <div className="decision-list">
              {filtered.map((d) => (
                <button
                  type="button"
                  className="decision-row"
                  key={d.id}
                  onClick={() => {
                    setSelectedId(d.id);
                    if (itemId) setSearchParams({}, { replace: true });
                  }}
                >
                  <span className="decision-num">{d.number}</span>
                  <span className="decision-main">
                    <strong>{d.title}</strong>
                    <small>{d.published === false ? "Черновик · " : ""}{d.description}</small>
                  </span>
                  <span className="decision-date">
                    {formatShortDate(d.date)}
                  </span>
                  <StatusBadge status={d.status} />
                  <ArrowUpRight size={18} />
                </button>
              ))}
            </div>
          )
          : <EmptyState />}
      </Card>
      {selected && !editing && (
        <Modal
          title={`Решение ${selected.number}`}
          onClose={() => {
            setSelectedId(null);
            if (itemId) setSearchParams({}, { replace: true });
          }}
        >
          <div className="decision-modal">
            <StatusBadge status={selected.status} />
            <h3>{selected.title}</h3>
            <p>{selected.description}</p>
            <div>
              <span>Дата принятия</span>
              <strong>{formatDate(selected.date)}</strong>
            </div>
            <div>
              <span>Связанное заседание</span>
              <Link to={`/meetings/${selected.meetingId}`}>
                Открыть заседание <ArrowUpRight size={15} />
              </Link>
            </div>
            {mode === "mock" && <p className="demo-note">Это демонстрационная запись без юридического статуса.</p>}
            {canEdit && <Button variant="secondary" onClick={() => setEditing(true)}>Изменить статус и сведения</Button>}
          </div>
        </Modal>
      )}
      {editing && selected && canEdit && <Modal title={`Изменить ${selected.number}`} onClose={() => setEditing(false)}><DecisionEditor decision={selected} meetings={meetings} onSave={async (updated) => { await saveDecision(updated); setEditing(false); setToast(mode === "mock" ? "Решение обновлено локально." : "Решение обновлено в реестре."); }} /></Modal>}
      {creating && canEdit && <Modal title="Новое решение" onClose={() => setCreating(false)}><DecisionEditor meetings={meetings} onSave={async (created) => { await saveDecision(created); setCreating(false); setToast(mode === "mock" ? "Решение добавлено локально." : "Решение добавлено в реестр."); }} /></Modal>}
      {toast && <Toast message={toast} onClose={() => setToast("")} />}
    </>
  );
}

function About() {
  return (
    <>
      <PageHeading
        eyebrow="06 / ИНСТИТУТ"
        title="О Сенате Республики"
        description="Принципы, структура и направления работы в цифровом пространстве."
      />
      <div className="about-hero">
        <span className="eyebrow">ARGENTI / DIGITAL SENATE</span>
        <SenateMark size={116} />
        <h2>
          Технологичное управление<br />
          <span>начинается с ясности.</span>
        </h2>
        <p>
          Сенат Технологической Республики Аргенти представлен здесь как
          цифровой законодательный институт. Эта страница демонстрирует
          возможную структуру официального портала; описания не являются
          действующими правовыми нормами.
        </p>
      </div>
      <div className="about-grid">
        <Card>
          <span className="about-index">01 / РОЛЬ</span>
          <h3>Пространство обсуждения</h3>
          <p>
            Раздел объединяет сведения о заседаниях, рассматриваемых темах и
            опубликованных результатах. Конкретные полномочия Сената здесь не
            утверждаются до публикации официальных документов.
          </p>
        </Card>
        <Card>
          <span className="about-index">02 / ОТКРЫТОСТЬ</span>
          <h3>Понятные итоги</h3>
          <p>
            Повестки, краткие пересказы и статусы решений помогают следить за
            ходом работы. До публикации материалов соответствующие разделы
            остаются пустыми.
          </p>
        </Card>
        <Card>
          <span className="about-index">03 / СИСТЕМНОСТЬ</span>
          <h3>Единый порядок</h3>
          <p>
            Расписание, архив и аналитика используют общую структуру данных,
            чтобы путь от будущего заседания к его результатам был
            последовательным.
          </p>
        </Card>
      </div>
      <div className="about-lower">
        <Card>
          <span className="eyebrow accent">НАПРАВЛЕНИЯ ДЕЯТЕЛЬНОСТИ</span>
          <div className="principle-list">
            <div>
              <span>01</span>
              <strong>Рассмотрение инициатив</strong>
              <p>
                Рассмотрение поступивших материалов и фиксация следующих шагов
                после официальной публикации.
              </p>
            </div>
            <div>
              <span>02</span>
              <strong>Организация заседаний</strong>
              <p>
                Публичное расписание, повестка и краткие итоги в единой системе.
              </p>
            </div>
            <div>
              <span>03</span>
              <strong>Наблюдение за исполнением</strong>
              <p>
                Наглядные статусы решений и сводные показатели деятельности.
              </p>
            </div>
          </div>
        </Card>
        <Card className="leadership-card">
          <span className="eyebrow accent">ПРЕДСЕДАТЕЛЬСТВО</span>
          <div className="leadership-symbol">
            <SenateMark size={82} />
          </div>
          <h3>Структура руководства</h3>
          <p>
            Состав председательства и персональные сведения пока не указаны.
            Данные появятся после утверждения и публикации.
          </p>
          <Badge tone="lime">Сведения ожидаются</Badge>
        </Card>
      </div>
    </>
  );
}

function NotFound() {
  return (
    <AppLayout>
      <Card className="not-found">
        <EmptyState
          title="Страница не найдена"
          description="Возможно, адрес изменился или содержит ошибку."
        />
        <Link className="button button-secondary" to="/dashboard">
          На обзор
        </Link>
      </Card>
    </AppLayout>
  );
}

function LoginPage() {
  const { session, signIn } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async (event: FormEvent) => {
    event.preventDefault(); setBusy(true); setError("");
    try { await signIn(email, password); navigate("/dashboard"); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Не удалось войти."); }
    finally { setBusy(false); }
  };
  if (session) return <div className="login-page"><PublicHeader /><main className="login-content"><Card className="login-card"><h1>Вы уже вошли</h1><Link className="button button-primary" to="/dashboard">Открыть панель</Link></Card></main></div>;
  return <div className="login-page"><PublicHeader /><main className="login-content"><Card className="login-card"><SenateMark size={46}/><span className="eyebrow accent">ДОСТУП ДЛЯ УЧАСТНИКОВ</span><h1>Вход в Сенат</h1><p>Войдите с учётной записью, выданной администрацией. Публичные материалы доступны без входа.</p><form onSubmit={submit}><label>Электронная почта<input required type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)}/></label><label>Пароль<input required type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)}/></label>{error && <p className="form-error" role="alert">{error}</p>}<Button type="submit" disabled={busy}>{busy ? "Входим…" : "Войти"}</Button></form><Link className="text-link" to="/">Вернуться на главную</Link></Card></main></div>;
}

function AdminPage() {
  const { canEdit, mode } = useDataStore();
  return <AppLayout><PageHeading eyebrow="УПРАВЛЕНИЕ" title="Публикации Сената" description="Создание и редактирование материалов в реестре." />{canEdit ? <div className="admin-actions"><Link className="card admin-action" to="/schedule">Заседания и повестки <ArrowUpRight size={20}/></Link><Link className="card admin-action" to="/decisions">Решения и статусы <ArrowUpRight size={20}/></Link></div> : <EmptyState title="Нет доступа к управлению" description={mode === "unavailable" ? "Сначала подключите реестр Supabase." : "Для изменения материалов требуется роль председателя или секретаря."} />}</AppLayout>;
}

export default function App() {
  const location = useLocation();
  const reduced = useReducedMotion();
  const [period, setPeriod] = useState<Period>("Год");
  return (
    <PeriodContext.Provider value={{ period, setPeriod }}>
    <AnimatePresence mode="wait" initial={false}>
    <motion.div key={location.pathname} initial={reduced ? false : { opacity: 0, y: 7 }} animate={{ opacity: 1, y: 0 }} exit={reduced ? undefined : { opacity: 0, y: -5 }} transition={{ duration: motionTokens.fast }}>
    <Routes location={location}>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/admin" element={<AdminPage />} />
      <Route
        path="/dashboard"
        element={
          <AppLayout>
            <Dashboard />
          </AppLayout>
        }
      />
      <Route
        path="/schedule"
        element={
          <AppLayout>
            <Schedule />
          </AppLayout>
        }
      />
      <Route
        path="/archive"
        element={
          <AppLayout>
            <ArchivePage />
          </AppLayout>
        }
      />
      <Route
        path="/meetings/:id"
        element={
          <AppLayout>
            <MeetingPage />
          </AppLayout>
        }
      />
      <Route
        path="/analytics"
        element={
          <AppLayout>
            <Analytics />
          </AppLayout>
        }
      />
      <Route
        path="/decisions"
        element={
          <AppLayout>
            <DecisionsPage />
          </AppLayout>
        }
      />
      <Route
        path="/about"
        element={
          <AppLayout>
            <About />
          </AppLayout>
        }
      />
      <Route path="*" element={<NotFound />} />
    </Routes>
    </motion.div>
    </AnimatePresence>
    </PeriodContext.Provider>
  );
}
