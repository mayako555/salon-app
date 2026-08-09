require('dotenv').config({ path: '.env.local' });

async function test() {
  const response = await fetch("https://api.line.me/v2/bot/message/push", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.LINE_CHANNEL_ACCESS_TOKEN}`,
    },
    body: JSON.stringify({
      to: "Uabcdefg1234567890", // dummy, but should return a specific error
      messages: [ { type: "text", text: "test" } ]
    }),
  });
  const data = await response.json();
  console.log(data);
}
test();
