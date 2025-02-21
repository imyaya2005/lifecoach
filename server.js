import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const port = process.env.PORT || 3000;

// 配置CORS和请求体解析
app.use(cors());
app.use(express.json());

// 配置静态文件服务
app.use(express.static('.'));

// 设置API密钥
const API_KEY = process.env.ARK_API_KEY;
if (!API_KEY) {
    console.error('错误：未设置API密钥。请在.env文件中设置ARK_API_KEY');
    process.exit(1);
}
const API_URL = 'https://ark.cn-beijing.volces.com/api/v3/chat/completions';

// 处理聊天请求
app.post('/chat', async (req, res) => {
    try {
        const response = await fetch(API_URL, {
            signal: req.signal,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${API_KEY}`
            },
            body: JSON.stringify({
                model: 'deepseek-r1-250120',
                messages: [
                    {
                        role: 'system',
                        content: '你是一位专业的Life Coach，擅长通过对话帮助人们发现自己的潜力，解决成长中的困惑，并提供实用的建议和指导。你的回答应该富有同理心，积极正面，并且注重实际可行的解决方案。'
                    },
                    ...req.body.messages
                ],
                temperature: 0.6,
                stream: true
            })
        });

        // 设置SSE头部
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');

        // 处理流式响应
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`API请求失败: ${response.status} - ${errorData.error || '未知错误'}`);
        }

        // 处理流式响应
        const decoder = new TextDecoder();

        try {
            for await (const chunk of response.body) {
                const text = decoder.decode(chunk);
                const lines = text.split('\n');
                
                for (const line of lines) {
                    if (line.trim() === '') continue;
                    if (line.trim() === 'data: [DONE]') {
                        res.write('data: [DONE]\n\n');
                        continue;
                    }

                    if (line.startsWith('data: ')) {
                        try {
                            const jsonData = JSON.parse(line.slice(6));
                            if (jsonData.choices?.[0]?.delta?.content) {
                                res.write(`data: ${JSON.stringify(jsonData)}\n\n`);
                                res.flushHeaders();
                            }
                        } catch (error) {
                            console.error('解析响应数据时出错:', error);
                            continue;
                        }
                    }
                }
            }
        } catch (error) {
            console.error('流处理错误:', error);
            throw error;
        }

        res.write('data: [DONE]\n\n');
        res.end();

    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: '服务器内部错误' });
    }
});

// 启动服务器
app.listen(port, () => {
    console.log(`服务器运行在 http://localhost:${port}`);
});