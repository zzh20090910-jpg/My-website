exports.handler = async function (event) {
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: "Only POST is allowed" })
    };
  }

  try {
    const { text, task } = JSON.parse(event.body || "{}");

    if (!text || text.trim().length < 20) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "没有足够的文字可以总结。请先上传并预览文件。" })
      };
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: "服务器没有设置 OPENAI_API_KEY。" })
      };
    }

    const clippedText = text.slice(0, 12000);

    const prompt = `
你是一个文档助手。请根据用户上传文件中的文字内容完成任务。

任务类型：${task || "summary"}

请用中文输出：
1. 一句话总结
2. 主要内容
3. 关键要点 bullet points
4. 如果要做成 PPT，可以分成哪些页面
5. 可能需要注意的问题

文档内容：
${clippedText}
`;

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
        input: prompt
      })
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        statusCode: response.status,
        body: JSON.stringify({
          error: data.error?.message || "OpenAI API 请求失败。"
        })
      };
    }

    const outputText =
      data.output_text ||
      data.output?.map(item =>
        item.content?.map(c => c.text).join("")
      ).join("\n") ||
      "AI 没有返回内容。";

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ result: outputText })
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message || String(error) })
    };
  }
};
