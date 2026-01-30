
import { initializeApp, getApps, getApp } from 'firebase/app';
import { initializeFirestore, doc, setDoc, onSnapshot } from 'firebase/firestore';
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

let db: any = null;

export const initFirebase = () => {
  try {
    const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    db = initializeFirestore(app, {
      experimentalForceLongPolling: true,
      useFetchStreams: false 
    });
    return db;
  } catch (e) {
    console.error("Firebase initialization failed:", e);
    return null;
  }
};

export const syncQuestionsToFirebase = async (questions: Question[], subjectOrder?: { mcq: string[], short: string[] }) => {
  if (!db) throw new Error("Database not initialized");
  const quizRef = doc(db, 'config', 'questions_data');
  await setDoc(quizRef, { 
    questions, 
    subjectOrder: subjectOrder || { mcq: [], short: [] },
    updatedAt: new Date().toISOString() 
  });
};

export const listenToQuestions = (
  onUpdate: (questions: Question[], subjectOrder?: { mcq: string[], short: string[] }) => void, 
  onError: (error: any) => void
) => {
  if (!db) {
    onError(new Error("No DB"));
    return () => {};
  }
  
  const quizRef = doc(db, 'config', 'questions_data');
  
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
      onError(error);
    }
  );
};
