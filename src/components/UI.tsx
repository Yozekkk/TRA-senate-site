import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { motionTokens } from "../animations/motion";
import { Link } from "react-router-dom";
import { ArrowUpRight, CalendarDays, Search, X } from "lucide-react";
import type {
  DecisionStatus,
  Meeting,
  MeetingPriority,
  MeetingStatus,
} from "../data/mockData";
import { formatDate, formatShortDate } from "../data/mockData";

export function SenateMark({ size = 38 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M24 2 45 13v22L24 46 3 35V13L24 2Z"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path
        d="M24 9 38 16.5v15L24 39 10 31.5v-15L24 9Z"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path
        d="M24 9v30M10 16.5l28 15M38 16.5l-28 15"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <circle cx="24" cy="24" r="3" fill="currentColor" />
    </svg>
  );
}

/** Original layered ribbon: a light, scalable alternative to a 3D runtime. */
export function SenateSculpture({ compact = false }: { compact?: boolean }) {
  return <svg className={`senate-sculpture ${compact ? "compact" : ""}`} viewBox="0 0 560 300" role="img" aria-label="Скульптурная эмблема Сената Аргенти">
    <defs>
      <filter id="sculpture-shadow" x="-30%" y="-30%" width="160%" height="170%"><feGaussianBlur stdDeviation="11" /></filter>
      <clipPath id="sculpture-clip"><path d="M85 236C48 189 73 120 139 89c49-23 76-11 116-45 34-29 93-29 137-7 64 31 99 92 83 151-17 63-84 92-158 93-98 2-176-1-232-45Z" /></clipPath>
    </defs>
    <ellipse cx="284" cy="262" rx="181" ry="18" fill="#000" opacity=".44" filter="url(#sculpture-shadow)" />
    <g clipPath="url(#sculpture-clip)">
      <path d="M29 269C120 157 196 270 286 135 347 43 415 53 536 114v174H29Z" fill="#233626" />
      <path d="M21 242C124 111 205 245 294 112 368 1 434 51 548 93v34C434 89 377 37 309 139 201 300 102 144 21 279Z" fill="#5b8b44" />
      <path d="M30 221C132 98 220 225 307 89 385-34 455 44 553 80v29C442 77 390 24 321 128 214 290 108 139 30 254Z" fill="#9bd65f" />
      <path d="M45 195C140 85 230 202 324 65 402-50 478 39 563 67v26C457 67 406 9 339 111 229 279 124 125 45 225Z" fill="#d0ff91" />
      <path d="M88 168C172 81 242 178 339 51 408-39 481 15 557 53v17C463 33 421-10 352 91 252 238 153 116 88 184Z" fill="#f1ffd9" opacity=".88" />
      <path d="M78 237C165 178 215 286 306 158 373 65 426 70 520 119v32C419 99 391 93 323 193 229 333 154 199 78 264Z" fill="#345339" opacity=".75" />
    </g>
    <path d="M85 236C48 189 73 120 139 89c49-23 76-11 116-45 34-29 93-29 137-7 64 31 99 92 83 151-17 63-84 92-158 93-98 2-176-1-232-45Z" fill="none" stroke="#d6ffac" strokeOpacity=".28" />
  </svg>;
}

export function Button(
  { children, variant = "primary", className = "", ...props }:
    & ButtonHTMLAttributes<HTMLButtonElement>
    & { variant?: "primary" | "secondary" | "ghost" },
) {
  return (
    <button
      type="button"
      className={`button button-${variant} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
export function IconButton(
  { label, children, className = "", ...props }:
    & ButtonHTMLAttributes<HTMLButtonElement>
    & { label: string },
) {
  return (
    <button
      type="button"
      className={`icon-button ${className}`}
      aria-label={label}
      title={label}
      {...props}
    >
      {children}
    </button>
  );
}
export function Card(
  { children, className = "", ...props }: HTMLAttributes<HTMLDivElement>,
) {
  return <div className={`card ${className}`} {...props}>{children}</div>;
}
export function Badge(
  { children, tone = "neutral" }: {
    children: ReactNode;
    tone?: "neutral" | "lime" | "critical" | "green" | "yellow";
  },
) {
  return (
    <span className={`badge badge-${tone}`}>
      <span className="badge-dot" />
      {children}
    </span>
  );
}
export function StatusBadge(
  { status }: { status: MeetingStatus | DecisionStatus | MeetingPriority },
) {
  const tones: Record<
    string,
    "neutral" | "lime" | "critical" | "green" | "yellow"
  > = {
    "Запланировано": "lime",
    "Завершено": "green",
    "Отменено": "neutral",
    "Обычное": "neutral",
    "Важное": "lime",
    "Срочное": "critical",
    "Принято": "lime",
    "На исполнении": "yellow",
    "Исполнено": "green",
    "Отложено": "neutral",
  };
  return <Badge tone={tones[status]}>{status}</Badge>;
}
export function StatCard(
  { label, value, note, icon, accent = "lime" }: {
    label: string;
    value: string | number;
    note?: string;
    icon?: ReactNode;
    accent?: "lime" | "critical" | "green" | "yellow";
  },
) {
  return (
    <Card className={`stat-card stat-${accent}`}>
      <div className="stat-top">
        <span>{label}</span>
        {icon && <span className="stat-icon">{icon}</span>}
      </div>
      <div className="stat-value"><AnimatedValue value={value} /></div>
      {note && <div className="stat-note">{note}</div>}
    </Card>
  );
}
function AnimatedValue({ value }: { value: string | number }) {
  const reduced = useReducedMotion();
  const textValue = String(value);
  const match = textValue.match(/^(\d+)(.*)$/);
  const numeric = match ? Number(match[1]) : null;
  const [shown, setShown] = useState(match && !reduced ? 0 : Number(match?.[1] ?? 0));
  useEffect(() => {
    if (numeric === null || reduced) return;
    const target = numeric;
    let frame = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / 560);
      setShown(Math.round(target * (1 - (1 - progress) ** 3)));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [numeric, reduced]);
  return match ? <>{reduced ? match[1] : shown}{match[2]}</> : <>{value}</>;
}
export function SearchInput(
  { value, onChange, placeholder = "Поиск", className = "" }: {
    value: string;
    onChange: (v: string) => void;
    placeholder?: string;
    className?: string;
  },
) {
  return (
    <label className={`search-input ${className}`}>
      <Search size={17} />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
      />
      {value && (
        <button
          type="button"
          aria-label="Очистить поиск"
          onClick={() => onChange("")}
        >
          <X size={15} />
        </button>
      )}
    </label>
  );
}
export function FilterSelect(
  { value, onChange, options, label }: {
    value: string;
    onChange: (v: string) => void;
    options: string[];
    label: string;
  },
) {
  return (
    <label className="filter-select">
      <span className="sr-only">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label={label}
      >
        {options.map((option) => <option key={option}>{option}</option>)}
      </select>
    </label>
  );
}
export function Tabs<T extends string>(
  { items, value, onChange, ariaLabel }: {
    items: readonly T[];
    value: T;
    onChange: (v: T) => void;
    ariaLabel: string;
  },
) {
  return (
    <div className="tabs" role="tablist" aria-label={ariaLabel}>
      {items.map((item, index) => (
        <button
          type="button"
          key={item}
          role="tab"
          aria-selected={value === item}
          tabIndex={value === item ? 0 : -1}
          className={value === item ? "active" : ""}
          onClick={() => onChange(item)}
          onKeyDown={(event) => {
            const next = event.key === "ArrowRight" ? (index + 1) % items.length
              : event.key === "ArrowLeft" ? (index - 1 + items.length) % items.length
              : event.key === "Home" ? 0
              : event.key === "End" ? items.length - 1 : -1;
            if (next < 0) return;
            event.preventDefault();
            onChange(items[next]);
            event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>("button")[next]?.focus();
          }}
        >
          {item}
        </button>
      ))}
    </div>
  );
}
export function Modal(
  { title, children, onClose }: {
    title: string;
    children: ReactNode;
    onClose: () => void;
  },
) {
  const dialogRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const focusable = () =>
      dialogRef.current?.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );
    focusable()?.[0]?.focus();
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "Tab") {
        const nodes = focusable();
        if (!nodes?.length) return;
        const first = nodes[0];
        const last = nodes[nodes.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", handler);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handler);
      document.body.style.overflow = "";
      previouslyFocused?.focus();
    };
  }, [onClose]);
  return (
    <motion.div
      className="modal-backdrop"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: motionTokens.fast }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <motion.div
        ref={dialogRef}
        className="modal"
        initial={{ opacity: 0, y: 16, scale: .985 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: motionTokens.standard, ease: motionTokens.ease }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        <div className="modal-head">
          <h2 id="modal-title">{title}</h2>
          <IconButton label="Закрыть" onClick={onClose}>
            <X size={19} />
          </IconButton>
        </div>
        {children}
      </motion.div>
    </motion.div>
  );
}
export function Dropdown(
  { trigger, children, align = "right", label }: {
    trigger: ReactNode;
    children: ReactNode;
    align?: "right" | "left";
    label: string;
  },
) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (event: KeyboardEvent) => {
      if (event.key === "Escape") { setOpen(false); triggerRef.current?.focus(); }
    };
    document.addEventListener("keydown", close);
    return () => document.removeEventListener("keydown", close);
  }, [open]);
  return (
    <div className="dropdown">
      <button
        type="button"
        className="dropdown-trigger"
        ref={triggerRef}
        aria-expanded={open}
        aria-label={label}
        onClick={() => setOpen((v) => !v)}
      >
        {trigger}
      </button>
      {open && (
        <>
          <button
            type="button"
            className="dropdown-catcher"
            aria-label="Закрыть меню"
            onClick={() => setOpen(false)}
          />
          <motion.div
            className={`dropdown-menu align-${align}`}
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: motionTokens.fast }}
            onClick={() => setOpen(false)}
          >
            {children}
          </motion.div>
        </>
      )}
    </div>
  );
}
export function Tooltip(
  { text, children }: { text: string; children: ReactNode },
) {
  return (
    <span className="tooltip" tabIndex={0}>
      {children}
      <span role="tooltip">{text}</span>
    </span>
  );
}
export function EmptyState(
  {
    title = "Ничего не найдено",
    description = "Попробуйте изменить поиск или фильтры.",
  }: { title?: string; description?: string },
) {
  return (
    <div className="empty-state">
      <SenateMark size={32} />
      <h3>{title}</h3>
      <p>{description}</p>
    </div>
  );
}
export function Skeleton() {
  return <div className="skeleton" aria-label="Загрузка" />;
}
export function Toast(
  { message, onClose }: { message: string; onClose: () => void },
) {
  useEffect(() => {
    const t = setTimeout(onClose, 3600);
    return () => clearTimeout(t);
  }, [onClose]);
  return (
    <motion.div className="toast" role="status" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: motionTokens.standard }}>
      {message}
      <button type="button" onClick={onClose} aria-label="Закрыть">
        <X size={16} />
      </button>
    </motion.div>
  );
}
export function DataTable(
  { headers, rows }: { headers: string[]; rows: ReactNode[][] },
) {
  return (
    <div className="table-scroll">
      <table className="data-table">
        <thead>
          <tr>{headers.map((h) => <th key={h}>{h}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i}>{row.map((cell, j) => <td key={j}>{cell}</td>)}</tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
export function MeetingCard(
  { meeting, compact = false }: { meeting: Meeting; compact?: boolean },
) {
  return (
    <Link
      to={`/meetings/${meeting.id}`}
      className={`meeting-card ${compact ? "compact" : ""}`}
    >
      <div className="meeting-card-top">
        <span className="eyebrow">№ {meeting.number} · {meeting.type}</span>
        <ArrowUpRight size={18} />
      </div>
      <h3>{meeting.title}</h3>
      {!compact && <p>{meeting.summary || "Подробности и повестка доступны в карточке заседания."}</p>}
      <div className="meeting-card-bottom">
        <span>
          <CalendarDays size={15} />
          {formatShortDate(meeting.date)} · {meeting.time} МСК
        </span>
        <StatusBadge status={meeting.status} />
        {meeting.published === false && <Badge tone="neutral">Черновик</Badge>}
      </div>
    </Link>
  );
}
export function ChartCard(
  { title, subtitle, children, className = "" }: {
    title: string;
    subtitle?: string;
    children: ReactNode;
    className?: string;
  },
) {
  return (
    <Card className={`chart-card ${className}`}>
      <div className="card-heading">
        <div>
          <h3>{title}</h3>
          {subtitle && <p>{subtitle}</p>}
        </div>
      </div>
      {children}
    </Card>
  );
}
export function DemoLabel() {
  return <span className="demo-label">Демонстрационные данные</span>;
}
export function DateText({ date }: { date: string }) {
  return <time dateTime={date}>{formatDate(date)}</time>;
}
