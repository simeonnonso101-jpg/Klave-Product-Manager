// src/lib/objectStorage.ts

export class ObjectNotFoundError extends Error {
  constructor(key: string) {
    super(`Object with key "${key}" not found`);
    this.name = "ObjectNotFoundError";
  }
}

type StorageRecord = {
  key: string;
  value: string;
};

export class ObjectStorageService {
  private storage: Map<string, string>;

  constructor() {
    this.storage = new Map();
  }

  // Save object
  async putObject(key: string, value: string): Promise<void> {
    this.storage.set(key, value);
  }

  // Get object
  async getObject(key: string): Promise<string> {
    const value = this.storage.get(key);

    if (!value) {
      throw new ObjectNotFoundError(key);
    }

    return value;
  }

  // Delete object
  async deleteObject(key: string): Promise<void> {
    if (!this.storage.has(key)) {
      throw new ObjectNotFoundError(key);
    }

    this.storage.delete(key);
  }

  // List all objects
  async listObjects(): Promise<StorageRecord[]> {
    return Array.from(this.storage.entries()).map(([key, value]) => ({
      key,
      value,
    }));
  }
}
