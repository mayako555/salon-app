import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
async function run() {
  const apiKey = process.env.GEMINI_API_KEY;
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
  const json = await res.json();
  console.log(json.models.filter(m => m.supportedGenerationMethods.includes("generateContent")).map(m => m.name));
}
run();
