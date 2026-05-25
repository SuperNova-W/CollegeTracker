import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { getCollege } from '../services/scorecardApi'
import { addCollege, isAdded, removeCollege } from '../services/localStore'

function StatCard({ label, value, icon, sub }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 text-center">
      <div className="text-xl mb-1">{icon}</div>
      <p className="text-[10px] text-slate-400 uppercase tracking-wide mb-1">{label}</p>
      <p className="text-slate-900 font-bold text-base leading-tight">{value ?? 'N/A'}</p>
      {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
    </div>
  )
}

function DeadlineRow({ label, date, type, warning }) {
  if (!date) return null
  const d = new Date(date)
  const days = Math.ceil((d - new Date()) / (1000 * 60 * 60 * 24))
  const passed = days < 0

  return (
    <div className="flex items-center justify-between py-3.5 border-b border-slate-100 last:border-0">
      <div>
        <span className="font-medium text-slate-700 text-sm">{label}</span>
        {warning && (
          <span className="ml-2 text-xs text-amber-600">⚠ Binding</span>
        )}
      </div>
      <div className="text-right">
        <p className="text-sm font-semibold text-slate-800">
          {d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
        </p>
        {!passed && days <= 60 && (
          <p className={`text-xs font-medium ${days <= 14 ? 'text-red-500' : 'text-amber-500'}`}>
            {days} day{days !== 1 ? 's' : ''} away
          </p>
        )}
        {!passed && days > 60 && (
          <p className="text-xs text-slate-400">{days} days away</p>
        )}
        {passed && <p className="text-xs text-slate-400">Passed</p>}
      </div>
    </div>
  )
}

const TYPE_OPTIONS = ['EA', 'ED', 'RD']

export default function CollegeDetailsPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [college, setCollege] = useState(null)
  const [loading, setLoading] = useState(true)
  const [added, setAdded] = useState(false)
  const [selectedType, setSelectedType] = useState('RD')
  const [notes, setNotes] = useState('')
  const [adding, setAdding] = useState(false)
  const [addError, setAddError] = useState(null)

  useEffect(() => {
    getCollege(id)
      .then((data) => {
        if (!data) return navigate('/explore')
        setCollege(data)
        setAdded(isAdded(data.id))
      })
      .catch(() => navigate('/explore'))
      .finally(() => setLoading(false))
  }, [id, navigate])

  const handleAdd = () => {
    setAdding(true)
    setAddError(null)
    try {
      addCollege(college, selectedType, notes)
      setAdded(true)
    } catch (e) {
      if (e.message === 'Already added') setAdded(true)
      else setAddError(e.message)
    } finally {
      setAdding(false)
    }
  }

  const handleRemove = () => {
    removeCollege(college.id)
    setAdded(false)
  }

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center">
        <p className="text-slate-400 animate-pulse">Loading college data...</p>
      </div>
    )
  }
  if (!college) return null

  const fmt$ = (v) => (v != null ? `$${Number(v).toLocaleString()}` : null)
  const fmtPct = (v) => (v != null ? `${(v * 100).toFixed(1)}%` : null)
  const fmtN = (v) => (v != null ? Number(v).toLocaleString() : null)

  const satComposite =
    college.satReading && college.satMath
      ? college.satReading + college.satMath
      : null

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <Link to="/explore" className="inline-flex items-center gap-1 text-sm text-[#20BEFF] hover:underline mb-6">
        ← Back to Explore
      </Link>

      {/* Header */}
      <div className="bg-gradient-to-br from-[#20BEFF] to-[#1492C2] rounded-2xl p-8 text-white mb-6 shadow-lg">
        <h1 className="text-2xl font-bold mb-1">{college.name}</h1>
        <p className="text-white/80 text-sm">
          {[college.city, college.state].filter(Boolean).join(', ')}
        </p>
        {college.website && (
          <a
            href={college.website.startsWith('http') ? college.website : `https://${college.website}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block text-white/80 hover:text-white text-sm underline mt-2"
          >
            {college.website} ↗
          </a>
        )}
        <div className="flex flex-wrap gap-3 mt-5">
          {college.acceptanceRate != null && (
            <Pill label={fmtPct(college.acceptanceRate)} sub="Acceptance Rate" />
          )}
          {college.enrollment != null && (
            <Pill label={fmtN(college.enrollment)} sub="Undergrads" />
          )}
          {college.graduationRate != null && (
            <Pill label={fmtPct(college.graduationRate)} sub="Graduation Rate" />
          )}
        </div>
      </div>

      {/* Cost & Scores */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <StatCard icon="🏛️" label="In-State Tuition" value={fmt$(college.costInState)} />
        <StatCard icon="✈️" label="Out-of-State" value={fmt$(college.costOutState)} />
        <StatCard icon="💡" label="Avg Net Price" value={fmt$(college.avgNetPrice)} sub="after aid" />
        <StatCard icon="💰" label="Median Earnings" value={fmt$(college.medianEarnings)} sub="10 yrs after" />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
        <StatCard icon="📝" label="SAT (composite)" value={satComposite} />
        <StatCard icon="📊" label="ACT (midpoint)" value={college.actMidpoint} />
        <StatCard icon="💳" label="App Fee" value={college.applicationFee ? `$${college.applicationFee}` : null} />
      </div>

      {/* Deadlines */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 mb-6">
        <h2 className="font-semibold text-slate-800 mb-3">Deadlines</h2>
        <DeadlineRow label="Early Action" type="EA" date={college.eaDeadline} />
        <DeadlineRow label="Early Decision" type="ED" date={college.edDeadline} warning />
        <DeadlineRow label="Regular Decision" type="RD" date={college.rdDeadline} />
        {!college.eaDeadline && !college.edDeadline && !college.rdDeadline && (
          <p className="text-slate-400 text-sm">Deadline data not available. Check the school's website.</p>
        )}
      </div>

      {/* Add / Remove */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 mb-6">
        <h2 className="font-semibold text-slate-800 mb-3">My Application List</h2>
        {added ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-emerald-600">
              <span className="text-xl">✓</span>
              <span className="text-sm font-medium">
                On your list. <Link to="/" className="underline text-[#20BEFF]">View timeline →</Link>
              </span>
            </div>
            <button
              onClick={handleRemove}
              className="text-xs text-slate-400 hover:text-red-400 transition-colors"
            >
              Remove
            </button>
          </div>
        ) : (
          <>
            <div className="flex gap-2 mb-4">
              {TYPE_OPTIONS.map((t) => (
                <button
                  key={t}
                  onClick={() => setSelectedType(t)}
                  className={`flex-1 py-2.5 text-sm font-medium rounded-xl border transition-colors ${
                    selectedType === t
                      ? 'bg-[#20BEFF] text-white border-[#20BEFF]'
                      : 'border-slate-200 text-slate-600 hover:border-[#8FDAF7] hover:bg-[#E8F8FF]'
                  }`}
                >
                  {t}{t === 'ED' ? ' ⚠' : ''}
                </button>
              ))}
            </div>

            {selectedType === 'ED' && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-700 mb-4">
                ⚠ Early Decision is binding — you must attend if accepted and withdraw all other applications.
              </div>
            )}

            {college[`${selectedType.toLowerCase()}Deadline`] ? (
              <p className="text-xs text-slate-500 mb-4">
                {selectedType} deadline:{' '}
                <span className="font-medium">
                  {new Date(college[`${selectedType.toLowerCase()}Deadline`]).toLocaleDateString('en-US', {
                    month: 'long', day: 'numeric', year: 'numeric',
                  })}
                </span>
              </p>
            ) : (
              <p className="text-xs text-amber-600 mb-4">
                No {selectedType} deadline on file — check the school's admissions page.
              </p>
            )}

            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Notes (optional) — why this school, concerns, etc."
              rows={2}
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#8FDAF7] mb-4 resize-none"
            />

            {addError && <p className="text-red-500 text-xs mb-3">{addError}</p>}

            <button
              onClick={handleAdd}
              disabled={adding}
              className="w-full py-3 text-sm font-semibold bg-[#20BEFF] text-white rounded-xl hover:bg-[#1AABE8] transition-colors disabled:opacity-60"
            >
              {adding ? 'Adding...' : `Add as ${selectedType}`}
            </button>
          </>
        )}
      </div>

      {/* Fun fact */}
      {college.funFact && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 mb-6">
          <h2 className="font-semibold text-amber-800 mb-2">💡 Did you know?</h2>
          <p className="text-amber-700 text-sm leading-relaxed">{college.funFact}</p>
        </div>
      )}

      {/* Application prompts */}
      {(college.prompt1 || college.prompt2) && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
          <h2 className="font-semibold text-slate-800 mb-4">Application Prompts</h2>
          {college.prompt1 && (
            <div className="mb-5">
              <span className="text-xs font-semibold text-[#20BEFF] uppercase tracking-wider">Prompt 1</span>
              <p className="text-slate-700 text-sm mt-1.5 leading-relaxed">{college.prompt1}</p>
            </div>
          )}
          {college.prompt2 && (
            <div>
              <span className="text-xs font-semibold text-[#20BEFF] uppercase tracking-wider">Prompt 2</span>
              <p className="text-slate-700 text-sm mt-1.5 leading-relaxed">{college.prompt2}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function Pill({ label, sub }) {
  return (
    <div className="bg-white/20 rounded-xl px-3 py-2 text-center">
      <p className="text-white font-bold text-sm">{label}</p>
      <p className="text-white/80 text-xs">{sub}</p>
    </div>
  )
}
