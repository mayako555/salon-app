"use strict";
// Firebase Admin Initialization (Safe for Vercel Build)
// Build fix trigger
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminStorage = exports.adminDb = exports.adminAuth = void 0;
// Build phase detection
var isBuild = process.env.npm_lifecycle_event === "build" ||
    process.env.NEXT_PHASE === "phase-production-build" ||
    !process.env.FIREBASE_PRIVATE_KEY;
// Create dummy proxies for build time to completely avoid importing or running firebase-admin
function createDummyProxy() {
    return new Proxy({}, {
        get: function () {
            return function () {
                var args = [];
                for (var _i = 0; _i < arguments.length; _i++) {
                    args[_i] = arguments[_i];
                }
                return Promise.resolve({ docs: [], exists: false, success: false, uid: "dummy" });
            };
        }
    });
}
var adminAuth;
var adminDb;
var adminStorage;
try {
    if (isBuild) {
        exports.adminAuth = adminAuth = createDummyProxy();
        exports.adminDb = adminDb = createDummyProxy();
        exports.adminStorage = adminStorage = createDummyProxy();
    }
    else {
        // Only require firebase-admin at runtime
        var admin = require("firebase-admin");
        var getPrivateKey = function () {
            var _a;
            // Vercelなどで環境変数として設定する場合、改行コードがエスケープされたり
            // 意図しない空白が混入することがあるため、それを適切に処理する
            var key = process.env.FIREBASE_PRIVATE_KEY;
            if (!key)
                return null;
            var parsedKey = key;
            if (key.trim().startsWith('{')) {
                try {
                    var parsed = JSON.parse(key);
                    if (parsed.private_key)
                        parsedKey = parsed.private_key;
                }
                catch (e) { }
            }
            // 先頭・末尾のクォーテーションやリテラルの\nを実際の改行に変換
            parsedKey = parsedKey.replace(/\\n/g, "\n").replace(/\"/g, "").trim();
            // base64のペイロード部分に意図せず空白やバックスラッシュ(\)が混入した場合、
            // PEMフォーマットエラー(Invalid PEM formatted message)になるため、
            // Base64として有効な文字以外をすべて除去し、64文字ごとに再フォーマットする
            var header = "-----BEGIN PRIVATE KEY-----";
            var footer = "-----END PRIVATE KEY-----";
            if (parsedKey.includes(header) && parsedKey.includes(footer)) {
                var payloadStart = parsedKey.indexOf(header) + header.length;
                var payloadEnd = parsedKey.indexOf(footer);
                var payload = parsedKey.substring(payloadStart, payloadEnd);
                // Base64として有効な文字 (A-Z, a-z, 0-9, +, /, =) 以外をすべて削除
                var cleanedPayload = payload.replace(/[^A-Za-z0-9+/=]/g, "");
                // 64文字ごとに改行を挿入して再構築
                var wrappedPayload = ((_a = cleanedPayload.match(/.{1,64}/g)) === null || _a === void 0 ? void 0 : _a.join("\n")) || cleanedPayload;
                parsedKey = header + "\n" + wrappedPayload + "\n" + footer;
            }
            return parsedKey;
        };
        var getClientEmail = function () {
            // ... (existing code for getClientEmail)
            var email = process.env.FIREBASE_CLIENT_EMAIL;
            if (email)
                return email;
            var key = process.env.FIREBASE_PRIVATE_KEY;
            if (key && key.trim().startsWith('{')) {
                try {
                    var parsed = JSON.parse(key);
                    if (parsed.client_email)
                        return parsed.client_email;
                }
                catch (e) { }
            }
            return undefined;
        };
        var firebaseAdminConfig = {
            projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "salonapp-ee4d2",
            clientEmail: getClientEmail(),
            privateKey: getPrivateKey(),
        };
        if (!admin.apps.length) {
            var pk = firebaseAdminConfig.privateKey;
            var hasValidKey = pk && pk.includes("-----BEGIN PRIVATE KEY-----");
            var storageBucket = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "salonapp-ee4d2.firebasestorage.app";
            if (firebaseAdminConfig.clientEmail && hasValidKey) {
                admin.initializeApp({
                    credential: admin.credential.cert(firebaseAdminConfig),
                    storageBucket: storageBucket
                });
            }
            else {
                admin.initializeApp({
                    storageBucket: storageBucket
                });
            }
        }
        exports.adminAuth = adminAuth = admin.auth();
        var getFirestore = require("firebase-admin/firestore").getFirestore;
        var databaseId = process.env.NEXT_PUBLIC_FIREBASE_DATABASE_ID || "(default)";
        exports.adminDb = adminDb = getFirestore(admin.app(), databaseId);
        exports.adminStorage = adminStorage = admin.storage();
    }
}
catch (error) {
    console.error("CRITICAL: Firebase Admin failed to load:", error);
    exports.adminAuth = adminAuth = createDummyProxy();
    exports.adminDb = adminDb = createDummyProxy();
    exports.adminStorage = adminStorage = createDummyProxy();
}
