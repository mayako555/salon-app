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
require("dotenv/config");
var firebase_admin_1 = require("../src/lib/firebase-admin");
var tenant_utils_1 = require("../src/lib/tenant-utils");
function runTests() {
    return __awaiter(this, void 0, void 0, function () {
        var ctxTenantA, ctxTenantB, ctxSystemOwner, passed, aList, aListIds, e_1, e_2, e_3;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    console.log("Running Tenant Isolation Tests...");
                    ctxTenantA = {
                        uid: "test-user-a",
                        email: "a@example.com",
                        role: "manager",
                        companyId: "tenant_A",
                        isImpersonating: false
                    };
                    ctxTenantB = {
                        uid: "test-user-b",
                        email: "b@example.com",
                        role: "manager",
                        companyId: "tenant_B",
                        isImpersonating: false
                    };
                    ctxSystemOwner = {
                        uid: "system-owner",
                        email: "sys@example.com",
                        role: "systemOwner",
                        companyId: "tenant_A",
                        isImpersonating: false
                    };
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 12, 13, 16]);
                    // 1. Write dummy data directly via Admin SDK
                    return [4 /*yield*/, firebase_admin_1.adminDb.collection("test_tenant_isolation").doc("docA").set({
                            companyId: "tenant_A",
                            secret: "tenant_A_secret"
                        })];
                case 2:
                    // 1. Write dummy data directly via Admin SDK
                    _a.sent();
                    return [4 /*yield*/, firebase_admin_1.adminDb.collection("test_tenant_isolation").doc("docB").set({
                            companyId: "tenant_B",
                            secret: "tenant_B_secret"
                        })];
                case 3:
                    _a.sent();
                    passed = true;
                    return [4 /*yield*/, (0, tenant_utils_1.getTenantCollection)("test_tenant_isolation", ctxTenantA).get()];
                case 4:
                    aList = _a.sent();
                    aListIds = aList.docs.map(function (d) { return d.id; });
                    if (aListIds.includes("docB")) {
                        console.error("FAIL: Tenant A can list Tenant B data");
                        passed = false;
                    }
                    else {
                        console.log("PASS: Tenant A listing isolated");
                    }
                    _a.label = 5;
                case 5:
                    _a.trys.push([5, 7, , 8]);
                    return [4 /*yield*/, (0, tenant_utils_1.getTenantDoc)("test_tenant_isolation", "docB", ctxTenantA)];
                case 6:
                    _a.sent();
                    console.error("FAIL: Tenant A can read Tenant B directly");
                    passed = false;
                    return [3 /*break*/, 8];
                case 7:
                    e_1 = _a.sent();
                    if (e_1.message.includes("Unauthorized tenant access")) {
                        console.log("PASS: Tenant A cannot read Tenant B directly");
                    }
                    else {
                        console.error("FAIL: Unexpected error message:", e_1.message);
                        passed = false;
                    }
                    return [3 /*break*/, 8];
                case 8:
                    _a.trys.push([8, 10, , 11]);
                    return [4 /*yield*/, (0, tenant_utils_1.getTenantDoc)("test_tenant_isolation", "docB", ctxSystemOwner)];
                case 9:
                    _a.sent();
                    console.log("PASS: SystemOwner can read Tenant B directly");
                    return [3 /*break*/, 11];
                case 10:
                    e_2 = _a.sent();
                    console.error("FAIL: SystemOwner cannot read Tenant B directly", e_2.message);
                    passed = false;
                    return [3 /*break*/, 11];
                case 11:
                    if (passed) {
                        console.log("ALL TESTS PASSED");
                    }
                    else {
                        process.exit(1);
                    }
                    return [3 /*break*/, 16];
                case 12:
                    e_3 = _a.sent();
                    console.error("Test framework error:", e_3);
                    return [3 /*break*/, 16];
                case 13: 
                // Cleanup
                return [4 /*yield*/, firebase_admin_1.adminDb.collection("test_tenant_isolation").doc("docA").delete()];
                case 14:
                    // Cleanup
                    _a.sent();
                    return [4 /*yield*/, firebase_admin_1.adminDb.collection("test_tenant_isolation").doc("docB").delete()];
                case 15:
                    _a.sent();
                    return [7 /*endfinally*/];
                case 16: return [2 /*return*/];
            }
        });
    });
}
runTests();
