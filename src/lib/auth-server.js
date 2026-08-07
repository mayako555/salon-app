"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCurrentUserContext = getCurrentUserContext;
exports.verifyPermission = verifyPermission;
var headers_1 = require("next/headers");
var navigation_1 = require("next/navigation");
var firebase_admin_1 = require("./firebase-admin");
/**
 * すべてのサーバーアクションの先頭で呼び出し、現在のユーザーコンテキストを取得する
 */
function getCurrentUserContext() {
    return __awaiter(this, void 0, void 0, function () {
        var cookieStore, session, decodedClaims, uid, email, snapshot, userData, role, companyId, isImpersonating, originalSystemOwnerUid, impCookie, schoolEnabled, schoolName, companySnap, e_1, error_1;
        var _a, _b, _c, _d, _e, _f, _g;
        return __generator(this, function (_h) {
            switch (_h.label) {
                case 0: return [4 /*yield*/, (0, headers_1.cookies)()];
                case 1:
                    cookieStore = _h.sent();
                    session = (_a = cookieStore.get("session")) === null || _a === void 0 ? void 0 : _a.value;
                    if (!session) {
                        (0, navigation_1.redirect)("/login");
                    }
                    _h.label = 2;
                case 2:
                    _h.trys.push([2, 12, , 13]);
                    return [4 /*yield*/, firebase_admin_1.adminAuth.verifySessionCookie(session, true)];
                case 3:
                    decodedClaims = _h.sent();
                    uid = decodedClaims.uid;
                    email = decodedClaims.email;
                    snapshot = void 0;
                    if (!email) return [3 /*break*/, 5];
                    return [4 /*yield*/, firebase_admin_1.adminDb.collection("staff_profiles").where("email", "==", email).limit(1).get()];
                case 4:
                    snapshot = _h.sent();
                    return [3 /*break*/, 7];
                case 5: return [4 /*yield*/, firebase_admin_1.adminDb.collection("staff_profiles").where("uid", "==", uid).limit(1).get()];
                case 6:
                    snapshot = _h.sent();
                    _h.label = 7;
                case 7:
                    if (!snapshot || snapshot.empty) {
                        // No profile found in DB, fallback to guest (same as frontend auth-context)
                        return [2 /*return*/, {
                                uid: uid,
                                role: "guest",
                                companyId: undefined, // guest has no company constraint initially
                                salonIds: [],
                                schoolEnabled: false,
                                schoolName: "",
                            }];
                    }
                    userData = (_b = snapshot.docs[0]) === null || _b === void 0 ? void 0 : _b.data();
                    if (!userData) {
                        throw new Error("ユーザーデータが空です (Empty User Data)");
                    }
                    role = (userData === null || userData === void 0 ? void 0 : userData.role) || "staff";
                    companyId = userData === null || userData === void 0 ? void 0 : userData.companyId;
                    isImpersonating = false;
                    originalSystemOwnerUid = undefined;
                    if (role === "systemOwner") {
                        impCookie = (_c = cookieStore.get("impersonated_company_id")) === null || _c === void 0 ? void 0 : _c.value;
                        if (impCookie) {
                            companyId = impCookie;
                            isImpersonating = true;
                            originalSystemOwnerUid = uid;
                        }
                    }
                    if (!companyId && role !== "systemOwner") {
                        throw new Error("会社情報が未設定です (Company ID missing)");
                    }
                    schoolEnabled = false;
                    schoolName = "";
                    if (!companyId) return [3 /*break*/, 11];
                    _h.label = 8;
                case 8:
                    _h.trys.push([8, 10, , 11]);
                    return [4 /*yield*/, firebase_admin_1.adminDb.collection("companies").doc(companyId).get()];
                case 9:
                    companySnap = _h.sent();
                    if (companySnap.exists) {
                        schoolEnabled = !!((_d = companySnap.data()) === null || _d === void 0 ? void 0 : _d.schoolEnabled);
                        schoolName = ((_e = companySnap.data()) === null || _e === void 0 ? void 0 : _e.schoolName) || "";
                    }
                    return [3 /*break*/, 11];
                case 10:
                    e_1 = _h.sent();
                    console.error("Failed to fetch company info in auth-server:", e_1);
                    return [3 /*break*/, 11];
                case 11: return [2 /*return*/, {
                        uid: uid,
                        role: role,
                        companyId: companyId,
                        salonIds: (userData === null || userData === void 0 ? void 0 : userData.salonIds) || [],
                        schoolEnabled: schoolEnabled,
                        schoolName: schoolName,
                        isImpersonating: isImpersonating,
                        originalSystemOwnerUid: originalSystemOwnerUid
                    }];
                case 12:
                    error_1 = _h.sent();
                    console.error("Auth verification failed:", error_1);
                    if (error_1.code === "auth/session-cookie-expired" ||
                        error_1.code === "auth/session-cookie-revoked" ||
                        ((_f = error_1.message) === null || _f === void 0 ? void 0 : _f.includes("expired")) ||
                        ((_g = error_1.message) === null || _g === void 0 ? void 0 : _g.includes("auth/"))) {
                        (0, navigation_1.redirect)("/login");
                    }
                    throw new Error("\u8A8D\u8A3C\u30A8\u30E9\u30FC: ".concat(error_1.message || String(error_1)));
                case 13: return [2 /*return*/];
            }
        });
    });
}
/**
 * 権限チェックユーティリティ
 * 各アクションで companyId 等のアクセス制御を共通化
 */
function verifyPermission(ctx, targetCompanyId, targetUserId) {
    // 1. systemOwner は全て許可
    if (ctx.role === "systemOwner")
        return true;
    // 2. targetCompanyId が指定されている場合、自社かどうかチェック
    if (targetCompanyId && targetCompanyId !== ctx.companyId) {
        throw new Error("権限がありません");
    }
    // 3. staff権限の場合は自分のデータしか見られない (要求があれば)
    if (ctx.role === "staff" && targetUserId && targetUserId !== ctx.uid) {
        throw new Error("権限がありません");
    }
    return true;
}
