import { adminDb } from "../../src/lib/firebase-admin";
import { faqSeedData } from "../../src/lib/faq-seed-data";

// Extends seed data with LINE integration helper (accessible by storeManager too)
const extendedFaqs = [
  ...faqSeedData,
  {
    category: "LINE連携",
    question: "お客様に自動でLINE通知（予約完了・前日リマインドなど）を送る連携設定はどう行いますか？",
    answer: "システム設定の『LINE連携設定』から、公式LINEアカウントのChannel ID、Channel Secret、およびアクセストークンを登録してください。連携完了後、予約作成時や前日にLINEリマインダーが自動送信されるようになります。",
    search_terms: ["LINE", "ライン", "連携", "通知", "リマインド", "自動送信", "設定", "公式アカウント"],
    target_roles: ["systemOwner", "companyOwner", "admin", "storeManager"],
    related_screen: "/settings"
  },
  {
    category: "LINE連携",
    question: "LINE通知のテンプレート文章は変更できますか？",
    answer: "はい、変更できます。「システム設定」の「LINEメッセージテンプレート」タブから、予約完了、リマインド、サンクスメッセージのそれぞれのテンプレート文章を自由に編集し、お客様のお名前などを動的に挿入できます。",
    search_terms: ["LINE文章", "テンプレート", "文面", "変更", "編集", "リマインド文面"],
    target_roles: ["systemOwner", "companyOwner", "admin", "storeManager"],
    related_screen: "/settings"
  }
];

async function run() {
  console.log("Seeding FAQ database...");
  if (typeof adminDb.collection !== "function") {
    console.error("Error: adminDb is a mock/dummy proxy.");
    process.exit(1);
  }

  const snap = await adminDb.collection("faqs").get();
  const batch = adminDb.batch();

  if (snap.size > 0) {
    const cleanBatch = adminDb.batch();
    snap.docs.forEach((doc: any) => cleanBatch.delete(doc.ref));
    await cleanBatch.commit();
    console.log("Cleared old FAQ data.");
  }

  extendedFaqs.forEach((faq, idx) => {
    const ref = adminDb.collection("faqs").doc(`faq-seed-${idx + 1}`);
    batch.set(ref, {
      ...faq,
      is_published: true,
      created_at: new Date(),
      updated_at: new Date()
    });
  });

  await batch.commit();
  console.log(`Successfully seeded ${extendedFaqs.length} FAQ items!`);
}

run().catch(console.error);
