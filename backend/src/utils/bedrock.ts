import {
  BedrockRuntimeClient,
  InvokeModelCommand,
} from '@aws-sdk/client-bedrock-runtime';

const client = new BedrockRuntimeClient({ region: process.env.REGION || 'us-west-2' });

const MODEL_ID = process.env.BEDROCK_MODEL_ID || 'anthropic.claude-3-5-sonnet-20241022-v2:0';

const SYSTEM_PROMPT = `あなたは設備メンテナンス記録を収集・整理するアシスタントです。

## 役割
ユーザーから設備の問題に関する情報を収集し、以下の3カテゴリに整理します：
- 症状: 設備に発生した問題・異常の内容
- 原因: 問題が発生した原因
- 対策: 問題を解決するために実施した対応

## ルール
1. **推測禁止**: ユーザーが明示的に述べていない情報を推測して補完してはいけません
2. **質問**: 情報が不足している場合は、具体的な質問をして追加情報を求めてください
3. **技術公用文**: 情報を整理する際は、技術公用文の形式で記述してください
   - 「である」調を使用
   - 簡潔・明確・客観的に記述
   - 専門用語は適切に使用
4. **確認**: 必要な情報が揃ったと判断したら、整理した内容を提示し「この内容で記録を保存してよろしいですか？」と確認を求めてください

## 出力形式
必ず以下のJSON形式で応答してください。JSONの前後に余計なテキストを入れないでください：
{
  "message": "ユーザーへの応答メッセージ",
  "extractedInfo": {
    "symptom": "抽出された症状（まだ不明な場合はnull）",
    "cause": "抽出された原因（まだ不明な場合はnull）",
    "solution": "抽出された対策（まだ不明な場合はnull）",
    "isComplete": false,
    "missingFields": ["不足している情報のリスト"]
  }
}

## PDF添付時
PDFが添付された場合、その内容を解読してください。ただし、PDFの内容が不正確または不完全な場合があるため、必要に応じて確認・修正を求めてください。`;

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface AIResponse {
  message: string;
  extractedInfo: {
    symptom: string | null;
    cause: string | null;
    solution: string | null;
    isComplete: boolean;
    missingFields: string[];
  };
}

export async function invokeAI(
  messages: ChatMessage[],
  pdfContent?: string
): Promise<AIResponse> {
  const formattedMessages = messages.map((msg) => ({
    role: msg.role,
    content: msg.content,
  }));

  // Add PDF content to the last user message if provided
  if (pdfContent && formattedMessages.length > 0) {
    const lastMessage = formattedMessages[formattedMessages.length - 1];
    if (lastMessage.role === 'user') {
      lastMessage.content = `[添付PDFの内容]\n${pdfContent}\n\n[ユーザーメッセージ]\n${lastMessage.content}`;
    }
  }

  const payload = {
    anthropic_version: 'bedrock-2023-05-31',
    max_tokens: 4096,
    system: SYSTEM_PROMPT,
    messages: formattedMessages,
  };

  const command = new InvokeModelCommand({
    modelId: MODEL_ID,
    contentType: 'application/json',
    accept: 'application/json',
    body: JSON.stringify(payload),
  });

  const response = await client.send(command);
  const responseBody = JSON.parse(new TextDecoder().decode(response.body));
  const assistantContent = responseBody.content[0].text;

  // Parse the JSON response
  try {
    const parsed = JSON.parse(assistantContent);
    return {
      message: parsed.message,
      extractedInfo: parsed.extractedInfo,
    };
  } catch {
    // If parsing fails, return a default response
    return {
      message: assistantContent,
      extractedInfo: {
        symptom: null,
        cause: null,
        solution: null,
        isComplete: false,
        missingFields: ['症状', '原因', '対策'],
      },
    };
  }
}
