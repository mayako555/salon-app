const { GoogleGenerativeAI } = require("@google/generative-ai");

async function testGemini() {
  const apiKey = "AIzaSyBiCtiXgbYI4brACtBDv7JjbME_0TNtYPU";
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-pro" });

  try {
    const result = await model.generateContent("Hello, are you working?");
    const response = await result.response;
    console.log("Success:", response.text());
  } catch (error) {
    console.error("Error:", error.message);
  }
}

testGemini();
