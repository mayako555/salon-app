import { Project, SyntaxKind, CallExpression } from "ts-morph";

const project = new Project();
project.addSourceFilesAtPaths("src/app/shifts/actions.ts");

const files = project.getSourceFiles();

for (const sourceFile of files) {
  // Replace imports
  const importDecls = sourceFile.getImportDeclarations();
  let hasDbImport = false;
  for (const imp of importDecls) {
    if (imp.getModuleSpecifierValue() === "@/lib/firebase") {
      hasDbImport = true;
      imp.setModuleSpecifier("@/lib/firebase-admin");
      imp.getNamedImports().forEach(n => {
        if (n.getName() === "db") n.setName("adminDb");
      });
    }
  }

  if (hasDbImport) {
    // This is a naive text replacement script that uses regex on the file text,
    // which is much easier than full AST transformation for this specific pattern.
    let text = sourceFile.getFullText();

    // 1. replace collection(db, X) -> adminDb.collection(X)
    text = text.replace(/collection\(\s*db\s*,\s*([^)]+)\)/g, "adminDb.collection($1)");

    // 2. replace getDocs(query(X, where(Y), where(Z))) -> X.where(Y).where(Z).get()
    // This requires a bit of regex wizardry or just manual fixes.
    // Let's just save the adminDb replace and we can manually fix the queries.
    sourceFile.replaceWithText(text);
    sourceFile.saveSync();
  }
}
