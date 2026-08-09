"use server";

import { db } from "@/lib/firebase";
import { 
  collection, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc,
  doc, 
  serverTimestamp,
  query,
  orderBy
} from "firebase/firestore";
import { revalidatePath } from "next/cache";
import { updateTenantOwnedDoc, deleteTenantOwnedDoc , addTenantOwnedDoc } from "@/lib/tenant-ownership";


export type ContractTemplate = {
  id: string;
  title: string;
  type: "employment" | "outsourcing" | "part_time" | "mirror_rental" | "other";
  content: string;
  createdAt?: any;
  updatedAt?: any;
};

const TEMPLATES_COLLECTION = "contract_templates";

export async function getContractTemplates() {
  try {
    const colRef = collection(db, TEMPLATES_COLLECTION);
    const q = query(colRef, orderBy("createdAt", "desc"));
    const snap = await getDocs(q);
    
    return snap.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as ContractTemplate[];
  } catch (error) {
    console.error("Error fetching contract templates:", error);
    try {
      const snap = await getDocs(collection(db, TEMPLATES_COLLECTION));
      return snap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as ContractTemplate[];
    } catch (e) {
      return [];
    }
  }
}

export async function saveContractTemplate(id: string | null, payload: Omit<ContractTemplate, "id" | "createdAt" | "updatedAt">) {
  try {
    if (id) {
      const docRef = doc(db, TEMPLATES_COLLECTION, id);
      await updateTenantOwnedDoc(docRef, {
        ...payload,
        updatedAt: serverTimestamp()
      });
    } else {
      const colRef = collection(db, TEMPLATES_COLLECTION);
      await addTenantOwnedDoc(colRef, {
        ...payload,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    }
    revalidatePath("/admin/master/system/contracts");
    return { success: true };
  } catch (error: any) {
    console.error("Error saving contract template:", error);
    return { success: false, error: error.message };
  }
}

export async function deleteContractTemplate(id: string) {
  try {
    const docRef = doc(db, TEMPLATES_COLLECTION, id);
    await deleteTenantOwnedDoc(docRef);
    revalidatePath("/admin/master/system/contracts");
    return { success: true };
  } catch (error: any) {
    console.error("Error deleting contract template:", error);
    return { success: false, error: error.message };
  }
}

const DEFAULT_TEMPLATES: Omit<ContractTemplate, "id" | "createdAt" | "updatedAt">[] = [
  {
    title: "【標準】正社員 雇用契約書",
    type: "employment",
    content: `## 雇用契約書

使用者（以下「甲」という）と、労働者（以下「乙」という）は、以下の通り雇用契約を締結する。

### 第1条（雇用期間）
1. 雇用期間の定め：なし（正社員）
2. 試用期間：入社日から3ヶ月間とする。試用期間中において不適格と認められた場合は、本採用を拒否することがある。

### 第2条（就業場所および従事する業務）
1. 就業場所：甲が指定する店舗
2. 従事する業務：美容師業務、サロン運営業務、その他付随する業務

### 第3条（労働時間・休憩）
1. 始業時刻および終業時刻はシフト表の定めによる。
2. 休憩時間は、1日の労働時間が6時間を超える場合は45分、8時間を超える場合は60分とする。

### 第4条（賃金）
1. 基本給：月額 [[基本給]] 円
2. 歩合給：個人の技術売上、指名売上等に基づき、甲の定める歩合給規程により支給する。
3. 手当：役職手当、通勤手当（上限20,000円）等を別途支給する。
4. 賃金締切日および支払日：毎月末日締め、翌月15日支払い

### 第5条（機密保持）
乙は、在職中および退職後において、甲の顧客情報、技術情報、経営ノウハウ等の機密情報を第三者に漏洩してはならない。これに違反し甲に損害を与えた場合、乙は損害賠償の責を負う。

---
本契約の証として、本書2通を作成し、甲乙署名捺印の上、各自1通を保有する。`
  },
  {
    title: "【標準】アルバイト・パート 雇用契約書",
    type: "part_time",
    content: `## 雇用契約書（パートタイム）

使用者（以下「甲」という）と、労働者（以下「乙」という）は、以下の通り雇用契約を締結する。

### 第1条（雇用期間）
雇用期間の定め：あり（原則6ヶ月更新）

### 第2条（就業場所および従事する業務）
1. 就業場所：甲が指定する店舗
2. 従事する業務：アシスタント業務、フロント業務、その他サロン運営補助

### 第3条（労働時間・休憩・休日）
1. 労働日および労働時間：原則としてシフト表による。週 [[週の勤務日数]] 日程度。
2. 休憩時間：法定通り付与する。
3. 休日：シフト表で指定する日。

### 第4条（賃金）
1. 基本賃金：時給 [[時給]] 円
2. 諸手当：店販手当等の歩合規程がある場合はそれに従う。通勤手当（実費、上限あり）。
3. 賃金締切日および支払日：毎月末日締め、翌月15日支払い

### 第5条（服務規律）
乙は甲の指示に従い、誠実に職務を遂行しなければならない。無断欠勤やサロンの風紀を乱す行為があった場合、甲は本契約を即時解除できる。

---
本契約の証として、本書2通を作成し、甲乙署名捺印の上、各自1通を保有する。`
  },
  {
    title: "【標準】業務委託契約書（フリーランス）",
    type: "outsourcing",
    content: `## 業務委託契約書

委託者（以下「甲」という）と、受託者（以下「乙」という）は、美容業務の委託に関し、以下の通り契約を締結する。

### 第1条（目的・業務内容）
甲は、甲が運営するサロンにおける美容師業務（カット、カラー、パーマ等の施術、および接客業務）を乙に委託し、乙はこれを受託する。乙は独立した事業者として、自らの責任において業務を遂行する。

### 第2条（業務遂行の場所・時間）
1. 業務遂行場所：甲の指定する店舗
2. 業務時間：乙の裁量により決定する。ただし、サロンの営業時間内とし、事前予約のある時間帯については責任をもって業務を遂行すること。

### 第3条（委託報酬）
甲は乙に対し、以下の基準に基づき算出した額を業務委託報酬として支払う。
1. 指名売上に対する報酬：税抜売上額の [[指名売上歩合率(％)]] %
2. フリー売上に対する報酬：税抜売上額の [[フリー売上歩合率(％)]] %
3. 材料費：使用した材料費の [[材料費負担率(％)]] %を報酬から控除する。
4. 支払時期：月末締め、翌月15日払い（乙からの請求書に基づく）

### 第4条（インボイス制度への対応）
乙が適格請求書発行事業者である場合、乙は甲に対し適格請求書を発行するものとする。未登録の場合は、消費税相当額の支払いについて別途協議する。

### 第5条（機密保持および競業避止）
乙は、甲のサロンで得た顧客リストを不正に持ち出し、自己の営業のために利用してはならない。

---
本契約の証として、本書2通を作成し、甲乙署名または電子署名の上、各自保有する。`
  },
  {
    title: "【標準】面貸し（ミラーレンタル）契約書",
    type: "mirror_rental",
    content: `## ミラーレンタル契約書

店舗運営者（以下「甲」という）と、利用者（以下「乙」という）は、サロンの設備利用に関して以下の通り契約する。

### 第1条（目的）
甲は、乙が美容師として自己の顧客に施術を行うため、甲が運営するサロンの一部（セット面、シャンプー台等の設備）を利用することを許諾する。

### 第2条（利用料金・条件）
1. 利用料金：固定月額 [[固定月額(円)]] 円、または技術売上の [[技術売上歩合率(％)]] %とする。
2. 材料・薬剤：原則として乙が自己負担で持参するものとする。甲の材料を使用する場合は、別途実費を精算する。

### 第3条（利用時間）
乙が設備を利用できる時間は、原則として甲のサロン営業時間内とする。時間外の利用については甲の事前の承諾を必要とする。

### 第4条（損害賠償）
乙が故意または過失により甲の設備等を破損・汚損した場合、乙はその損害を賠償する責任を負う。また、乙の施術に起因して顧客とトラブルが発生した場合、乙の責任と負担において解決するものとする。

### 第5条（契約解除）
乙が本契約に違反した場合、またはサロンの風紀を著しく乱した場合、甲は催告なく即時に本契約を解除できる。

---
本契約の証として、本書2通を作成し、甲乙署名または電子署名の上、各自保有する。`
  }
];

export async function seedDefaultTemplates() {
  try {
    const colRef = collection(db, TEMPLATES_COLLECTION);
    
    // First check if templates already exist
    const snap = await getDocs(colRef);
    if (snap.size > 0) {
      return { success: false, error: "すでにテンプレートが存在します。" };
    }

    const promises = DEFAULT_TEMPLATES.map(template => {
      return addTenantOwnedDoc(colRef, {
        ...template,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    });

    await Promise.all(promises);
    revalidatePath("/admin/master/system/contracts");
    return { success: true };
  } catch (error: any) {
    console.error("Error seeding templates:", error);
    return { success: false, error: error.message };
  }
}
