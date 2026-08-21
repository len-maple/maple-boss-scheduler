import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  serverTimestamp,
  setDoc,
  updateDoc,
  type Unsubscribe,
} from 'firebase/firestore'
import { db } from '../firebase'
import type { DateAnswer, MemberResponse, Schedule } from '../types'

function scheduleDocRef(scheduleId: string) {
  return doc(db, 'schedules', scheduleId)
}

function responsesCollectionRef(scheduleId: string) {
  return collection(db, 'schedules', scheduleId, 'responses')
}

function toSchedule(id: string, data: any): Schedule {
  return {
    id,
    title: data.title,
    bossId: data.bossId ?? '',
    leaderId: data.leaderId,
    candidateDates: data.candidateDates ?? [],
    status: data.status,
    confirmedDate: data.confirmedDate ?? null,
    confirmedTime: data.confirmedTime ?? null,
    createdAt: data.createdAt?.toMillis?.() ?? 0,
  }
}

export async function createSchedule(
  leaderId: string,
  title: string,
  bossId: string,
  candidateDates: string[],
): Promise<string> {
  const ref = doc(collection(db, 'schedules'))
  await setDoc(ref, {
    title,
    bossId,
    leaderId,
    candidateDates,
    status: 'collecting',
    confirmedDate: null,
    confirmedTime: null,
    createdAt: serverTimestamp(),
  })
  return ref.id
}

export async function getSchedule(scheduleId: string): Promise<Schedule | null> {
  const snap = await getDoc(scheduleDocRef(scheduleId))
  if (!snap.exists()) return null
  return toSchedule(snap.id, snap.data())
}

export function subscribeSchedule(
  scheduleId: string,
  callback: (schedule: Schedule | null) => void,
): Unsubscribe {
  return onSnapshot(scheduleDocRef(scheduleId), (snap) => {
    callback(snap.exists() ? toSchedule(snap.id, snap.data()) : null)
  })
}

export function subscribeResponses(
  scheduleId: string,
  callback: (responses: MemberResponse[]) => void,
): Unsubscribe {
  return onSnapshot(responsesCollectionRef(scheduleId), (snap) => {
    const responses = snap.docs.map((d) => {
      const data = d.data()
      return {
        memberId: d.id,
        memberName: data.memberName,
        answers: data.answers ?? {},
        updatedAt: data.updatedAt?.toMillis?.() ?? 0,
      } as MemberResponse
    })
    callback(responses)
  })
}

export async function getMyResponse(
  scheduleId: string,
  memberId: string,
): Promise<MemberResponse | null> {
  const snap = await getDoc(doc(responsesCollectionRef(scheduleId), memberId))
  if (!snap.exists()) return null
  const data = snap.data()
  return {
    memberId: snap.id,
    memberName: data.memberName,
    answers: data.answers ?? {},
    updatedAt: data.updatedAt?.toMillis?.() ?? 0,
  }
}

export async function upsertResponse(
  scheduleId: string,
  memberId: string,
  memberName: string,
  answers: Record<string, DateAnswer>,
): Promise<void> {
  await setDoc(
    doc(responsesCollectionRef(scheduleId), memberId),
    {
      memberName,
      answers,
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  )
}

export async function confirmSchedule(
  scheduleId: string,
  confirmedDate: string,
  confirmedTime: string,
): Promise<void> {
  await updateDoc(scheduleDocRef(scheduleId), {
    status: 'confirmed',
    confirmedDate,
    confirmedTime,
  })
}

export async function listSchedulesByIds(ids: string[]): Promise<Schedule[]> {
  const results = await Promise.all(
    ids.map(async (id) => {
      const snap = await getDoc(scheduleDocRef(id))
      return snap.exists() ? toSchedule(snap.id, snap.data()) : null
    }),
  )
  return results.filter((s): s is Schedule => s !== null)
}
