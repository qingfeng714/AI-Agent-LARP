// DeepSeek API配置
const DEEPSEEK_API_KEY = 'sk-d2e54f65a2854f50ab1459f240d09324';
const DEEPSEEK_API_URL = 'https://api.deepseek.com/v1/chat/completions';

// 角色设定
const roleSettings = {
    student: {
        name: '学生领袖',
        description: '你是一名热血青年，组织学生运动，代号"火种"。你擅长演讲和组织，但需要小心特务的监视。'
    },
    journalist: {
        name: '进步记者',
        description: '你是一名用笔杆子战斗的新闻工作者，代号"火种"。你通过报纸传递信息，揭露真相，但报社内部也有危险。'
    },
    merchant: {
        name: '爱国商人',
        description: '你是一名暗中支持革命事业的商人，代号"火种"。你利用商业网络传递物资和信息，但需要伪装得很好。'
    }
};

// 结局设定
const endings = {
    perfect: {
        title: '完美结局：火种燎原',
        description: '你成功完成了所有任务，火种在北平城燃起，为革命事业做出了巨大贡献。你的智慧和勇气将被历史铭记。',
        minScore: 80,
        minRounds: 5
    },
    good: {
        title: '良好结局：星星之火',
        description: '你完成了大部分任务，虽然遇到了一些困难，但最终还是为革命事业贡献了力量。火种虽小，但终将燎原。',
        minScore: 60,
        minRounds: 4
    },
    normal: {
        title: '普通结局：风雨飘摇',
        description: '你尽力完成了任务，但过程中遇到了不少挫折。虽然结果不算完美，但你的努力值得肯定。',
        minScore: 40,
        minRounds: 3
    },
    bad: {
        title: '失败结局：火种熄灭',
        description: '任务失败了，火种未能燃起。但革命的道路从来不是一帆风顺的，下次你会做得更好。',
        minScore: 0,
        minRounds: 0
    }
};

// 游戏状态
let gameState = {
    currentRole: null,
    playerName: '',
    score: 0,
    round: 0,
    dialogueHistory: [],
    choices: []
};

// DOM元素
const introSection = document.getElementById('intro-section');
const characterSection = document.getElementById('character-section');
const gameSection = document.getElementById('game-section');
const endingSection = document.getElementById('ending-section');
const startBtn = document.getElementById('start-btn');
const characterCards = document.querySelectorAll('.character-card');
const currentRoleEl = document.getElementById('current-role');
const roleDescriptionEl = document.getElementById('role-description');
const dialogueHistoryEl = document.getElementById('dialogue-history');
const optionsArea = document.getElementById('options-area');
const optionsContainer = document.getElementById('options-container');
const inputArea = document.getElementById('input-area');
const userInput = document.getElementById('user-input');
const sendBtn = document.getElementById('send-btn');
const restartBtn = document.getElementById('restart-btn');
const backToMenuBtn = document.getElementById('back-to-menu-btn');
const scoreValueEl = document.getElementById('score-value');
const roundValueEl = document.getElementById('round-value');
const endingTitleEl = document.getElementById('ending-title');
const endingContentEl = document.getElementById('ending-content');
const finalScoreEl = document.getElementById('final-score');
const finalRoundsEl = document.getElementById('final-rounds');

// 初始化
document.addEventListener('DOMContentLoaded', () => {
    startBtn.addEventListener('click', showCharacterSelection);
    characterCards.forEach(card => {
        card.addEventListener('click', () => selectCharacter(card.dataset.role));
    });
    sendBtn.addEventListener('click', sendName);
    restartBtn.addEventListener('click', restartGame);
    backToMenuBtn.addEventListener('click', backToMenu);
    
    // 回车发送名字
    userInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !inputArea.classList.contains('hidden')) {
            sendName();
        }
    });
});

// 显示角色选择
function showCharacterSelection() {
    introSection.classList.add('hidden');
    characterSection.classList.remove('hidden');
}

// 选择角色
function selectCharacter(role) {
    gameState.currentRole = role;
    const roleInfo = roleSettings[role];
    
    currentRoleEl.textContent = `角色：${roleInfo.name}`;
    roleDescriptionEl.textContent = roleInfo.description;
    
    characterSection.classList.add('hidden');
    gameSection.classList.remove('hidden');
    
    // 清空对话历史
    dialogueHistoryEl.innerHTML = '';
    
    // 初始化对话
    addSystemMessage(`欢迎，${roleInfo.name}。请告诉我你的名字，火种同志。`);
    inputArea.classList.remove('hidden');
    optionsArea.classList.add('hidden');
}

// 发送名字
function sendName() {
    const name = userInput.value.trim();
    if (!name) return;
    
    gameState.playerName = name;
    addUserMessage(name);
    userInput.value = '';
    inputArea.classList.add('hidden');
    
    // 开始第一轮游戏
    startGameRound();
}

// 开始游戏回合
async function startGameRound() {
    gameState.round++;
    updateUI();
    
    // 显示加载状态
    const loadingMessage = addSystemMessage('正在思考...');
    
    try {
        // 调用DeepSeek API获取剧情和选项
        const response = await callDeepSeekAPI();
        
        // 移除加载消息
        loadingMessage.remove();
        
        // 解析响应，提取剧情文本和选项
        const { story, options, scoreChange, isEnding } = parseAIResponse(response);
        
        // 添加剧情文本
        if (story) {
            addSystemMessage(story);
        }
        
        // 更新积分
        if (scoreChange) {
            gameState.score += scoreChange;
            updateUI();
            if (scoreChange > 0) {
                addSystemMessage(`<span style="color: #4ade80;">+${scoreChange} 积分</span>`, true);
            } else if (scoreChange < 0) {
                addSystemMessage(`<span style="color: #f87171;">${scoreChange} 积分</span>`, true);
            }
        }
        
        // 检查是否结束（第8回合或AI判定结束）
        if (isEnding || gameState.round >= 8) {
            setTimeout(() => showEnding(), 1500);
            return;
        }
        
        // 显示选项
        if (options && options.length > 0) {
            showOptions(options);
        } else {
            // 如果没有选项，继续下一轮
            setTimeout(() => startGameRound(), 1500);
        }
        
    } catch (error) {
        console.error('API调用错误:', error);
        loadingMessage.remove();
        addSystemMessage('抱歉，出现了错误。请稍后再试。');
        setTimeout(() => startGameRound(), 2000);
    }
}

// 调用DeepSeek API
async function callDeepSeekAPI() {
    const roleInfo = roleSettings[gameState.currentRole];
    
    // 构建系统提示词
    const systemPrompt = `你是一个剧本杀游戏的主持人，主题是"北平城春-火种"。

背景设定：一九四九年春天，北平城刚刚解放，但暗流仍在涌动。玩家是一名地下工作者，代号"火种"。

玩家角色：${roleInfo.name} - ${roleInfo.description}
玩家名字：${gameState.playerName}
当前回合：${gameState.round}/8
当前积分：${gameState.score}

游戏规则：
1. 每次回复必须严格按照JSON格式，只返回JSON，不要其他文字
2. 剧情描述50-100字，推进故事发展
3. 必须提供2-3个选项供玩家选择
4. 根据选择难度和正确性给予积分：优秀选择+10到+15分，一般选择+5到+10分，错误选择-5到0分
5. 第7-8回合时，如果积分足够高，可以给出结局
6. 创造紧张刺激的氛围，符合1949年北平的历史背景
7. 选项要清晰明确，影响剧情走向

重要：必须只返回JSON格式，不要任何其他文字或解释！

JSON格式示例：
{
  "story": "你走在北平的街道上，突然听到身后有脚步声。你回头一看，发现一个可疑的人正在跟踪你。",
  "options": ["快速躲进小巷", "继续正常行走", "转身质问跟踪者"],
  "scoreChange": 10,
  "isEnding": false
}

如果游戏应该结束（第7-8回合且积分足够，或任务完成），设置isEnding为true。`;

    // 构建对话历史
    const messages = [
        {
            role: 'system',
            content: systemPrompt
        }
    ];
    
    // 添加最近的对话历史（最多3轮）
    const recentHistory = gameState.dialogueHistory.slice(-6);
    recentHistory.forEach(item => {
        messages.push({
            role: item.role === 'user' ? 'user' : 'assistant',
            content: item.content
        });
    });
    
    // 添加当前状态
    let userPrompt;
    if (gameState.round === 1) {
        userPrompt = `游戏开始！玩家${gameState.playerName}刚进入游戏，请给出第一段剧情和2-3个选项。剧情应该符合${roleInfo.name}的身份设定。`;
    } else {
        const lastChoice = gameState.choices[gameState.choices.length - 1];
        userPrompt = `玩家选择了：${lastChoice}。请根据这个选择推进剧情，描述结果，并给出新的2-3个选项。当前是第${gameState.round}回合，还有${8 - gameState.round}回合。`;
    }
    
    messages.push({
        role: 'user',
        content: userPrompt
    });
    
    const response = await fetch(DEEPSEEK_API_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${DEEPSEEK_API_KEY}`
        },
        body: JSON.stringify({
            model: 'deepseek-chat',
            messages: messages,
            temperature: 0.8,
            max_tokens: 500
        })
    });
    
    if (!response.ok) {
        throw new Error(`API错误: ${response.status}`);
    }
    
    const data = await response.json();
    const aiMessage = data.choices[0].message.content.trim();
    
    // 保存到对话历史
    gameState.dialogueHistory.push({
        role: 'assistant',
        content: aiMessage
    });
    
    return aiMessage;
}

// 解析AI响应
function parseAIResponse(response) {
    try {
        // 清理响应文本，移除可能的markdown代码块标记
        let cleanResponse = response.trim();
        if (cleanResponse.startsWith('```json')) {
            cleanResponse = cleanResponse.replace(/```json\n?/g, '').replace(/```\n?/g, '');
        } else if (cleanResponse.startsWith('```')) {
            cleanResponse = cleanResponse.replace(/```\n?/g, '');
        }
        
        // 尝试解析JSON
        const jsonMatch = cleanResponse.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            return {
                story: parsed.story || cleanResponse,
                options: Array.isArray(parsed.options) ? parsed.options : [],
                scoreChange: typeof parsed.scoreChange === 'number' ? parsed.scoreChange : 0,
                isEnding: parsed.isEnding === true
            };
        }
        
        // 如果不是JSON，尝试解析文本格式
        const lines = response.split('\n');
        let story = '';
        const options = [];
        let scoreChange = 0;
        let isEnding = false;
        
        for (let line of lines) {
            line = line.trim();
            if (!line) continue;
            
            // 检查选项格式：选项A：描述
            const optionMatch = line.match(/选项[ABC]：(.+)/);
            if (optionMatch) {
                options.push(optionMatch[1]);
            }
            // 检查积分变化
            else if (line.includes('积分') || line.includes('分数')) {
                const scoreMatch = line.match(/([+-]?\d+)\s*积分/);
                if (scoreMatch) {
                    scoreChange = parseInt(scoreMatch[1]);
                }
            }
            // 检查是否结束
            else if (line.includes('结束') || line.includes('结局')) {
                isEnding = true;
                story += line + '\n';
            }
            // 其他作为剧情
            else {
                story += line + '\n';
            }
        }
        
        // 如果没有找到选项，尝试从文本中提取
        if (options.length === 0) {
            const optionPattern = /[ABC][\.：]\s*(.+?)(?=[ABC][\.：]|$)/g;
            let match;
            while ((match = optionPattern.exec(response)) !== null) {
                options.push(match[1].trim());
            }
        }
        
        // 如果没有选项，生成默认选项
        if (options.length === 0 && !isEnding) {
            options.push('继续调查', '寻求帮助', '谨慎行动');
        }
        
        // 确保至少有一个选项（除非是结局）
        if (options.length === 0 && !isEnding) {
            options.push('继续', '观察', '行动');
        }
        
        return {
            story: story.trim() || cleanResponse,
            options: options.slice(0, 3), // 最多3个选项
            scoreChange: scoreChange || 5, // 默认给5分
            isEnding: isEnding
        };
    } catch (error) {
        console.error('解析响应错误:', error);
        console.log('原始响应:', response);
        // 如果解析失败，返回默认值
        return {
            story: response || '剧情继续发展...',
            options: ['继续调查', '寻求帮助', '谨慎行动'],
            scoreChange: 5,
            isEnding: gameState.round >= 8 // 8回合后自动结束
        };
    }
}

// 显示选项
function showOptions(options) {
    optionsContainer.innerHTML = '';
    options.forEach((option, index) => {
        const btn = document.createElement('button');
        btn.className = 'option-btn';
        btn.textContent = option;
        btn.addEventListener('click', () => selectOption(option, index));
        optionsContainer.appendChild(btn);
    });
    optionsArea.classList.remove('hidden');
}

// 选择选项
function selectOption(option, index) {
    // 禁用所有选项按钮
    const buttons = optionsContainer.querySelectorAll('.option-btn');
    buttons.forEach(btn => btn.disabled = true);
    
    // 添加用户选择消息
    addUserMessage(`我选择：${option}`);
    
    // 隐藏选项区域
    optionsArea.classList.add('hidden');
    
    // 保存选择
    gameState.choices.push(option);
    gameState.dialogueHistory.push({
        role: 'user',
        content: option
    });
    
    // 继续下一轮
    setTimeout(() => startGameRound(), 1000);
}

// 显示结局
function showEnding() {
    const ending = determineEnding();
    
    endingTitleEl.textContent = ending.title;
    endingContentEl.textContent = ending.description;
    finalScoreEl.textContent = gameState.score;
    finalRoundsEl.textContent = gameState.round;
    
    gameSection.classList.add('hidden');
    endingSection.classList.remove('hidden');
}

// 判定结局
function determineEnding() {
    if (gameState.score >= endings.perfect.minScore && gameState.round >= endings.perfect.minRounds) {
        return endings.perfect;
    } else if (gameState.score >= endings.good.minScore && gameState.round >= endings.good.minRounds) {
        return endings.good;
    } else if (gameState.score >= endings.normal.minScore && gameState.round >= endings.normal.minRounds) {
        return endings.normal;
    } else {
        return endings.bad;
    }
}

// 更新UI
function updateUI() {
    scoreValueEl.textContent = gameState.score;
    roundValueEl.textContent = gameState.round;
}

// 添加系统消息
function addSystemMessage(text, isHTML = false) {
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message npc-message';
    if (isHTML) {
        messageDiv.innerHTML = `
            <div class="message-content">
                <strong>系统：</strong>${text}
            </div>
        `;
    } else {
        messageDiv.innerHTML = `
            <div class="message-content">
                <strong>系统：</strong>${escapeHtml(text)}
            </div>
        `;
    }
    dialogueHistoryEl.appendChild(messageDiv);
    dialogueHistoryEl.scrollTop = dialogueHistoryEl.scrollHeight;
    return messageDiv;
}

// 添加用户消息
function addUserMessage(text) {
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message user-message';
    messageDiv.innerHTML = `
        <div class="message-content">
            <strong>${gameState.playerName || '你'}：</strong>${escapeHtml(text)}
        </div>
    `;
    dialogueHistoryEl.appendChild(messageDiv);
    dialogueHistoryEl.scrollTop = dialogueHistoryEl.scrollHeight;
}

// HTML转义
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// 重新开始游戏
function restartGame() {
    if (confirm('确定要重新开始游戏吗？')) {
        resetGame();
        gameSection.classList.add('hidden');
        characterSection.classList.remove('hidden');
    }
}

// 返回主菜单
function backToMenu() {
    resetGame();
    endingSection.classList.add('hidden');
    introSection.classList.remove('hidden');
}

// 重置游戏
function resetGame() {
    gameState = {
        currentRole: null,
        playerName: '',
        score: 0,
        round: 0,
        dialogueHistory: [],
        choices: []
    };
    
    dialogueHistoryEl.innerHTML = '';
    userInput.value = '';
    optionsContainer.innerHTML = '';
    optionsArea.classList.add('hidden');
    inputArea.classList.add('hidden');
    updateUI();
}
