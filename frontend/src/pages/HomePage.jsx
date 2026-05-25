import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { getMyColleges, removeCollege } from '../services/localStore'

const TYPE_CONFIG = {
  EA: {
    label: 'Early Action',
    dot: 'bg-emerald-500',
    banner: 'bg-emerald-50 border-emerald-200',
    heading: 'text-emerald-800',
    badge: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  },
  ED: {
    label: 'Early Decision',
    dot: 'bg-amber-500',
    banner: 'bg-amber-50 border-amber-200',
    heading: 'text-amber-800',
    badge: 'bg-amber-100 text-amber-700 border-amber-200',
    warning: true,
  },
  RD: {
    label: 'Regular Decision',
    dot: 'bg-blue-500',
    banner: 'bg-blue-50 border-blue-200',
    heading: 'text-blue-800',
    badge: 'bg-blue-100 text-blue-700 border-blue-200',
  },
}

function daysUntil(dateStr) {
  if (!dateStr) return null
  const deadline = new Date(dateStr)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return Math.ceil((deadline - today) / (1000 * 60 * 60 * 24))
}

function formatDate(dateStr) {
  if (!dateStr) return 'TBD'
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  })
}

function Countdown({ days }) {
  if (days === null) return <span className="text-xs text-slate-400">No deadline set</span>
  if (days < 0) return <span className="text-xs text-slate-400">Passed</span>
  if (days === 0) return <span className="text-xs font-bold text-red-600 animate-pulse">Due today!</span>
  if (days <= 7) return <span className="text-xs font-bold text-red-500">{days}d left</span>
  if (days <= 30) return <span className="text-xs font-semibold text-amber-600">{days}d left</span>
  return <span className="text-xs text-slate-400">{days}d left</span>
}

function TimelineSection({ type, entries, onRemove }) {
  const cfg = TYPE_CONFIG[type]
  if (entries.length === 0) return null

  const sorted = [...entries].sort((a, b) => {
    if (!a.deadline) return 1
    if (!b.deadline) return -1
    return new Date(a.deadline) - new Date(b.deadline)
  })

  return (
    <section className={`rounded-2xl border p-6 ${cfg.banner}`}>
      <div className="flex items-center gap-2 mb-4">
        <span className={`w-2.5 h-2.5 rounded-full ${cfg.dot}`} />
        <h2 className={`font-semibold text-sm ${cfg.heading}`}>
          {cfg.label}
          {cfg.warning && (
            <span className="ml-2 font-normal text-amber-600 text-xs">⚠ Binding agreement</span>
          )}
        </h2>
        <span className={`ml-auto text-xs font-medium px-2 py-0.5 rounded-full border ${cfg.badge}`}>
          {entries.length}
        </span>
      </div>

      <div className="space-y-2.5">
        {sorted.map((entry) => {
          const days = daysUntil(entry.deadline)
          const urgent = days !== null && days >= 0 && days <= 14

          return (
            <div
              key={entry.id}
              className={`bg-white rounded-xl border px-4 py-3 flex items-center gap-4 shadow-sm transition-shadow hover:shadow-md ${
                urgent ? 'border-red-200' : 'border-slate-100'
              }`}
            >
              <div className={`w-1.5 h-10 rounded-full shrink-0 ${cfg.dot}`} />

              <div className="flex-1 min-w-0">
                <Link
                  to={`/college/${entry.id}`}
                  className="font-semibold text-slate-800 hover:text-[#20BEFF] transition-colors text-sm block truncate"
                >
                  {entry.name}
                </Link>
                <p className="text-xs text-slate-500 truncate">
                  {[entry.city, entry.state].filter(Boolean).join(', ')}
                </p>
                {entry.notes && (
                  <p className="text-xs text-slate-400 italic mt-0.5 truncate">"{entry.notes}"</p>
                )}
              </div>

              <div className="text-right shrink-0">
                <p className="text-sm font-medium text-slate-700">{formatDate(entry.deadline)}</p>
                <Countdown days={days} />
              </div>

              <button
                onClick={() => onRemove(entry.id)}
                title="Remove"
                className="text-slate-300 hover:text-red-400 transition-colors text-lg shrink-0 leading-none"
              >
                ×
              </button>
            </div>
          )
        })}
      </div>
    </section>
  )
}

export default function HomePage() {
  const [entries, setEntries] = useState([])

  useEffect(() => {
    setEntries(getMyColleges())
  }, [])

  const handleRemove = (collegeId) => {
    removeCollege(collegeId)
    setEntries((prev) => prev.filter((e) => e.id !== String(collegeId)))
  }

  const grouped = entries.reduce((acc, e) => {
    const t = e.applicationType
    if (!acc[t]) acc[t] = []
    acc[t].push(e)
    return acc
  }, {})

  const totalUrgent = entries.filter((e) => {
    const d = daysUntil(e.deadline)
    return d !== null && d >= 0 && d <= 30
  }).length

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      {/* Page header */}
      <div className="flex items-start justify-between mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Application Timeline</h1>
          <p className="text-slate-500 text-sm mt-1">
            {entries.length === 0
              ? 'Add colleges to track your deadlines'
              : `${entries.length} college${entries.length !== 1 ? 's' : ''} tracked`}
            {totalUrgent > 0 && (
              <span className="ml-2 text-red-500 font-medium">
                · {totalUrgent} deadline{totalUrgent !== 1 ? 's' : ''} within 30 days
              </span>
            )}
          </p>
        </div>
        <Link
          to="/explore"
          className="shrink-0 flex items-center gap-1.5 bg-[#20BEFF] text-white text-sm font-semibold px-4 py-2.5 rounded-xl hover:bg-[#1AABE8] transition-colors shadow-sm"
        >
          + Add College
        </Link>
      </div>

      {entries.length === 0 ? (
        <div className="text-center py-24">
          <div className="text-6xl mb-4">📋</div>
          <p className="text-lg font-semibold text-slate-700 mb-1">Your timeline is empty</p>
          <p className="text-sm text-slate-400 mb-8">
            Search colleges, pick your application type, and they'll appear here.
          </p>
          <Link
            to="/explore"
            className="inline-flex items-center gap-2 bg-[#20BEFF] text-white font-semibold px-6 py-3 rounded-xl hover:bg-[#1AABE8] transition-colors"
          >
            Browse colleges →
          </Link>
        </div>
      ) : (
        <div className="space-y-5">
          {['EA', 'ED', 'RD'].map((type) =>
            grouped[type] ? (
              <TimelineSection
                key={type}
                type={type}
                entries={grouped[type]}
                onRemove={handleRemove}
              />
            ) : null
          )}
        </div>
      )}
    </div>
  )
}
