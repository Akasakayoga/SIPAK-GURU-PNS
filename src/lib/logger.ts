import { collection, addDoc, serverTimestamp, getDocs, deleteDoc, doc, updateDoc, query, orderBy, limit } from 'firebase/firestore';
import { db, auth } from '../firebase';

export interface SystemLog {
  id: string;
  timestamp: string; // ISO 8601 string
  error: string;
  operationType?: string;
  path?: string | null;
  userId?: string | null;
  email?: string | null;
  browser: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  resolved?: boolean;
  resolutionNotes?: string;
  synced?: boolean; // Offline tracing flag
}

const LOCAL_LOGS_KEY = 'sipak_system_logs_v1';

// Get current browser user agent
function getBrowserInfo(): string {
  const ua = navigator.userAgent;
  let tem;
  let M = ua.match(/(opera|chrome|safari|firefox|msie|trident(?=\/))\/?\s*(\d+)/i) || [];
  if (/trident/i.test(M[1])) {
    tem = /\brv[ :]+(\d+)/g.exec(ua) || [];
    return 'IE ' + (tem[1] || '');
  }
  if (M[1] === 'Chrome') {
    tem = ua.match(/\b(OPR|Edge)\/(\d+)/);
    if (tem != null) return tem.slice(1).join(' ').replace('OPR', 'Opera');
  }
  M = M[2] ? [M[1], M[2]] : [navigator.appName, navigator.appVersion, '-?'];
  if ((tem = ua.match(/version\/(\d+)/i)) != null) M.splice(1, 1, tem[1]);
  return M.join(' ');
}

// Read all logs from localStorage
export function getLocalLogs(): SystemLog[] {
  try {
    const raw = localStorage.getItem(LOCAL_LOGS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error('Failed to parse local logs:', e);
    return [];
  }
}

// Save logs array back to localStorage
export function saveLocalLogs(logs: SystemLog[]): void {
  try {
    // Keep a maximum of 300 logs locally to prevent storage bloat
    const sliced = logs.slice(-300);
    localStorage.setItem(LOCAL_LOGS_KEY, JSON.stringify(sliced));
  } catch (e) {
    console.error('Failed to save local logs:', e);
  }
}

// Log a system event / error
export async function logEvent(
  error: string,
  severity: 'info' | 'warning' | 'error' | 'critical' = 'error',
  operationType?: string,
  path?: string | null
): Promise<SystemLog> {
  const currentUser = auth.currentUser;
  
  const logItem: SystemLog = {
    id: Math.random().toString(36).substring(2, 15) + Date.now().toString(36),
    timestamp: new Date().toISOString(),
    error,
    operationType,
    path: path || null,
    userId: currentUser?.uid || 'anonymous',
    email: currentUser?.email || 'anonymous',
    browser: getBrowserInfo(),
    severity,
    resolved: false,
    resolutionNotes: '',
    synced: false
  };

  // 1. Save to local storage (instant offline persistence)
  const currentLogs = getLocalLogs();
  currentLogs.push(logItem);
  saveLocalLogs(currentLogs);

  // 2. If online, attempt to upload to Firestore
  if (navigator.onLine) {
    try {
      await addDoc(collection(db, 'system_logs'), {
        id: logItem.id,
        timestamp: logItem.timestamp,
        error: logItem.error,
        operationType: logItem.operationType || 'general',
        path: logItem.path || '',
        userId: logItem.userId,
        email: logItem.email,
        browser: logItem.browser,
        severity: logItem.severity,
        resolved: false,
        resolutionNotes: '',
        createdAt: serverTimestamp()
      });
      
      // Update local synced status
      const updatedLogs = getLocalLogs();
      const targetIndex = updatedLogs.findIndex(l => l.id === logItem.id);
      if (targetIndex !== -1) {
        updatedLogs[targetIndex].synced = true;
        saveLocalLogs(updatedLogs);
      }
    } catch (fsError) {
      // Don't recursive log to prevent infinite loops, just console.warn
      console.warn('Could not write log to Firestore:', fsError);
    }
  }

  return logItem;
}

// Synchronize any unsynced offline logs to Firestore
export async function syncOfflineLogs(): Promise<number> {
  if (!navigator.onLine) return 0;
  
  const logs = getLocalLogs();
  const unsynced = logs.filter(l => !l.synced);
  if (unsynced.length === 0) return 0;

  let successCount = 0;
  for (const logItem of unsynced) {
    try {
      await addDoc(collection(db, 'system_logs'), {
        id: logItem.id,
        timestamp: logItem.timestamp,
        error: logItem.error,
        operationType: logItem.operationType || 'general',
        path: logItem.path || '',
        userId: logItem.userId,
        email: logItem.email,
        browser: logItem.browser,
        severity: logItem.severity,
        resolved: logItem.resolved || false,
        resolutionNotes: logItem.resolutionNotes || '',
        createdAt: serverTimestamp()
      });
      logItem.synced = true;
      successCount++;
    } catch (e) {
      console.warn(`Failed to sync log ${logItem.id}:`, e);
    }
  }

  if (successCount > 0) {
    saveLocalLogs(logs);
  }
  return successCount;
}

// Clear all local logs
export function clearLocalLogs(): void {
  localStorage.removeItem(LOCAL_LOGS_KEY);
}

// Fetch remote logs from Firestore (Admin review)
export async function fetchRemoteLogs(limitCount: number = 100): Promise<SystemLog[]> {
  try {
    const q = query(
      collection(db, 'system_logs'),
      orderBy('timestamp', 'desc'),
      limit(limitCount)
    );
    const snapshot = await getDocs(q);
    const remoteLogs: SystemLog[] = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      remoteLogs.push({
        id: doc.id, // Use doc ID for updating/deleting in Firestore
        timestamp: data.timestamp || new Date().toISOString(),
        error: data.error || '',
        operationType: data.operationType || '',
        path: data.path || null,
        userId: data.userId || '',
        email: data.email || '',
        browser: data.browser || '',
        severity: data.severity || 'error',
        resolved: data.resolved || false,
        resolutionNotes: data.resolutionNotes || '',
        synced: true
      });
    });
    return remoteLogs;
  } catch (error) {
    console.error('Failed to fetch remote logs:', error);
    // Fallback to local logs if offline
    return getLocalLogs();
  }
}

// Resolve a log in Firestore or Local
export async function resolveLog(logId: string, notes: string, isLocalOnly: boolean = false): Promise<void> {
  // Update local
  const localLogs = getLocalLogs();
  const idx = localLogs.findIndex(l => l.id === logId);
  if (idx !== -1) {
    localLogs[idx].resolved = true;
    localLogs[idx].resolutionNotes = notes;
    saveLocalLogs(localLogs);
  }

  // Update remote
  if (!isLocalOnly && navigator.onLine) {
    try {
      await updateDoc(doc(db, 'system_logs', logId), {
        resolved: true,
        resolutionNotes: notes,
        updatedAt: serverTimestamp()
      });
    } catch (e) {
      console.error('Failed to resolve remote log:', e);
    }
  }
}

// Delete a log
export async function deleteLog(logId: string, isLocalOnly: boolean = false): Promise<void> {
  const localLogs = getLocalLogs();
  const filtered = localLogs.filter(l => l.id !== logId);
  saveLocalLogs(filtered);

  if (!isLocalOnly && navigator.onLine) {
    try {
      await deleteDoc(doc(db, 'system_logs', logId));
    } catch (e) {
      console.error('Failed to delete remote log:', e);
    }
  }
}
