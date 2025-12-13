import { AssetItem } from '../types';

const DB_NAME = 'GelapStudioDB';
const STORE_NAME = 'assets';
const STORE_THUMBNAILS = 'model_thumbnails';
const STORE_CHARACTERS = 'custom_characters';
const STORE_WORKSPACE = 'character_workspace';
// Incrementing version to 6 to force schema upgrade for workspace store
const DB_VERSION = 6;

export interface CustomCharacter {
  id: string;
  name: string;
  thumbnail: string; // Base64
  description: string;
  timestamp: number;
}

const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE_THUMBNAILS)) {
        db.createObjectStore(STORE_THUMBNAILS, { keyPath: 'modelId' });
      }
      if (!db.objectStoreNames.contains(STORE_CHARACTERS)) {
        db.createObjectStore(STORE_CHARACTERS, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE_WORKSPACE)) {
        db.createObjectStore(STORE_WORKSPACE, { keyPath: 'id' });
      }
    };

    request.onsuccess = (event) => {
      resolve((event.target as IDBOpenDBRequest).result);
    };

    request.onerror = (event) => {
      reject((event.target as IDBOpenDBRequest).error);
    };
  });
};

export const saveAsset = async (asset: AssetItem): Promise<void> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.put(asset);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

export const getAssets = async (): Promise<AssetItem[]> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();

    request.onsuccess = () => {
      // Sort by timestamp descending (newest first)
      const results = request.result as AssetItem[];
      results.sort((a, b) => b.timestamp - a.timestamp);
      resolve(results);
    };
    request.onerror = () => reject(request.error);
  });
};

export const deleteAsset = async (id: string): Promise<void> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete(id);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

export const saveModelThumbnail = async (modelId: string, data: string): Promise<void> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_THUMBNAILS], 'readwrite');
    const store = transaction.objectStore(STORE_THUMBNAILS);
    const request = store.put({ modelId, data });

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

export const getModelThumbnails = async (): Promise<Record<string, string>> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    if (!db.objectStoreNames.contains(STORE_THUMBNAILS)) {
      resolve({});
      return;
    }
    const transaction = db.transaction([STORE_THUMBNAILS], 'readonly');
    const store = transaction.objectStore(STORE_THUMBNAILS);
    const request = store.getAll();

    request.onsuccess = () => {
      const results = request.result as { modelId: string, data: string }[];
      const map: Record<string, string> = {};
      results.forEach(item => {
          map[item.modelId] = item.data;
      });
      resolve(map);
    };
    request.onerror = () => reject(request.error);
  });
};

export const saveCustomCharacter = async (character: CustomCharacter): Promise<void> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_CHARACTERS], 'readwrite');
    const store = transaction.objectStore(STORE_CHARACTERS);
    const request = store.put(character);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

export const deleteCustomCharacter = async (id: string): Promise<void> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_CHARACTERS], 'readwrite');
    const store = transaction.objectStore(STORE_CHARACTERS);
    const request = store.delete(id);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

export const getCustomCharacters = async (): Promise<CustomCharacter[]> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    if (!db.objectStoreNames.contains(STORE_CHARACTERS)) {
      resolve([]);
      return;
    }
    const transaction = db.transaction([STORE_CHARACTERS], 'readonly');
    const store = transaction.objectStore(STORE_CHARACTERS);
    const request = store.getAll();

    request.onsuccess = () => {
      const results = request.result as CustomCharacter[];
      results.sort((a, b) => b.timestamp - a.timestamp);
      resolve(results);
    };
    request.onerror = () => reject(request.error);
  });
};

// Workspace Persistence for Character Studio
export const saveCharacterWorkspace = async (data: any): Promise<void> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    if (!db.objectStoreNames.contains(STORE_WORKSPACE)) {
      // In case upgrade didn't happen (dev env), resolve gracefully or handle error
      resolve(); 
      return;
    }
    const transaction = db.transaction([STORE_WORKSPACE], 'readwrite');
    const store = transaction.objectStore(STORE_WORKSPACE);
    const request = store.put({ id: 'current', ...data });

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

export const getCharacterWorkspace = async (): Promise<any> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    if (!db.objectStoreNames.contains(STORE_WORKSPACE)) {
      resolve(null);
      return;
    }
    const transaction = db.transaction([STORE_WORKSPACE], 'readonly');
    const store = transaction.objectStore(STORE_WORKSPACE);
    const request = store.get('current');

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

export const downloadAsset = async (data: string, filename: string) => {
  try {
    const response = await fetch(data);
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    
    setTimeout(() => {
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    }, 100);
  } catch (error) {
    // Fallback if fetch/blob conversion fails
    const link = document.createElement('a');
    link.href = data;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
};