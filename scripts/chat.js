// 等待DOM加载完成
document.addEventListener('DOMContentLoaded', () => {
    const chatForm = document.getElementById('chatForm');
    const userInput = document.getElementById('userInput');
    const chatHistory = document.getElementById('chatHistory');

    // 消息历史
    let messageHistory = [];

    // 添加消息到聊天界面
    function addMessage(content, type) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${type}`;
        messageDiv.innerHTML = `<p>${content}</p>`;
        chatHistory.appendChild(messageDiv);
        chatHistory.scrollTop = chatHistory.scrollHeight;
    }

    // 处理用户输入
    chatForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const userMessage = userInput.value.trim();
        if (!userMessage) return;

        // 禁用输入和发送按钮
        const sendButton = chatForm.querySelector('button[type="submit"]');
        userInput.disabled = true;
        sendButton.disabled = true;

        // 添加加载动画
        const loadingSpinner = document.createElement('span');
        loadingSpinner.className = 'loading';
        sendButton.textContent = '思考中';
        sendButton.appendChild(loadingSpinner);


        // 添加用户消息到界面
        addMessage(userMessage, 'user');

        // 更新消息历史
        messageHistory.push({ role: 'user', content: userMessage });

        // 清空输入框
        userInput.value = '';

        try {
            // 发送请求到服务器
            const response = await fetch('http://localhost:3000/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ messages: messageHistory })
            });

            // 创建新的消息元素
            const aiMessageDiv = document.createElement('div');
            aiMessageDiv.className = 'message ai';
            const messageParagraph = document.createElement('p');
            aiMessageDiv.appendChild(messageParagraph);
            chatHistory.appendChild(aiMessageDiv);

            // 处理流式响应
            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let aiResponse = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                // 解码响应数据
                const chunk = decoder.decode(value);
                const lines = chunk.split('\n');
                
                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        try {
                            const jsonData = JSON.parse(line.slice(6));
                            if (jsonData.choices && jsonData.choices[0].delta.content) {
                                const content = jsonData.choices[0].delta.content;
                                aiResponse += content;
                                messageParagraph.textContent = aiResponse;
                                chatHistory.scrollTop = chatHistory.scrollHeight;
                            }
                        } catch (error) {
                            console.log('解析响应数据时出错:', error);
                        }
                    }
                }
            }

            // 更新消息历史
            messageHistory.push({ role: 'assistant', content: aiResponse });

            // 恢复输入和发送按钮状态
            userInput.disabled = false;
            sendButton.disabled = false;
            sendButton.textContent = '发送';
            // 移除加载动画
            const loadingSpinner = sendButton.querySelector('.loading');
            if (loadingSpinner) {
                loadingSpinner.remove();
            }

        } catch (error) {
            console.error('Error:', error);
            addMessage('抱歉，发生了一些错误，请稍后重试。', 'system');
            // 发生错误时也要恢复输入和发送按钮状态
            userInput.disabled = false;
            sendButton.disabled = false;
            sendButton.textContent = '发送';
            // 移除加载动画
            const loadingSpinner = sendButton.querySelector('.loading');
            if (loadingSpinner) {
                loadingSpinner.remove();
            }
        }
    });

    // 自动调整文本框高度
    userInput.addEventListener('input', () => {
        userInput.style.height = 'auto';
        userInput.style.height = userInput.scrollHeight + 'px';
    });
});