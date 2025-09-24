// Lightweight Daytona API client to replace the problematic SDK
interface DaytonaSandbox {
  id: string;
  name?: string;
  state: string;
  status?: string;
  createdAt?: string;
}

interface DaytonaPreview {
  url: string;
}

export class DaytonaClient {
  private apiKey: string;
  private baseUrl: string;

  constructor(options: { apiKey: string; baseUrl?: string }) {
    this.apiKey = options.apiKey;
    // Try to derive API URL from the API key or use a default
    // Daytona typically uses workspace-specific URLs
    this.baseUrl = options.baseUrl || this.deriveApiUrl();
  }

  private deriveApiUrl(): string {
    // For now, return a placeholder - we'll need to fix this based on actual API
    // The Daytona SDK might use different endpoints
    return 'https://api.daytona.io'; // This will likely need to be updated
  }

  private async makeRequest(endpoint: string, options: RequestInit = {}): Promise<any> {
    const url = `${this.baseUrl}${endpoint}`;

    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Daytona API error ${response.status}: ${errorText}`);
    }

    return await response.json();
  }

  async list(): Promise<DaytonaSandbox[]> {
    console.log('[DaytonaClient] Listing sandboxes...');
    return await this.makeRequest('/sandboxes');
  }

  async getSandbox(id: string): Promise<DaytonaSandbox | null> {
    console.log(`[DaytonaClient] Getting sandbox: ${id}`);
    try {
      return await this.makeRequest(`/sandboxes/${id}`);
    } catch (error: any) {
      if (error.message.includes('404')) {
        return null;
      }
      throw error;
    }
  }

  async startSandbox(id: string): Promise<void> {
    console.log(`[DaytonaClient] Starting sandbox: ${id}`);
    await this.makeRequest(`/sandboxes/${id}/start`, {
      method: 'POST',
    });
  }

  async stopSandbox(id: string): Promise<void> {
    console.log(`[DaytonaClient] Stopping sandbox: ${id}`);
    await this.makeRequest(`/sandboxes/${id}/stop`, {
      method: 'POST',
    });
  }

  async getPreviewLink(id: string, port: number = 3000): Promise<DaytonaPreview | null> {
    console.log(`[DaytonaClient] Getting preview link for sandbox: ${id}, port: ${port}`);
    try {
      return await this.makeRequest(`/sandboxes/${id}/preview?port=${port}`);
    } catch (error: any) {
      console.log(`[DaytonaClient] Preview link not available: ${error.message}`);
      return null;
    }
  }
}

// Helper function to create a sandbox-like object for backward compatibility
export function createSandboxWrapper(sandbox: DaytonaSandbox, client: DaytonaClient) {
  return {
    ...sandbox,
    start: () => client.startSandbox(sandbox.id),
    stop: () => client.stopSandbox(sandbox.id),
    getPreviewLink: (port: number = 3000) => client.getPreviewLink(sandbox.id, port),
  };
}