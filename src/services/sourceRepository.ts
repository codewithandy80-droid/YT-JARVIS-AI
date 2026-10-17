/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Source Repository Service
 * Canonical data store and synchronization layer for research sources across:
 * - Sources Tab
 * - Script Generator Tab
 * - SEO Studio Tab
 * - Thumbnail Studio Tab
 * - YT Editor
 */

import {
  subscribeUserSources,
  saveUserSource,
  deleteUserSource,
} from './firestoreService.ts';

export interface SourceItem {
  id: string;
  title: string;
  text: string;
  createdAt: number | string;
  updatedAt?: number | string;
  userId?: string;
  projectId?: string;
  tags?: string[];
  wordCount?: number;
}

export const PRIMARY_STORAGE_PREFIX = 'ytai_sources_';
export const LEGACY_STORAGE_PREFIX = 'workspace_portal_sources_';

// In-memory event dispatcher for instant cross-component updates
type SourcesListener = (sources: SourceItem[]) => void;
const listenersMap = new Map<string, Set<SourcesListener>>();

function notifyListeners(userId: string, sources: SourceItem[]) {
  const set = listenersMap.get(userId);
  if (set) {
    set.forEach((fn) => {
      try {
        fn(sources);
      } catch (e) {
        console.error('Error in source repository subscriber:', e);
      }
    });
  }
}

/**
 * Derives a clean fallback title from the first sentence or heading if none provided
 */
export function deriveSourceTitle(text: string, fallbackIndex = 1): string {
  const clean = (text || '').trim();
  if (!clean) return `Source Article #${fallbackIndex}`;
  const firstLine = clean.split('\n')[0].replace(/[#*`_]/g, '').trim();
  return firstLine.slice(0, 60) || `Source Article #${fallbackIndex}`;
}

/**
 * Calculates word count from text safely
 */
export function countWords(text: string): number {
  const clean = (text || '').trim();
  if (!clean) return 0;
  return clean.split(/\s+/).filter(Boolean).length;
}

/**
 * Sanitizes and migrates a source item to the canonical format
 */
export function sanitizeSourceItem(raw: any, fallbackIndex = 1, defaultUserId = 'local_creator'): SourceItem {
  const text = typeof raw.text === 'string' ? raw.text : '';
  const title = (raw.title && typeof raw.title === 'string' && raw.title.trim())
    ? raw.title.trim()
    : deriveSourceTitle(text, fallbackIndex);

  let createdAt = raw.createdAt;
  if (!createdAt) {
    createdAt = Date.now();
  }

  return {
    id: raw.id || `src_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    title,
    text,
    createdAt,
    updatedAt: raw.updatedAt || createdAt,
    userId: raw.userId || defaultUserId,
    projectId: raw.projectId,
    tags: Array.isArray(raw.tags) ? raw.tags : [],
    wordCount: countWords(text),
  };
}

/**
 * Loads all saved sources for a given user from localStorage with bidirectional migration.
 * Checks primary key first, then legacy key, and synchronizes both.
 */
export function getSavedSources(userId: string = 'local_creator'): SourceItem[] {
  const primaryKey = `${PRIMARY_STORAGE_PREFIX}${userId}`;
  const legacyKey = `${LEGACY_STORAGE_PREFIX}${userId}`;

  let items: SourceItem[] = [];
  let foundInLegacy = false;

  // 1. Try primary storage
  try {
    const rawPrimary = localStorage.getItem(primaryKey);
    if (rawPrimary) {
      const parsed = JSON.parse(rawPrimary);
      if (Array.isArray(parsed)) {
        items = parsed.map((item, idx) => sanitizeSourceItem(item, idx + 1, userId));
      }
    }
  } catch (err) {
    console.warn('Could not read from primary source storage:', err);
  }

  // 2. If primary storage is empty, check legacy storage for migration
  if (items.length === 0) {
    try {
      const rawLegacy = localStorage.getItem(legacyKey);
      if (rawLegacy) {
        const parsed = JSON.parse(rawLegacy);
        if (Array.isArray(parsed) && parsed.length > 0) {
          foundInLegacy = true;
          items = parsed.map((item, idx) => sanitizeSourceItem(item, idx + 1, userId));
        }
      }
    } catch (err) {
      console.warn('Could not read from legacy source storage:', err);
    }
  }

  // 3. If migrated from legacy or sync needed, persist to primary
  if (foundInLegacy && items.length > 0) {
    try {
      localStorage.setItem(primaryKey, JSON.stringify(items));
    } catch (err) {
      console.warn('Could not sync migrated sources to primary storage:', err);
    }
  }

  // Sort descending by creation date
  return items.sort((a, b) => {
    const timeA = typeof a.createdAt === 'number' ? a.createdAt : new Date(a.createdAt).getTime();
    const timeB = typeof b.createdAt === 'number' ? b.createdAt : new Date(b.createdAt).getTime();
    return (timeB || 0) - (timeA || 0);
  });
}

/**
 * Persists source items to both primary and legacy localStorage keys for maximum compatibility
 */
function persistSourcesToStorage(userId: string, sources: SourceItem[]): void {
  const primaryKey = `${PRIMARY_STORAGE_PREFIX}${userId}`;
  const legacyKey = `${LEGACY_STORAGE_PREFIX}${userId}`;

  try {
    const serialized = JSON.stringify(sources);
    localStorage.setItem(primaryKey, serialized);
    localStorage.setItem(legacyKey, serialized);
  } catch (err) {
    console.warn('Failed to persist sources to storage:', err);
  }
}

/**
 * Retrieves a single source by its ID
 */
export function getSourceById(userId: string, sourceId: string): SourceItem | undefined {
  if (!sourceId) return undefined;
  const list = getSavedSources(userId);
  return list.find((s) => s.id === sourceId);
}

/**
 * Saves a new source or updates an existing one if ID matches
 */
export function saveSource(
  userId: string = 'local_creator',
  sourceData: {
    id?: string;
    title?: string;
    text: string;
    projectId?: string;
    tags?: string[];
  }
): SourceItem {
  const current = getSavedSources(userId);
  const now = Date.now();
  const trimmedText = sourceData.text || '';
  const finalTitle = (sourceData.title && sourceData.title.trim())
    ? sourceData.title.trim()
    : deriveSourceTitle(trimmedText, current.length + 1);

  let savedItem: SourceItem;

  if (sourceData.id && current.some((s) => s.id === sourceData.id)) {
    // Update existing
    savedItem = {
      id: sourceData.id,
      title: finalTitle,
      text: trimmedText,
      createdAt: current.find((s) => s.id === sourceData.id)?.createdAt || now,
      updatedAt: now,
      userId,
      projectId: sourceData.projectId,
      tags: sourceData.tags || [],
      wordCount: countWords(trimmedText),
    };
    const updated = current.map((s) => (s.id === sourceData.id ? savedItem : s));
    persistSourcesToStorage(userId, updated);
    notifyListeners(userId, updated);
  } else {
    // Create new with stable unique ID
    savedItem = {
      id: sourceData.id || `src_${now}_${Math.random().toString(36).substring(2, 7)}`,
      title: finalTitle,
      text: trimmedText,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      userId,
      projectId: sourceData.projectId,
      tags: sourceData.tags || [],
      wordCount: countWords(trimmedText),
    };
    const updated = [savedItem, ...current];
    persistSourcesToStorage(userId, updated);
    notifyListeners(userId, updated);
  }

  // Cloud sync if authenticated
  if (userId && userId !== 'local_creator') {
    saveUserSource(userId, savedItem).catch((err) => {
      console.warn('Background Cloud sync for source:', err.message);
    });
  }

  return savedItem;
}

/**
 * Updates an existing source item partially
 */
export function updateSource(
  userId: string,
  sourceId: string,
  updates: Partial<SourceItem>
): SourceItem | null {
  const current = getSavedSources(userId);
  const existingIndex = current.findIndex((s) => s.id === sourceId);
  if (existingIndex === -1) return null;

  const existing = current[existingIndex];
  const updatedItem: SourceItem = {
    ...existing,
    ...updates,
    id: existing.id, // Immutable ID
    updatedAt: Date.now(),
    wordCount: updates.text !== undefined ? countWords(updates.text) : existing.wordCount,
  };

  const updatedList = [...current];
  updatedList[existingIndex] = updatedItem;

  persistSourcesToStorage(userId, updatedList);
  notifyListeners(userId, updatedList);

  if (userId && userId !== 'local_creator') {
    saveUserSource(userId, updatedItem).catch((err) => {
      console.warn('Cloud update for source:', err.message);
    });
  }

  return updatedItem;
}

/**
 * Deletes a source by its ID
 */
export function deleteSource(userId: string, sourceId: string): boolean {
  const current = getSavedSources(userId);
  const exists = current.some((s) => s.id === sourceId);
  if (!exists) return false;

  const filtered = current.filter((s) => s.id !== sourceId);
  persistSourcesToStorage(userId, filtered);
  notifyListeners(userId, filtered);

  if (userId && userId !== 'local_creator') {
    deleteUserSource(userId, sourceId).catch((err) => {
      console.warn('Cloud delete for source:', err.message);
    });
  }

  return true;
}

/**
 * Subscribes to real-time source changes (both local in-memory modifications and Firestore updates)
 */
export function subscribeSources(
  userId: string,
  callback: (sources: SourceItem[]) => void
): () => void {
  // Register local in-memory listener
  if (!listenersMap.has(userId)) {
    listenersMap.set(userId, new Set());
  }
  const set = listenersMap.get(userId)!;
  set.add(callback);

  // Deliver current state immediately
  const initial = getSavedSources(userId);
  callback(initial);

  // If user is authenticated to Firestore, wire real-time Firestore sync
  let unsubscribeFirestore = () => {};
  if (userId && userId !== 'local_creator') {
    unsubscribeFirestore = subscribeUserSources(
      userId,
      (firestoreItems) => {
        if (firestoreItems && firestoreItems.length > 0) {
          // Merge with local items preserving unsynced local sources
          const localItems = getSavedSources(userId);
          const map = new Map<string, SourceItem>();
          
          localItems.forEach((item) => map.set(item.id, item));
          firestoreItems.forEach((cloudItem) => {
            map.set(cloudItem.id, sanitizeSourceItem(cloudItem, 1, userId));
          });

          const merged = Array.from(map.values()).sort((a, b) => {
            const timeA = typeof a.createdAt === 'number' ? a.createdAt : new Date(a.createdAt).getTime();
            const timeB = typeof b.createdAt === 'number' ? b.createdAt : new Date(b.createdAt).getTime();
            return (timeB || 0) - (timeA || 0);
          });

          persistSourcesToStorage(userId, merged);
          notifyListeners(userId, merged);
        }
      },
      (err) => {
        console.warn('Firestore subscription fallback to local cache:', err.message);
      }
    );
  }

  // Cleanup function
  return () => {
    set.delete(callback);
    if (set.size === 0) {
      listenersMap.delete(userId);
    }
    unsubscribeFirestore();
  };
}
