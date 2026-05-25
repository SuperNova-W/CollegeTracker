const KEY = 'ct_user_colleges'

function load() {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '[]')
  } catch {
    return []
  }
}

function save(list) {
  localStorage.setItem(KEY, JSON.stringify(list))
}

export function getMyColleges() {
  return load()
}

export function isAdded(collegeId) {
  return load().some((e) => e.id === String(collegeId))
}

function resolveDeadline(entry, applicationType) {
  return (
    { EA: entry.eaDeadline, ED: entry.edDeadline, RD: entry.rdDeadline }[applicationType] ??
    entry.rdDeadline ??
    null
  )
}

export function addCollege(college, applicationType, notes = '') {
  const list = load()
  if (list.some((e) => e.id === String(college.id))) throw new Error('Already added')

  const entry = {
    // Core identity
    id: String(college.id),
    name: college.name,
    city: college.city,
    state: college.state,
    website: college.website,

    // From College Scorecard (read-only, auto-filled)
    costInState: college.costInState ?? null,
    costOutState: college.costOutState ?? null,
    avgNetPrice: college.avgNetPrice ?? null,
    acceptanceRate: college.acceptanceRate ?? null,
    applicationFee: college.applicationFee ?? null,

    // Application deadlines (from enrichment)
    eaDeadline: college.eaDeadline ?? null,
    edDeadline: college.edDeadline ?? null,
    rdDeadline: college.rdDeadline ?? null,

    // User's application choice
    applicationType,
    notes,
    deadline: resolveDeadline(college, applicationType),
    addedAt: new Date().toISOString(),

    // Editable tracker fields (user fills in)
    visited: false,
    affiliated: false,
    chance: '',          // 'LOW' | 'OK' | 'HIGH'
    bucket: '',          // 'Reach' | 'Target' | 'Safety'
    documentDeadline: '',
    testScoreDeadline: '',
    decisionDate: '',    // e.g. "Mar 14"
    undergradRanking: '',
    gradRanking: '',
    csAcceptanceRate: '',

    // Financial (pre-filled from Scorecard, user can override)
    tuition: college.costOutState ?? college.costInState ?? null,
    accommodation: null,
  }

  save([...list, entry])
  return entry
}

export function updateCollegeField(collegeId, field, value) {
  const list = load()
  const updated = list.map((e) => {
    if (e.id !== String(collegeId)) return e
    const entry = { ...e, [field]: value }
    // Keep resolved deadline in sync when applicationType changes
    if (field === 'applicationType') {
      entry.deadline = resolveDeadline(entry, value)
    }
    return entry
  })
  save(updated)
}

export function updateCollege(collegeId, applicationType, notes) {
  const list = load()
  const updated = list.map((e) => {
    if (e.id !== String(collegeId)) return e
    return {
      ...e,
      applicationType,
      notes,
      deadline: resolveDeadline(e, applicationType),
    }
  })
  save(updated)
  return updated.find((e) => e.id === String(collegeId))
}

export function removeCollege(collegeId) {
  save(load().filter((e) => e.id !== String(collegeId)))
}
