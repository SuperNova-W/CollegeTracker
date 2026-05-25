import axios from 'axios'
import { enrich } from '../data/collegeEnrichment'

const API_KEY = import.meta.env.VITE_COLLEGE_SCORECARD_KEY
const BASE_URL = 'https://api.data.gov/ed/collegescorecard/v1/schools'

const FIELDS = [
  'id',
  'school.name',
  'school.city',
  'school.state',
  'school.school_url',
  'latest.cost.tuition.in_state',
  'latest.cost.tuition.out_of_state',
  'latest.cost.avg_net_price.overall',
  'latest.admissions.admission_rate.overall',
  'latest.admissions.sat_scores.midpoint.critical_reading',
  'latest.admissions.sat_scores.midpoint.math',
  'latest.admissions.act_scores.midpoint.cumulative',
  'latest.student.size',
  'latest.completion.completion_rate_4yr_150nt',
  'latest.earnings.10_yrs_after_entry.median',
].join(',')

function mapResult(r) {
  const unitId = String(r['id'])
  const college = {
    id: unitId,
    name: r['school.name'] ?? 'Unknown',
    city: r['school.city'] ?? '',
    state: r['school.state'] ?? '',
    website: r['school.school_url'] ?? '',
    costInState: r['latest.cost.tuition.in_state'],
    costOutState: r['latest.cost.tuition.out_of_state'],
    avgNetPrice: r['latest.cost.avg_net_price.overall'],
    acceptanceRate: r['latest.admissions.admission_rate.overall'],
    satReading: r['latest.admissions.sat_scores.midpoint.critical_reading'],
    satMath: r['latest.admissions.sat_scores.midpoint.math'],
    actMidpoint: r['latest.admissions.act_scores.midpoint.cumulative'],
    enrollment: r['latest.student.size'],
    graduationRate: r['latest.completion.completion_rate_4yr_150nt'],
    medianEarnings: r['latest.earnings.10_yrs_after_entry.median'],
  }
  return { ...college, ...enrich(unitId, college.name) }
}

const client = axios.create({ baseURL: BASE_URL })

export async function searchColleges(query = '', page = 0) {
  const params = {
    api_key: API_KEY,
    fields: FIELDS,
    per_page: 20,
    page,
    // Only 4-year / bachelor's-predominant schools
    'school.degrees_awarded.predominant': 3,
  }
  if (query.trim()) {
    params['school.name'] = query.trim()
  } else {
    // Default view: sort by most selective (lowest acceptance rate), exclude nulls
    params['latest.admissions.admission_rate.overall__range'] = '0..1'
    params['_sort'] = 'latest.admissions.admission_rate.overall'
  }

  const { data } = await client.get('', { params })
  return {
    colleges: (data.results ?? []).map(mapResult),
    total: data.metadata?.total ?? 0,
    page: data.metadata?.page ?? 0,
  }
}

export async function getCollege(unitId) {
  const { data } = await client.get('', {
    params: {
      api_key: API_KEY,
      fields: FIELDS,
      id: unitId,
    },
  })
  const results = data.results ?? []
  if (results.length === 0) return null
  return mapResult(results[0])
}
