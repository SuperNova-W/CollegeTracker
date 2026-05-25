import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
})

// In dev mode, inject X-User-Id header so the backend knows who we are
api.interceptors.request.use((config) => {
  const devUserId = 'local-user-1'
  config.headers['X-User-Id'] = devUserId
  // In production: replace with Cognito JWT token
  // const token = await Auth.currentSession() => getIdToken().getJwtToken()
  // config.headers['Authorization'] = `Bearer ${token}`
  return config
})

export const collegesApi = {
  list: (search) => api.get('/colleges', { params: search ? { search } : {} }),
  get: (id) => api.get(`/colleges/${id}`),
}

export const userCollegesApi = {
  list: () => api.get('/user/colleges'),
  add: (collegeId, applicationType, notes) =>
    api.post('/user/colleges', { collegeId, applicationType, notes }),
  update: (id, applicationType, notes) =>
    api.put(`/user/colleges/${id}`, { collegeId: null, applicationType, notes }),
  remove: (id) => api.delete(`/user/colleges/${id}`),
}
