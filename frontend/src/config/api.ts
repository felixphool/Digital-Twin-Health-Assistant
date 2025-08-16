// API Configuration for Digital Twin Health System

const API_BASE_URL =  'http://localhost:8000';

export const API_ENDPOINTS = {
  // Digital Twin endpoints
  INITIALIZE_DIGITAL_TWIN: `${API_BASE_URL}/digital/initialize-digital-twin`,
  UPLOAD_DETAILED_PARAMETERS: `${API_BASE_URL}/digital/upload-detailed-parameters`,
  PARSE_MEDICAL_REPORT: `${API_BASE_URL}/digital/parse-medical-report`,
  RUN_VIRTUAL_TEST: `${API_BASE_URL}/digital/run-virtual-test`,
  RUN_SIMULATION: `${API_BASE_URL}/digital/run-simulation`,
  RUN_SIMULATION_WITH_CSV: `${API_BASE_URL}/digital/run-simulation-with-csv`,
  GET_HEALTH_CONSULTANCY: `${API_BASE_URL}/digital/get-health-consultancy`,
  GET_SCENARIOS: `${API_BASE_URL}/digital/scenarios`,
  GET_SIMULATION_RESULTS: `${API_BASE_URL}/digital/simulation-results`,
  GET_MEDICAL_REPORTS: `${API_BASE_URL}/digital/reports`,
  PREDICT_MEDICATION_IMPACT: `${API_BASE_URL}/digital/predict-medication-impact`,
  
  // File upload endpoints
  UPLOAD_REPORT: `${API_BASE_URL}/digital/upload-report`,
  
  // Chat endpoints (if needed)
  CHAT: `${API_BASE_URL}/api/chat`,
};

export const API_CONFIG = {
  baseURL: API_BASE_URL,
  timeout: 30000, // 30 seconds
  headers: {
    'Content-Type': 'application/json',
  },
};

// Helper function to create FormData for multipart requests
export const createFormData = (data: Record<string, any>): FormData => {
  const formData = new FormData();
  
  Object.entries(data).forEach(([key, value]) => {
    if (value !== null && value !== undefined) {
      if (typeof value === 'object') {
        formData.append(key, JSON.stringify(value));
      } else {
        formData.append(key, value.toString());
      }
    }
  });
  
  return formData;
};

// Helper function to handle API responses
export const handleApiResponse = async (response: Response) => {
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
  }
  
  return response.json();
};

// Helper function to make API calls with error handling
export const apiCall = async (
  endpoint: string,
  options: RequestInit = {}
): Promise<any> => {
  try {
    const response = await fetch(endpoint, {
      ...options,
      headers: {
        ...API_CONFIG.headers,
        ...options.headers,
      },
    });
    
    return await handleApiResponse(response);
  } catch (error) {
    console.error('API call failed:', error);
    throw error;
  }
}; 