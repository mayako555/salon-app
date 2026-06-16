import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";

const applicants = [
  { application_date: "2025-01-20", name: "小野麻妃", age: 25, category: "経験3年以上", application_source: "リジョブ", status: "不採用", notes: "技術不足", desired_role: "その他", phone: "", email: "", name_kana: "" },
  { application_date: "2025-01-25", name: "古川友泉", category: "経験3年以上", application_source: "リジョブ", status: "不採用", notes: "見学のみ", desired_role: "その他", phone: "", email: "", name_kana: "" },
  { application_date: "2025-02-06", name: "溝口結衣", category: "未経験", application_source: "リジョブ", status: "不採用", desired_role: "その他", phone: "", email: "", name_kana: "" },
  { application_date: "2025-02-14", name: "亀井千尋", category: "経験3年以上", application_source: "リジョブ", status: "不採用", desired_role: "その他", phone: "", email: "", name_kana: "" },
  { application_date: "2025-03-05", name: "小山田翔子", category: "経験3年未満", application_source: "リジョブ", status: "不採用", desired_role: "その他", phone: "", email: "", name_kana: "" },
  { application_date: "2025-03-08", name: "大竹裕子", category: "スクールのみ", application_source: "リジョブ", status: "不採用", desired_role: "その他", phone: "", email: "", name_kana: "" },
  { application_date: "2025-03-10", name: "豊岡沙耶", age: 42, category: "経験3年以上", application_source: "HotPepper Beauty Works", status: "不採用", notes: "連絡取れず", desired_role: "その他", phone: "", email: "", name_kana: "" },
  { application_date: "2025-03-30", name: "平松祐希奈", age: 23, category: "経験3年未満", application_source: "リジョブ", status: "不採用", desired_role: "その他", phone: "", email: "", name_kana: "" },
  { application_date: "2025-04-12", name: "柴田真海", age: 20, category: "未経験", application_source: "Instagram", status: "採用", school_name: "B*", desired_role: "その他", phone: "", email: "", name_kana: "" },
  { application_date: "2025-04-18", name: "佐多裕陽", age: 25, category: "経験3年未満", application_source: "リジョブ", status: "辞退", desired_role: "その他", phone: "", email: "", name_kana: "" },
  { application_date: "2025-04-19", name: "稲葉悠花", age: 20, category: "2026年度新卒", application_source: "HotPepper Beauty Works", status: "採用", school_name: "B*", join_date: "2026-04-01", desired_role: "その他", phone: "", email: "", name_kana: "" },
  { application_date: "2025-04-23", name: "太田夏海", age: 19, category: "2026年度新卒", application_source: "HotPepper Beauty Works", status: "辞退", desired_role: "その他", phone: "", email: "", name_kana: "" },
  { application_date: "2025-04-30", name: "沖段瑠璃", age: 20, category: "2026年度新卒", application_source: "リジョブ", status: "不採用", desired_role: "その他", phone: "", email: "", name_kana: "" },
  { application_date: "2025-05-15", name: "濱田優月", age: 20, category: "経験1年未満(準新卒2025年)", application_source: "リジョブ", status: "辞退", desired_role: "その他", phone: "", email: "", name_kana: "" },
  { application_date: "2025-05-20", name: "黒坂夏帆", age: 24, category: "未経験", application_source: "HotPepper Beauty Works", status: "不採用", notes: "連絡取れず", desired_role: "その他", phone: "", email: "", name_kana: "" },
  { application_date: "2025-05-30", name: "岩崎侑莉", age: 25, category: "経験3年未満", application_source: "HotPepper Beauty Works", status: "不採用", notes: "見学のみ", desired_role: "その他", phone: "", email: "", name_kana: "" },
  { application_date: "2025-06-03", name: "笠平渚", age: 35, category: "経験3年以上", application_source: "リジョブ", status: "辞退", desired_role: "その他", phone: "", email: "", name_kana: "" },
  { application_date: "2026-06-16", name: "弘川いづみ", age: 20, category: "経験1年未満(準新卒2025年)", application_source: "リジョブ", status: "不採用", notes: "見学のみ", desired_role: "その他", phone: "", email: "", name_kana: "" },
  { application_date: "2025-06-17", name: "塚本翠泉", age: 21, category: "経験1年未満(準新卒2025年)", application_source: "HotPepper Beauty Works", recruitment_cost: "15万", status: "採用", decision_date: "2025-06-27", join_date: "2025-07-01", desired_role: "その他", phone: "", email: "", name_kana: "" },
  { application_date: "2025-06-17", name: "上地陽菜", age: 20, category: "2026年度新卒", application_source: "Instagram", status: "採用", desired_role: "その他", phone: "", email: "", name_kana: "" },
  { application_date: "2025-06-18", name: "ききもとひめな", age: 20, category: "未経験", salon_tour_date: "なし", interview_date: "2025-07-17", application_source: "HotPepper Beauty Works", recruitment_cost: "10万", status: "応募受付", school_name: "神戸ベルレベル", desired_role: "その他", phone: "", email: "", name_kana: "" },
  { application_date: "2025-06-20", name: "大河杏羽", age: 19, category: "2026年度新卒", salon_tour_date: "2025-06-30", application_source: "リジョブ", status: "応募受付", desired_role: "その他", phone: "", email: "", name_kana: "" },
  { application_date: "2025-06-21", name: "相田", age: 19, category: "2026年度新卒", salon_tour_date: "2025-07-12", application_source: "リジョブ", status: "応募受付", desired_role: "その他", phone: "", email: "", name_kana: "" },
  { application_date: "2025-06-24", name: "青木美緒", age: 20, category: "2026年度新卒", salon_tour_date: "2025-07-01", application_source: "リジョブ", status: "応募受付", desired_role: "その他", phone: "", email: "", name_kana: "" },
  { application_date: "2025-06-04", name: "帯刀朱夏", age: 20, category: "2026年度新卒", application_source: "自社サイト", school_name: "B*", status: "応募受付", desired_role: "その他", phone: "", email: "", name_kana: "" },
  { application_date: "2025-06-23", name: "中倉菜和", name_kana: "なかくらまなか", category: "2026年度新卒", interview_date: "2025-07-12T16:00", application_source: "その他", notes: "Besupport", school_name: "神戸ベルレベル", status: "応募受付", desired_role: "その他", phone: "", email: "" },
  { application_date: "2025-08-05", name: "曽我部綾音", age: 37, category: "経験3年", interview_date: "2025-08-13", application_source: "キレイビズ", recruitment_cost: "44万円", status: "採用", desired_role: "その他", phone: "", email: "", name_kana: "" },
  { application_date: "2025-09-19", name: "辻美和", age: 36, category: "経験3年以上", application_source: "HotPepper Beauty Works", status: "応募受付", desired_role: "その他", phone: "", email: "", name_kana: "" },
  { application_date: "2025-07-17", name: "河村成美", name_kana: "かわむらなるみ", category: "経験3年以上", application_source: "リジョブ", status: "応募受付", desired_role: "その他", phone: "", email: "" },
  { application_date: "2025-07-22", name: "内藤さやか", name_kana: "ないとうさやか", category: "経験3年以上", application_source: "リジョブ", status: "応募受付", desired_role: "その他", phone: "", email: "" },
  { application_date: "2025-08-07", name: "相馬綾香", name_kana: "そうまあやか", category: "経験3年以上", application_source: "リジョブ", status: "辞退", desired_role: "その他", phone: "", email: "" },
  { application_date: "2025-08-08", name: "安平冴", name_kana: "やすひらさえ", category: "経験3年以上", application_source: "リジョブ", status: "応募受付", desired_role: "その他", phone: "", email: "" },
  { application_date: "2025-09-05", name: "徳山綾乃", name_kana: "とくやまあやの", category: "未経験", application_source: "リジョブ", status: "応募受付", desired_role: "その他", phone: "", email: "" },
  { application_date: "2025-09-05", name: "長見真心", name_kana: "ながみこころ", category: "未経験", application_source: "リジョブ", status: "応募受付", desired_role: "その他", phone: "", email: "" },
  { application_date: "2025-10-09", name: "平野乃愛", name_kana: "ひらののあ", category: "経験3年以上", application_source: "リジョブ", status: "応募受付", desired_role: "その他", phone: "", email: "" },
  { application_date: "2025-10-23", name: "藤本貴美香", name_kana: "ふじもときみか", category: "未経験", application_source: "リジョブ", status: "応募受付", desired_role: "その他", phone: "", email: "" },
  { application_date: "2025-10-23", name: "岡崎櫻", name_kana: "おかざきさくら", category: "未経験", application_source: "リジョブ", status: "応募受付", desired_role: "その他", phone: "", email: "" },
  { application_date: "2026-01-01", name: "谷口有香", name_kana: "たにぐちゆうか", category: "経験3未満", application_source: "リジョブ", status: "応募受付", desired_role: "その他", phone: "", email: "" },
  { application_date: "2026-01-24", name: "竹本侑希", name_kana: "たけもとゆうき", category: "経験3未満", application_source: "リジョブ", status: "応募受付", desired_role: "その他", phone: "", email: "" },
  { application_date: "2026-02-24", name: "森田麻里", age: 43, category: "経験3年以上", application_source: "リジョブ", status: "応募受付", desired_role: "その他", phone: "", email: "", name_kana: "" },
  { application_date: "2026-02-25", name: "松本結衣", age: 20, category: "新卒", application_source: "リジョブ", status: "応募受付", desired_role: "その他", phone: "", email: "", name_kana: "" },
  { application_date: "2026-02-26", name: "宮分桃香", category: "未経験", application_source: "リジョブ", status: "応募受付", desired_role: "その他", phone: "", email: "", name_kana: "" },
  { application_date: "2026-03-21", name: "安達奏", age: 22, category: "未経験", application_source: "リジョブ", status: "応募受付", desired_role: "その他", phone: "", email: "", name_kana: "" },
  { application_date: "2026-04-11", name: "居林伊吹", age: 29, category: "経験3年以上", application_source: "リジョブ", status: "応募受付", desired_role: "その他", phone: "", email: "", name_kana: "" }
];

export async function GET() {
  try {
    let count = 0;
    const batch = adminDb.batch();
    
    for (const app of applicants) {
      if (app.application_source === "Hotpepper Beauty Works" || app.application_source === "HotPeppe 15万" || app.application_source === "Hotpeppe 10万") {
        app.application_source = "HotPepper Beauty Works";
      }
      if (app.application_source === "HP") app.application_source = "自社サイト";
      if (app.application_source === "Instagtam") app.application_source = "Instagram";
      if (app.application_source === "キレイビズ") app.application_source = "その他";
      if (app.application_source === "Besupport") app.application_source = "その他";
      
      const docRef = adminDb.collection("applicants").doc();
      batch.set(docRef, {
        ...app,
        created_at: new Date(),
        updated_at: new Date()
      });
      count++;
    }
    
    await batch.commit();
    return NextResponse.json({ success: true, count });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message });
  }
}
