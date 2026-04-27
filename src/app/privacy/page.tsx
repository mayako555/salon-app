export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-slate-50 py-12 px-6">
      <div className="max-w-2xl mx-auto bg-white rounded-3xl p-8 md:p-12 shadow-sm border border-slate-100">
        <h1 className="text-2xl font-black text-slate-900 mb-8 border-b border-slate-100 pb-4">プライバシーポリシー</h1>
        
        <div className="space-y-8 text-slate-600 leading-relaxed text-sm">
          <section>
            <h2 className="font-bold text-slate-900 text-lg mb-3">1. 個人情報の収集と利用目的</h2>
            <p>Jasmine Lash（以下「当店」）は、本アプリを通じて以下の目的で個人情報を収集・利用いたします。</p>
            <ul className="list-disc ml-5 mt-2 space-y-1">
              <li>カウンセリングシートの作成および施術の安全確認</li>
              <li>LINEを通じた予約確定メッセージ、リマインドメッセージの自動送信</li>
              <li>ご本人確認およびお問合せへの対応</li>
            </ul>
          </section>

          <section>
            <h2 className="font-bold text-slate-900 text-lg mb-3">2. 収集する情報</h2>
            <p>当店は、以下の情報を収集する場合があります。</p>
            <ul className="list-disc ml-5 mt-2 space-y-1">
              <li>お名前、電話番号、住所、メールアドレス、生年月日</li>
              <li>LINEユーザーID（通知機能の自動化のため）</li>
              <li>施術に関する健康状態や同意事項の回答内容</li>
            </ul>
          </section>

          <section>
            <h2 className="font-bold text-slate-900 text-lg mb-3">3. 第三者への提供</h2>
            <p>当店は、お客様の同意を得ることなく第三者に個人情報を提供することはありません。ただし、法令に基づく場合や人の生命、身体または財産の保護のために必要がある場合はこの限りではありません。</p>
          </section>

          <section>
            <h2 className="font-bold text-slate-900 text-lg mb-3">4. 安全管理措置</h2>
            <p>当店は、個人情報の漏えい、滅失またはき損の防止その他の個人情報の安全管理のために必要かつ適切な措置を講じます。</p>
          </section>

          <section>
            <h2 className="font-bold text-slate-900 text-lg mb-3">5. お問い合わせ先</h2>
            <p>プライバシーポリシーに関するお問い合わせは、当店のスタッフまでお願いいたします。</p>
          </section>

          <div className="pt-8 text-[10px] text-slate-400 font-medium">
            <p>制定日：2026年4月27日</p>
            <p>店舗名：Jasmine Lash</p>
          </div>
        </div>
      </div>
    </div>
  );
}
