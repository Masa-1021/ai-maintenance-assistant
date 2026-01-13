import { useAuthStore } from '../stores/authStore';
import type {
  Equipment,
  CreateEquipmentRequest,
  UpdateEquipmentRequest,
  MaintenanceRecord,
  CreateRecordRequest,
  UpdateRecordRequest,
  RecordFilter,
  ChatSession,
  CreateChatSessionRequest,
  ChatMessage,
  SendMessageRequest,
  SendMessageResponse,
  UploadUrlResponse,
  DownloadUrlResponse,
  ApiResponse,
  PaginatedResponse,
} from 'shared';

const API_ENDPOINT = import.meta.env.VITE_API_ENDPOINT || '';

async function fetchWithAuth<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = await useAuthStore.getState().getAccessToken();

  const response = await fetch(`${API_ENDPOINT}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: token ? `Bearer ${token}` : '',
      ...options.headers,
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
  }

  return response.json();
}

// Equipment API
export const equipmentApi = {
  list: async (): Promise<Equipment[]> => {
    const response = await fetchWithAuth<ApiResponse<PaginatedResponse<Equipment>>>('/equipment');
    return response.data?.items || [];
  },

  get: async (id: string): Promise<Equipment> => {
    const response = await fetchWithAuth<ApiResponse<Equipment>>(`/equipment/${id}`);
    if (!response.data) throw new Error('Equipment not found');
    return response.data;
  },

  create: async (data: CreateEquipmentRequest): Promise<Equipment> => {
    const response = await fetchWithAuth<ApiResponse<Equipment>>('/equipment', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (!response.data) throw new Error('Failed to create equipment');
    return response.data;
  },

  update: async (id: string, data: UpdateEquipmentRequest): Promise<Equipment> => {
    const response = await fetchWithAuth<ApiResponse<Equipment>>(`/equipment/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    if (!response.data) throw new Error('Failed to update equipment');
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await fetchWithAuth(`/equipment/${id}`, { method: 'DELETE' });
  },
};

// Records API
export const recordsApi = {
  list: async (filter?: RecordFilter): Promise<MaintenanceRecord[]> => {
    const params = new URLSearchParams();
    if (filter?.equipmentId) params.append('equipmentId', filter.equipmentId);
    if (filter?.startDate) params.append('startDate', filter.startDate);
    if (filter?.endDate) params.append('endDate', filter.endDate);
    if (filter?.keyword) params.append('keyword', filter.keyword);
    if (filter?.limit) params.append('limit', String(filter.limit));

    const query = params.toString();
    const response = await fetchWithAuth<ApiResponse<PaginatedResponse<MaintenanceRecord>>>(
      `/records${query ? `?${query}` : ''}`
    );
    return response.data?.items || [];
  },

  get: async (id: string): Promise<MaintenanceRecord> => {
    const response = await fetchWithAuth<ApiResponse<MaintenanceRecord>>(`/records/${id}`);
    if (!response.data) throw new Error('Record not found');
    return response.data;
  },

  create: async (data: CreateRecordRequest): Promise<MaintenanceRecord> => {
    const response = await fetchWithAuth<ApiResponse<MaintenanceRecord>>('/records', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (!response.data) throw new Error('Failed to create record');
    return response.data;
  },

  update: async (id: string, data: UpdateRecordRequest): Promise<MaintenanceRecord> => {
    const response = await fetchWithAuth<ApiResponse<MaintenanceRecord>>(`/records/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    if (!response.data) throw new Error('Failed to update record');
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await fetchWithAuth(`/records/${id}`, { method: 'DELETE' });
  },

  export: async (filter?: RecordFilter): Promise<Blob> => {
    const params = new URLSearchParams();
    if (filter?.equipmentId) params.append('equipmentId', filter.equipmentId);
    if (filter?.startDate) params.append('startDate', filter.startDate);
    if (filter?.endDate) params.append('endDate', filter.endDate);
    if (filter?.keyword) params.append('keyword', filter.keyword);

    const query = params.toString();
    const token = await useAuthStore.getState().getAccessToken();

    const response = await fetch(`${API_ENDPOINT}/records/export${query ? `?${query}` : ''}`, {
      headers: {
        Authorization: token ? `Bearer ${token}` : '',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to export records');
    }

    return response.blob();
  },
};

// Chat API
export const chatApi = {
  listSessions: async (): Promise<ChatSession[]> => {
    const response = await fetchWithAuth<ApiResponse<PaginatedResponse<ChatSession>>>('/chat/sessions');
    return response.data?.items || [];
  },

  getSession: async (id: string): Promise<ChatSession> => {
    const response = await fetchWithAuth<ApiResponse<ChatSession>>(`/chat/sessions/${id}`);
    if (!response.data) throw new Error('Session not found');
    return response.data;
  },

  createSession: async (data: CreateChatSessionRequest): Promise<ChatSession> => {
    const response = await fetchWithAuth<ApiResponse<ChatSession>>('/chat/sessions', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (!response.data) throw new Error('Failed to create session');
    return response.data;
  },

  deleteSession: async (id: string): Promise<void> => {
    await fetchWithAuth(`/chat/sessions/${id}`, { method: 'DELETE' });
  },

  getMessages: async (sessionId: string): Promise<ChatMessage[]> => {
    const response = await fetchWithAuth<ApiResponse<PaginatedResponse<ChatMessage>>>(
      `/chat/sessions/${sessionId}/messages`
    );
    return response.data?.items || [];
  },

  sendMessage: async (sessionId: string, data: SendMessageRequest): Promise<SendMessageResponse> => {
    const response = await fetchWithAuth<ApiResponse<SendMessageResponse>>(
      `/chat/sessions/${sessionId}/messages`,
      {
        method: 'POST',
        body: JSON.stringify(data),
      }
    );
    if (!response.data) throw new Error('Failed to send message');
    return response.data;
  },
};

// File API
export const fileApi = {
  getUploadUrl: async (filename: string, contentType: string): Promise<UploadUrlResponse> => {
    const response = await fetchWithAuth<ApiResponse<UploadUrlResponse>>('/files/upload-url', {
      method: 'POST',
      body: JSON.stringify({ filename, contentType }),
    });
    if (!response.data) throw new Error('Failed to get upload URL');
    return response.data;
  },

  getDownloadUrl: async (key: string): Promise<DownloadUrlResponse> => {
    const response = await fetchWithAuth<ApiResponse<DownloadUrlResponse>>(
      `/files/${encodeURIComponent(key)}`
    );
    if (!response.data) throw new Error('Failed to get download URL');
    return response.data;
  },

  uploadFile: async (file: File): Promise<string> => {
    const { uploadUrl, key } = await fileApi.getUploadUrl(file.name, file.type);

    const uploadResponse = await fetch(uploadUrl, {
      method: 'PUT',
      body: file,
      headers: {
        'Content-Type': file.type,
      },
    });

    if (!uploadResponse.ok) {
      throw new Error('Failed to upload file');
    }

    return key;
  },
};
