import { AccountingError } from './model';
export async function apiJson(url: string, init: RequestInit = {}, read = false): Promise<any> {
    for (let attempt = 0; attempt < 3; attempt++) {
        let response: Response;
        try {
            response = await fetch(url, { ...init, cache: 'no-store', signal: AbortSignal.timeout(12000) });
        }
        catch {
            throw new AccountingError('NETWORK', '通信結果を確認できません。', !read);
        }
        if (read && (response.status === 429 || response.status >= 500) && attempt < 2) {
            const retry = Number(response.headers.get('retry-after'));
            if (Number.isFinite(retry) && retry > 5)
                throw new AccountingError('RATE_LIMIT', 'しばらく待ってから再実行してください。');
            await new Promise(r => setTimeout(r, Math.max(500 * 2 ** attempt, Number.isFinite(retry) ? retry * 1000 : 0) + Math.random() * 200));
            continue;
        }
        if (!response.ok) {
            const code = response.status === 401 ? 'REAUTH' : response.status === 403 ? 'PERMISSION' : response.status === 429 ? 'RATE_LIMIT' : response.status >= 500 ? 'REMOTE' : 'VALIDATION';
            throw new AccountingError(code, code === 'REAUTH' ? '会計ソフトとの連携が切れています。再連携してください。' : `会計サービスが処理を受け付けませんでした（${response.status}）。`, !read && (response.status >= 500 || [408, 409].includes(response.status)));
        }
        if (response.status === 204)
            return {};
        try {
            return await response.json();
        }
        catch {
            throw new AccountingError('SCHEMA', '会計サービスの応答を確認できません。', !read);
        }
    }
    throw new AccountingError('REMOTE', '会計サービスに接続できません。');
}
