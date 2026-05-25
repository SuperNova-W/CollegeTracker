import { useState, useEffect, useCallback, useRef } from 'react'
import { Link } from 'react-router-dom'
import { searchColleges } from '../services/scorecardApi'
import { addCollege, isAdded } from '../services/localStore'

const TYPE_OPTIONS = ['EA', 'ED', 'RD']

function formatPct(v) {
  return v != null ? `${(v * 100).toFixed(1)}%` : 'N/A'
}
function formatMoney(v) {
  return v != null ? `$${Number(v).toLocaleString()}` : 'N/A'
}

function AddModal({ college, onClose, onAdded }) {
  const [appType, setAppType] = useState('RD')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const handleAdd = async () => {
    setLoading(true)
    setError(null)
    try {
      addCollege(college, appType, notes)
      onAdded()
      onClose()
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6" onClick={(e) => e.stopPropagation()}>
        <h3 className="font-bold text-slate-800 text-lg mb-1">Add to your list</h3>
        <p className="text-slate-500 text-sm mb-5 truncate">{college.name}</p>

        <label className="block text-sm font-medium text-slate-700 mb-2">Application type</label>
        <div className="flex gap-2 mb-4">
          {TYPE_OPTIONS.map((t) => (
            <button
              key={t}
              onClick={() => setAppType(t)}
              className={`flex-1 py-2.5 rounded-xl text-sm font-medium border transition-colors ${
                appType === t
                  ? 'bg-[#20BEFF] text-white border-[#20BEFF]'
                  : 'border-slate-200 text-slate-600 hover:border-[#8FDAF7] hover:bg-[#E8F8FF]'
              }`}
            >
              {t}{t === 'ED' ? ' ⚠' : ''}
            </button>
          ))}
        </div>

        {appType === 'ED' && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-700 mb-4">
            ⚠ Early Decision is binding. If accepted, you must attend and withdraw all other applications.
          </div>
        )}

        {college[`${appType.toLowerCase()}Deadline`] ? (
          <p className="text-xs text-slate-500 mb-4">
            {appType} deadline:{' '}
            <span className="font-medium">
              {new Date(college[`${appType.toLowerCase()}Deadline`]).toLocaleDateString('en-US', {
                month: 'long', day: 'numeric', year: 'numeric',
              })}
            </span>
          </p>
        ) : (
          <p className="text-xs text-amber-600 mb-4">No {appType} deadline on file — check the school's website.</p>
        )}

        <label className="block text-sm font-medium text-slate-700 mb-1">Notes (optional)</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Why this school? Concerns?"
          rows={2}
          className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#8FDAF7] mb-5 resize-none"
        />

        {error && <p className="text-red-500 text-xs mb-3">{error}</p>}

        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 text-sm font-medium text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleAdd}
            disabled={loading}
            className="flex-1 py-2.5 text-sm font-medium bg-[#20BEFF] text-white rounded-xl hover:bg-[#1AABE8] transition-colors disabled:opacity-60"
          >
            {loading ? 'Adding...' : 'Add to list'}
          </button>
        </div>
      </div>
    </div>
  )
}

function CollegeCard({ college, onRequestAdd }) {
  const [added, setAdded] = useState(() => isAdded(college.id))

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all p-5 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <Link
            to={`/college/${college.id}`}
            className="font-semibold text-slate-800 hover:text-[#20BEFF] transition-colors leading-snug block"
          >
            {college.name}
          </Link>
          <p className="text-sm text-slate-500 mt-0.5">
            {[college.city, college.state].filter(Boolean).join(', ')}
          </p>
        </div>
        <button
          onClick={() => {
            if (!added) onRequestAdd(college, () => setAdded(true))
          }}
          disabled={added}
          className={`shrink-0 text-xs font-semibold px-3 py-1.5 rounded-xl transition-colors ${
            added
              ? 'bg-emerald-100 text-emerald-700 cursor-default'
              : 'bg-[#20BEFF] text-white hover:bg-[#1AABE8] cursor-pointer'
          }`}
        >
          {added ? '✓ Added' : '+ Add'}
        </button>
      </div>

      <div className="grid grid-cols-3 gap-2 text-center">
        <Stat label="Acceptance" value={formatPct(college.acceptanceRate)} />
        <Stat label="Tuition" value={formatMoney(college.costInState ?? college.costOutState)} />
        <Stat label="Net Price" value={formatMoney(college.avgNetPrice)} />
      </div>

      {college.rdDeadline && (
        <p className="text-xs text-slate-400">
          RD:{' '}
          {new Date(college.rdDeadline).toLocaleDateString('en-US', {
            month: 'short', day: 'numeric', year: 'numeric',
          })}
        </p>
      )}
    </div>
  )
}

function Stat({ label, value }) {
  return (
    <div className="bg-slate-50 rounded-xl py-2 px-1">
      <p className="text-[10px] text-slate-400 uppercase tracking-wide mb-0.5">{label}</p>
      <p className="text-sm font-semibold text-slate-700 truncate">{value}</p>
    </div>
  )
}

export default function ExplorePage() {
  const [colleges, setColleges] = useState([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [total, setTotal] = useState(0)
  const [modal, setModal] = useState(null) // { college, onAdded }
  const debounceRef = useRef(null)

  const fetchColleges = useCallback((q) => {
    setLoading(true)
    setError(null)
    searchColleges(q)
      .then(({ colleges, total }) => {
        setColleges(colleges)
        setTotal(total)
      })
      .catch(() => setError('Could not reach the College Scorecard API. Check your internet connection.'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    fetchColleges('')
  }, [fetchColleges])

  const handleSearchChange = (e) => {
    const val = e.target.value
    setSearch(val)
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => fetchColleges(val), 350)
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Explore Colleges</h1>
        <p className="text-slate-500 text-sm mt-1">
          Live data from the U.S. College Scorecard API · {loading ? '...' : `${total.toLocaleString()} schools`}
        </p>
      </div>

      <div className="relative mb-6">
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">🔍</span>
        <input
          type="text"
          value={search}
          onChange={handleSearchChange}
          placeholder="Search any college..."
          className="w-full pl-11 pr-4 py-3.5 border border-slate-200 rounded-2xl text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#8FDAF7] bg-white shadow-sm text-sm"
        />
        {loading && (
          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 text-xs animate-pulse">
            Loading...
          </span>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700 mb-6">{error}</div>
      )}

      {!loading && colleges.length === 0 && !error ? (
        <div className="text-center py-16 text-slate-400">
          <p className="text-5xl mb-3">🔎</p>
          <p className="text-base font-medium text-slate-600">No results for "{search}"</p>
          <p className="text-sm mt-1">Try a different name or check the spelling.</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {colleges.map((c) => (
            <CollegeCard
              key={c.id}
              college={c}
              onRequestAdd={(college, onAdded) => setModal({ college, onAdded })}
            />
          ))}
        </div>
      )}

      {modal && (
        <AddModal
          college={modal.college}
          onClose={() => setModal(null)}
          onAdded={modal.onAdded}
        />
      )}
    </div>
  )
}
