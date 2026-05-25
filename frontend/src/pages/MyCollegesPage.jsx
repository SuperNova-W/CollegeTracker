import { useState, useCallback, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { getMyColleges, updateCollegeField, removeCollege } from '../services/localStore'
import { getRank, getSavedMajor, saveMajor, getAvailableMajors, preloadMajor } from '../services/rankingsStore'

// ─── formatters ───────────────────────────────────────────────────────────────

function fmtMoney(v) {
  if (v == null || v === '') return '—'
  return `$${Number(v).toLocaleString()}`
}

function fmtShortDate(d) {
  if (!d) return 'NA'
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function fmtPct(v) {
  if (v == null) return '—'
  return `${(v * 100).toFixed(1)}%`
}

// ─── cell primitives ──────────────────────────────────────────────────────────

function TextCell({ value, onChange, placeholder = '—', align = 'center', moneyPrefix = false }) {
  return (
    <input
      type="text"
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={`w-full bg-transparent text-xs placeholder-slate-300 focus:bg-[#E8F8FF] focus:outline-none rounded px-1.5 py-1 ${
        align === 'center' ? 'text-center' : 'text-left'
      }`}
    />
  )
}

function NumberCell({ value, onChange, placeholder = '—' }) {
  return (
    <input
      type="number"
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value))}
      placeholder={placeholder}
      className="w-full bg-transparent text-xs text-center placeholder-slate-300 focus:bg-[#E8F8FF] focus:outline-none rounded px-1.5 py-1"
    />
  )
}

function SelectCell({ value, options, onChange, colorMap }) {
  const color = colorMap?.[value] ?? 'text-slate-700'
  return (
    <select
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value)}
      className={`w-full bg-transparent text-xs focus:bg-[#E8F8FF] focus:outline-none rounded px-1 py-1 cursor-pointer ${color}`}
    >
      {options.map((o) => (
        <option key={o.value ?? o} value={o.value ?? o}>
          {o.label ?? o}
        </option>
      ))}
    </select>
  )
}

function BoolCell({ value, onChange, trueLabel = 'Y', falseLabel = 'N' }) {
  return (
    <button
      onClick={() => onChange(!value)}
      className={`w-full text-xs font-semibold rounded py-0.5 transition-colors ${
        value
          ? 'text-emerald-700 bg-emerald-100'
          : 'text-slate-400 hover:text-slate-600'
      }`}
    >
      {value ? trueLabel : falseLabel}
    </button>
  )
}

function ReadCell({ children, className = '' }) {
  return (
    <span className={`block text-xs text-center text-slate-600 px-1 ${className}`}>
      {children}
    </span>
  )
}

// ─── bucket and chance styling ────────────────────────────────────────────────

const BUCKET_COLOR = {
  Reach: 'text-rose-600 font-semibold',
  Target: 'text-amber-600 font-semibold',
  Safety: 'text-emerald-600 font-semibold',
}

const CHANCE_COLOR = {
  HIGH: 'text-emerald-600 font-semibold',
  OK: 'text-amber-600 font-semibold',
  LOW: 'text-rose-600 font-semibold',
}

// ─── column header ────────────────────────────────────────────────────────────

function Th({ children, width, className = '', title }) {
  return (
    <th
      title={title}
      style={{ minWidth: width, width }}
      className={`px-2 py-2.5 text-[10px] font-semibold uppercase tracking-wide text-slate-300 whitespace-nowrap border-r border-slate-700 last:border-r-0 ${className}`}
    >
      {children}
    </th>
  )
}

// ─── major rank badge ─────────────────────────────────────────────────────────

function MajorRankCell({ rank, loading }) {
  if (loading) return <ReadCell className="text-slate-300 italic">…</ReadCell>
  if (rank == null) return <ReadCell>—</ReadCell>
  return (
    <ReadCell className="font-semibold text-[#20BEFF]">
      #{rank}
    </ReadCell>
  )
}

// ─── table row ────────────────────────────────────────────────────────────────

function CollegeRow({ entry, index, onUpdate, onRemove, majorRank, rankLoading }) {
  const total =
    (Number(entry.tuition) || 0) + (Number(entry.accommodation) || 0) || null

  const td = (children, className = '') => (
    <td className={`px-1.5 py-1.5 border-b border-slate-100 border-r border-r-slate-100 ${className}`}>
      {children}
    </td>
  )

  return (
    <tr className={index % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'}>
      {/* ── College name (sticky) ── */}
      <td className="sticky left-0 z-10 px-3 py-2 border-b border-slate-100 bg-inherit shadow-[2px_0_6px_-2px_rgba(0,0,0,0.08)]">
        <div className="flex items-center gap-2 min-w-0">
          <button
            onClick={() => onRemove(entry.id)}
            title="Remove"
            className="shrink-0 text-slate-200 hover:text-rose-400 transition-colors text-base leading-none"
          >
            ×
          </button>
          <Link
            to={`/college/${entry.id}`}
            className="text-xs font-medium text-slate-800 hover:text-[#20BEFF] truncate"
          >
            {entry.name}
          </Link>
        </div>
      </td>

      {/* ── Visited ── */}
      {td(<BoolCell value={entry.visited} onChange={(v) => onUpdate(entry.id, 'visited', v)} />)}

      {/* ── Decision notification (user types) ── */}
      {td(<TextCell value={entry.decisionDate} onChange={(v) => onUpdate(entry.id, 'decisionDate', v)} placeholder="Mar 14" />)}

      {/* ── App deadline (resolved from type) ── */}
      {td(<ReadCell>{fmtShortDate(entry.deadline)}</ReadCell>)}

      {/* ── Major rank (auto from US News rankings) ── */}
      {td(<MajorRankCell rank={majorRank} loading={rankLoading} />)}

      {/* ── UG CS Rank (user types) ── */}
      {td(<TextCell value={entry.undergradRanking} onChange={(v) => onUpdate(entry.id, 'undergradRanking', v)} placeholder="#" />)}

      {/* ── Grad CS Rank (user types) ── */}
      {td(<TextCell value={entry.gradRanking} onChange={(v) => onUpdate(entry.id, 'gradRanking', v)} placeholder="#" />)}

      {/* ── CS Acceptance Rate (user types) ── */}
      {td(<TextCell value={entry.csAcceptanceRate} onChange={(v) => onUpdate(entry.id, 'csAcceptanceRate', v)} placeholder="12%" />)}

      {/* ── ED / EA / RD deadline (from enrichment, read-only) ── */}
      {td(<ReadCell>{fmtShortDate(entry.edDeadline)}</ReadCell>)}
      {td(<ReadCell>{fmtShortDate(entry.eaDeadline)}</ReadCell>)}
      {td(<ReadCell>{fmtShortDate(entry.rdDeadline)}</ReadCell>)}

      {/* ── Chance ── */}
      {td(
        <SelectCell
          value={entry.chance}
          onChange={(v) => onUpdate(entry.id, 'chance', v)}
          options={[
            { value: '', label: '—' },
            { value: 'LOW', label: 'LOW' },
            { value: 'OK', label: 'OK' },
            { value: 'HIGH', label: 'HIGH' },
          ]}
          colorMap={CHANCE_COLOR}
        />
      )}

      {/* ── Affiliated (Y/N) ── */}
      {td(
        <BoolCell
          value={entry.affiliated}
          onChange={(v) => onUpdate(entry.id, 'affiliated', v)}
          trueLabel="Y"
          falseLabel="N"
        />
      )}

      {/* ── Bucket ── */}
      {td(
        <SelectCell
          value={entry.bucket}
          onChange={(v) => onUpdate(entry.id, 'bucket', v)}
          options={[
            { value: '', label: '—' },
            { value: 'Reach', label: 'Reach' },
            { value: 'Target', label: 'Target' },
            { value: 'Safety', label: 'Safety' },
          ]}
          colorMap={BUCKET_COLOR}
        />
      )}

      {/* ── Applying as (EA / ED / RD) ── */}
      {td(
        <SelectCell
          value={entry.applicationType}
          onChange={(v) => onUpdate(entry.id, 'applicationType', v)}
          options={['EA', 'ED', 'RD']}
        />
      )}

      {/* ── Document deadline (user types) ── */}
      {td(<TextCell value={entry.documentDeadline} onChange={(v) => onUpdate(entry.id, 'documentDeadline', v)} placeholder="Nov 18" />)}

      {/* ── Test score deadline (user types) ── */}
      {td(<TextCell value={entry.testScoreDeadline} onChange={(v) => onUpdate(entry.id, 'testScoreDeadline', v)} placeholder="Jan 6" />)}

      {/* ── Tuition (editable, pre-filled from Scorecard) ── */}
      {td(<NumberCell value={entry.tuition} onChange={(v) => onUpdate(entry.id, 'tuition', v)} placeholder="60000" />)}

      {/* ── Room & Board (user types) ── */}
      {td(<NumberCell value={entry.accommodation} onChange={(v) => onUpdate(entry.id, 'accommodation', v)} placeholder="15000" />)}

      {/* ── Total (computed) ── */}
      {td(
        <ReadCell className={total ? 'font-semibold text-slate-800' : ''}>
          {total ? fmtMoney(total) : '—'}
        </ReadCell>
      )}

      {/* ── Avg Net Price from Scorecard ── */}
      {td(
        <ReadCell className="text-[#1492C2] font-medium">
          {fmtMoney(entry.avgNetPrice)}
        </ReadCell>
      )}
    </tr>
  )
}

// ─── summary footer ───────────────────────────────────────────────────────────

function SummaryRow({ entries }) {
  const counts = { Reach: 0, Target: 0, Safety: 0, '': 0 }
  entries.forEach((e) => { counts[e.bucket ?? ''] = (counts[e.bucket ?? ''] || 0) + 1 })

  return (
    <div className="flex flex-wrap gap-4 mt-4 text-sm text-slate-600">
      <span className="font-medium">{entries.length} total</span>
      {counts.Reach > 0 && <span className="text-rose-600 font-semibold">{counts.Reach} Reach</span>}
      {counts.Target > 0 && <span className="text-amber-600 font-semibold">{counts.Target} Target</span>}
      {counts.Safety > 0 && <span className="text-emerald-600 font-semibold">{counts.Safety} Safety</span>}
    </div>
  )
}

// ─── page ─────────────────────────────────────────────────────────────────────

export default function MyCollegesPage() {
  const [colleges, setColleges] = useState(() => getMyColleges())
  const [selectedMajor, setSelectedMajor] = useState(() => getSavedMajor())
  const [availableMajors, setAvailableMajors] = useState([])
  const [ranks, setRanks] = useState({})      // { [collegeId]: number | null }
  const [ranksLoading, setRanksLoading] = useState(false)

  useEffect(() => {
    getAvailableMajors().then(setAvailableMajors)
  }, [])

  useEffect(() => {
    if (!selectedMajor || colleges.length === 0) {
      setRanks({})
      return
    }
    preloadMajor(selectedMajor)
    setRanksLoading(true)
    let cancelled = false
    Promise.all(
      colleges.map(async (c) => [c.id, await getRank(selectedMajor, c.name)])
    ).then((pairs) => {
      if (cancelled) return
      setRanks(Object.fromEntries(pairs))
      setRanksLoading(false)
    })
    return () => { cancelled = true }
  }, [selectedMajor, colleges])

  const handleMajorChange = (slug) => {
    setSelectedMajor(slug)
    saveMajor(slug)
  }

  const handleUpdate = useCallback((id, field, value) => {
    updateCollegeField(id, field, value)
    setColleges((prev) =>
      prev.map((c) => {
        if (c.id !== String(id)) return c
        const updated = { ...c, [field]: value }
        if (field === 'applicationType') {
          updated.deadline =
            { EA: c.eaDeadline, ED: c.edDeadline, RD: c.rdDeadline }[value] ??
            c.rdDeadline ??
            null
        }
        return updated
      })
    )
  }, [])

  const handleRemove = (id) => {
    removeCollege(id)
    setColleges((prev) => prev.filter((c) => c.id !== String(id)))
  }

  if (colleges.length === 0) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-24 text-center">
        <div className="text-6xl mb-4">📋</div>
        <p className="text-xl font-semibold text-slate-700 mb-2">No colleges yet</p>
        <p className="text-slate-400 text-sm mb-8">
          Add colleges from the Explore page to start tracking them here.
        </p>
        <Link
          to="/explore"
          className="inline-flex items-center gap-2 bg-[#20BEFF] text-white font-semibold px-6 py-3 rounded-xl hover:bg-[#1AABE8] transition-colors"
        >
          Browse colleges →
        </Link>
      </div>
    )
  }

  return (
    <div className="px-4 py-10">
      {/* Page header */}
      <div className="flex items-center justify-between mb-6 max-w-none">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">My Colleges</h1>
          <p className="text-slate-500 text-sm mt-1">
            Click any cell to edit · Tuition &amp; acceptance rate auto-filled from College Scorecard
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {/* Major picker */}
          <div className="flex items-center gap-2">
            <label className="text-xs font-medium text-slate-500 whitespace-nowrap">Major ranking:</label>
            <select
              value={selectedMajor}
              onChange={(e) => handleMajorChange(e.target.value)}
              className="text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#8FDAF7] shadow-sm"
            >
              <option value="">— Pick a major —</option>
              {availableMajors.map((m) => (
                <option key={m.slug} value={m.slug}>{m.name}</option>
              ))}
            </select>
          </div>
          <Link
            to="/explore"
            className="flex items-center gap-1.5 bg-[#20BEFF] text-white text-sm font-semibold px-4 py-2.5 rounded-xl hover:bg-[#1AABE8] transition-colors shadow-sm"
          >
            + Add College
          </Link>
        </div>
      </div>

      {/* Editable legend */}
      <div className="flex items-center gap-4 mb-4 text-xs text-slate-400">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-slate-100 border border-slate-200 inline-block" />
          Editable (type to fill)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-[#E8F8FF] border border-[#8FDAF7] inline-block" />
          Auto-filled from Scorecard
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-[#E8F8FF] border border-[#8FDAF7] inline-block" />
          US News major ranking
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-white border border-slate-200 inline-block" />
          Computed
        </span>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-2xl border border-slate-200 shadow-sm">
        <table className="border-collapse text-left" style={{ tableLayout: 'fixed' }}>
          <thead>
            <tr className="bg-[#1C1C1C]">
              {/* Sticky header — college name */}
              <th
                className="sticky left-0 z-20 bg-[#1C1C1C] px-3 py-3 text-[10px] font-semibold uppercase tracking-wide text-slate-300 border-r border-slate-700"
                style={{ minWidth: 220, width: 220 }}
              >
                College
              </th>
              <Th width={65}>Visited</Th>
              <Th width={90} title="When the decision comes out">Decision</Th>
              <Th width={90} title="Deadline for your chosen type (auto)">App DL</Th>

              {/* Rankings group */}
              <Th width={80} title="US News rank for your selected major (auto)" className="text-[#8FDAF7]">
                {selectedMajor ? 'Major Rank' : 'Major Rank'}
              </Th>
              <Th width={68} title="CS Undergrad Ranking (US News)">UG Rank</Th>
              <Th width={68} title="CS Grad Ranking (US News)">CS Rank</Th>
              <Th width={85} title="CS department acceptance rate">CS Rate</Th>

              {/* School deadlines group */}
              <Th width={75}>ED</Th>
              <Th width={75}>EA</Th>
              <Th width={75}>RD</Th>

              {/* Status group */}
              <Th width={80}>Chance</Th>
              <Th width={68} title="School-affiliated / connections">Affiliated</Th>
              <Th width={88}>Bucket</Th>
              <Th width={75}>Applying</Th>

              {/* Doc deadlines group */}
              <Th width={90} title="Document submission deadline">Doc DL</Th>
              <Th width={90} title="Self-reported test score deadline">Test DL</Th>

              {/* Financials group */}
              <Th width={95} title="Tuition (pre-filled, editable)">Tuition</Th>
              <Th width={100}>Room &amp; Board</Th>
              <Th width={90}>Total</Th>
              <Th width={90} title="Average net price from College Scorecard" className="text-[#8FDAF7]">
                Net Cost
              </Th>
            </tr>
          </thead>

          <tbody>
            {colleges.map((entry, i) => (
              <CollegeRow
                key={entry.id}
                entry={entry}
                index={i}
                onUpdate={handleUpdate}
                onRemove={handleRemove}
                majorRank={ranks[entry.id] ?? null}
                rankLoading={ranksLoading && !!selectedMajor}
              />
            ))}
          </tbody>
        </table>
      </div>

      {/* Summary */}
      <SummaryRow entries={colleges} />

      {/* Keyboard hint */}
      <p className="text-xs text-slate-300 mt-4">
        Tab between cells · changes save automatically
      </p>
    </div>
  )
}
