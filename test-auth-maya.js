const admin = require('firebase-admin');

const firebaseAdminConfig = {
  projectId: "salonapp-ee4d2",
  clientEmail: "firebase-adminsdk-fbsvc@salonapp-ee4d2.iam.gserviceaccount.com",
  privateKey: "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQDkFeZaMjeQgqpK\nRRvmGdIAKw0OFQLXkk2D7Ahhsi1i4C8+QBAnjdfGR+QUXOePiILZlw7/4vqxovDb\nfoLpRDWnFS1jnrUR1jETUlF20yfPNFvusXzAA7pc9qBosjuXb6SH+ICW7WAYy2+q\nY/CyGfmINjIPbjUk9byO0E2D8Z8J25ggPgNoiUDWngmr3ogkYvSHcwaFUpqOoUM3\nZCtpg328zQiQVrIvZn93TyMnx8WW50Mt8eCGE9ixpbeFryD8dodkfpBib7gQKnqm\nauhRh6kQ+n4oDayIRXH+mA667ALpP98EIQYR99UNTKiiYAQVEWsCdxClDVqEJnTm\n/LoEbE0lAgMBAAECggEADgpfFMb/Q/vB2d0+kL/0J83T+ZLyNYJXF+Y2xIorCxQm\nibF4jRweiqEwTs9Cne5XB71Uegy8m/oeKOo1ICudFeeoKfgXc2f5EL8XhAtkPvgd\nKf4ZDNpDOv0foMegAtF857Xfd0BY6GMq65VIDYlVzWcbVncqpFd66luzpIoCMqFe\nj+LIC10+WENYq91D2vxp+9gbkmnIPqJwdlcAvQ6tQPpgnYDrlRxxwc/pXHyyI1CR\nljfqPxpbxCnqRmR5htm4lITm3sR0H6Qe9WP2CxAqZN1O/QPQxRtuO3Dx4hzCjVYQ\nKBdAvBmyDPH7fJf90VNKAVeVO0JCYZ50MhdxC5NhYQKBgQD0EyHz6RmEUEegebny\nwE668DYpSM/O9p3/X4dGc7WdMySXmmScxGMmE+GU0UHzjJhvxHawYW2uoBNHouNz\nOHCxO4PHMHIdxsytss1v7Z75UOmgVJNMe6QPkoaUzG65LUD78TeXlIzkONCVQ/5O\nxMkmdwf3mUuCNh/+mJ6Cjxz7SQKBgQDvOsaRyJULpH+Y/EtkyhOytexViSnlGPlc\nHko5E7Um7n2ifA5mgw+auypYhhF9AmpvZhYS/q+AJPee2DF8x1lb2GHFN/S/O5TB\n1exRV7DsLdH4b4bz9/k6OIKYuZcdTzyIyc5z94q+UjrbxDJ4rCiqy2xPy/l/OKFO\nD93LpYJG/QKBgBL4obz5s1gLfWXF0GRD+lqhbTRMSorFtIYzAKrDN6yeWwvFnmhp\nA2PkS7ZrhXrOxNJ7LNaM3B+kpZr92DwOeQPtolKLO3OBDku6CCnZCHBMj7w8lq5t\nNdVYCEnskfamw9RRbYbErybWG7Bedpfcx93Lhr0CF1Jprpb1eeyf/xqxAoGBAIum\nQt49OgxW1YmH1bcbY45SNojkDgnHn2EP6YISKBB27e4Y/wsGfOh1U83jTXgtHdaz\nwDUMaYSjj80xJQpTEK3VzZUkCgJMFJVmfJIrX4MvaD/fUuc+HUXIUSw4QqeAZrTv\nIU5+9YYOWH+Ls27QCNlS8IJQbu++LiN0jaPglQE9AoGADGMCjs6jpBRpqhx1Haka\n38fq9oSeZUfETyzZC0w4PpdhiBKaCY0mClGvYWN4R7dINYMHvC26piekCeXRFmHw\n86GZ692dg3orD2vNrykU7I5WICCOOrMkTAZXvMvvHrtPmYEOoqSN+9F3JZa0CVnp\nSW2Cks1PlxJvTqBAXjpPHC0=\n-----END PRIVATE KEY-----\n"
};

admin.initializeApp({
  credential: admin.credential.cert(firebaseAdminConfig)
});

(async () => {
  try {
    const user = await admin.auth().getUserByEmail('mayainny5@gmail.com');
    console.log('Firebase Auth User Found:', user.uid);
  } catch (e) {
    console.error('Auth Error:', e.message);
  }
  process.exit(0);
})();
