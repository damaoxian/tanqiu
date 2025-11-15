// 游戏状态
const GameState = {
    WAITING: 'waiting',
    PLAYING: 'playing',
    GAME_OVER: 'game_over'
};

// 游戏配置
const config = {
    centerX: 0,
    centerY: 0,
    coinRadius: 200, // 圆形路径半径
    coinCount: 30, // 每关金币数量
    coinRadiusSize: 8, // 金币大小
    shipRadius: 12,
    bulletRadius: 8,
    shipSpeed: 0.04, // 角度速度
    bulletSpeed: 3,
    bulletSpawnInterval: 1000, // 毫秒
    islandRadius: 50 // 中心岛屿半径
};

// 游戏变量
let canvas, ctx;
let gameState = GameState.WAITING;
let score = 0;
let level = 1;
let ship = null;
let coins = [];
let bullets = [];
let lastBulletTime = 0;
let animationId = null;

// 初始化
function init() {
    canvas = document.getElementById('gameCanvas');
    ctx = canvas.getContext('2d');
    
    // 设置canvas尺寸
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    
    // 绑定控制按钮（支持触摸和点击）
    const controlBtn = document.getElementById('controlBtn');
    controlBtn.addEventListener('click', handleControlClick);
    controlBtn.addEventListener('touchend', (e) => {
        e.preventDefault(); // 防止触发点击事件
        handleControlClick();
    });
    
    // 绑定重启按钮（支持触摸和点击）
    const restartBtn = document.getElementById('restartBtn');
    restartBtn.addEventListener('click', restartGame);
    restartBtn.addEventListener('touchend', (e) => {
        e.preventDefault();
        restartGame();
    });
    
    // 防止页面滚动和缩放
    document.addEventListener('touchmove', (e) => {
        // 只在非按钮区域阻止滚动
        if (e.target.tagName !== 'BUTTON') {
            e.preventDefault();
        }
    }, { passive: false });
    
    document.addEventListener('gesturestart', (e) => {
        e.preventDefault();
    });
    
    document.addEventListener('gesturechange', (e) => {
        e.preventDefault();
    });
    
    document.addEventListener('gestureend', (e) => {
        e.preventDefault();
    });
    
    // 延迟初始化，确保移动端DOM完全加载
    setTimeout(() => {
        resizeCanvas();
        resetGame();
        draw();
    }, 100);
    
    // 监听屏幕方向变化
    window.addEventListener('orientationchange', () => {
        setTimeout(() => {
            resizeCanvas();
            if (gameState === GameState.PLAYING || gameState === GameState.WAITING) {
                draw();
            }
        }, 200);
    });
}

// 调整canvas尺寸
function resizeCanvas() {
    const gameArea = document.querySelector('.game-area');
    if (!gameArea) return;
    
    const rect = gameArea.getBoundingClientRect();
    const width = rect.width || gameArea.clientWidth || window.innerWidth;
    const height = rect.height || gameArea.clientHeight || window.innerHeight;
    
    // 确保有有效的尺寸
    if (width > 0 && height > 0) {
        canvas.width = width;
        canvas.height = height;
        config.centerX = canvas.width / 2;
        config.centerY = canvas.height / 2;
        
        // 如果游戏已开始，重新生成金币以适应新尺寸
        if (gameState === GameState.PLAYING || gameState === GameState.WAITING) {
            const wasPlaying = gameState === GameState.PLAYING;
            generateCoins();
            if (wasPlaying && ship) {
                // 重新定位飞船
                if (coins.length > 0) {
                    const nearestCoin = coins.reduce((prev, curr) => {
                        const prevDist = Math.abs(prev.angle - ship.angle);
                        const currDist = Math.abs(curr.angle - ship.angle);
                        return currDist < prevDist ? curr : prev;
                    });
                    ship.angle = nearestCoin.angle;
                    ship.x = config.centerX + Math.cos(ship.angle) * config.coinRadius;
                    ship.y = config.centerY + Math.sin(ship.angle) * config.coinRadius;
                }
            }
        }
    }
}

// 重置游戏
function resetGame() {
    gameState = GameState.WAITING;
    score = 0;
    level = 1;
    coins = [];
    bullets = [];
    ship = null;
    lastBulletTime = 0;
    
    // 生成初始金币路径
    generateCoins();
    
    // 更新UI
    updateUI();
    document.getElementById('gameOverScreen').classList.add('hidden');
    document.getElementById('controlBtn').classList.remove('reverse');
}

// 开始新关卡
function startNextLevel() {
    level++;
    bullets = [];
    lastBulletTime = 0;
    
    // 重新生成金币
    generateCoins();
    
    // 重置飞船位置到第一个金币
    if (coins.length > 0) {
        const firstCoin = coins[0];
        ship = {
            x: firstCoin.x,
            y: firstCoin.y,
            angle: firstCoin.angle,
            direction: 1, // 1为顺时针，-1为逆时针
            speed: config.shipSpeed
        };
    }
    
    updateUI();
}

// 生成金币路径（圆形路径）
function generateCoins() {
    coins = [];
    const angleStep = (Math.PI * 2) / config.coinCount;
    
    for (let i = 0; i < config.coinCount; i++) {
        const angle = i * angleStep;
        const x = config.centerX + Math.cos(angle) * config.coinRadius;
        const y = config.centerY + Math.sin(angle) * config.coinRadius;
        
        coins.push({
            x: x,
            y: y,
            angle: angle,
            collected: false
        });
    }
}

// 开始游戏
function startGame() {
    if (gameState !== GameState.WAITING) return;
    
    gameState = GameState.PLAYING;
    
    // 创建飞船（从第一个金币位置开始）
    if (coins.length > 0) {
        const firstCoin = coins[0];
        ship = {
            x: firstCoin.x,
            y: firstCoin.y,
            angle: firstCoin.angle,
            direction: 1, // 1为顺时针，-1为逆时针
            speed: config.shipSpeed
        };
    }
    
    // 更新按钮样式
    document.getElementById('controlBtn').classList.add('reverse');
    
    // 开始游戏循环
    gameLoop();
}

// 处理控制按钮点击
function handleControlClick() {
    if (gameState === GameState.WAITING) {
        startGame();
    } else if (gameState === GameState.PLAYING) {
        // 转向
        if (ship) {
            ship.direction *= -1;
        }
    }
}

// 游戏主循环
function gameLoop() {
    if (gameState !== GameState.PLAYING) return;
    
    update();
    draw();
    
    animationId = requestAnimationFrame(gameLoop);
}

// 更新游戏逻辑
function update() {
    if (!ship) return;
    
    // 更新飞船位置
    updateShip();
    
    // 检查金币收集
    checkCoinCollection();
    
    // 更新子弹
    updateBullets();
    
    // 生成新子弹
    spawnBullets();
    
    // 检查碰撞
    checkCollisions();
    
    // 更新UI
    updateUI();
}

// 更新飞船位置
function updateShip() {
    // 沿着圆形路径移动
    ship.angle += ship.direction * ship.speed;
    
    // 确保角度在0到2π之间
    if (ship.angle < 0) {
        ship.angle += Math.PI * 2;
    } else if (ship.angle >= Math.PI * 2) {
        ship.angle -= Math.PI * 2;
    }
    
    // 更新飞船位置
    ship.x = config.centerX + Math.cos(ship.angle) * config.coinRadius;
    ship.y = config.centerY + Math.sin(ship.angle) * config.coinRadius;
}

// 检查金币收集
function checkCoinCollection() {
    coins.forEach(coin => {
        if (!coin.collected) {
            const dx = ship.x - coin.x;
            const dy = ship.y - coin.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < config.shipRadius + config.coinRadiusSize) {
                coin.collected = true;
                score++;
            }
        }
    });
    
    // 检查是否所有金币都已收集
    const allCollected = coins.every(coin => coin.collected);
    if (allCollected && coins.length > 0) {
        // 进入下一关
        startNextLevel();
    }
}

// 生成子弹
function spawnBullets() {
    const now = Date.now();
    // 根据关卡计算子弹生成间隔（关卡越高，间隔越短）
    const baseInterval = config.bulletSpawnInterval; // 基础间隔
    const intervalReduction = 100; // 每关减少的毫秒数
    const minInterval = 100; // 最小间隔（避免太快）
    const currentInterval = Math.max(minInterval, baseInterval - (level - 1) * intervalReduction);
    
    if (now - lastBulletTime > currentInterval) {
        // 从中心炮台直线发射子弹
        // 随机选择一个角度
        const angle = Math.random() * Math.PI * 2;
        bullets.push({
            x: config.centerX,
            y: config.centerY,
            angle: angle, // 发射角度
            speed: config.bulletSpeed
        });
        lastBulletTime = now;
    }
}

// 更新子弹位置
function updateBullets() {
    const maxRadius = Math.min(canvas.width, canvas.height) / 2 + 50;
    
    bullets = bullets.filter(bullet => {
        // 直线移动
        bullet.x += Math.cos(bullet.angle) * bullet.speed;
        bullet.y += Math.sin(bullet.angle) * bullet.speed;
        
        // 计算距离中心的距离
        const dx = bullet.x - config.centerX;
        const dy = bullet.y - config.centerY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // 如果超出边界，移除子弹
        return distance < maxRadius && 
               bullet.x > 0 && bullet.x < canvas.width &&
               bullet.y > 0 && bullet.y < canvas.height;
    });
}

// 检查碰撞
function checkCollisions() {
    bullets.forEach(bullet => {
        const dx = ship.x - bullet.x;
        const dy = ship.y - bullet.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < config.shipRadius + config.bulletRadius) {
            // 游戏结束
            endGame();
        }
    });
}

// 结束游戏
function endGame() {
    gameState = GameState.GAME_OVER;
    if (animationId) {
        cancelAnimationFrame(animationId);
    }
    
    // 显示游戏结束界面
    document.getElementById('finalScore').textContent = score;
    document.getElementById('gameOverScreen').classList.remove('hidden');
}

// 重启游戏
function restartGame() {
    resetGame();
    draw();
}

// 绘制游戏
function draw() {
    // 检查Canvas是否有效
    if (!canvas || !ctx || canvas.width === 0 || canvas.height === 0) {
        return;
    }
    
    // 清空画布
    ctx.fillStyle = '#87CEEB';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // 确保中心点已计算
    if (config.centerX === 0 || config.centerY === 0) {
        config.centerX = canvas.width / 2;
        config.centerY = canvas.height / 2;
    }
    
    // 绘制中心岛屿
    drawIsland();
    
    // 绘制圆形路径
    drawCircularPath();
    
    // 绘制金币
    drawCoins();
    
    // 绘制子弹
    drawBullets();
    
    // 绘制飞船
    if (ship) {
        drawShip();
    }
}

// 绘制中心岛屿
function drawIsland() {
    const islandRadius = 50;
    
    // 外圈（浅橙色）
    ctx.fillStyle = '#FFE4B5';
    ctx.beginPath();
    ctx.arc(config.centerX, config.centerY, islandRadius, 0, Math.PI * 2);
    ctx.fill();
    
    // 中圈（橙色）
    ctx.fillStyle = '#FFA500';
    ctx.beginPath();
    ctx.arc(config.centerX, config.centerY, islandRadius - 10, 0, Math.PI * 2);
    ctx.fill();
    
    // 炮台（齿轮状）
    ctx.fillStyle = '#555';
    ctx.beginPath();
    ctx.arc(config.centerX, config.centerY, 25, 0, Math.PI * 2);
    ctx.fill();
    
    // 齿轮齿
    for (let i = 0; i < 8; i++) {
        const angle = (i * Math.PI * 2) / 8;
        const x1 = config.centerX + Math.cos(angle) * 25;
        const y1 = config.centerY + Math.sin(angle) * 25;
        const x2 = config.centerX + Math.cos(angle) * 35;
        const y2 = config.centerY + Math.sin(angle) * 35;
        
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.lineWidth = 8;
        ctx.strokeStyle = '#555';
        ctx.stroke();
    }
    
    // 中心点
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.arc(config.centerX, config.centerY, 8, 0, Math.PI * 2);
    ctx.fill();
    
    // 装饰植物
    drawBush(config.centerX - 20, config.centerY - 15);
    drawBush(config.centerX + 20, config.centerY + 15);
}

// 绘制灌木
function drawBush(x, y) {
    ctx.fillStyle = '#228B22';
    for (let i = 0; i < 5; i++) {
        const offsetX = (Math.random() - 0.5) * 8;
        const offsetY = (Math.random() - 0.5) * 8;
        ctx.beginPath();
        ctx.arc(x + offsetX, y + offsetY, 4, 0, Math.PI * 2);
        ctx.fill();
    }
}

// 绘制圆形路径
function drawCircularPath() {
    ctx.strokeStyle = '#FFB6C1'; // 粉色虚线
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    
    ctx.beginPath();
    ctx.arc(config.centerX, config.centerY, config.coinRadius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
}

// 绘制金币
function drawCoins() {
    coins.forEach(coin => {
        if (!coin.collected) {
            // 金币外圈
            ctx.fillStyle = '#FFD700';
            ctx.beginPath();
            ctx.arc(coin.x, coin.y, config.coinRadiusSize, 0, Math.PI * 2);
            ctx.fill();
            
            // 金币边框
            ctx.strokeStyle = '#FFF';
            ctx.lineWidth = 2;
            ctx.stroke();
            
            // 数字1
            ctx.fillStyle = '#FFF';
            ctx.font = '10px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('1', coin.x, coin.y);
        }
    });
}

// 绘制子弹
function drawBullets() {
    bullets.forEach(bullet => {
        ctx.fillStyle = '#555';
        ctx.beginPath();
        ctx.arc(bullet.x, bullet.y, config.bulletRadius, 0, Math.PI * 2);
        ctx.fill();
        
        // 子弹尾迹（从中心指向子弹）
        ctx.strokeStyle = '#FFF';
        ctx.lineWidth = 2;
        const trailLength = 15;
        const trailX = bullet.x - Math.cos(bullet.angle) * trailLength;
        const trailY = bullet.y - Math.sin(bullet.angle) * trailLength;
        ctx.beginPath();
        ctx.moveTo(bullet.x, bullet.y);
        ctx.lineTo(trailX, trailY);
        ctx.stroke();
    });
}

// 绘制飞船
function drawShip() {
    // 计算飞船朝向（基于圆形路径的切线方向）
    // 切线方向垂直于半径方向
    const tangentAngle = ship.angle + (ship.direction > 0 ? Math.PI / 2 : -Math.PI / 2);
    
    // 飞船主体（棕色，三角形）
    ctx.save();
    ctx.translate(ship.x, ship.y);
    ctx.rotate(tangentAngle);
    
    ctx.fillStyle = '#8B4513';
    ctx.beginPath();
    ctx.moveTo(config.shipRadius, 0);
    ctx.lineTo(-config.shipRadius * 0.6, -config.shipRadius * 0.6);
    ctx.lineTo(-config.shipRadius * 0.6, config.shipRadius * 0.6);
    ctx.closePath();
    ctx.fill();
    
    // 胡须
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-3, -3);
    ctx.lineTo(-6, -5);
    ctx.moveTo(-3, 3);
    ctx.lineTo(-6, 5);
    ctx.stroke();
    
    ctx.restore();
    
    // 尾迹（沿着圆形路径）
    const prevAngle = ship.angle - ship.direction * ship.speed * 2;
    const prevX = config.centerX + Math.cos(prevAngle) * config.coinRadius;
    const prevY = config.centerY + Math.sin(prevAngle) * config.coinRadius;
    ctx.strokeStyle = '#FFF';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(ship.x, ship.y);
    ctx.lineTo(prevX, prevY);
    ctx.stroke();
}

// 更新UI
function updateUI() {
    document.getElementById('score').textContent = score;
    document.getElementById('level').textContent = level;
}

// 启动游戏 - 确保DOM完全加载后再初始化
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    // DOM已经加载完成
    init();
}
