/**
 * Daily Schedule Push Alert Script
 * Runs via GitHub Actions every day at 21:00 KST (12:00 UTC)
 * Queries tomorrow's family schedules from Firestore and sends Web Push notifications to registered devices.
 */

const webpush = require('web-push');

// VAPID Keys for Web Push
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || 'BKBMPraKK0JLJddN66OjYoDCiFyTfUdiYLVmSnJwebiOWL_TWfnR4WWxcdwpIcgZL3tFkBRmPqAiGJXZ_wNpN14';
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || 'E1aJD5bTWjaPRGfg70EMF3-47y4Xe_58ZIgdiS7C4Ro';
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:family@ourhome-connect.local';

// Firebase Config
const FIREBASE_API_KEY = process.env.FIREBASE_API_KEY || 'AIzaSyC6OW9ACw4LYewILAcZlE3jxhNX5KzmS7w';
const PROJECT_ID = process.env.FIREBASE_PROJECT_ID || 'family-8fba4';

// Member Map
const MEMBER_NAME_MAP = {
  dad: '아빠',
  mom: '엄마',
  child1: '김주원',
  child2: '김주아',
  children: '자녀(주원·주아)',
  family: '가족 전체'
};

function parseFirestoreFields(fields) {
  if (!fields) return {};
  const res = {};
  for (const [k, v] of Object.entries(fields)) {
    if ('stringValue' in v) res[k] = v.stringValue;
    else if ('integerValue' in v) res[k] = parseInt(v.integerValue, 10);
    else if ('doubleValue' in v) res[k] = parseFloat(v.doubleValue);
    else if ('booleanValue' in v) res[k] = v.booleanValue;
    else if ('mapValue' in v) res[k] = parseFirestoreFields(v.mapValue.fields);
    else if ('nullValue' in v) res[k] = null;
  }
  return res;
}

async function getFirebaseAuthToken() {
  try {
    const res = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${FIREBASE_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ returnSecureToken: true })
    });
    if (!res.ok) {
      console.warn('Anonymous auth failed, proceeding without token:', res.status);
      return null;
    }
    const data = await res.json();
    return data.idToken;
  } catch (err) {
    console.warn('Auth token error, proceeding without token:', err.message);
    return null;
  }
}

async function fetchFirestoreCollection(collectionName, token) {
  const headers = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/${collectionName}?pageSize=300`;
  const res = await fetch(url, { headers });
  if (!res.ok) {
    throw new Error(`Failed to fetch ${collectionName}: ${res.status} ${res.statusText}`);
  }
  const data = await res.json();
  if (!data.documents || !Array.isArray(data.documents)) {
    return [];
  }

  return data.documents.map((doc) => {
    const id = doc.name.split('/').pop();
    const parsed = parseFirestoreFields(doc.fields);
    return { id, docName: doc.name, ...parsed };
  });
}

async function deleteFirestoreDoc(docName, token) {
  try {
    const headers = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    await fetch(`https://firestore.googleapis.com/v1/${docName}`, {
      method: 'DELETE',
      headers
    });
  } catch (err) {
    console.warn('Failed to delete doc:', docName, err.message);
  }
}

async function main() {
  console.log('🚀 [Schedule Alerts] Starting daily check...');
  console.log('Current UTC Time:', new Date().toISOString());

  // KST 기준 내일 날짜 계산 (현재 UTC + 9시간 + 24시간)
  const now = Date.now();
  const kstTomorrow = new Date(now + (9 * 60 + 24 * 60) * 60 * 1000);
  const tomorrowStr = kstTomorrow.toISOString().slice(0, 10);
  console.log(`📅 Target Tomorrow Date (KST): ${tomorrowStr}`);

  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

  // 1. Firebase 인증 토큰
  const token = await getFirebaseAuthToken();

  // 2. 일정 조회
  const schedules = await fetchFirestoreCollection('schedules', token);
  console.log(`📋 Total schedules found in DB: ${schedules.length}`);

  // 3. 내일 일정 필터링
  const tomorrowSchedules = schedules.filter((sch) => {
    if (!sch || sch.isDone) return false;
    if (sch.date === tomorrowStr) return true;
    if (sch.isRange && sch.date && sch.endDate) {
      return sch.date <= tomorrowStr && sch.endDate >= tomorrowStr;
    }
    return false;
  });

  console.log(`📌 Found ${tomorrowSchedules.length} schedule(s) for tomorrow (${tomorrowStr}).`);

  if (tomorrowSchedules.length === 0) {
    console.log('✨ No schedules for tomorrow. Skipping notification.');
    return;
  }

  // 4. 구독자(스마트폰 기기) 목록 조회
  const subscriptions = await fetchFirestoreCollection('push_subscriptions', token);
  console.log(`📱 Found ${subscriptions.length} registered push subscription(s).`);

  if (subscriptions.length === 0) {
    console.log('⚠️ No push subscriptions found in Firestore. Please enable push notifications on your phone/browser.');
    return;
  }

  // 5. 알림 메시지 생성
  const firstSch = tomorrowSchedules[0];
  const memberName = MEMBER_NAME_MAP[firstSch.memberId] || '가족';
  const timeText = firstSch.startTime ? ` (${firstSch.startTime})` : '';

  let title = `📅 [내일 일정 알림] ${memberName}: ${firstSch.title}`;
  if (tomorrowSchedules.length > 1) {
    title = `📅 [내일 가족 일정 알림] 총 ${tomorrowSchedules.length}건`;
  }

  let body = '';
  if (tomorrowSchedules.length === 1) {
    body = `내일(${firstSch.date})${timeText} 예정된 가족 일정이 있습니다! 🔔${firstSch.notes ? `\n📝 ${firstSch.notes}` : ''}`;
  } else {
    body = tomorrowSchedules.map((s, idx) => {
      const name = MEMBER_NAME_MAP[s.memberId] || '가족';
      const time = s.startTime ? ` [${s.startTime}]` : '';
      return `${idx + 1}. ${name}: ${s.title}${time}`;
    }).join('\n');
  }

  const payload = JSON.stringify({
    title,
    body,
    tag: `sch-daily-${tomorrowStr}`,
    data: { url: './?tab=schedule' }
  });

  console.log('📤 Sending push notifications:');
  console.log('Title:', title);
  console.log('Body:\n', body);

  // 6. 각 기기로 푸시 발송
  let successCount = 0;
  let failCount = 0;

  for (const subItem of subscriptions) {
    if (!subItem.endpoint || !subItem.keys) continue;

    const pushSub = {
      endpoint: subItem.endpoint,
      keys: {
        p256dh: subItem.keys.p256dh,
        auth: subItem.keys.auth
      }
    };

    try {
      await webpush.sendNotification(pushSub, payload);
      successCount++;
      console.log(`✅ Push sent to ${subItem.memberName || 'device'} (${subItem.id})`);
    } catch (err) {
      failCount++;
      console.warn(`❌ Push failed for ${subItem.id}:`, err.statusCode, err.message);

      // 만료되거나 유효하지 않은 구독(410 Gone, 404 Not Found)은 DB에서 정리
      if (err.statusCode === 410 || err.statusCode === 404) {
        console.log(`🧹 Removing expired subscription from Firestore: ${subItem.docName}`);
        await deleteFirestoreDoc(subItem.docName, token);
      }
    }
  }

  console.log(`🎉 Done. Sent: ${successCount}, Failed: ${failCount}`);
}

main().catch((err) => {
  console.error('💥 Fatal error running schedule alerts:', err);
  process.exit(1);
});
