import 'server-only';
import { apiJson } from './http';
import { AccountingError, freeePayload, moneyForwardPayload, type Account, type Candidate, type Company, type Mapping, type ProviderId, type Token } from './model';
export interface AccountingProvider {
    id: ProviderId;
    capabilities: {
        oauth: boolean;
        write: boolean;
        csv: boolean;
    };
    connect(state: string, redirect: string, challenge?: string): string;
    exchange(code: string, redirect: string, verifier?: string): Promise<Token>;
    disconnect(token: string): Promise<void>;
    refreshToken(token: string): Promise<Token>;
    getCompanies(token: string): Promise<Company[]>;
    getAccounts(token: string, company: string): Promise<Account[]>;
    createTransaction(token: string, company: string, item: Candidate, mapping: Mapping, reference: string): Promise<string>;
    healthCheck(token: string): Promise<boolean>;
}
export function freeeConfig() {
    const client = process.env.FREEE_CLIENT_ID, secret = process.env.FREEE_CLIENT_SECRET, origin = process.env.ACCOUNTING_APP_ORIGIN;
    if (!client || !secret || !origin || new URL(origin).protocol !== 'https:' || new URL(origin).origin !== origin)
        throw new AccountingError('CONFIG', 'freee連携のサーバー設定が未完了です。');
    return { client, secret, origin, redirect: origin + '/api/accounting/freee/callback' };
}
export class FreeeProvider implements AccountingProvider {
    id = 'freee' as const;
    capabilities = { oauth: true, write: true, csv: false };
    connect(state: string, redirect: string) { const c = freeeConfig(); return 'https://accounts.secure.freee.co.jp/public_api/authorize?' + new URLSearchParams({ client_id: c.client, response_type: 'code', redirect_uri: redirect, state, prompt: 'select_company' }); }
    private async token(values: Record<string, string>): Promise<Token> {
        const c = freeeConfig();
        const data = await apiJson('https://accounts.secure.freee.co.jp/public_api/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ ...values, client_id: c.client, client_secret: c.secret }) });
        if (typeof data.access_token !== 'string' || typeof data.refresh_token !== 'string' || !Number.isFinite(data.expires_in) || data.expires_in <= 0)
            throw new AccountingError('SCHEMA', '認証応答を確認できません。', true);
        return { access_token: data.access_token, refresh_token: data.refresh_token, expires_in: data.expires_in, scope: typeof data.scope === 'string' ? data.scope : '' };
    }
    exchange(code: string, redirect: string) { return this.token({ grant_type: 'authorization_code', code, redirect_uri: redirect }); }
    refreshToken(refresh: string) { return this.token({ grant_type: 'refresh_token', refresh_token: refresh }); }
    async disconnect(token: string) { const c = freeeConfig(); await apiJson('https://accounts.secure.freee.co.jp/public_api/revoke', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ token, client_id: c.client, client_secret: c.secret }) }); }
    private get(token: string, path: string) { return apiJson('https://api.freee.co.jp/api/1/' + path, { headers: { Authorization: `Bearer ${token}` } }, true); }
    async getCompanies(token: string) { const d = await this.get(token, 'companies'); if (!Array.isArray(d.companies))
        throw new AccountingError('SCHEMA', '事業所情報を確認できません。'); return d.companies.map((v: any) => ({ id: String(v.id), name: String(v.display_name || v.name || v.id) })); }
    async getAccounts(token: string, company: string) { const d = await this.get(token, 'account_items?company_id=' + encodeURIComponent(company)); if (!Array.isArray(d.account_items))
        throw new AccountingError('SCHEMA', '科目情報を確認できません。'); return d.account_items.map((v: any) => ({ id: Number(v.id), name: String(v.name) })); }
    async createTransaction(token: string, company: string, item: Candidate, mapping: Mapping, reference: string) {
        const d = await apiJson('https://api.freee.co.jp/api/1/deals', { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(freeePayload(company, item, mapping, reference)) });
        if (!d.deal?.id)
            throw new AccountingError('SCHEMA', '登録結果の確認が必要です。', true);
        return String(d.deal.id);
    }
    async healthCheck(token: string) { await this.getCompanies(token); return true; }
}
class UnavailableProvider implements AccountingProvider {
    capabilities = { oauth: false, write: false, csv: false };
    constructor(public id: ProviderId) { }
    private unavailable(): never { throw new AccountingError('UNSUPPORTED', 'このサービスのAPI連携は準備中です。標準CSVをご利用ください。'); }
    connect(): string { return this.unavailable(); }
    async exchange(): Promise<Token> { return this.unavailable(); }
    async disconnect(): Promise<void> { return this.unavailable(); }
    async refreshToken(): Promise<Token> { return this.unavailable(); }
    async getCompanies(): Promise<Company[]> { return this.unavailable(); }
    async getAccounts(): Promise<Account[]> { return this.unavailable(); }
    async createTransaction(): Promise<string> { return this.unavailable(); }
    async healthCheck() { return false; }
}
export function providerConfig(id: ProviderId) {
    if (id === 'freee')
        return freeeConfig();
    const client = process.env.MONEYFORWARD_CLIENT_ID, secret = process.env.MONEYFORWARD_CLIENT_SECRET, origin = process.env.ACCOUNTING_APP_ORIGIN;
    if (id !== 'moneyforward' || !client || !secret || !origin || new URL(origin).protocol !== 'https:' || new URL(origin).origin !== origin)
        throw new AccountingError('CONFIG', '連携サーバー設定が未完了です。');
    return { client, secret, origin, redirect: origin + '/api/accounting/moneyforward/callback' };
}
export class MoneyForwardProvider implements AccountingProvider {
    id = 'moneyforward' as const;
    capabilities = { oauth: true, write: true, csv: false };
    connect(state: string, redirect: string, challenge?: string) { if (!challenge)
        throw new AccountingError('PKCE', '認証をやり直してください。'); const c = providerConfig(this.id); return 'https://api.biz.moneyforward.com/authorize?' + new URLSearchParams({ client_id: c.client, response_type: 'code', redirect_uri: redirect, state, code_challenge: challenge, code_challenge_method: 'S256', scope: 'mfc/accounting/offices.read mfc/accounting/accounts.read mfc/accounting/journal.write' }); }
    private async token(values: Record<string, string>): Promise<Token> { const c = providerConfig(this.id); const d = await apiJson('https://api.biz.moneyforward.com/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded', Authorization: 'Basic ' + Buffer.from(c.client + ':' + c.secret).toString('base64') }, body: new URLSearchParams(values) }); if (typeof d.access_token !== 'string' || typeof d.refresh_token !== 'string' || !Number.isFinite(d.expires_in) || d.expires_in <= 0)
        throw new AccountingError('SCHEMA', '認証応答を確認できません。', true); return { access_token: d.access_token, refresh_token: d.refresh_token, expires_in: d.expires_in, scope: typeof d.scope === 'string' ? d.scope : '' }; }
    exchange(code: string, redirect: string, verifier?: string) { if (!verifier)
        throw new AccountingError('PKCE', '認証をやり直してください。'); return this.token({ grant_type: 'authorization_code', code, redirect_uri: redirect, code_verifier: verifier }); }
    refreshToken(token: string) { return this.token({ grant_type: 'refresh_token', refresh_token: token }); }
    async disconnect(): Promise<void> { throw new AccountingError('REVOKE', 'マネーフォワード側でも連携許可を解除してください。'); }
    private get(token: string, path: string) { return apiJson('https://api-accounting.moneyforward.com/api/v3/' + path, { headers: { Authorization: 'Bearer ' + token } }, true); }
    async getCompanies(token: string) { const d = await this.get(token, 'offices'); if (typeof d.code !== 'string' || typeof d.name !== 'string')
        throw new AccountingError('SCHEMA', '事業所情報を確認できません。'); return [{ id: d.code, name: d.name }]; }
    async getAccounts(token: string, company: string) { const companies = await this.getCompanies(token); if (companies[0].id !== company)
        throw new AccountingError('COMPANY', '認可事業所が異なります。'); const d = await this.get(token, 'accounts'); if (!Array.isArray(d.accounts))
        throw new AccountingError('SCHEMA', '科目情報を確認できません。'); return d.accounts.map((a: any) => ({ id: String(a.id), name: String(a.name) })); }
    async createTransaction(token: string, company: string, item: Candidate, m: Mapping, reference: string) { const companies = await this.getCompanies(token); if (companies[0].id !== company)
        throw new AccountingError('COMPANY', '認可事業所が異なります。'); const payload = moneyForwardPayload(item, m, reference); const d = await apiJson('https://api-accounting.moneyforward.com/api/v3/journals', { method: 'POST', headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }); if (typeof d.journal?.id !== 'string')
        throw new AccountingError('SCHEMA', '登録結果を確認してください。', true); return d.journal.id; }
    async healthCheck(token: string) { await this.getCompanies(token); return true; }
}
export class YayoiProvider extends UnavailableProvider {
    constructor() { super('yayoi'); }
}
const providers = { freee: new FreeeProvider(), moneyforward: new MoneyForwardProvider(), yayoi: new YayoiProvider() };
export function getProvider(id: ProviderId): AccountingProvider { const p = Object.hasOwn(providers, id) ? providers[id] : undefined; if (!p)
    throw new AccountingError('INVALID', 'サービスを確認してください。'); return p; }
