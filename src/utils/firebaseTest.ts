import { db } from '@/lib/firebase';
import { collection, addDoc, getDocs } from 'firebase/firestore';

// Test Firebase connection
export const testFirebaseConnection = async () => {
  try {
    console.log('🧪 Testing Firebase connection...');
    
    // Test writing to Firestore
    const testRef = await addDoc(collection(db, 'test'), {
      message: 'Hello Firebase!',
      timestamp: new Date().toISOString()
    });
    
    console.log('✅ Test document created with ID:', testRef.id);
    
    // Test reading from Firestore
    const snapshot = await getDocs(collection(db, 'test'));
    console.log('✅ Test documents found:', snapshot.size);
    
    return true;
  } catch (error) {
    console.error('❌ Firebase test failed:', error);
    return false;
  }
};
