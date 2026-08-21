import { initializeApp } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'
import { getAuth, signInAnonymously, onAuthStateChanged, type User } from 'firebase/auth'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

// .env.local が未設定/不正な場合、Firebase SDKがここで同期的に例外を投げて
// アプリ全体が白画面になってしまうため、原因が分かるメッセージに変換しておく。
export let firebaseInitError: string | null = null
let app: ReturnType<typeof initializeApp> | undefined
let dbInstance: ReturnType<typeof getFirestore> | undefined
let authInstance: ReturnType<typeof getAuth> | undefined

try {
  app = initializeApp(firebaseConfig)
  dbInstance = getFirestore(app)
  authInstance = getAuth(app)
} catch (err) {
  firebaseInitError =
    'Firebaseの設定が正しくありません。.env.local（docs/firebase-setup.md を参照）を確認してください。'
  console.error(err)
}

export const db = dbInstance as ReturnType<typeof getFirestore>
export const auth = authInstance as ReturnType<typeof getAuth>

// このアプリはログイン画面を持たないため、匿名認証で得られる uid を
// 「自分」の識別子（リーダー/メンバー共通）として使う。
// docs/firebase-setup.md の「認証方式についての前提」を参照。
let readyResolve!: (user: User) => void
export const authReady: Promise<User> = new Promise((resolve) => {
  readyResolve = resolve
})

if (authInstance) {
  onAuthStateChanged(authInstance, (user) => {
    if (user) {
      readyResolve(user)
    } else {
      signInAnonymously(authInstance!).catch((err) => {
        console.error('匿名認証に失敗しました', err)
      })
    }
  })
}
