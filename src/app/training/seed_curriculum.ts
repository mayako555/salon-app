
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import * as fs from 'fs';

// Initialize with service account if available, or use default (for this environment)
// In this specific assistant environment, we'll use a script that we can run with node
// Assuming the environment has access to the same project.

const CURRICULUM_DATA = [
  {
    name: "アイブロウ基礎知識",
    description: "皮膚学、毛髪学、脱毛学、衛生学、倫理学、カウンセリング学、商材学、フェイス分析、デザイン学",
    free_model_target: 0,
    paid_model_target: 0,
    evaluation_criteria: ["皮膚・毛髪の知識", "商材・衛生の理解", "デザイン理論の習得"]
  },
  {
    name: "アイブロウ基礎技術",
    description: "アイブロウデッサン（演習・モデル）、ワキシング（シート・ハード）、ツイージング、スタイリング＆WAX、ラミネート技術、メンズアイブロウ",
    free_model_target: 5,
    paid_model_target: 5,
    evaluation_criteria: ["左右バランスの正確さ", "ワキシングの技術", "間引きの適切さ", "ラミネートの仕上がり"]
  },
  {
    name: "エクステンション基礎知識",
    description: "マネキンかき分け、1by1装着特性、ツイーザー保持、毛髪学、皮膚学、ワゴンセッティング、ヒトモデル前処理、ポイントリムーブ、トラブル対策、アフターカウンセリング、広告・リスク管理",
    free_model_target: 0,
    paid_model_target: 0,
    evaluation_criteria: ["装着姿勢の正しさ", "ツイーザーの扱い", "カウンセリングの質", "衛生管理の徹底"]
  },
  {
    name: "シングルエクステ",
    description: "テープワーク、グルー塗布量、装着すり合わせ技法、デザイン演習（ゴージャス、キュート、セクシー、スイート）、シルク・カシミア施術、下まつ毛エクステ",
    free_model_target: 10,
    paid_model_target: 10,
    evaluation_criteria: ["装着のスピード", "持続力（接着面）", "デザインの再現性"]
  },
  {
    name: "ボリュームラッシュ",
    description: "2D〜5D FANトレーニング、ウィッグFAN装着、デザインFAN装着実習",
    free_model_target: 10,
    paid_model_target: 10,
    evaluation_criteria: ["FANの開き具合", "装着の安定感", "デザインバランス"]
  },
  {
    name: "アイブロウOJT",
    description: "アイブロウメニューの実務実習、カウンセリングから施術完了までのフロー習得",
    free_model_target: 0,
    paid_model_target: 0,
    evaluation_criteria: ["実務フローの習得", "接客の丁寧さ"]
  },
  {
    name: "ラッシュリフトOJT",
    description: "次世代まつ毛パーマの実務実習、ロット選定、薬剤塗布技術の習得",
    free_model_target: 5,
    paid_model_target: 5,
    evaluation_criteria: ["ロット選定の適切さ", "カールの均一性"]
  },
  {
    name: "シングルエクステOJT",
    description: "通常メニュー（シングル）の現場実習、入客を通したスピードと質の向上",
    free_model_target: 0,
    paid_model_target: 0,
    evaluation_criteria: ["施術スピード", "顧客満足度"]
  },
  {
    name: "ボリュームラッシュOJT",
    description: "ボリュームラッシュメニューの現場実習",
    free_model_target: 0,
    paid_model_target: 0,
    evaluation_criteria: ["仕上がりの密度", "装着の正確性"]
  }
];

// This is a placeholder for the actual execution logic which would normally run via a server action
// Since I need to populate Firestore, I will provide the data and use the existing 'saveCurriculumItem' action logic
// if I were to run this as a real script. 

console.log("Extracted Data:", JSON.stringify(CURRICULUM_DATA, null, 2));
