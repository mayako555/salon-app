import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function test() {
  const apiKey = process.env.GEMINI_API_KEY;
  const models = ["gemini-1.5-flash", "gemini-1.5-pro", "gemini-2.0-flash", "gemini-flash-latest", "gemini-1.5-flash-8b"];
  
  for (const model of models) {
    console.log(`Testing ${model}...`);
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: "Hello" }] }]
        })
      });
      if (res.ok) {
        console.log(`✅ ${model} worked!`);
      } else {
        const err = await res.json();
        console.log(`❌ ${model} failed: ${err.error?.message}`);
      }
    } catch (e) {
      console.log(`❌ ${model} network error: ${e.message}`);
    }
  }
}
test();
