/**
 * API Client for Architech Backend Integration
 * Handles RESTful API communication via API Gateway
 */

import { logger } from '@/lib/logger';
import { errorHandler, ErrorType } from '@/lib/errorHandler';

interface ApiResponse<T = any> {
  data?: T;
  error?: string;
  message?: string;
}

interface RequestConfig {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  headers?: Record<string, string>;
  body?: any;
}

class ApiClient {
  private baseUrl: string;
  private authToken: string | null = null;

  constructor(baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1') {
    this.baseUrl = baseUrl;
    this.loadAuthToken();
  }

  /**
   * Set authentication token
   */
  setAuthToken(token: string) {
    this.authToken = token;
    localStorage.setItem('architech_auth_token', token);
    logger.info('Authentication token set', { action: 'auth_token_set' });
  }

  /**
   * Clear authentication token
   */
  clearAuthToken() {
    this.authToken = null;
    localStorage.removeItem('architech_auth_token');
    logger.info('Authentication token cleared', { action: 'auth_token_cleared' });
  }

  /**
   * Load auth token from localStorage
   */
  private loadAuthToken() {
    const token = localStorage.getItem('architech_auth_token');
    if (token) {
      this.authToken = token;
    }
  }

  /**
   * Get default headers with authentication
   */
  private getDefaultHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (this.authToken) {
      headers.Authorization = `Bearer ${this.authToken}`;
    }

    return headers;
  }

  /**
   * Make HTTP request
   */
  private async request<T>(endpoint: string, config: RequestConfig = {}): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const startTime = Date.now();

    try {
      const response = await fetch(url, {
        method: config.method || 'GET',
        headers: {
          ...this.getDefaultHeaders(),
          ...config.headers,
        },
        body: config.body ? JSON.stringify(config.body) : undefined,
      });

      const duration = Date.now() - startTime;
      logger.apiCall(endpoint, config.method || 'GET', duration, response.status);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw errorHandler.handleNetworkError(
          new Error(`HTTP ${response.status}: ${errorData.message || response.statusText}`),
          endpoint
        );
      }

      const data = await response.json();
      return data;
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.apiCall(endpoint, config.method || 'GET', duration, 0);
      
      if (error instanceof Error) {
        throw errorHandler.handleNetworkError(error, endpoint);
      }
      throw error;
    }
  }

  // User Management API (via API Gateway)
  async login(email: string, password: string) {
    const result = await this.request<{ access_token: string; user: any }>('/users/login', {
      method: 'POST',
      body: { email, password },
    });
    
    // Set the auth token after successful login
    if (result.access_token) {
      this.setAuthToken(result.access_token);
    }
    
    return result;
  }

  async register(userData: { email: string; password: string; name: string }) {
    const result = await this.request<{ access_token: string; user: any }>('/users/register', {
      method: 'POST',
      body: userData,
    });
    
    // Set the auth token after successful registration
    if (result.access_token) {
      this.setAuthToken(result.access_token);
    }
    
    return result;
  }

  async getCurrentUser() {
    return this.request<any>('/users/me');
  }

  // Project Management API (via API Gateway)
  async getProjects() {
    return this.request<any[]>('/projects');
  }

  async getProject(projectId: string) {
    return this.request<any>(`/projects/${projectId}`);
  }

  async createProject(projectData: { name: string; description?: string }) {
    return this.request<any>('/projects', {
      method: 'POST',
      body: projectData,
    });
  }

  async updateProject(projectId: string, projectData: Partial<{ name: string; description: string }>) {
    return this.request<any>(`/projects/${projectId}`, {
      method: 'PUT',
      body: projectData,
    });
  }

  async deleteProject(projectId: string) {
    return this.request<void>(`/projects/${projectId}`, {
      method: 'DELETE',
    });
  }

  // Design Management API (via API Gateway)
  async getDesigns(projectId?: string) {
    const endpoint = projectId ? `/designs/project/${projectId}` : '/designs';
    return this.request<any[]>(endpoint);
  }

  async getDesign(designId: string) {
    return this.request<any>(`/designs/${designId}`);
  }

  async createDesign(designData: { 
    name: string; 
    project_id: string; 
    design_data: any;
    description?: string;
  }) {
    return this.request<any>('/designs', {
      method: 'POST',
      body: designData,
    });
  }

  async updateDesign(designId: string, designData: Partial<{
    name: string;
    design_data: any;
    description: string;
  }>) {
    return this.request<any>(`/designs/${designId}`, {
      method: 'PUT',
      body: designData,
    });
  }

  async deleteDesign(designId: string) {
    return this.request<void>(`/designs/${designId}`, {
      method: 'DELETE',
    });
  }

  // Design Version Management API
  async createDesignVersion(designId: string, versionData?: { description?: string }) {
    return this.request<any>(`/designs/${designId}/versions`, {
      method: 'POST',
      body: versionData || {},
    });
  }

  // Component Management API (via API Gateway)
  async getComponents(category?: string) {
    const endpoint = category ? `/components?category=${category}` : '/components';
    return this.request<any[]>(endpoint);
  }

  async getComponent(componentId: string) {
    return this.request<any>(`/components/${componentId}`);
  }

  async createComponent(componentData: {
    name: string;
    type: string;
    category: string;
    description?: string;
    properties_schema: any;
    default_properties: any;
    icon_url?: string;
  }) {
    return this.request<any>('/components', {
      method: 'POST',
      body: componentData,
    });
  }

  async updateComponent(componentId: string, componentData: Partial<{
    name: string;
    type: string;
    category: string;
    description: string;
    properties_schema: any;
    default_properties: any;
    icon_url: string;
  }>) {
    return this.request<any>(`/components/${componentId}`, {
      method: 'PUT',
      body: componentData,
    });
  }

  async deleteComponent(componentId: string) {
    return this.request<void>(`/components/${componentId}`, {
      method: 'DELETE',
    });
  }

  // Simulation Management API (via API Gateway)
  async createSimulationSession(designId: string, name?: string, config?: any) {
    return this.request<{ session_id: string }>('/simulations', {
      method: 'POST',
      body: { 
        design_id: designId, 
        name: name || `Simulation ${new Date().toISOString()}`,
        config: config || {}
      },
    });
  }

  async getSimulationSession(sessionId: string) {
    return this.request<any>(`/simulations/${sessionId}`);
  }

  async getSimulationSessions() {
    return this.request<any[]>('/simulations/sessions');
  }

  async startSimulation(sessionId: string) {
    return this.request<void>(`/simulations/${sessionId}/start`, {
      method: 'POST',
    });
  }

  async stopSimulation(sessionId: string) {
    return this.request<void>(`/simulations/${sessionId}/stop`, {
      method: 'POST',
    });
  }

  async pauseSimulation(sessionId: string) {
    return this.request<void>(`/simulations/${sessionId}/pause`, {
      method: 'POST',
    });
  }

  async resumeSimulation(sessionId: string) {
    return this.request<void>(`/simulations/${sessionId}/resume`, {
      method: 'POST',
    });
  }

  async deleteSimulationSession(sessionId: string) {
    return this.request<void>(`/simulations/${sessionId}`, {
      method: 'DELETE',
    });
  }

  // AI Service API (via API Gateway)
  async getAIRecommendations(designData: any) {
    return this.request<any>('/ai/recommendations', {
      method: 'POST',
      body: { design_data: designData },
    });
  }

  async getAIOptimizations(designData: any) {
    return this.request<any>('/ai/optimizations', {
      method: 'POST',
      body: { design_data: designData },
    });
  }

  // Observability API (via API Gateway)
  async getMetrics(sessionId?: string, componentId?: string) {
    let endpoint = '/observability/metrics';
    const params = new URLSearchParams();
    
    if (sessionId) params.append('session_id', sessionId);
    if (componentId) params.append('component_id', componentId);
    
    if (params.toString()) {
      endpoint += `?${params.toString()}`;
    }
    
    return this.request<any[]>(endpoint);
  }

  async getLogs(sessionId?: string, componentId?: string) {
    let endpoint = '/observability/logs';
    const params = new URLSearchParams();
    
    if (sessionId) params.append('session_id', sessionId);
    if (componentId) params.append('component_id', componentId);
    
    if (params.toString()) {
      endpoint += `?${params.toString()}`;
    }
    
    return this.request<any[]>(endpoint);
  }

  async getTraces(sessionId?: string, componentId?: string) {
    let endpoint = '/observability/traces';
    const params = new URLSearchParams();
    
    if (sessionId) params.append('session_id', sessionId);
    if (componentId) params.append('component_id', componentId);
    
    if (params.toString()) {
      endpoint += `?${params.toString()}`;
    }
    
    return this.request<any[]>(endpoint);
  }
}

// Export singleton instance
export const apiClient = new ApiClient();
export default apiClient;