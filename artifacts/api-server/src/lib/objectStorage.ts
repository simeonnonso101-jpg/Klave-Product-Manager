// src/lib/objectStorage.ts

export class ObjectNotFoundError extends Error {
  constructor(key: string) {
    super(`Object with key "${key}" not found`);
    this.name = "ObjectNotFoundError";
  }
}

type StorageResponse = {
  status: number;
  headers: Map<string, string>;
  body: Buffer;
};

type StorageItem = {
  key: string;
  value: string;
};

export class ObjectStorageService {
  private storage = new Map<string, string>();

  normalizeObjectEntityPath(path: string): string {
    return path.replace(/\/+/g, "/").trim();
  }

  async getObjectEntityUploadURL(key: string): Promise<string> {
    const normalized = this.normalizeObjectEntityPath(key);
    return `https://fake-upload-url.local/${encodeURIComponent(normalized)}`;
  }

  async putObject(key: string, value: string): Promise<void> {
    this.storage.set(key, value);
  }

  async getObject(key: string): Promise<string> {
    const value = this.storage.get(key);
    if (!value) throw new ObjectNotFoundError(key);
    return value;
  }

  // ✅ THIS is what your routes expect
  async downloadObject(key: string): Promise<StorageResponse> {
    const value = await this.getObject(key);

    return {
      status: 200,
      headers: new Map([
        ["content-type", "text/plain"],
      ]),
      body: Buffer.from(value),
    };
  }

  async getObjectEntityFile(key: string): Promise<StorageResponse> {
    return this.downloadObject(key);
  }

  async searchPublicObject(query: string): Promise<StorageItem[]> {
    return Array.from(this.storage.entries())
      .filter(([key]) => key.includes(query))
      .map(([key, value]) => ({ key, value }));
  }

  async deleteObject(key: string): Promise<void> {
    if (!this.storage.has(key)) {
      throw new ObjectNotFoundError(key);
    }
    this.storage.delete(key);
  }

  async listObjects(): Promise<StorageItem[]> {
    return Array.from(this.storage.entries()).map(([key, value]) => ({
      key,
      value,
    }));
  }
}
