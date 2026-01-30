
import { initializeApp, getApps, getApp } from 'firebase/app';
// Fix: Use separate type import for Firestore and named imports for values to resolve "no exported member" errors.
import { getFirestore, doc, setDoc, onSnapshot } from 'firebase/firestore';
import type { Firestore } from 'firebase/firestore';
import { Question } from '../types';

const firebaseConfig = {
  apiKey: "AIzaSyDw5UkwT6ab4rlel-g6KSmaKM9MgjUnIOs",
  authDomain: "quiz-master-kh.firebaseapp.com",
  projectId: "quiz-master-kh",
  storageBucket: "quiz-master-kh.firebasestorage.app",
  messagingSenderId: "1030981971798",
  appId: "1:1030981971798:web:5a7e6e86c0c593dca830f7",
  measurementId: "G-MQJYZ5ME91"
};

let db: Firestore | null = null;

/**
 * Initializes Firebase and Firestore.
 */
export const initFirebase = (): Firestore | null => {
  if (db) return db;
  try {
    const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    db = getFirestore(app);
    return db;
  } catch (e) {
    console.error("Firebase/Firestore initialization failed:", e);
    return null;
  }
};

/**
 * Syncs the current local question state to the Firebase cloud database.
 */
export const syncQuestionsToFirebase = async (questions: Question[], subjectOrder?: { mcq: string[], short: string[] }) => {
  const database = initFirebase();
  if (!database) throw new Error("Firestore instance not available");
  
  const quizRef = doc(database, 'config', 'questions_data');
  await setDoc(quizRef, { 
    questions, 
    subjectOrder: subjectOrder || { mcq: [], short: [] },
    updatedAt: new Date().toISOString() 
  });
};

/**
 * Sets up a real-time listener for the question data in Firebase.
 */
export const listenToQuestions = (
  onUpdate: (questions: Question[], subjectOrder?: { mcq: string[], short: string[] }) => void, 
  onError: (error: any) => void
) => {
  const database = initFirebase();
  if (!database) {
    const retryTimeout = setTimeout(() => {
      const dbRetry = initFirebase();
      if (!dbRetry) onError(new Error("Firestore service is unavailable."));
    }, 2000);
    return () => clearTimeout(retryTimeout);
  }
  
  const quizRef = doc(database, 'config', 'questions_data');
  
  return onSnapshot(quizRef, 
    (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        onUpdate(data.questions || [], data.subjectOrder);
      } else {
        onUpdate([], { mcq: [], short: [] });
      }
    },
    (error) => {
      console.error("Firestore listen error:", error);
      onError(error);
    }
  );
};
