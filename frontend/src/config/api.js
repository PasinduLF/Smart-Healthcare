const stripTrailingSlash = (value) => value.replace(/\/+$/, '');
const ensureLeadingSlash = (value = '') => (value.startsWith('/') ? value : `/${value}`);

const envApiBaseUrl = stripTrailingSlash((import.meta.env.VITE_API_BASE_URL || '').trim());
const envBasePointsToLocalhost = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(envApiBaseUrl);
const safeEnvApiBaseUrl = import.meta.env.PROD && envBasePointsToLocalhost ? '' : envApiBaseUrl;
const isLocalDevHost = typeof window !== 'undefined' && ['localhost', '127.0.0.1'].includes(window.location.hostname);

// In production, never default to localhost. Use env value or same-origin relative /api paths.
export const API_BASE_URL = safeEnvApiBaseUrl || (isLocalDevHost ? 'http://localhost:3000' : '');
export const PATIENT_SERVICE_BASE_URL = stripTrailingSlash((import.meta.env.VITE_PATIENT_SERVICE_URL || '').trim());
export const TELE_BASE_URL = (import.meta.env.VITE_TELE_URL || '').trim();

export const getGatewayUrl = (path = '') => `${API_BASE_URL}${ensureLeadingSlash(path)}`;

export const getPatientServiceUrl = (path = '') => {
	const normalizedPath = ensureLeadingSlash(path);

	if (PATIENT_SERVICE_BASE_URL) {
		const directPatientPath = normalizedPath.replace(/^\/api\/patients(?=\/|$)/, '');
		return `${PATIENT_SERVICE_BASE_URL}${directPatientPath}`;
	}

	const prefixedPath = normalizedPath.startsWith('/api/patients')
		? normalizedPath
		: `/api/patients${normalizedPath}`;

	return `${API_BASE_URL}${prefixedPath}`;
};
