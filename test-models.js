const { GoogleGenerativeAI } = require("@google/generative-ai");

async function listModels() {
  const apiKey = "AIzaSyBiCtiXgbYI4brACtBDv7JjbME_0TNtYPU";
  const genAI = new GoogleGenerativeAI(apiKey);

  try {
    // There is no direct listModels in the main export sometimes depending on version
    // But we can try a simple model that we know exists
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent("Hi");
    console.log("Success with gemini-1.5-flash:", (await result.response).text());
  } catch (error) {
    console.error("Error with gemini-1.5-flash:", error.message);
    
    try {
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" });
      const result = await model.generateContent("Hi");
      console.log("Success with gemini-1.5-flash-latest:", (await result.response).text());
    } catch (error2) {
      console.error("Error with gemini-1.5-flash-latest:", error2.message);
    }
  }
}

listModels();
