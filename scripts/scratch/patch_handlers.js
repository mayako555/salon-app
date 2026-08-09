const fs = require('fs');

let pageContent = fs.readFileSync('src/app/admin/expenses/page.tsx', 'utf-8');

const replacementPdfUpload = `  const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      toast.error("ファイルサイズは10MB以下にしてください");
      return;
    }

    setIsParsingPdf(true);
    setImportError(null);
    setParsedTransactions([]);
    setRequireColumnMapping(false);
    setImportStats(null);

    try {
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const base64Data = reader.result as string;
          let mime = file.type;
          if (!mime && file.name.endsWith(".txt")) mime = "text/plain";
          if (!mime && file.name.endsWith(".csv")) mime = "text/csv";
          if (!mime && file.name.endsWith(".rtf")) mime = "text/rtf";
          if (mime === "application/rtf") mime = "text/rtf";
          
          if (mime === "text/csv" || mime === "text/plain" || mime === "text/rtf") {
            const cleanBase64 = base64Data.includes(",") ? base64Data.split(",")[1] : base64Data;
            const decodedText = Buffer.from(cleanBase64, 'base64').toString('utf8');
            setPasteText(decodedText); // Save for column mapping fallback
          }

          const res = await parseYayoiPdfAction(base64Data, mime || "application/pdf");
          
          if (res.success && res.dataStr) {
            const parsedArray = JSON.parse(res.dataStr);
            if (parsedArray.length === 0) {
              setImportError("取引データが見つかりませんでした。金額や摘要が含まれているか確認してください。");
              toast.error("データが0件です");
            } else {
              setParsedTransactions(parsedArray);
              setImportStats(res.stats || null);
              toast.success("取引履歴を高速解析しました！");
            }
          } else if (res.requireColumnSelection) {
            setRequireColumnMapping(true);
            setCsvHeaders(res.headers || []);
            setCsvPreviewRows(res.previewRows || []);
            toast.error("CSVの列が自動判定できませんでした。列を選択してください。");
          } else {
            setImportError(res.error || "取引履歴の解析に失敗しました");
            toast.error("解析エラーが発生しました");
          }
        } catch (err: any) {
          console.error("Asynchronous error during transaction parsing:", err);
          setImportError(err.message || "解析中に予期せぬエラーが発生しました");
          toast.error("解析エラーが発生しました");
        } finally {
          setIsParsingPdf(false);
        }
      };
      reader.onerror = () => {
        toast.error("ファイルの読み込み中にエラーが発生しました");
        setIsParsingPdf(false);
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      console.error(err);
      setImportError(err.message);
      toast.error("エラーが発生しました");
      setIsParsingPdf(false);
    }
  };

  const handlePasteTextUpload = async (columnMappingParams?: any) => {
    if (!pasteText.trim()) return;

    setIsParsingPdf(true);
    setImportError(null);
    if (!columnMappingParams) {
      setParsedTransactions([]);
      setRequireColumnMapping(false);
      setImportStats(null);
    }

    try {
      const res = await parseYayoiTextAction(pasteText, columnMappingParams);
      if (res.success && res.dataStr) {
        const parsedArray = JSON.parse(res.dataStr);
        if (parsedArray.length === 0) {
          setImportError("取引データが見つかりませんでした。金額や摘要が含まれているか確認してください。");
          toast.error("データが0件です");
        } else {
          setParsedTransactions(parsedArray);
          setImportStats(res.stats || null);
          setRequireColumnMapping(false);
          toast.success("テキストから取引履歴を高速解析しました！");
        }
      } else if (res.requireColumnSelection) {
        setRequireColumnMapping(true);
        setCsvHeaders(res.headers || []);
        setCsvPreviewRows(res.previewRows || []);
        toast.error("CSVの列が自動判定できませんでした。列を選択してください。");
      } else {
        setImportError(res.error || "取引履歴の解析に失敗しました");
        toast.error("解析エラーが発生しました");
      }
    } catch (err: any) {
      console.error("Asynchronous error during transaction parsing:", err);
      setImportError(err.message || "解析中に予期せぬエラーが発生しました");
      toast.error("解析エラーが発生しました");
    } finally {
      setIsParsingPdf(false);
    }
  };`;

const targetRegex = /const handlePdfUpload = async \([^]*?\} finally \{\s*setIsParsingPdf\(false\);\s*\}\s*\};\s*const handleApplyImportedExpenses = async \(\) => {/g;

if (!targetRegex.test(pageContent)) {
  console.log("Could not find target in page.tsx");
  process.exit(1);
}

const updatedContent = pageContent.replace(targetRegex, replacementPdfUpload + "\n\n  const handleApplyImportedExpenses = async () => {");
fs.writeFileSync('src/app/admin/expenses/page.tsx', updatedContent);
console.log("Patched handlers in page.tsx successfully!");
