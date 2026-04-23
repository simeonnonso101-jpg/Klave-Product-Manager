// src/lib/objectStorage.ts

export class ObjectNotFoundError extends Error {
  constructor(key: string) {
    super(`Object with key "${key}" not found`);
    this.name = "ObjectNotFoundError";
  }
}

type StorageItem = {
  key: string;
  value: string;
};

export class ObjectStorageService {
  private storage = new Map<string, string>();

  // Normalize path
  normalizeObjectEntityPath(path: string): string {
    return path.replace(/\/+/g, "/").trim();
  }

  // Fake upload URL (since no real cloud storage yet)
  async getObjectEntityUploadURL(key: string): Promise<string> {
    const normalizedKey = this.normalizeObjectEntityPath(key);
    return `https://fake-upload-url.local/upload/${encodeURIComponent(normalizedKey)}`;
  }

  // Save object
  async putObject(key: string, value: string): Promise<void> {
    this.storage.set(key, value);
  }

  // Get raw object
  async getObject(key: string): Promise<string> {
    const value = this.storage.get(key);
    if (!value) throw new ObjectNotFoundError(key);
    return value;
  }

  // Download object (alias of getObject)
  async downloadObject(key: string): Promise<string> {
    return this.getObject(key);
  }

  // Get object file (simulate file response)
  async getObjectEntityFile(key: string): Promise<{ data: string }> {
    const value = await this.getObject(key);
    return { data: value };
  }

  // Search (simple filter)
  async searchPublicObject(query: string): Promise<StorageItem[]> {
    return Array.from(this.storage.entries())
      .filter(([key]) => key.includes(query))
      .map(([key, value]) => ({ key, value }));
  }

  // Delete
  async deleteObject(key: string): Promise<void> {
    if (!this.storage.has(key)) {
      throw new ObjectNotFoundError(key);
    }
    this.storage.delete(key);
  }

  // List all
  async listObjects(): Promise<StorageItem[]> {
    return Array.from(this.storage.entries()).map(([key, value]) => ({
      key,
      value,
    }));
  }
}
