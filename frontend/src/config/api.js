const stripTrailingSlash = (value) => value.replace(/\/+$/, '');
const ensureLeadingSlash = (value = '') => (value.startsWith('/') ? value : `/${value}`);

const envApiBaseUrl = stripTrailingSlash((import.meta.env.VITE_API_BASE_URL || '').trim());
const envBasePointsToLocalhost = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(envApiBaseUrl);
const safeEnvApiBaseUrl = import.meta.env.PROD && envBasePointsToLocalhost ? '' : envApiBaseUrl;
const envTeleBaseUrl = stripTrailingSlash((import.meta.env.VITE_TELE_URL || '').trim());
const teleBasePointsToLocalhost = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(envTeleBaseUrl);
const safeEnvTeleBaseUrl = import.meta.env.PROD && teleBasePointsToLocalhost ? '' : envTeleBaseUrl;
const isLocalDevHost = typeof window !== 'undefined' && ['localhost', '127.0.0.1'].includes(window.location.hostname);

// In production, never default to localhost. Use env value or same-origin relative /api paths.
export const API_BASE_URL = safeEnvApiBaseUrl || (isLocalDevHost ? 'http://localhost:3000' : '');
export const PATIENT_SERVICE_BASE_URL = stripTrailingSlash((import.meta.env.VITE_PATIENT_SERVICE_URL || '').trim());
export const DOCTOR_SERVICE_BASE_URL = stripTrailingSlash((import.meta.env.VITE_DOCTOR_SERVICE_URL || '').trim());
export const AI_SERVICE_BASE_URL = stripTrailingSlash((import.meta.env.VITE_AI_SERVICE_URL || '').trim());
export const APPOINTMENT_SERVICE_BASE_URL = stripTrailingSlash((import.meta.env.VITE_APPOINTMENT_SERVICE_URL || '').trim());
export const PAYMENT_SERVICE_BASE_URL = stripTrailingSlash((import.meta.env.VITE_PAYMENT_SERVICE_URL || '').trim());
// Telemedicine relies on a websocket backend, so never default to the frontend origin in production.
export const TELE_BASE_URL = safeEnvTeleBaseUrl || (isLocalDevHost ? 'http://localhost:3004' : '');

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

export const getDoctorServiceUrl = (path = '') => {
	const normalizedPath = ensureLeadingSlash(path);

	if (DOCTOR_SERVICE_BASE_URL) {
		const directDoctorPath = normalizedPath.replace(/^\/api\/doctors(?=\/|$)/, '');
		return `${DOCTOR_SERVICE_BASE_URL}${directDoctorPath}`;
	}

	const prefixedPath = normalizedPath.startsWith('/api/doctors')
		? normalizedPath
		: `/api/doctors${normalizedPath}`;

	return `${API_BASE_URL}${prefixedPath}`;
};

export const getAiServiceUrl = (path = '') => {
	const normalizedPath = ensureLeadingSlash(path);

	if (AI_SERVICE_BASE_URL) {
		const directAiPath = normalizedPath.replace(/^\/api\/ai(?=\/|$)/, '');
		return `${AI_SERVICE_BASE_URL}${directAiPath}`;
	}

	const prefixedPath = normalizedPath.startsWith('/api/ai')
		? normalizedPath
		: `/api/ai${normalizedPath}`;

	return `${API_BASE_URL}${prefixedPath}`;
};

export const getAppointmentServiceUrl = (path = '') => {
	const normalizedPath = ensureLeadingSlash(path);

	if (APPOINTMENT_SERVICE_BASE_URL) {
		const directAppointmentPath = normalizedPath.replace(/^\/api\/appointments(?=\/|$)/, '');
		return `${APPOINTMENT_SERVICE_BASE_URL}${directAppointmentPath}`;
	}

	const prefixedPath = normalizedPath.startsWith('/api/appointments')
		? normalizedPath
		: `/api/appointments${normalizedPath}`;

	return `${API_BASE_URL}${prefixedPath}`;
};

export const getPaymentServiceUrl = (path = '') => {
	const normalizedPath = ensureLeadingSlash(path);

	if (PAYMENT_SERVICE_BASE_URL) {
		const directPaymentPath = normalizedPath.replace(/^\/api\/payments(?=\/|$)/, '');
		return `${PAYMENT_SERVICE_BASE_URL}${directPaymentPath}`;
	}

	const prefixedPath = normalizedPath.startsWith('/api/payments')
		? normalizedPath
		: `/api/payments${normalizedPath}`;

	return `${API_BASE_URL}${prefixedPath}`;
};

export const getTelemedicineServiceUrl = (path = '') => {
	if (!TELE_BASE_URL) {
		return '';
	}

	if (!path) {
		return TELE_BASE_URL;
	}

	return `${TELE_BASE_URL}${ensureLeadingSlash(path)}`;
};
