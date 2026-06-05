/* ==========================================================
 * 猫咪博物馆 · Demo（融合视图版）
 * 改造点：
 *  - 博物馆作为永久背景，棋盘悬浮在前
 *  - 合成 L3+ 自动飞行到展位 + 金光高光
 *  - 馆长等级条动画 + 橘猫蹭过去
 *  - 棋盘下滑手势 + 展开博物馆按钮替代 Tab
 * ========================================================== */

const CONFIG = {
  BOARD_W: 5,
  BOARD_H: 6,        // 动态：通过 getBoardH() 取实际值
  ENERGY_MAX: 60,    // 动态：通过 getEnergyMax() 取实际值
  ENERGY_RECOVER_MS: 60 * 1000,
  ORDER_INTERVAL_MIN: 18000,
  ORDER_INTERVAL_MAX: 32000,
  ORDER_MAX: 4,
  ORDER_TIMEOUT: 120000,
  PRODUCER_TAP_COST: 1,
  SAVE_KEY: 'fatcat_museum_save_v4',
};
// 动态读取：考虑棋盘 / 能量扩容档位
function getBoardH(){ return (typeof BOARD_TIERS!=='undefined') ? BOARD_TIERS[state.boardTier||0].rows : 6; }
function getEnergyMax(){ return (typeof ENERGY_TIERS!=='undefined') ? ENERGY_TIERS[state.energyTier||0].max : 60; }

// =========================================================
// 物品图标 · 全套纯 SVG（抛弃带英文烧录的 sprite png）
// 索引规则：row=0 fossil 化石链，row=1 relic 古董链，row=2 cat 猫链
//          col=0..4 → 一阶~五阶
// 每张 SVG 尺寸固定 100x100，无背景，外层容器决定大小；
// 通过 sprite(row,col) 返回 background-image:url(data:image/svg+xml;...) 字符串，
// 与原 sprite() 调用点无需任何改动。
// =========================================================
const ICON_SVGS = (() => {
  // —— 通用工具 ——
  const wrap = (inner) =>
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">${inner}</svg>`;

  // 共用色
  const C = {
    bone:    ['#F4E8D0','#E8D8B5','#A88848'],   // 骨色 浅/中/线
    rock:    ['#9A7E5E','#6E5435','#3D2818'],
    fossilG: ['#D4B888','#A88848','#5C4632'],
    egg:     ['#E8D8B5','#C9A878','#8B6F4E'],
    dino:    ['#7A5C3E','#3D2818'],
    clay:    ['#D89870','#A85020','#5A2510'],
    porcW:   ['#F4F8F4','#A8C8C0','#5A8078'],   // 青瓷 白底/青/暗
    porcG:   ['#E8F0EC','#88B0A8','#3D6058'],
    bronze:  ['#A88848','#5C4020','#FFE3A3'],   // 青铜 主/暗/高光
    jade:    ['#B8E0C8','#5A9078','#2A5040'],
    cat:     ['#A88848','#5C4632','#FFE3A3'],   // 印记/线/高光
    fish:    ['#F4C088','#D8743C','#5C2818'],
    yarn:    ['#D8A8C8','#A86888'],
    gold:    ['#FFE3A3','#D4A574','#8A6332'],
    pink:    '#F0A8AE',
    line:    '#3D2818',
    shadow:  'rgba(0,0,0,.18)',
    // —— L6/L7 镇馆专用色 ——
    whJade:  ['#F8FCFA','#D4E8DC','#5A9078'],   // 白玉：白/浅青/暗青
    shrine:  ['#C9402C','#8B2510','#FFD08A'],   // 神祠：朱红/暗红/金顶
    ivory:   ['#F4E8C8','#D4B888','#8B6B3E'],   // 象牙：奶白/牙黄/暗
    archae:  ['#5A4030','#2A1A0C','#A88458'],   // 始祖鸟：深褐/黑/羽金
    sancai:  ['#E89A5C','#5A8078','#F4E8B0'],   // 唐三彩：橙釉/绿釉/黄釉
    seal:    ['#E8D8B5','#A85020','#5A2510'],   // 玉玺：白玉印身/朱印/线
  };

  // —— Row 0：化石链 ——

  // 1. 碎骨 fossil1：一小段断骨碎片
  const fossil1 = wrap(`
    <ellipse cx="50" cy="78" rx="22" ry="3" fill="${C.shadow}"/>
    <path d="M 28,62 Q 22,58 25,52 Q 28,48 34,50 Q 38,42 46,44 Q 52,38 58,46 Q 66,46 64,54 Q 72,58 66,64 Q 60,68 52,64 Q 44,68 36,64 Q 30,66 28,62 Z"
      fill="${C.bone[0]}" stroke="${C.bone[2]}" stroke-width="2" stroke-linejoin="round"/>
    <path d="M 38,52 Q 44,50 50,54 Q 56,52 60,56" stroke="${C.bone[1]}" stroke-width="1.5" fill="none" opacity=".7"/>
    <circle cx="40" cy="58" r="1.5" fill="${C.bone[2]}" opacity=".5"/>
    <circle cx="56" cy="60" r="1.2" fill="${C.bone[2]}" opacity=".5"/>
  `);

  // 2. 骨片 fossil2：完整一根长骨（关节）
  const fossil2 = wrap(`
    <ellipse cx="50" cy="80" rx="26" ry="3" fill="${C.shadow}"/>
    <path d="M 26,32 Q 18,32 18,40 Q 18,46 24,48 Q 28,52 32,52 L 68,52 Q 72,52 76,48 Q 82,46 82,40 Q 82,32 74,32 Q 68,30 64,36 L 36,36 Q 32,30 26,32 Z"
      fill="${C.bone[0]}" stroke="${C.bone[2]}" stroke-width="2" stroke-linejoin="round"/>
    <path d="M 26,52 Q 18,52 18,60 Q 18,66 24,68 Q 28,72 32,72 L 68,72 Q 72,72 76,68 Q 82,66 82,60 Q 82,52 74,52 Q 68,50 64,56 L 36,56 Q 32,50 26,52 Z"
      fill="${C.bone[0]}" stroke="${C.bone[2]}" stroke-width="2" stroke-linejoin="round"/>
    <path d="M 30,44 Q 50,42 70,44" stroke="${C.bone[1]}" stroke-width="1.2" fill="none" opacity=".6"/>
    <circle cx="26" cy="40" r="2" fill="${C.bone[2]}" opacity=".4"/>
    <circle cx="74" cy="40" r="2" fill="${C.bone[2]}" opacity=".4"/>
  `);

  // 3. 化石蛋 fossil3：石质蛋型 + 裂纹
  const fossil3 = wrap(`
    <ellipse cx="50" cy="86" rx="22" ry="3" fill="${C.shadow}"/>
    <ellipse cx="50" cy="52" rx="26" ry="34" fill="${C.egg[1]}" stroke="${C.egg[2]}" stroke-width="2.4"/>
    <path d="M 50,22 Q 46,40 52,56 Q 48,68 54,82" stroke="${C.egg[2]}" stroke-width="1.8" fill="none" opacity=".7"/>
    <path d="M 38,40 Q 44,42 42,50" stroke="${C.egg[2]}" stroke-width="1.4" fill="none" opacity=".6"/>
    <path d="M 62,56 Q 56,60 60,66" stroke="${C.egg[2]}" stroke-width="1.4" fill="none" opacity=".6"/>
    <ellipse cx="42" cy="40" rx="6" ry="9" fill="${C.egg[0]}" opacity=".55"/>
    <circle cx="60" cy="34" r="2.4" fill="${C.egg[2]}" opacity=".5"/>
    <circle cx="38" cy="60" r="1.8" fill="${C.egg[2]}" opacity=".4"/>
    <circle cx="58" cy="68" r="2" fill="${C.egg[2]}" opacity=".4"/>
  `);

  // 4. 三叶虫 fossil4：节肢分段身体 + 化石围岩
  const fossil4 = wrap(`
    <ellipse cx="50" cy="88" rx="30" ry="3" fill="${C.shadow}"/>
    <!-- 围岩 -->
    <path d="M 14,50 Q 14,30 30,22 Q 50,16 70,22 Q 86,30 86,50 Q 88,72 70,80 Q 50,86 30,80 Q 14,72 14,50 Z"
      fill="${C.fossilG[0]}" stroke="${C.fossilG[2]}" stroke-width="2"/>
    <!-- 三叶虫主体 -->
    <ellipse cx="50" cy="50" rx="22" ry="28" fill="${C.fossilG[1]}" stroke="${C.fossilG[2]}" stroke-width="1.8"/>
    <!-- 头节 -->
    <path d="M 32,32 Q 50,22 68,32 Q 64,40 50,40 Q 36,40 32,32 Z" fill="${C.fossilG[2]}" opacity=".7"/>
    <circle cx="42" cy="32" r="2" fill="${C.fossilG[0]}"/>
    <circle cx="58" cy="32" r="2" fill="${C.fossilG[0]}"/>
    <!-- 中轴 -->
    <path d="M 50,40 L 50,72" stroke="${C.fossilG[2]}" stroke-width="2.5"/>
    <!-- 体节横纹（左右对称） -->
    <g stroke="${C.fossilG[2]}" stroke-width="1.4" fill="none" opacity=".75">
      <path d="M 32,46 Q 40,44 50,46 Q 60,44 68,46"/>
      <path d="M 30,54 Q 40,52 50,54 Q 60,52 70,54"/>
      <path d="M 32,62 Q 40,60 50,62 Q 60,60 68,62"/>
      <path d="M 36,70 Q 42,68 50,70 Q 58,68 64,70"/>
    </g>
    <!-- 尾节 -->
    <path d="M 38,72 Q 50,82 62,72 Q 56,76 50,76 Q 44,76 38,72 Z" fill="${C.fossilG[2]}" opacity=".6"/>
  `);

  // 5. 恐龙化石 fossil5：完整恐龙骨架（俯视/侧视简化）
  const fossil5 = wrap(`
    <ellipse cx="50" cy="92" rx="34" ry="3" fill="${C.shadow}"/>
    <!-- 围岩底板 -->
    <rect x="6" y="20" width="88" height="68" rx="6" fill="${C.fossilG[0]}" stroke="${C.fossilG[2]}" stroke-width="2"/>
    <!-- 脊柱 -->
    <path d="M 14,54 Q 22,40 36,42 L 60,46 Q 74,46 84,38" stroke="${C.bone[2]}" stroke-width="3" fill="none" stroke-linecap="round"/>
    <!-- 头骨（右上） -->
    <path d="M 78,30 Q 90,32 88,40 Q 86,46 80,46 Q 74,44 74,38 Q 74,32 78,30 Z" fill="${C.bone[0]}" stroke="${C.bone[2]}" stroke-width="1.8"/>
    <circle cx="82" cy="38" r="1.8" fill="${C.bone[2]}"/>
    <path d="M 76,42 L 82,44" stroke="${C.bone[2]}" stroke-width="1.2"/>
    <!-- 尾巴（左下） -->
    <path d="M 14,54 Q 8,64 10,76" stroke="${C.bone[2]}" stroke-width="2.5" fill="none" stroke-linecap="round"/>
    <!-- 肋骨（向下扇形） -->
    <g stroke="${C.bone[2]}" stroke-width="1.6" fill="none" stroke-linecap="round">
      <path d="M 28,46 Q 26,58 30,68"/>
      <path d="M 36,48 Q 34,62 38,72"/>
      <path d="M 44,48 Q 44,62 46,74"/>
      <path d="M 52,48 Q 54,62 52,74"/>
      <path d="M 60,48 Q 62,60 60,72"/>
      <path d="M 68,46 Q 70,58 68,68"/>
    </g>
    <!-- 腿骨（左前/右后） -->
    <path d="M 28,68 L 24,82" stroke="${C.bone[2]}" stroke-width="2.5" stroke-linecap="round"/>
    <path d="M 60,72 L 64,84" stroke="${C.bone[2]}" stroke-width="2.5" stroke-linecap="round"/>
    <!-- 标本标签 -->
    <rect x="62" y="74" width="20" height="8" rx="1.5" fill="#FFFFFF" stroke="${C.fossilG[2]}" stroke-width="1"/>
    <rect x="64" y="76" width="16" height="1.4" fill="${C.fossilG[2]}" opacity=".7"/>
    <rect x="64" y="79" width="10" height="1.4" fill="${C.fossilG[2]}" opacity=".5"/>
  `);

  // 6. 猛犸象牙 fossil6：弯弓象牙 + 标本支架
  const fossil6 = wrap(`
    <ellipse cx="50" cy="92" rx="34" ry="3" fill="${C.shadow}"/>
    <!-- 木质底座 -->
    <rect x="18" y="80" width="64" height="9" rx="2" fill="${C.dino[0]}" stroke="${C.dino[1]}" stroke-width="1.6"/>
    <rect x="18" y="80" width="64" height="2.5" fill="${C.fossilG[1]}" opacity=".7"/>
    <!-- 黄铜支架（左右两根） -->
    <path d="M 28,80 L 28,52" stroke="${C.bronze[1]}" stroke-width="2.4" stroke-linecap="round"/>
    <circle cx="28" cy="52" r="2.4" fill="${C.bronze[2]}" stroke="${C.bronze[1]}" stroke-width="1"/>
    <path d="M 72,80 L 72,42" stroke="${C.bronze[1]}" stroke-width="2.4" stroke-linecap="round"/>
    <circle cx="72" cy="42" r="2.4" fill="${C.bronze[2]}" stroke="${C.bronze[1]}" stroke-width="1"/>
    <!-- 象牙主体（弯弓形，从粗到细） -->
    <path d="M 22,52 Q 18,46 26,40 Q 38,28 56,26 Q 72,26 80,38 Q 84,46 80,50 Q 72,46 58,42 Q 44,42 32,48 Q 26,52 22,52 Z"
      fill="${C.ivory[0]}" stroke="${C.ivory[2]}" stroke-width="2" stroke-linejoin="round"/>
    <!-- 象牙根部纹理 -->
    <path d="M 26,46 Q 32,44 38,46" stroke="${C.ivory[2]}" stroke-width="1" fill="none" opacity=".5"/>
    <path d="M 26,50 Q 32,48 38,50" stroke="${C.ivory[2]}" stroke-width="1" fill="none" opacity=".5"/>
    <!-- 象牙中段年轮纹 -->
    <path d="M 44,38 Q 50,36 56,36" stroke="${C.ivory[1]}" stroke-width=".9" fill="none" opacity=".7"/>
    <path d="M 50,42 Q 56,40 62,40" stroke="${C.ivory[1]}" stroke-width=".9" fill="none" opacity=".7"/>
    <!-- 象牙尖（颜色加深） -->
    <path d="M 76,38 Q 82,38 80,42 Q 78,40 76,38 Z" fill="${C.ivory[1]}" opacity=".7"/>
    <!-- 高光 -->
    <path d="M 28,42 Q 36,32 56,30" stroke="#FFFFFF" stroke-width="2" fill="none" opacity=".55" stroke-linecap="round"/>
    <!-- 标签 -->
    <rect x="56" y="82" width="22" height="6" rx="1" fill="#FFFFFF" stroke="${C.dino[1]}" stroke-width=".8"/>
    <text x="67" y="86.6" font-size="4" font-weight="700" fill="${C.dino[1]}" text-anchor="middle">MAMMOTH</text>
  `);

  // 7. 始祖鸟全骨架 fossil7：板岩里的展翅飞鸟化石（自然馆顶级）
  const fossil7 = wrap(`
    <ellipse cx="50" cy="93" rx="38" ry="3" fill="${C.shadow}"/>
    <!-- 板岩外框 -->
    <rect x="6" y="10" width="88" height="78" rx="4" fill="${C.archae[0]}" stroke="${C.archae[1]}" stroke-width="2"/>
    <!-- 板岩纹理 -->
    <path d="M 10,30 L 92,30" stroke="${C.archae[1]}" stroke-width=".6" opacity=".4"/>
    <path d="M 10,52 L 92,52" stroke="${C.archae[1]}" stroke-width=".6" opacity=".4"/>
    <path d="M 10,72 L 92,72" stroke="${C.archae[1]}" stroke-width=".6" opacity=".4"/>
    <!-- 脊柱（弯曲身体） -->
    <path d="M 26,52 Q 40,46 56,50 Q 70,54 78,62" stroke="${C.bone[0]}" stroke-width="2.5" fill="none" stroke-linecap="round"/>
    <!-- 头骨 + 喙 -->
    <path d="M 22,52 Q 18,50 18,46 Q 18,44 22,44 L 28,46 Q 30,48 28,52 Z" fill="${C.bone[0]}" stroke="${C.bone[2]}" stroke-width="1.2"/>
    <path d="M 18,46 L 12,42" stroke="${C.bone[0]}" stroke-width="1.6" stroke-linecap="round"/>
    <circle cx="22" cy="48" r=".8" fill="${C.archae[1]}"/>
    <!-- 左翅膀（展开向上，羽骨细线） -->
    <g stroke="${C.bone[0]}" stroke-width="1.4" fill="none" stroke-linecap="round">
      <path d="M 38,48 Q 28,32 18,22"/>
      <path d="M 42,48 Q 36,30 30,16"/>
      <path d="M 46,48 Q 44,30 42,14"/>
      <path d="M 50,48 Q 52,32 54,18"/>
    </g>
    <!-- 右翅膀（展开向下右，化石嵌入感） -->
    <g stroke="${C.bone[0]}" stroke-width="1.4" fill="none" stroke-linecap="round">
      <path d="M 60,52 Q 70,42 82,36"/>
      <path d="M 62,56 Q 74,50 88,46"/>
      <path d="M 60,60 Q 72,60 86,56"/>
    </g>
    <!-- 羽毛印痕（金色暗示稀有） -->
    <g fill="${C.archae[2]}" opacity=".55">
      <ellipse cx="32" cy="28" rx="2.4" ry=".8" transform="rotate(-50 32 28)"/>
      <ellipse cx="40" cy="22" rx="2.4" ry=".8" transform="rotate(-65 40 22)"/>
      <ellipse cx="50" cy="22" rx="2.4" ry=".8" transform="rotate(-78 50 22)"/>
      <ellipse cx="76" cy="44" rx="2.6" ry=".8" transform="rotate(20 76 44)"/>
      <ellipse cx="82" cy="50" rx="2.6" ry=".8" transform="rotate(10 82 50)"/>
    </g>
    <!-- 尾羽（向右下扇形） -->
    <g stroke="${C.bone[0]}" stroke-width="1.2" fill="none" stroke-linecap="round">
      <path d="M 78,62 L 86,72"/>
      <path d="M 78,62 L 88,68"/>
      <path d="M 78,62 L 84,76"/>
    </g>
    <!-- 后爪 -->
    <path d="M 60,52 L 58,64 L 54,68" stroke="${C.bone[0]}" stroke-width="1.4" fill="none" stroke-linecap="round"/>
    <path d="M 60,52 L 64,66 L 68,70" stroke="${C.bone[0]}" stroke-width="1.4" fill="none" stroke-linecap="round"/>
    <!-- 标本铭牌 -->
    <rect x="62" y="78" width="26" height="8" rx="1.5" fill="${C.archae[2]}" stroke="${C.archae[1]}" stroke-width=".8"/>
    <text x="75" y="83.6" font-size="4" font-weight="800" fill="${C.archae[1]}" text-anchor="middle">ARCHAEOPTERYX</text>
  `);

  // —— Row 1：古董链 ——

  // 1. 陶片 relic1：陶器破片
  const relic1 = wrap(`
    <ellipse cx="50" cy="80" rx="22" ry="3" fill="${C.shadow}"/>
    <path d="M 24,38 Q 30,30 44,32 Q 60,30 72,38 Q 78,46 70,58 Q 64,68 50,70 Q 36,68 30,60 Q 22,50 24,38 Z"
      fill="${C.clay[0]}" stroke="${C.clay[2]}" stroke-width="2" stroke-linejoin="round"/>
    <!-- 破口锯齿 -->
    <path d="M 24,38 L 28,42 L 26,46 L 30,50 L 24,52" stroke="${C.clay[2]}" stroke-width="1.6" fill="none"/>
    <path d="M 72,38 L 68,42 L 72,46 L 68,50 L 74,54" stroke="${C.clay[2]}" stroke-width="1.6" fill="none"/>
    <!-- 几何纹 -->
    <path d="M 36,46 L 40,50 L 36,54 L 40,58 L 36,62" stroke="${C.clay[2]}" stroke-width="1.2" fill="none" opacity=".7"/>
    <path d="M 56,46 L 60,50 L 56,54 L 60,58 L 56,62" stroke="${C.clay[2]}" stroke-width="1.2" fill="none" opacity=".7"/>
    <circle cx="48" cy="52" r="2" fill="${C.clay[2]}" opacity=".6"/>
  `);

  // 2. 残碗 relic2：残缺一角的碗
  const relic2 = wrap(`
    <ellipse cx="50" cy="86" rx="28" ry="3" fill="${C.shadow}"/>
    <!-- 碗主体（带缺口） -->
    <path d="M 18,46 Q 18,44 22,44 L 38,44 L 42,40 L 58,44 L 78,44 Q 82,44 82,46 Q 82,68 70,76 Q 60,82 50,82 Q 40,82 30,76 Q 18,68 18,46 Z"
      fill="${C.clay[0]}" stroke="${C.clay[2]}" stroke-width="2" stroke-linejoin="round"/>
    <!-- 碗内 -->
    <ellipse cx="50" cy="46" rx="32" ry="6" fill="${C.clay[1]}" opacity=".7"/>
    <!-- 缺口锯齿 -->
    <path d="M 38,44 L 41,47 L 38,50 L 42,40" stroke="${C.clay[2]}" stroke-width="1.4" fill="${C.clay[1]}"/>
    <!-- 装饰带 -->
    <path d="M 24,58 Q 36,62 50,60 Q 64,62 76,58" stroke="${C.clay[2]}" stroke-width="1.4" fill="none" opacity=".7"/>
    <circle cx="32" cy="68" r="1.5" fill="${C.clay[2]}" opacity=".5"/>
    <circle cx="50" cy="70" r="1.5" fill="${C.clay[2]}" opacity=".5"/>
    <circle cx="68" cy="68" r="1.5" fill="${C.clay[2]}" opacity=".5"/>
  `);

  // 3. 青瓷碗 relic3：完整青瓷碗 + 高光
  const relic3 = wrap(`
    <ellipse cx="50" cy="88" rx="30" ry="3" fill="${C.shadow}"/>
    <!-- 圈足 -->
    <ellipse cx="50" cy="82" rx="14" ry="3" fill="${C.porcG[2]}"/>
    <!-- 碗主体 -->
    <path d="M 16,42 Q 16,40 20,40 L 80,40 Q 84,40 84,42 Q 84,68 70,80 Q 60,84 50,84 Q 40,84 30,80 Q 16,68 16,42 Z"
      fill="${C.porcW[1]}" stroke="${C.porcW[2]}" stroke-width="2" stroke-linejoin="round"/>
    <!-- 内圈 -->
    <ellipse cx="50" cy="42" rx="34" ry="6" fill="${C.porcG[0]}"/>
    <ellipse cx="50" cy="42" rx="34" ry="6" fill="none" stroke="${C.porcW[2]}" stroke-width="1.4"/>
    <!-- 高光 -->
    <path d="M 24,46 Q 22,58 28,68" stroke="${C.porcW[0]}" stroke-width="3" fill="none" stroke-linecap="round" opacity=".7"/>
    <!-- 青花纹 -->
    <path d="M 36,58 Q 42,54 48,58 Q 54,54 60,58 Q 66,54 72,58" stroke="${C.porcG[2]}" stroke-width="1.5" fill="none"/>
    <circle cx="40" cy="68" r="2" fill="${C.porcG[2]}" opacity=".7"/>
    <circle cx="50" cy="72" r="2" fill="${C.porcG[2]}" opacity=".7"/>
    <circle cx="60" cy="68" r="2" fill="${C.porcG[2]}" opacity=".7"/>
  `);

  // 4. 青铜爵 relic4：三足爵 + 双柱
  const relic4 = wrap(`
    <ellipse cx="50" cy="92" rx="30" ry="3" fill="${C.shadow}"/>
    <!-- 流（左尖嘴）和尾（右尖尾） -->
    <path d="M 12,30 L 28,38 L 20,42 Z" fill="${C.bronze[1]}" stroke="${C.bronze[1]}" stroke-width="1.4"/>
    <path d="M 88,30 L 72,38 L 80,42 Z" fill="${C.bronze[1]}" stroke="${C.bronze[1]}" stroke-width="1.4"/>
    <!-- 杯口顶视(椭圆) -->
    <ellipse cx="50" cy="34" rx="22" ry="5" fill="${C.bronze[0]}" stroke="${C.bronze[1]}" stroke-width="2"/>
    <!-- 杯身（梯形） -->
    <path d="M 30,36 L 24,68 L 42,72 L 58,72 L 76,68 L 70,36 Z"
      fill="${C.bronze[0]}" stroke="${C.bronze[1]}" stroke-width="2" stroke-linejoin="round"/>
    <!-- 双柱（口沿上的两根小柱） -->
    <rect x="38" y="22" width="3" height="10" fill="${C.bronze[1]}"/>
    <circle cx="39.5" cy="22" r="2.6" fill="${C.bronze[2]}" stroke="${C.bronze[1]}" stroke-width="1"/>
    <rect x="59" y="22" width="3" height="10" fill="${C.bronze[1]}"/>
    <circle cx="60.5" cy="22" r="2.6" fill="${C.bronze[2]}" stroke="${C.bronze[1]}" stroke-width="1"/>
    <!-- 三足（前两后一） -->
    <path d="M 30,72 Q 26,82 24,90 L 30,90 Q 32,82 36,72 Z" fill="${C.bronze[1]}"/>
    <path d="M 70,72 Q 74,82 76,90 L 70,90 Q 68,82 64,72 Z" fill="${C.bronze[1]}"/>
    <path d="M 48,72 L 46,88 L 54,88 L 52,72 Z" fill="${C.bronze[1]}" opacity=".75"/>
    <!-- 兽面纹 -->
    <ellipse cx="44" cy="54" rx="3" ry="2.4" fill="${C.bronze[1]}"/>
    <ellipse cx="56" cy="54" rx="3" ry="2.4" fill="${C.bronze[1]}"/>
    <path d="M 36,46 Q 50,42 64,46" stroke="${C.bronze[1]}" stroke-width="1.4" fill="none"/>
    <path d="M 36,62 Q 50,66 64,62" stroke="${C.bronze[1]}" stroke-width="1.4" fill="none"/>
    <!-- 高光 -->
    <path d="M 32,40 L 30,64" stroke="${C.bronze[2]}" stroke-width="1.5" opacity=".5"/>
  `);

  // 5. 玉如意 relic5：S形如意 + 流苏
  const relic5 = wrap(`
    <ellipse cx="50" cy="92" rx="30" ry="3" fill="${C.shadow}"/>
    <!-- 如意杆 -->
    <path d="M 22,28 Q 36,38 52,52 Q 64,62 72,76"
      stroke="${C.jade[1]}" stroke-width="6" fill="none" stroke-linecap="round"/>
    <path d="M 22,28 Q 36,38 52,52 Q 64,62 72,76"
      stroke="${C.jade[0]}" stroke-width="3.4" fill="none" stroke-linecap="round" opacity=".85"/>
    <!-- 如意头（云形） -->
    <path d="M 14,30 Q 10,18 22,16 Q 30,16 28,26 Q 36,22 36,30 Q 32,38 22,36 Q 14,38 14,30 Z"
      fill="${C.jade[0]}" stroke="${C.jade[2]}" stroke-width="1.8" stroke-linejoin="round"/>
    <ellipse cx="22" cy="26" rx="3" ry="2" fill="${C.jade[1]}" opacity=".5"/>
    <!-- 如意尾（小云） -->
    <path d="M 78,72 Q 88,72 84,82 Q 78,86 72,82 Q 68,76 78,72 Z"
      fill="${C.jade[0]}" stroke="${C.jade[2]}" stroke-width="1.8" stroke-linejoin="round"/>
    <!-- 流苏 -->
    <circle cx="78" cy="76" r="2.4" fill="${C.gold[1]}" stroke="${C.gold[2]}" stroke-width=".8"/>
    <path d="M 78,80 L 76,90" stroke="#D72020" stroke-width="1.8" stroke-linecap="round"/>
    <path d="M 80,80 L 82,90" stroke="#D72020" stroke-width="1.8" stroke-linecap="round"/>
    <!-- 中段花结 -->
    <circle cx="50" cy="50" r="4" fill="${C.gold[0]}" stroke="${C.gold[2]}" stroke-width="1.2"/>
    <!-- 高光 -->
    <path d="M 26,28 Q 24,22 30,22" stroke="#FFFFFF" stroke-width="1.6" fill="none" opacity=".7"/>
  `);

  // 6. 唐三彩骆驼 relic6：橙绿黄三彩釉骆驼俑（背载丝绸）
  const relic6 = wrap(`
    <ellipse cx="50" cy="92" rx="34" ry="3" fill="${C.shadow}"/>
    <!-- 木质底座（窄） -->
    <rect x="20" y="84" width="60" height="6" rx="1.5" fill="${C.dino[0]}" stroke="${C.dino[1]}" stroke-width="1.2"/>
    <!-- 后腿（站姿） -->
    <rect x="32" y="70" width="6" height="16" rx="1.5" fill="${C.sancai[0]}" stroke="${C.line}" stroke-width="1.4"/>
    <rect x="62" y="70" width="6" height="16" rx="1.5" fill="${C.sancai[0]}" stroke="${C.line}" stroke-width="1.4"/>
    <!-- 前腿 -->
    <rect x="40" y="68" width="5" height="18" rx="1.5" fill="${C.sancai[2]}" stroke="${C.line}" stroke-width="1.4"/>
    <rect x="55" y="68" width="5" height="18" rx="1.5" fill="${C.sancai[2]}" stroke="${C.line}" stroke-width="1.4"/>
    <!-- 身体（圆胖） -->
    <path d="M 26,58 Q 26,46 38,44 L 64,44 Q 76,46 76,58 Q 76,72 64,74 L 38,74 Q 26,72 26,58 Z"
      fill="${C.sancai[0]}" stroke="${C.line}" stroke-width="2" stroke-linejoin="round"/>
    <!-- 双驼峰 -->
    <path d="M 36,44 Q 38,30 46,32 Q 50,32 50,42 Z"
      fill="${C.sancai[2]}" stroke="${C.line}" stroke-width="1.6" stroke-linejoin="round"/>
    <path d="M 50,42 Q 50,32 54,32 Q 62,30 64,44 Z"
      fill="${C.sancai[1]}" stroke="${C.line}" stroke-width="1.6" stroke-linejoin="round"/>
    <!-- 脖子 + 头（前伸） -->
    <path d="M 26,58 Q 18,52 16,40 Q 18,30 22,30" stroke="${C.line}" stroke-width="1.6" fill="${C.sancai[0]}" stroke-linejoin="round"/>
    <ellipse cx="20" cy="28" rx="6" ry="5" fill="${C.sancai[0]}" stroke="${C.line}" stroke-width="1.6"/>
    <!-- 耳朵 -->
    <path d="M 18,24 L 17,20 L 22,22 Z" fill="${C.sancai[0]}" stroke="${C.line}" stroke-width="1"/>
    <!-- 眼 -->
    <circle cx="22" cy="28" r=".9" fill="${C.line}"/>
    <!-- 嘴 -->
    <path d="M 14,30 L 16,32" stroke="${C.line}" stroke-width=".9"/>
    <!-- 缰绳（绿釉） -->
    <path d="M 22,30 Q 28,40 36,46" stroke="${C.sancai[1]}" stroke-width="1.4" fill="none" opacity=".8"/>
    <!-- 釉色斑点（三彩特征：黄/绿/橙交替） -->
    <circle cx="40" cy="56" r="2" fill="${C.sancai[2]}" opacity=".75"/>
    <circle cx="52" cy="60" r="2.2" fill="${C.sancai[1]}" opacity=".75"/>
    <circle cx="60" cy="54" r="1.8" fill="${C.sancai[2]}" opacity=".75"/>
    <circle cx="46" cy="68" r="1.6" fill="${C.sancai[1]}" opacity=".7"/>
    <circle cx="62" cy="66" r="1.8" fill="${C.sancai[2]}" opacity=".7"/>
    <!-- 高光（釉面光泽） -->
    <path d="M 32,50 Q 40,46 50,48" stroke="#FFFFFF" stroke-width="1.6" fill="none" opacity=".5" stroke-linecap="round"/>
  `);

  // 7. 传国玉玺 relic7：方形玉印 + 螭龙钮 + 朱印泥（古董馆顶级）
  const relic7 = wrap(`
    <ellipse cx="50" cy="93" rx="32" ry="3" fill="${C.shadow}"/>
    <!-- 锦盒底（朱红色） -->
    <rect x="14" y="78" width="72" height="11" rx="2" fill="${C.shrine[0]}" stroke="${C.shrine[1]}" stroke-width="1.6"/>
    <rect x="14" y="78" width="72" height="3" fill="${C.shrine[2]}" opacity=".7"/>
    <path d="M 22,84 L 78,84" stroke="${C.shrine[2]}" stroke-width=".8" opacity=".5"/>
    <!-- 玺身（白玉方块） -->
    <rect x="26" y="46" width="48" height="34" rx="3"
      fill="${C.seal[0]}" stroke="${C.whJade[2]}" stroke-width="2"/>
    <!-- 玺侧面（深色玉，体积感） -->
    <path d="M 26,46 L 30,42 L 78,42 L 74,46 Z" fill="${C.whJade[1]}" stroke="${C.whJade[2]}" stroke-width="1.4" stroke-linejoin="round"/>
    <path d="M 74,46 L 78,42 L 78,76 L 74,80 Z" fill="${C.whJade[1]}" stroke="${C.whJade[2]}" stroke-width="1.4" stroke-linejoin="round" opacity=".7"/>
    <!-- 玺底篆刻（朱印纹） -->
    <rect x="32" y="56" width="36" height="20" rx="1" fill="${C.shrine[0]}" opacity=".15"/>
    <g stroke="${C.shrine[1]}" stroke-width="1.2" fill="none">
      <path d="M 36,60 L 42,60 L 42,72 L 36,72 Z"/>
      <path d="M 39,66 L 39,60 M 36,66 L 42,66"/>
      <path d="M 48,60 L 54,60 L 54,72 L 48,72 Z"/>
      <path d="M 51,60 L 51,72 M 48,66 L 54,66"/>
      <path d="M 60,60 L 66,60 L 66,72 L 60,72 Z"/>
      <path d="M 60,66 L 66,66"/>
    </g>
    <!-- 螭龙钮（顶部蟠龙） -->
    <path d="M 38,46 Q 36,32 44,28 Q 50,24 56,28 Q 64,32 62,46 Z"
      fill="${C.whJade[1]}" stroke="${C.whJade[2]}" stroke-width="1.8" stroke-linejoin="round"/>
    <!-- 龙鳞 -->
    <path d="M 42,38 Q 46,36 48,38 Q 52,36 54,38 Q 58,36 60,38" stroke="${C.whJade[2]}" stroke-width="1" fill="none" opacity=".7"/>
    <path d="M 42,42 Q 46,40 48,42 Q 52,40 54,42 Q 58,40 60,42" stroke="${C.whJade[2]}" stroke-width="1" fill="none" opacity=".7"/>
    <!-- 龙头（抬头朝右） -->
    <ellipse cx="56" cy="30" rx="5" ry="4" fill="${C.whJade[1]}" stroke="${C.whJade[2]}" stroke-width="1.4"/>
    <circle cx="58" cy="29" r=".8" fill="${C.line}"/>
    <!-- 龙角 -->
    <path d="M 54,26 L 52,22" stroke="${C.whJade[2]}" stroke-width="1.4" stroke-linecap="round"/>
    <path d="M 58,26 L 60,22" stroke="${C.whJade[2]}" stroke-width="1.4" stroke-linecap="round"/>
    <!-- 龙爪（钩前抓） -->
    <path d="M 44,28 L 40,30 L 38,28" stroke="${C.whJade[2]}" stroke-width="1.2" fill="none" stroke-linecap="round"/>
    <!-- 高光（玉的温润感） -->
    <path d="M 30,50 L 30,72" stroke="#FFFFFF" stroke-width="2.4" opacity=".6"/>
    <ellipse cx="46" cy="32" rx="2.4" ry="1.4" fill="#FFFFFF" opacity=".55"/>
    <!-- 金色封绶（前飘） -->
    <path d="M 42,80 Q 50,86 58,80" stroke="${C.gold[1]}" stroke-width="2" fill="none" stroke-linecap="round"/>
    <circle cx="50" cy="83" r="1.6" fill="${C.gold[0]}" stroke="${C.gold[2]}" stroke-width=".8"/>
  `);

  // —— Row 2：猫链 ——

  // 1. 猫爪印 cat1：肉垫脚印
  const cat1 = wrap(`
    <ellipse cx="50" cy="86" rx="22" ry="3" fill="${C.shadow}"/>
    <!-- 大肉垫 -->
    <path d="M 32,58 Q 26,52 32,46 Q 40,40 50,42 Q 60,40 68,46 Q 74,52 68,58 Q 64,68 56,72 Q 50,76 44,72 Q 36,68 32,58 Z"
      fill="${C.pink}" stroke="${C.line}" stroke-width="2" stroke-linejoin="round"/>
    <!-- 4 个小肉垫 -->
    <ellipse cx="30" cy="36" rx="5" ry="6" fill="${C.pink}" stroke="${C.line}" stroke-width="1.8"/>
    <ellipse cx="44" cy="26" rx="5" ry="6" fill="${C.pink}" stroke="${C.line}" stroke-width="1.8"/>
    <ellipse cx="56" cy="26" rx="5" ry="6" fill="${C.pink}" stroke="${C.line}" stroke-width="1.8"/>
    <ellipse cx="70" cy="36" rx="5" ry="6" fill="${C.pink}" stroke="${C.line}" stroke-width="1.8"/>
    <!-- 高光 -->
    <ellipse cx="42" cy="50" rx="4" ry="2" fill="#FFFFFF" opacity=".5"/>
  `);

  // 2. 小鱼干 cat2：横向鱼干
  const cat2 = wrap(`
    <ellipse cx="50" cy="80" rx="26" ry="3" fill="${C.shadow}"/>
    <!-- 鱼身 -->
    <path d="M 18,50 Q 28,32 50,32 Q 72,32 78,42 L 90,36 L 86,50 L 90,64 L 78,58 Q 72,68 50,68 Q 28,68 18,50 Z"
      fill="${C.fish[0]}" stroke="${C.fish[2]}" stroke-width="2" stroke-linejoin="round"/>
    <!-- 鱼鳞 -->
    <path d="M 30,44 Q 36,42 38,46" stroke="${C.fish[1]}" stroke-width="1.2" fill="none"/>
    <path d="M 40,40 Q 46,38 48,42" stroke="${C.fish[1]}" stroke-width="1.2" fill="none"/>
    <path d="M 50,40 Q 56,38 58,42" stroke="${C.fish[1]}" stroke-width="1.2" fill="none"/>
    <path d="M 60,40 Q 66,38 68,42" stroke="${C.fish[1]}" stroke-width="1.2" fill="none"/>
    <path d="M 30,52 Q 36,50 38,54" stroke="${C.fish[1]}" stroke-width="1.2" fill="none"/>
    <path d="M 40,52 Q 46,50 48,54" stroke="${C.fish[1]}" stroke-width="1.2" fill="none"/>
    <path d="M 50,52 Q 56,50 58,54" stroke="${C.fish[1]}" stroke-width="1.2" fill="none"/>
    <path d="M 60,52 Q 66,50 68,54" stroke="${C.fish[1]}" stroke-width="1.2" fill="none"/>
    <!-- 鱼眼 -->
    <circle cx="30" cy="46" r="2.4" fill="${C.fish[2]}"/>
    <circle cx="29" cy="45" r=".8" fill="#FFFFFF"/>
    <!-- 嘴 -->
    <path d="M 20,52 Q 24,54 22,58" stroke="${C.fish[2]}" stroke-width="1.4" fill="none"/>
  `);

  // 3. 逗猫棒 cat3：杆+羽毛+铃铛
  const cat3 = wrap(`
    <ellipse cx="50" cy="90" rx="28" ry="3" fill="${C.shadow}"/>
    <!-- 棒杆（斜放） -->
    <path d="M 18,82 L 64,30" stroke="${C.cat[1]}" stroke-width="5" stroke-linecap="round"/>
    <path d="M 18,82 L 64,30" stroke="${C.cat[2]}" stroke-width="2" stroke-linecap="round" opacity=".6"/>
    <!-- 把手 -->
    <circle cx="18" cy="82" r="5" fill="${C.cat[1]}" stroke="${C.line}" stroke-width="1.5"/>
    <!-- 羽毛簇（顶端） -->
    <g transform="translate(64,30)">
      <ellipse cx="0" cy="-12" rx="6" ry="14" fill="#F0A0B8" stroke="${C.line}" stroke-width="1.2" transform="rotate(-20)"/>
      <ellipse cx="-6" cy="-8" rx="5" ry="13" fill="#88C8E8" stroke="${C.line}" stroke-width="1.2" transform="rotate(-50)"/>
      <ellipse cx="6" cy="-6" rx="5" ry="13" fill="#F8D870" stroke="${C.line}" stroke-width="1.2" transform="rotate(20)"/>
      <!-- 羽轴 -->
      <path d="M 0,0 L 0,-22" stroke="${C.line}" stroke-width=".8" opacity=".7"/>
    </g>
    <!-- 铃铛 -->
    <line x1="40" y1="56" x2="44" y2="64" stroke="${C.line}" stroke-width="1.2"/>
    <circle cx="46" cy="68" r="5" fill="${C.gold[0]}" stroke="${C.gold[2]}" stroke-width="1.4"/>
    <path d="M 44,72 L 48,72" stroke="${C.gold[2]}" stroke-width="1.4"/>
    <circle cx="46" cy="72" r="1" fill="${C.gold[2]}"/>
    <!-- 高光 -->
    <circle cx="44" cy="66" r="1.2" fill="#FFFFFF" opacity=".7"/>
  `);

  // 4. 毛线雕像 cat4：毛线球缠出猫形
  const cat4 = wrap(`
    <ellipse cx="50" cy="86" rx="26" ry="3" fill="${C.shadow}"/>
    <!-- 毛线球主体 -->
    <circle cx="50" cy="54" r="28" fill="${C.yarn[0]}" stroke="${C.yarn[1]}" stroke-width="2"/>
    <!-- 毛线缠绕（多圈椭圆） -->
    <ellipse cx="50" cy="54" rx="28" ry="10" fill="none" stroke="${C.yarn[1]}" stroke-width="1.4" transform="rotate(20 50 54)"/>
    <ellipse cx="50" cy="54" rx="28" ry="10" fill="none" stroke="${C.yarn[1]}" stroke-width="1.4" transform="rotate(-20 50 54)"/>
    <ellipse cx="50" cy="54" rx="28" ry="10" fill="none" stroke="${C.yarn[1]}" stroke-width="1.4" transform="rotate(60 50 54)"/>
    <ellipse cx="50" cy="54" rx="28" ry="10" fill="none" stroke="${C.yarn[1]}" stroke-width="1.4" transform="rotate(-60 50 54)"/>
    <ellipse cx="50" cy="54" rx="28" ry="10" fill="none" stroke="${C.yarn[1]}" stroke-width="1.4"/>
    <!-- 猫耳（顶部两个三角，破出毛线球） -->
    <path d="M 32,32 Q 30,18 36,18 Q 42,22 42,32 Z" fill="${C.yarn[0]}" stroke="${C.line}" stroke-width="1.6"/>
    <path d="M 68,32 Q 70,18 64,18 Q 58,22 58,32 Z" fill="${C.yarn[0]}" stroke="${C.line}" stroke-width="1.6"/>
    <path d="M 34,28 Q 35,22 38,22" stroke="${C.pink}" stroke-width="1.4" fill="none"/>
    <path d="M 66,28 Q 65,22 62,22" stroke="${C.pink}" stroke-width="1.4" fill="none"/>
    <!-- 毛线尾巴（从右侧拖出） -->
    <path d="M 78,52 Q 90,48 88,38" stroke="${C.yarn[1]}" stroke-width="2" fill="none"/>
    <circle cx="88" cy="36" r="2" fill="${C.yarn[1]}"/>
    <!-- 猫脸（小） -->
    <circle cx="42" cy="54" r="1.8" fill="${C.line}"/>
    <circle cx="58" cy="54" r="1.8" fill="${C.line}"/>
    <circle cx="42.5" cy="53" r=".6" fill="#FFFFFF"/>
    <circle cx="58.5" cy="53" r=".6" fill="#FFFFFF"/>
    <path d="M 50,58 L 50,60" stroke="${C.line}" stroke-width="1"/>
    <path d="M 50,60 Q 47,62 45,61" stroke="${C.line}" stroke-width="1" fill="none"/>
    <path d="M 50,60 Q 53,62 55,61" stroke="${C.line}" stroke-width="1" fill="none"/>
  `);

  // 5. 金猫像 cat5：黄金猫雕像（招财猫风）
  const cat5 = wrap(`
    <ellipse cx="50" cy="92" rx="30" ry="3" fill="${C.shadow}"/>
    <!-- 底座 -->
    <rect x="22" y="78" width="56" height="10" rx="2" fill="${C.gold[2]}" stroke="#5A3F18" stroke-width="1.6"/>
    <rect x="22" y="78" width="56" height="3" fill="${C.gold[0]}" opacity=".8"/>
    <!-- 身体 -->
    <path d="M 30,78 Q 24,60 28,46 Q 32,32 50,28 Q 68,32 72,46 Q 76,60 70,78 Z"
      fill="${C.gold[0]}" stroke="${C.gold[2]}" stroke-width="2" stroke-linejoin="round"/>
    <!-- 头 -->
    <circle cx="50" cy="36" r="18" fill="${C.gold[0]}" stroke="${C.gold[2]}" stroke-width="2"/>
    <!-- 耳朵 -->
    <path d="M 34,26 L 30,14 L 42,22 Z" fill="${C.gold[1]}" stroke="${C.gold[2]}" stroke-width="1.6" stroke-linejoin="round"/>
    <path d="M 66,26 L 70,14 L 58,22 Z" fill="${C.gold[1]}" stroke="${C.gold[2]}" stroke-width="1.6" stroke-linejoin="round"/>
    <!-- 抬起的招财手 -->
    <path d="M 70,44 Q 80,32 78,22 Q 70,20 66,30 Q 62,38 64,46 Z"
      fill="${C.gold[0]}" stroke="${C.gold[2]}" stroke-width="1.8" stroke-linejoin="round"/>
    <ellipse cx="76" cy="26" rx="3" ry="3.4" fill="${C.gold[1]}" opacity=".7"/>
    <!-- 项圈和铃铛 -->
    <path d="M 36,52 Q 50,56 64,52" stroke="#D72020" stroke-width="3" fill="none" stroke-linecap="round"/>
    <circle cx="50" cy="56" r="3.4" fill="${C.gold[0]}" stroke="${C.gold[2]}" stroke-width="1.4"/>
    <path d="M 48,58.5 L 52,58.5" stroke="${C.gold[2]}" stroke-width="1.2"/>
    <!-- 小金币（手中） -->
    <circle cx="74" cy="50" r="6" fill="${C.gold[1]}" stroke="${C.gold[2]}" stroke-width="1.4"/>
    <text x="74" y="53" font-size="7" font-weight="700" fill="${C.gold[2]}" text-anchor="middle">¥</text>
    <!-- 五官 -->
    <ellipse cx="42" cy="34" rx="2" ry="3" fill="${C.line}"/>
    <ellipse cx="58" cy="34" rx="2" ry="3" fill="${C.line}"/>
    <circle cx="42.5" cy="33" r=".7" fill="#FFFFFF"/>
    <circle cx="58.5" cy="33" r=".7" fill="#FFFFFF"/>
    <path d="M 48,40 L 52,40 L 50,42 Z" fill="${C.pink}"/>
    <path d="M 50,42 L 50,44" stroke="${C.line}" stroke-width=".9"/>
    <path d="M 50,44 Q 47,46 45,45" stroke="${C.line}" stroke-width=".9" fill="none"/>
    <path d="M 50,44 Q 53,46 55,45" stroke="${C.line}" stroke-width=".9" fill="none"/>
    <!-- 高光 -->
    <ellipse cx="40" cy="28" rx="3" ry="2" fill="#FFFFFF" opacity=".55"/>
    <ellipse cx="36" cy="60" rx="2" ry="6" fill="#FFFFFF" opacity=".4"/>
  `);

  // 6. 白玉招财猫 cat6：羊脂玉雕的招财猫，绿丝带项圈
  const cat6 = wrap(`
    <ellipse cx="50" cy="92" rx="32" ry="3" fill="${C.shadow}"/>
    <!-- 红木底座 -->
    <path d="M 22,80 L 78,80 L 76,89 L 24,89 Z"
      fill="${C.shrine[0]}" stroke="${C.shrine[1]}" stroke-width="1.6" stroke-linejoin="round"/>
    <rect x="22" y="80" width="56" height="2" fill="${C.shrine[2]}" opacity=".7"/>
    <!-- 玉璧底盘 -->
    <ellipse cx="50" cy="80" rx="22" ry="3" fill="${C.whJade[1]}" stroke="${C.whJade[2]}" stroke-width="1.4"/>
    <!-- 身体（玉雕） -->
    <path d="M 30,80 Q 24,62 28,46 Q 32,32 50,28 Q 68,32 72,46 Q 76,62 70,80 Z"
      fill="${C.whJade[0]}" stroke="${C.whJade[2]}" stroke-width="2" stroke-linejoin="round"/>
    <!-- 头 -->
    <circle cx="50" cy="36" r="18" fill="${C.whJade[0]}" stroke="${C.whJade[2]}" stroke-width="2"/>
    <!-- 耳朵 -->
    <path d="M 34,26 L 30,14 L 42,22 Z" fill="${C.whJade[1]}" stroke="${C.whJade[2]}" stroke-width="1.6" stroke-linejoin="round"/>
    <path d="M 66,26 L 70,14 L 58,22 Z" fill="${C.whJade[1]}" stroke="${C.whJade[2]}" stroke-width="1.6" stroke-linejoin="round"/>
    <!-- 招财手（举起） -->
    <path d="M 70,44 Q 80,30 78,20 Q 70,18 66,28 Q 62,36 64,46 Z"
      fill="${C.whJade[0]}" stroke="${C.whJade[2]}" stroke-width="1.8" stroke-linejoin="round"/>
    <ellipse cx="76" cy="24" rx="3" ry="3.4" fill="${C.whJade[1]}" opacity=".7"/>
    <!-- 翡翠绿丝带项圈 -->
    <path d="M 36,52 Q 50,56 64,52" stroke="${C.jade[1]}" stroke-width="3" fill="none" stroke-linecap="round"/>
    <path d="M 36,52 Q 50,56 64,52" stroke="${C.jade[0]}" stroke-width="1.2" fill="none" stroke-linecap="round" opacity=".7"/>
    <!-- 项圈玉珠 -->
    <circle cx="50" cy="56" r="3" fill="${C.jade[0]}" stroke="${C.jade[2]}" stroke-width="1.2"/>
    <circle cx="50" cy="56" r="1" fill="#FFFFFF" opacity=".6"/>
    <!-- 招财牌（玉牌） -->
    <rect x="68" y="46" width="10" height="8" rx="1.2" fill="${C.jade[0]}" stroke="${C.jade[2]}" stroke-width="1"/>
    <text x="73" y="52.5" font-size="6" font-weight="700" fill="${C.jade[2]}" text-anchor="middle">福</text>
    <!-- 五官（玉雕浅刻线） -->
    <ellipse cx="42" cy="34" rx="1.8" ry="2.6" fill="${C.whJade[2]}"/>
    <ellipse cx="58" cy="34" rx="1.8" ry="2.6" fill="${C.whJade[2]}"/>
    <circle cx="42.4" cy="33" r=".6" fill="#FFFFFF"/>
    <circle cx="58.4" cy="33" r=".6" fill="#FFFFFF"/>
    <path d="M 48,40 L 52,40 L 50,42 Z" fill="${C.pink}" opacity=".7"/>
    <path d="M 50,42 L 50,44" stroke="${C.whJade[2]}" stroke-width=".8"/>
    <path d="M 50,44 Q 47,46 45,45" stroke="${C.whJade[2]}" stroke-width=".8" fill="none"/>
    <path d="M 50,44 Q 53,46 55,45" stroke="${C.whJade[2]}" stroke-width=".8" fill="none"/>
    <!-- 玉的温润高光（侧面竖光） -->
    <path d="M 36,42 Q 32,58 38,76" stroke="#FFFFFF" stroke-width="2.6" fill="none" opacity=".55" stroke-linecap="round"/>
    <ellipse cx="42" cy="28" rx="3" ry="1.6" fill="#FFFFFF" opacity=".6"/>
  `);

  // 7. 猫神祠 cat7：朱漆木祠 + 金顶 + 内供金猫像（猫咪馆终极镇馆）
  const cat7 = wrap(`
    <ellipse cx="50" cy="93" rx="40" ry="3" fill="${C.shadow}"/>
    <!-- 石阶 -->
    <rect x="14" y="84" width="72" height="6" fill="${C.whJade[1]}" stroke="${C.whJade[2]}" stroke-width="1.2"/>
    <rect x="20" y="78" width="60" height="6" fill="${C.whJade[0]}" stroke="${C.whJade[2]}" stroke-width="1.2"/>
    <!-- 祠身（朱漆） -->
    <rect x="22" y="40" width="56" height="40" fill="${C.shrine[0]}" stroke="${C.shrine[1]}" stroke-width="2"/>
    <!-- 祠内壁（暗红） -->
    <rect x="30" y="48" width="40" height="32" fill="${C.shrine[1]}" opacity=".75"/>
    <!-- 内供金猫像（缩影） -->
    <circle cx="50" cy="58" r="6" fill="${C.gold[0]}" stroke="${C.gold[2]}" stroke-width="1"/>
    <path d="M 44,52 L 42,46 L 47,50 Z" fill="${C.gold[1]}" stroke="${C.gold[2]}" stroke-width=".8"/>
    <path d="M 56,52 L 58,46 L 53,50 Z" fill="${C.gold[1]}" stroke="${C.gold[2]}" stroke-width=".8"/>
    <path d="M 44,64 L 44,76 L 56,76 L 56,64 Z" fill="${C.gold[0]}" stroke="${C.gold[2]}" stroke-width=".8"/>
    <circle cx="48" cy="58" r=".7" fill="${C.line}"/>
    <circle cx="52" cy="58" r=".7" fill="${C.line}"/>
    <!-- 招财手（举起） -->
    <path d="M 56,60 Q 60,54 60,50" stroke="${C.gold[2]}" stroke-width="1.6" fill="none" stroke-linecap="round"/>
    <!-- 红柱（左右） -->
    <rect x="22" y="40" width="6" height="40" fill="${C.shrine[1]}" stroke="${C.shrine[1]}" stroke-width="1"/>
    <rect x="72" y="40" width="6" height="40" fill="${C.shrine[1]}" stroke="${C.shrine[1]}" stroke-width="1"/>
    <!-- 金箔柱头 -->
    <rect x="20" y="38" width="10" height="4" fill="${C.gold[1]}" stroke="${C.shrine[1]}" stroke-width=".8"/>
    <rect x="70" y="38" width="10" height="4" fill="${C.gold[1]}" stroke="${C.shrine[1]}" stroke-width=".8"/>
    <!-- 屋檐横梁 -->
    <rect x="14" y="32" width="72" height="8" fill="${C.shrine[1]}" stroke="${C.line}" stroke-width="1.4"/>
    <!-- 金顶（弯曲翘檐） -->
    <path d="M 10,32 L 50,12 L 90,32 Z" fill="${C.shrine[2]}" stroke="${C.shrine[1]}" stroke-width="1.8" stroke-linejoin="round"/>
    <path d="M 10,32 L 50,12 L 90,32" fill="none" stroke="${C.gold[2]}" stroke-width="1" opacity=".7"/>
    <!-- 翘檐两端 -->
    <path d="M 10,32 Q 4,30 6,26" stroke="${C.shrine[1]}" stroke-width="2" fill="none" stroke-linecap="round"/>
    <path d="M 90,32 Q 96,30 94,26" stroke="${C.shrine[1]}" stroke-width="2" fill="none" stroke-linecap="round"/>
    <!-- 屋脊小猫（守护神兽） -->
    <circle cx="50" cy="14" r="2.2" fill="${C.gold[0]}" stroke="${C.gold[2]}" stroke-width=".8"/>
    <path d="M 48.5,12 L 47.5,10 L 49.5,11 Z" fill="${C.gold[1]}"/>
    <path d="M 51.5,12 L 52.5,10 L 50.5,11 Z" fill="${C.gold[1]}"/>
    <!-- 牌匾「猫神」 -->
    <rect x="36" y="42" width="28" height="6" rx="1" fill="${C.gold[1]}" stroke="${C.shrine[1]}" stroke-width=".8"/>
    <text x="50" y="46.6" font-size="4.4" font-weight="800" fill="${C.shrine[1]}" text-anchor="middle">猫神</text>
    <!-- 红灯笼（左右） -->
    <ellipse cx="18" cy="50" rx="3.4" ry="4.2" fill="${C.shrine[0]}" stroke="${C.shrine[1]}" stroke-width="1"/>
    <ellipse cx="82" cy="50" rx="3.4" ry="4.2" fill="${C.shrine[0]}" stroke="${C.shrine[1]}" stroke-width="1"/>
    <path d="M 18,46 L 18,42" stroke="${C.shrine[1]}" stroke-width=".8"/>
    <path d="M 82,46 L 82,42" stroke="${C.shrine[1]}" stroke-width=".8"/>
    <!-- 金光（神圣感） -->
    <g opacity=".55">
      <path d="M 50,12 L 50,4" stroke="${C.gold[0]}" stroke-width="1.4" stroke-linecap="round"/>
      <path d="M 50,12 L 42,6" stroke="${C.gold[0]}" stroke-width="1" stroke-linecap="round"/>
      <path d="M 50,12 L 58,6" stroke="${C.gold[0]}" stroke-width="1" stroke-linecap="round"/>
    </g>
  `);

  // 二维表（row -> col -> svg）
  return [
    [fossil1, fossil2, fossil3, fossil4, fossil5, fossil6, fossil7],
    [relic1,  relic2,  relic3,  relic4,  relic5,  relic6,  relic7 ],
    [cat1,    cat2,    cat3,    cat4,    cat5,    cat6,    cat7   ],
  ];
})();

// 把 SVG 字符串转成 dataURL（urlencode，不用 base64 体积更小）
const ICON_URLS = ICON_SVGS.map(row => row.map(svg => {
  // encodeURIComponent 会处理 # 等特殊字符；保留空格让 SVG 可读
  return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg)
    .replace(/'/g, '%27').replace(/"/g, '%22');
}));

// 与原签名 100% 兼容：返回完整 background 串，含居中显示
function sprite(row, col){
  const url = (ICON_URLS[row] && ICON_URLS[row][col]) || '';
  return `background-image:url("${url}");background-size:contain;background-repeat:no-repeat;background-position:center`;
}

// =========================================================
// 4 个产出器（猫窝/矿堆/古遗址/神秘宝箱）SVG · 圆形画布 100x100
// 不再用 emoji + 文字背景，整张画进 SVG 里，饱满干净
// =========================================================
const PRODUCER_SVGS = (() => {
  const wrap = (inner, bg) =>
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">` +
      `<defs><clipPath id="cc"><circle cx="50" cy="50" r="48"/></clipPath></defs>` +
      `<circle cx="50" cy="50" r="48" fill="${bg}" stroke="#A88848" stroke-width="2"/>` +
      `<g clip-path="url(#cc)">${inner}</g>` +
    `</svg>`;

  // 猫窝：藤编圆篮 + 一只蜷缩睡着的小布偶猫（侧脸+尾巴包住身体）
  const P_cat = wrap(`
    <ellipse cx="50" cy="93" rx="38" ry="3" fill="rgba(0,0,0,.2)"/>
    <!-- 篮子主体（半圆碗形） -->
    <path d="M 12,56 Q 12,90 50,92 Q 88,90 88,56 Z"
      fill="#C9A878" stroke="#5C4020" stroke-width="2.2" stroke-linejoin="round"/>
    <!-- 藤编横纹 -->
    <g stroke="#5C4020" stroke-width="1.2" fill="none" opacity=".5">
      <path d="M 14,64 Q 50,72 86,64"/>
      <path d="M 16,72 Q 50,80 84,72"/>
      <path d="M 20,80 Q 50,86 80,80"/>
    </g>
    <!-- 藤编竖纹 -->
    <g stroke="#5C4020" stroke-width="1" fill="none" opacity=".4">
      <path d="M 26,58 L 30,90 M 38,57 L 40,91 M 50,56 L 50,92 M 62,57 L 60,91 M 74,58 L 70,90"/>
    </g>
    <!-- 篮口边缘软垫（米色） -->
    <ellipse cx="50" cy="56" rx="38" ry="6" fill="#E8C99A" stroke="#5C4020" stroke-width="1.8"/>
    <!-- 小猫蜷缩团（三花色身体橘+白） -->
    <!-- 身体：椭圆躺卧 -->
    <ellipse cx="50" cy="50" rx="28" ry="13" fill="#F4D5A8" stroke="#5C4020" stroke-width="1.8"/>
    <!-- 身体橘色斑（背部） -->
    <path d="M 30,44 Q 35,38 50,40 Q 65,38 70,44 Q 60,46 50,46 Q 40,46 30,44 Z"
      fill="#D89058" opacity=".85"/>
    <!-- 尾巴绕身前 -->
    <path d="M 22,52 Q 18,48 22,44 Q 28,42 32,48"
      fill="none" stroke="#5C4020" stroke-width="1.6" stroke-linecap="round"/>
    <path d="M 22,52 Q 18,48 22,44 Q 28,42 32,48 L 30,52 Q 24,55 22,52 Z"
      fill="#D89058" opacity=".85"/>
    <!-- 头侧脸（向右） -->
    <ellipse cx="62" cy="42" rx="14" ry="12" fill="#FBF4E8" stroke="#5C4020" stroke-width="1.8"/>
    <!-- 耳朵（一对小三角，横向斜） -->
    <path d="M 52,33 L 48,24 L 56,30 Z" fill="#F4D5A8" stroke="#5C4020" stroke-width="1.4" stroke-linejoin="round"/>
    <path d="M 70,32 L 76,23 L 72,32 Z" fill="#F4D5A8" stroke="#5C4020" stroke-width="1.4" stroke-linejoin="round"/>
    <!-- 头顶橘斑 -->
    <path d="M 52,34 Q 60,30 70,33 Q 66,38 60,38 Q 54,38 52,34 Z" fill="#D89058" opacity=".7"/>
    <!-- 闭眼（睡觉，弧线） -->
    <path d="M 56,42 Q 58,40 60,42" stroke="#2A1F14" stroke-width="1.4" fill="none" stroke-linecap="round"/>
    <path d="M 66,42 Q 68,40 70,42" stroke="#2A1F14" stroke-width="1.4" fill="none" stroke-linecap="round"/>
    <!-- 鼻+嘴（小巧） -->
    <path d="M 62,46 L 64,46 L 63,47.5 Z" fill="#F0A8AE"/>
    <path d="M 63,47.5 Q 61,49 60,48 M 63,47.5 Q 65,49 66,48"
      stroke="#5C4020" stroke-width=".8" fill="none"/>
    <!-- ZZZ 飘上方 -->
    <text x="78" y="22" font-size="11" font-weight="700" fill="#5C4020" opacity=".6">z</text>
    <text x="84" y="16" font-size="9" font-weight="700" fill="#5C4020" opacity=".4">z</text>
  `, '#FEF3E2');

  // 矿堆：3 块叠石 + 小铁镐 + 闪光（清爽，不要中央"脸"）
  const P_fossil = wrap(`
    <ellipse cx="50" cy="92" rx="38" ry="3" fill="rgba(0,0,0,.2)"/>
    <!-- 后排大石（多边形，棱角分明） -->
    <path d="M 22,82 L 18,60 L 28,42 L 50,36 L 70,42 L 80,58 L 78,82 Z"
      fill="#A88860" stroke="#3D2818" stroke-width="2.2" stroke-linejoin="round"/>
    <!-- 大石高光面 -->
    <path d="M 22,82 L 18,60 L 28,42 L 38,46 L 36,82 Z"
      fill="#C9A878" opacity=".55"/>
    <!-- 大石暗面 -->
    <path d="M 70,42 L 80,58 L 78,82 L 64,82 L 66,46 Z"
      fill="#7A5C3E" opacity=".55"/>
    <!-- 中石（左前） -->
    <path d="M 14,86 L 12,72 L 22,66 L 36,70 L 38,86 Z"
      fill="#9A7E5E" stroke="#3D2818" stroke-width="1.8" stroke-linejoin="round"/>
    <!-- 中石高光 -->
    <path d="M 14,86 L 12,72 L 22,66 L 24,86 Z" fill="#B8966E" opacity=".55"/>
    <!-- 小石（右前） -->
    <path d="M 62,86 L 60,76 L 70,72 L 84,76 L 84,86 Z"
      fill="#8B6F4E" stroke="#3D2818" stroke-width="1.6" stroke-linejoin="round"/>
    <path d="M 62,86 L 60,76 L 70,72 L 70,86 Z" fill="#A88860" opacity=".5"/>
    <!-- 小铁镐（斜插在大石顶上） -->
    <!-- 木柄 -->
    <path d="M 38,30 L 64,18" stroke="#5C2510" stroke-width="3.2" stroke-linecap="round"/>
    <path d="M 38,30 L 64,18" stroke="#8B4020" stroke-width="1.6" stroke-linecap="round" opacity=".7"/>
    <!-- 镐头（金属银） -->
    <path d="M 30,20 L 44,32 L 38,38 L 24,28 Z"
      fill="#C0C8D0" stroke="#3D2818" stroke-width="1.4" stroke-linejoin="round"/>
    <path d="M 32,22 L 36,26" stroke="#FFFFFF" stroke-width="1" opacity=".7"/>
    <!-- 闪光晶体（嵌在大石上） -->
    <path d="M 50,52 L 54,58 L 50,66 L 46,58 Z"
      fill="#FFE3A3" stroke="#A88848" stroke-width="1.2" stroke-linejoin="round"/>
    <path d="M 50,52 L 54,58 L 50,60 Z" fill="#FFFBEF" opacity=".8"/>
    <!-- 小亮点（×3） -->
    <g fill="#FFFBEF">
      <path d="M 70,52 L 71,55 L 74,56 L 71,57 L 70,60 L 69,57 L 66,56 L 69,55 Z"/>
      <circle cx="32" cy="58" r="1.2" opacity=".8"/>
      <circle cx="58" cy="74" r="1" opacity=".7"/>
    </g>
  `, '#F0E0C8');

  // 古遗址：神庙立柱 + 山形顶
  const P_relic = wrap(`
    <ellipse cx="50" cy="92" rx="36" ry="3" fill="rgba(0,0,0,.18)"/>
    <!-- 远山 -->
    <path d="M 6,62 L 22,46 L 36,58 L 50,42 L 64,54 L 80,40 L 94,58 L 94,90 L 6,90 Z"
      fill="#C9D8E0" stroke="#5A8078" stroke-width="1.4" opacity=".55"/>
    <!-- 神庙基座 -->
    <rect x="14" y="78" width="72" height="6" fill="#E8DDC4" stroke="#5C4020" stroke-width="1.6"/>
    <rect x="10" y="82" width="80" height="4" fill="#D4C49E" stroke="#5C4020" stroke-width="1.6"/>
    <!-- 三角山形顶（pediment） -->
    <path d="M 16,40 L 50,18 L 84,40 Z" fill="#F4E8D0" stroke="#5C4020" stroke-width="2" stroke-linejoin="round"/>
    <!-- 顶部装饰横带 -->
    <rect x="14" y="40" width="72" height="6" fill="#E8DDC4" stroke="#5C4020" stroke-width="1.6"/>
    <!-- 山形浮雕：太阳/三角 -->
    <circle cx="50" cy="32" r="3.4" fill="#D4A574" stroke="#5C4020" stroke-width="1"/>
    <path d="M 38,38 L 42,32 L 46,38 Z M 54,38 L 58,32 L 62,38 Z" fill="#A88848" opacity=".7"/>
    <!-- 4 根立柱 -->
    <g fill="#FBF4E8" stroke="#5C4020" stroke-width="1.6">
      <rect x="20" y="48" width="10" height="30"/>
      <rect x="36" y="48" width="10" height="30"/>
      <rect x="54" y="48" width="10" height="30"/>
      <rect x="70" y="48" width="10" height="30"/>
    </g>
    <!-- 立柱凹槽（竖纹） -->
    <g stroke="#A88848" stroke-width=".8" opacity=".7">
      <path d="M 23,50 L 23,76 M 27,50 L 27,76"/>
      <path d="M 39,50 L 39,76 M 43,50 L 43,76"/>
      <path d="M 57,50 L 57,76 M 61,50 L 61,76"/>
      <path d="M 73,50 L 73,76 M 77,50 L 77,76"/>
    </g>
    <!-- 立柱柱头横线 -->
    <path d="M 18,48 L 32,48 M 34,48 L 48,48 M 52,48 L 66,48 M 68,48 L 82,48"
      stroke="#5C4020" stroke-width="2" fill="none"/>
    <!-- 藤蔓装饰（残破感） -->
    <path d="M 22,60 Q 18,66 24,72" stroke="#5A9078" stroke-width="1.6" fill="none"/>
    <ellipse cx="20" cy="68" rx="2" ry="1.4" fill="#5A9078" transform="rotate(-30 20 68)"/>
    <path d="M 80,52 Q 86,58 82,66" stroke="#5A9078" stroke-width="1.6" fill="none"/>
    <ellipse cx="84" cy="60" rx="2" ry="1.4" fill="#5A9078" transform="rotate(30 84 60)"/>
  `, '#E8E4D0');

  // 神秘宝箱：木质宝箱 + 金锁 + 红绸 + 闪光
  const P_box = wrap(`
    <ellipse cx="50" cy="92" rx="36" ry="3" fill="rgba(0,0,0,.18)"/>
    <!-- 闪光（背景） -->
    <g opacity=".55">
      <path d="M 50,12 L 52,22 L 62,24 L 52,26 L 50,36 L 48,26 L 38,24 L 48,22 Z" fill="#FFE3A3"/>
      <path d="M 18,30 L 19,34 L 23,35 L 19,36 L 18,40 L 17,36 L 13,35 L 17,34 Z" fill="#FFE3A3"/>
      <path d="M 82,32 L 83,36 L 87,37 L 83,38 L 82,42 L 81,38 L 77,37 L 81,36 Z" fill="#FFE3A3"/>
    </g>
    <!-- 宝箱箱体 -->
    <rect x="14" y="50" width="72" height="36" rx="3" fill="#A85020" stroke="#5C2510" stroke-width="2"/>
    <!-- 木板纹理 -->
    <path d="M 14,62 L 86,62 M 14,74 L 86,74" stroke="#5C2510" stroke-width="1.4" opacity=".55"/>
    <path d="M 30,50 L 30,86 M 50,50 L 50,86 M 70,50 L 70,86" stroke="#5C2510" stroke-width=".9" opacity=".4"/>
    <!-- 箱盖（弧顶） -->
    <path d="M 14,50 Q 14,28 50,28 Q 86,28 86,50 Z"
      fill="#C25C28" stroke="#5C2510" stroke-width="2" stroke-linejoin="round"/>
    <!-- 箱盖纹 -->
    <path d="M 18,42 Q 50,30 82,42" stroke="#5C2510" stroke-width="1.4" fill="none" opacity=".6"/>
    <!-- 金属包边 -->
    <rect x="14" y="48" width="72" height="4" fill="#D4A574" stroke="#5C2510" stroke-width="1.2"/>
    <!-- 金属角钉 -->
    <circle cx="20" cy="56" r="2" fill="#D4A574" stroke="#5C2510" stroke-width=".8"/>
    <circle cx="80" cy="56" r="2" fill="#D4A574" stroke="#5C2510" stroke-width=".8"/>
    <circle cx="20" cy="82" r="2" fill="#D4A574" stroke="#5C2510" stroke-width=".8"/>
    <circle cx="80" cy="82" r="2" fill="#D4A574" stroke="#5C2510" stroke-width=".8"/>
    <!-- 金锁底盘 -->
    <rect x="40" y="52" width="20" height="20" rx="2" fill="#FFE3A3" stroke="#8A6332" stroke-width="1.4"/>
    <!-- 锁孔 -->
    <circle cx="50" cy="60" r="2.6" fill="#5C2510"/>
    <rect x="49" y="62" width="2" height="6" fill="#5C2510"/>
    <!-- 红绸蝴蝶结 -->
    <path d="M 50,28 L 50,50" stroke="#D72020" stroke-width="4" stroke-linecap="round"/>
    <path d="M 38,32 Q 30,28 32,38 Q 38,42 50,36 Q 62,42 68,38 Q 70,28 62,32 Q 56,34 50,34 Q 44,34 38,32 Z"
      fill="#D72020" stroke="#8A1010" stroke-width="1.4" stroke-linejoin="round"/>
    <circle cx="50" cy="34" r="2.5" fill="#FFE3A3" stroke="#8A1010" stroke-width="1"/>
    <!-- 高光 -->
    <path d="M 18,38 Q 16,46 18,52" stroke="#FFE3A3" stroke-width="2" fill="none" opacity=".6" stroke-linecap="round"/>
  `, '#FCEACB');

  return { P_cat, P_fossil, P_relic, P_box };
})();

const PRODUCER_URLS = Object.fromEntries(
  Object.entries(PRODUCER_SVGS).map(([k, svg]) => [
    k,
    'data:image/svg+xml;utf8,' + encodeURIComponent(svg).replace(/'/g, '%27').replace(/"/g, '%22')
  ])
);

function producerSprite(id){
  const url = PRODUCER_URLS[id] || '';
  return `background-image:url("${url}");background-size:contain;background-repeat:no-repeat;background-position:center`;
}

// 卡通布偶猫·SVG 模板（参考：棕白布偶猫，蓬松毛边大眼颜文字嘴）
// state: walk / idle / sit / lay / cheer  · 通过类切换动画，SVG 结构相同
function kittySVG(palette){
  // palette 可选：覆盖默认布偶色（用于金猫像/订单多色客人）
  const p = Object.assign({
    brown:    '#C9A88E',  // 棕色块（头顶/背/尾巴段）
    brownDk:  '#8B6F4E',  // 深棕勾边/阴影
    white:    '#FBF4E8',  // 白色（脸/胸/腹/腿外侧）
    whiteSh:  '#E8DDC9',  // 白色阴影
    eye:      '#2A1F14',  // 黑眼
    eyeHl:    '#FFFFFF',  // 眼高光
    pink:     '#F0A8AE',  // 粉鼻/耳内
    line:     '#5C4632',  // 线稿色（嘴/胡子）
  }, palette || {});
  // 蓬松不规则边缘用 path 锯齿曲线模拟毛边
  return `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <!-- 地面阴影 -->
    <ellipse cx="50" cy="94" rx="26" ry="3" fill="rgba(0,0,0,.18)"/>

    <!-- 尾巴（最底层，从身体右下伸出，向上翘起，毛茸茸分段） -->
    <g class="k-tail">
      <!-- 尾巴主体：白底 + 棕色斑块 -->
      <path d="M 70,76 Q 84,68 88,52 Q 90,40 84,32 Q 82,28 78,30 Q 76,34 79,40 Q 82,48 78,56 Q 74,64 64,72 Z"
            fill="${p.white}" stroke="${p.brownDk}" stroke-width="1.4" stroke-linejoin="round"/>
      <!-- 尾巴棕色段 -->
      <path d="M 78,32 Q 82,28 84,32 Q 87,38 85,46 Q 83,52 78,56 Q 75,52 77,44 Q 79,38 78,32 Z"
            fill="${p.brown}" stroke="${p.brownDk}" stroke-width="1" stroke-linejoin="round"/>
    </g>

    <!-- 身体组：所有动作时整体起伏 -->
    <g class="k-body-group">

      <!-- 后腿（走路时显示） -->
      <g class="k-walking">
        <ellipse class="k-backleg-l" cx="34" cy="82" rx="6" ry="9" fill="${p.white}" stroke="${p.brownDk}" stroke-width="1.3"/>
        <ellipse class="k-backleg-r" cx="60" cy="82" rx="6" ry="9" fill="${p.white}" stroke="${p.brownDk}" stroke-width="1.3"/>
      </g>

      <!-- 身体（蓬松椭圆，白底，毛边用不规则曲线） -->
      <path class="k-body" d="
        M 26,72
        Q 22,60 24,50
        Q 20,45 23,38
        Q 21,30 28,28
        Q 32,22 42,24
        Q 50,18 60,24
        Q 70,22 74,28
        Q 80,30 79,38
        Q 82,46 78,52
        Q 80,62 76,72
        Q 78,82 70,86
        Q 60,90 50,88
        Q 40,90 30,86
        Q 24,82 26,72 Z"
        fill="${p.white}" stroke="${p.brownDk}" stroke-width="1.6" stroke-linejoin="round"/>

      <!-- 背部棕色斑块（贴合身体上半部分） -->
      <path d="
        M 30,32
        Q 36,22 48,24
        Q 60,22 70,32
        Q 76,40 74,48
        Q 70,42 64,42
        Q 56,40 50,42
        Q 42,40 36,44
        Q 30,42 28,40
        Q 28,36 30,32 Z"
        fill="${p.brown}" stroke="${p.brownDk}" stroke-width="1.2" stroke-linejoin="round" opacity=".95"/>

      <!-- 前腿（坐姿/idle 时的两个小肉垫，垂直收拢） -->
      <g class="k-sitting">
        <ellipse class="k-frontleg-l" cx="40" cy="80" rx="5.5" ry="8" fill="${p.white}" stroke="${p.brownDk}" stroke-width="1.3"/>
        <ellipse class="k-frontleg-r" cx="56" cy="80" rx="5.5" ry="8" fill="${p.white}" stroke="${p.brownDk}" stroke-width="1.3"/>
        <!-- 肉垫粉点 -->
        <circle cx="40" cy="84" r="1.4" fill="${p.pink}"/>
        <circle cx="56" cy="84" r="1.4" fill="${p.pink}"/>
      </g>

      <!-- 走路前腿（替代坐姿前腿） -->
      <g class="k-walking">
        <ellipse class="k-frontleg-l" cx="40" cy="78" rx="5" ry="9" fill="${p.white}" stroke="${p.brownDk}" stroke-width="1.3"/>
        <ellipse class="k-frontleg-r" cx="56" cy="78" rx="5" ry="9" fill="${p.white}" stroke="${p.brownDk}" stroke-width="1.3"/>
      </g>

      <!-- 头（在身体上方，圆+蓬松毛边） -->
      <g class="k-head">
        <!-- 耳朵外（棕色，三角带毛边） -->
        <path d="M 26,28 Q 24,16 30,12 Q 34,18 36,28 Q 32,30 26,28 Z"
              fill="${p.brown}" stroke="${p.brownDk}" stroke-width="1.4" stroke-linejoin="round"/>
        <path d="M 74,28 Q 76,16 70,12 Q 66,18 64,28 Q 68,30 74,28 Z"
              fill="${p.brown}" stroke="${p.brownDk}" stroke-width="1.4" stroke-linejoin="round"/>
        <!-- 耳朵内（粉色） -->
        <path d="M 28,24 Q 28,18 31,16 Q 33,20 33,26 Z" fill="${p.pink}"/>
        <path d="M 72,24 Q 72,18 69,16 Q 67,20 67,26 Z" fill="${p.pink}"/>

        <!-- 头顶蓬松（白脸 + 棕色"帽子"） -->
        <path d="
          M 22,40
          Q 18,30 24,22
          Q 30,16 38,18
          Q 44,14 50,16
          Q 56,14 62,18
          Q 70,16 76,22
          Q 82,30 78,40
          Q 82,48 76,54
          Q 72,60 64,62
          Q 56,64 50,62
          Q 44,64 36,62
          Q 28,60 24,54
          Q 18,48 22,40 Z"
          fill="${p.white}" stroke="${p.brownDk}" stroke-width="1.6" stroke-linejoin="round"/>
        <!-- 头顶棕色斑（帽子状） -->
        <path d="
          M 28,30
          Q 26,22 32,18
          Q 38,16 44,20
          Q 50,16 56,20
          Q 62,16 68,18
          Q 74,22 72,30
          Q 70,36 64,36
          Q 56,32 50,34
          Q 44,32 36,36
          Q 30,36 28,30 Z"
          fill="${p.brown}" stroke="${p.brownDk}" stroke-width="1.2" stroke-linejoin="round" opacity=".95"/>

        <!-- 眼睛（大圆 + 高光） -->
        <ellipse class="k-eye" cx="38" cy="44" rx="3.6" ry="4.4" fill="${p.eye}"/>
        <ellipse class="k-eye" cx="62" cy="44" rx="3.6" ry="4.4" fill="${p.eye}"/>
        <!-- 眼高光（两个：上大下小） -->
        <circle cx="39.5" cy="42" r="1.3" fill="${p.eyeHl}"/>
        <circle cx="63.5" cy="42" r="1.3" fill="${p.eyeHl}"/>
        <circle cx="37" cy="45.5" r=".7" fill="${p.eyeHl}"/>
        <circle cx="61" cy="45.5" r=".7" fill="${p.eyeHl}"/>

        <!-- 鼻子（粉色小三角） -->
        <path d="M 50,52 L 47,55 L 53,55 Z" fill="${p.pink}" stroke="${p.line}" stroke-width=".8" stroke-linejoin="round"/>

        <!-- 嘴（颜文字 ω 风格） -->
        <path d="M 50,55 L 50,57.5" stroke="${p.line}" stroke-width="1" stroke-linecap="round"/>
        <path d="M 50,57.5 Q 47,60 44,58" stroke="${p.line}" stroke-width="1.1" stroke-linecap="round" fill="none"/>
        <path d="M 50,57.5 Q 53,60 56,58" stroke="${p.line}" stroke-width="1.1" stroke-linecap="round" fill="none"/>

        <!-- 胡须（左右各 3 根） -->
        <path d="M 30,52 L 20,50" stroke="${p.line}" stroke-width=".7" stroke-linecap="round"/>
        <path d="M 30,54 L 19,55" stroke="${p.line}" stroke-width=".7" stroke-linecap="round"/>
        <path d="M 30,56 L 20,59" stroke="${p.line}" stroke-width=".7" stroke-linecap="round"/>
        <path d="M 70,52 L 80,50" stroke="${p.line}" stroke-width=".7" stroke-linecap="round"/>
        <path d="M 70,54 L 81,55" stroke="${p.line}" stroke-width=".7" stroke-linecap="round"/>
        <path d="M 70,56 L 80,59" stroke="${p.line}" stroke-width=".7" stroke-linecap="round"/>
      </g>

    </g>
  </svg>`;
}

// CSS 卡通猫·HTML 模板（用于产出器、订单、L5 金猫像等）
function kittyHTML(stateClass, sizeVar, paletteOrCSSVars){
  const styleAttr = `--size:${sizeVar||'36px'}`;
  // 兼容旧调用：传入是 CSS 变量字符串（订单的彩色客人/金猫像），转成 palette 对象
  let palette = null;
  if (paletteOrCSSVars && typeof paletteOrCSSVars === 'object'){
    palette = paletteOrCSSVars;
  }
  return `<div class="kitty ${stateClass||'sit'} face-r" style="${styleAttr}">${kittySVG(palette)}</div>`;
}

// 物品定义
const ITEMS = {};
function defChain(prefix, row, names){
  names.forEach((name, i) => {
    const id = `${prefix}${i+1}`;
    ITEMS[id] = { id, name, lv: i+1, chain: prefix, row, col: i, next: i < names.length - 1 ? `${prefix}${i+2}` : null };
  });
}
defChain('fossil', 0, ['碎骨','骨片','化石蛋','三叶虫','恐龙化石','猛犸象牙','始祖鸟全骨架']);
defChain('relic',  1, ['陶片','残碗','青瓷碗','青铜爵','玉如意','唐三彩骆驼','传国玉玺']);
defChain('cat',    2, ['猫爪印','小鱼干','逗猫棒','毛线雕像','金猫像','白玉招财猫','猫神祠']);

// 产出器
// 节奏：补货前点完即出（cooldown:0），用完 cap=20 个后进入 refillMs=10s 的补货期
const PRODUCERS = {
  P_cat:    { id:'P_cat',    name:'猫窝',     emoji:'🐾', cooldown:0, cap:20, refillMs:10000, product:'cat1' },
  P_fossil: { id:'P_fossil', name:'矿堆',     emoji:'🪨', cooldown:0, cap:20, refillMs:10000, product:'fossil1' },
  P_relic:  { id:'P_relic',  name:'古遗址',   emoji:'🏛️', cooldown:0, cap:20, refillMs:10000, product:'relic1' },
  P_box:    { id:'P_box',    name:'神秘宝箱', emoji:'🎁', cooldown:7*60*1000+45*1000, cap:1, refillMs:0, product:'__random_L3', oneShot:true },
};

let state = {
  gold: 50, plan: 0, mlv: 1, mexp: 0,  // mexp: 馆长经验（用于动画进度条）
  energy: 60,  // 启动时由 init 重算 = getEnergyMax()
  lastEnergyTs: Date.now(),
  board: [],
  orders: [],
  exhibits: { cat:[null,null,null,null,null,null], fossil:[null,null,null,null,null,null], relic:[null,null,null,null,null,null] },
  unlocked: { cat:true, fossil:false, relic:false },
  currentHall: 'cat',
  panelCollapsed: false,
  tutorial: { step: 0, done: true }, // 开局即开放所有功能（含委托卡）
  stats: { tapCount: 0, mergeCount: 0, orderDone: 0 },
  // === 经营玩法新字段 ===
  // 每个馆已购买的展柜数（默认 6，最多扩到 12）
  slotsUnlocked: { cat: 6, fossil: 6, relic: 6 },
  // 每个馆已购买的装饰（key 列表）
  decor: { cat: [], fossil: [], relic: [] },
  // 棋盘扩容档位 0/1/2 → 5×6 / 5×7 / 5×8
  boardTier: 0,
  // 能量上限档位 0/1/2 → 60 / 80 / 100
  energyTier: 0,
  // 限时商店
  shop: { day: '', items: [], boughtIdx: [] },
  // === 委托系统（关卡主线）===
  // commissionSlots: 已解锁的委托槽数（默认 1，可扩到 3）
  // commissions: 当前在场的委托卡数组，长度 ≤ commissionSlots
  commissionSlots: 1,
  commissions: [],
  commissionTotalDone: 0,  // 历史完成数（用于触发剧情/成就）
};

const HALLS = {
  cat:    { name:'猫咪馆', chain:'cat',    unlockLv:1,  unlockGold:0,    pool:['cat3','cat4','cat5','cat6','cat7'] },
  fossil: { name:'自然馆', chain:'fossil', unlockLv:5,  unlockGold:2000, pool:['fossil3','fossil4','fossil5','fossil6','fossil7'] },
  relic:  { name:'古董馆', chain:'relic',  unlockLv:12, unlockGold:8000, pool:['relic3','relic4','relic5','relic6','relic7'] },
};

const EXHIBIT_COST = { 3:{gold:100,plan:1}, 4:{gold:300,plan:1}, 5:{gold:800,plan:2}, 6:{gold:2000,plan:4}, 7:{gold:6000,plan:10} };
const EXHIBIT_REWARD_GOLD_PER_MIN = { 3:2, 4:6, 5:15, 6:40, 7:120 };
const EXP_PER_LEVEL = 80;  // 每级所需经验

// === 展柜扩容价格阶梯（第 7 ~ 12 个柜子）===
const SLOT_EXPAND_COST = [300, 800];
const SLOT_MAX = 8;

// === 棋盘扩容档位（5×6 → 5×7 → 5×8） ===
const BOARD_TIERS = [
  { rows: 6, cost: 0 },
  { rows: 7, cost: 1500 },
  { rows: 8, cost: 3000 },
];

// === 能量上限档位 ===
const ENERGY_TIERS = [
  { max: 60,  cost: 0 },
  { max: 80,  cost: 800 },
  { max: 100, cost: 2000 },
];

// === 装饰系统：每馆 4 件，每件 +5% 金币产出 ===
// recipe = 委托配方（小猫委托想要这种装饰时，需要合成的素材）
// cost   = 兜底金币购买价（建议优先走委托）
const DECOR = {
  cat: [
    { id:'cat_rug',    name:'毛绒地毯',   emoji:'🟧', cost: 400,   buff: 0.05, recipe:[{id:'cat2',count:3}],                      hint:'小鱼干 ×3' },
    { id:'cat_lamp',   name:'壁挂吊灯',   emoji:'💡', cost: 1000,  buff: 0.05, recipe:[{id:'cat3',count:2}],                      hint:'逗猫棒 ×2' },
    { id:'cat_plant',  name:'盆栽绿植',   emoji:'🪴', cost: 1800,  buff: 0.05, recipe:[{id:'cat3',count:1},{id:'cat4',count:1}],  hint:'逗猫棒+毛线雕像' },
    { id:'cat_statue', name:'招财猫像',   emoji:'🐱', cost: 3000,  buff: 0.05, recipe:[{id:'cat5',count:1}],                      hint:'金猫像 ×1' },
    { id:'cat_jadebed',name:'白玉猫榻',   emoji:'🛏️', cost: 9000,  buff: 0.08, recipe:[{id:'cat6',count:1},{id:'cat4',count:2}],  hint:'白玉招财猫 ×1 + 毛线雕像 ×2' },
    { id:'cat_shrine', name:'金顶神龛',   emoji:'⛩️', cost: 24000, buff: 0.12, recipe:[{id:'cat7',count:1}],                      hint:'猫神祠 ×1（终极）' },
  ],
  fossil: [
    { id:'fos_moss',   name:'青苔石阶',   emoji:'🪨', cost: 600,   buff: 0.05, recipe:[{id:'fossil2',count:3}],                       hint:'骨片 ×3' },
    { id:'fos_torch',  name:'树皮壁灯',   emoji:'🔥', cost: 1200,  buff: 0.05, recipe:[{id:'fossil3',count:2}],                       hint:'化石蛋 ×2' },
    { id:'fos_tree',   name:'盆景古树',   emoji:'🌲', cost: 2200,  buff: 0.05, recipe:[{id:'fossil3',count:1},{id:'fossil4',count:1}],hint:'化石蛋+三叶虫' },
    { id:'fos_skull',  name:'恐龙头骨',   emoji:'🦖', cost: 3600,  buff: 0.05, recipe:[{id:'fossil5',count:1}],                       hint:'恐龙化石 ×1' },
    { id:'fos_ivory',  name:'象牙拱门',   emoji:'🏛️', cost: 12000, buff: 0.08, recipe:[{id:'fossil6',count:1},{id:'fossil4',count:2}],hint:'猛犸象牙 ×1 + 三叶虫 ×2' },
    { id:'fos_aviary', name:'始祖鸟展翼厅',emoji:'🦅', cost: 30000, buff: 0.12, recipe:[{id:'fossil7',count:1}],                       hint:'始祖鸟全骨架 ×1（终极）' },
  ],
  relic: [
    { id:'rel_carpet', name:'波斯地毯',   emoji:'🧶', cost: 800,   buff: 0.05, recipe:[{id:'relic2',count:3}],                       hint:'残碗 ×3' },
    { id:'rel_lantern',name:'宫灯一对',   emoji:'🏮', cost: 1600,  buff: 0.05, recipe:[{id:'relic3',count:2}],                       hint:'青瓷碗 ×2' },
    { id:'rel_vase',   name:'青花大瓷',   emoji:'🏺', cost: 2800,  buff: 0.05, recipe:[{id:'relic3',count:1},{id:'relic4',count:1}], hint:'青瓷碗+青铜爵' },
    { id:'rel_lion',   name:'守门石狮',   emoji:'🦁', cost: 4400,  buff: 0.05, recipe:[{id:'relic5',count:1}],                       hint:'玉如意 ×1' },
    { id:'rel_camelpath',name:'三彩驼铃道',emoji:'🐫', cost: 15000, buff: 0.08, recipe:[{id:'relic6',count:1},{id:'relic4',count:2}], hint:'唐三彩骆驼 ×1 + 青铜爵 ×2' },
    { id:'rel_throne', name:'玉玺龙台',   emoji:'👑', cost: 36000, buff: 0.12, recipe:[{id:'relic7',count:1}],                       hint:'传国玉玺 ×1（终极）' },
  ],
};

// === 限时商店模板（每天从中抽 3 个）===
const SHOP_POOL = [
  { type:'item',    label:'随机三阶展品', icon:'🎁', cost:500, rarity:'rare' },
  { type:'energy',  label:'能量药水 +20⚡', icon:'⚡', cost:200, value:20 },
  { type:'energy',  label:'能量药水 +50⚡', icon:'🧪', cost:450, value:50 },
  { type:'plan',    label:'图纸 ×3',     icon:'📜', cost:800, value:3 },
  { type:'plan',    label:'图纸 ×1',     icon:'📜', cost:280, value:1 },
  { type:'gold',    label:'金币包 +200', icon:'💰', cost:0,   value:200, free:true }, // 免费每日礼包
  { type:'order_refresh', label:'订单刷新券', icon:'🔄', cost:150 },
];

// ---------- 棋盘初始化 ----------
function initBoard(){
  state.board = Array(CONFIG.BOARD_W * getBoardH()).fill(null);
  place(0, 0, makeItem('P_cat'));
  place(2, 0, makeItem('P_fossil'));
  place(4, 0, makeItem('P_relic'));
  place(2, 5, makeItem('P_box'));
}
function idx(x,y){ return y * CONFIG.BOARD_W + x; }
function place(x,y,item){ state.board[idx(x,y)] = item; }
function makeItem(id){
  if (PRODUCERS[id]) return { id, uses: PRODUCERS[id].cap, cdEnd: 0, isProducer: true };
  return { id, isProducer: false };
}
function findEmpty(){ for (let i = 0; i < state.board.length; i++) if (!state.board[i]) return i; return -1; }

// ---------- 渲染棋盘 ----------
const $board = document.getElementById('board');
function renderBoard(){
  $board.innerHTML = '';
  $board.style.setProperty('--rows', getBoardH());
  const guideTargets = getGuideTargets();
  for (let i = 0; i < state.board.length; i++){
    const cell = document.createElement('div');
    cell.className = 'cell';
    cell.dataset.idx = i;
    if (guideTargets.includes(i)) cell.classList.add('guide-target');
    const it = state.board[i];
    if (it){
      const el = document.createElement('div');
      el.className = 'item' + (it.isProducer ? ' producer' : '');
      el.dataset.idx = i;
      if (it.isProducer){
        const def = PRODUCERS[it.id];
        // 4 个 producer 全部走 SVG 自绘（猫窝/矿堆/古遗址/神秘宝箱）
        el.style.cssText = producerSprite(it.id);
        const ptag = document.createElement('div'); ptag.className='ptag'; ptag.textContent=def.name; el.appendChild(ptag);
        if (it.uses > 0 && it.cdEnd <= Date.now()){
          const u = document.createElement('div'); u.className='uses'; u.textContent=it.uses; el.appendChild(u);
          if ((state.tutorial.step === 1 || state.tutorial.step === 2) && it.id === 'P_cat'){
            const h = document.createElement('div'); h.className='tap-hint'; h.textContent='👆点我'; el.appendChild(h);
          }
        }
        const now = Date.now();
        if (it.uses <= 0 && it.cdEnd > now){
          // 用完后补货倒计时
          el.classList.add('cooling');
          const cd = document.createElement('div'); cd.className='cd';
          cd.textContent = '补货 ' + formatCD(it.cdEnd - now); el.appendChild(cd);
        } else if (it.cdEnd > now){
          // 单次冷却（保留以兼容宝箱等可能有 cooldown 的产出器）
          el.classList.add('cooling');
          const cd = document.createElement('div'); cd.className='cd';
          cd.textContent = formatCD(it.cdEnd - now); el.appendChild(cd);
        }
      } else {
        const def = ITEMS[it.id];
        if (it.id === 'cat5'){
          // 金猫像：金色 CSS 猫坐姿
          el.style.cssText = 'display:flex;align-items:center;justify-content:center;background:radial-gradient(circle,#FFF1CC 30%,transparent 70%);border-radius:50%';
          el.innerHTML = kittyHTML('sit', '42px', { brown:'#D4A574', brownDk:'#8A6332', white:'#FFF1CC', whiteSh:'#E8C99A', pink:'#E8B89A' });
        } else if (it.id === 'cat4'){
          // 毛线雕像：用一只趴着的小猫示意
          el.style.cssText = 'display:flex;align-items:center;justify-content:center;background:radial-gradient(circle,#FCEACB 30%,transparent 70%);border-radius:50%';
          el.innerHTML = kittyHTML('lay', '40px');
        } else {
          el.style.cssText = sprite(def.row, def.col);
        }
        const lv = document.createElement('div'); lv.className='lv'; lv.textContent=['一','二','三','四','五'][def.lv-1]+'阶'; el.appendChild(lv);
        const nt = document.createElement('div'); nt.className='name-tag'; nt.textContent=def.name; el.appendChild(nt);
      }
      bindItemInteractions(el, i);
      cell.appendChild(el);
    }
    $board.appendChild(cell);
  }
}
function formatCD(ms){
  const s = Math.ceil(ms/1000);
  if (s < 60) return s+'秒';
  return Math.floor(s/60)+':'+String(s%60).padStart(2,'0');
}

// ---------- 引导高亮 ----------
function getGuideTargets(){
  if (state.tutorial.done) return [];
  const step = state.tutorial.step;
  if (step === 1 || step === 2){
    for (let i = 0; i < state.board.length; i++){
      if (state.board[i] && state.board[i].id === 'P_cat') return [i];
    }
  }
  if (step === 3){
    const t = [];
    for (let i = 0; i < state.board.length; i++){
      if (state.board[i] && state.board[i].id === 'cat1') t.push(i);
    }
    return t;
  }
  return [];
}

// ---------- 拖拽 + 点击 ----------
let drag = null;
function bindItemInteractions(el, i){
  const it = state.board[i];
  if (it.isProducer){
    el.addEventListener('click', e => {
      e.stopPropagation();
      tryProduce(i);
    });
    return;
  }
  el.addEventListener('pointerdown', e => {
    e.preventDefault();
    drag = { fromIdx: i, el, startX: e.clientX, startY: e.clientY, ghost: null };
    el.classList.add('dragging');
    const def = ITEMS[it.id];
    const ghost = document.createElement('div');
    ghost.style.cssText = `position:fixed;width:54px;height:54px;${sprite(def.row,def.col)};pointer-events:none;z-index:1000;transform:translate(-50%,-50%);left:${e.clientX}px;top:${e.clientY}px;filter:drop-shadow(0 4px 8px rgba(0,0,0,.25))`;
    document.body.appendChild(ghost);
    drag.ghost = ghost;
    el.style.opacity = '0.3';
  });
}
document.addEventListener('pointermove', e => {
  if (!drag) return;
  drag.ghost.style.left = e.clientX+'px';
  drag.ghost.style.top  = e.clientY+'px';
  document.querySelectorAll('.cell.drop-hover').forEach(c=>c.classList.remove('drop-hover'));
  const target = document.elementFromPoint(e.clientX, e.clientY);
  const cell = target ? target.closest('.cell') : null;
  if (cell) cell.classList.add('drop-hover');
});
document.addEventListener('pointerup', e => {
  if (!drag) return;
  const target = document.elementFromPoint(e.clientX, e.clientY);
  const cell = target ? target.closest('.cell') : null;
  if (cell){
    const toIdx = parseInt(cell.dataset.idx);
    handleDrop(drag.fromIdx, toIdx);
  }
  drag.ghost.remove();
  drag = null;
  document.querySelectorAll('.cell.drop-hover').forEach(c=>c.classList.remove('drop-hover'));
  document.querySelectorAll('.item.dragging').forEach(el=>{el.classList.remove('dragging');el.style.opacity=''});
});

function handleDrop(from, to){
  if (from === to) return;
  const a = state.board[from];
  const b = state.board[to];
  if (!a) return;
  if (!b){
    state.board[to] = a;
    state.board[from] = null;
    renderBoard();
    return;
  }
  if (!a.isProducer && !b.isProducer && a.id === b.id){
    const def = ITEMS[a.id];
    if (!def.next){
      toast('已是最高级!');
      renderBoard();
      return;
    }
    const newId = def.next;
    state.board[to] = makeItem(newId);
    state.board[from] = null;
    flashCell(to);
    state.stats.mergeCount++;
    onMerge(newId, to);
    if (state.tutorial.step === 3) advanceTutorial(4);
    renderBoard();
    checkOrders();
    updateGuide();
    return;
  }
  renderBoard();
}

function flashCell(i){
  const cells = $board.querySelectorAll('.cell');
  if (cells[i]) {
    cells[i].classList.add('merge-flash');
    setTimeout(()=>cells[i].classList.remove('merge-flash'), 400);
  }
}

function onMerge(newId, cellIdx){
  const def = ITEMS[newId];
  if (def.lv === 3) { state.gold += 10; toast(`合成「${def.name}」+10 🪙`); }
  else if (def.lv === 4) { state.gold += 30; state.plan += 1; toast(`合成「${def.name}」+30🪙 +1📜`); }
  else if (def.lv === 5) { state.gold += 100; state.plan += 2; toast(`🌟 顶级展品「${def.name}」+100🪙 +2📜`); }
  else if (def.lv === 6) { state.gold += 400; state.plan += 5; toast(`✨ 镇馆级「${def.name}」+400🪙 +5📜`); }
  else if (def.lv === 7) { state.gold += 1500; state.plan += 12; toast(`👑 至尊「${def.name}」+1500🪙 +12📜`); }
  else toast(`合成「${def.name}」`);

  // L3+ 自动飞向博物馆背景中对应展位（视觉上的"展示"反馈）
  if (def.lv >= 3 && cellIdx != null){
    setTimeout(() => flyExhibitToBgSlot(newId, cellIdx), 250);
  }
  updateHUD();
  // 委托卡进度刷新（实时反馈）
  if (typeof renderCommissions === 'function') renderCommissions();
}

// ---------- 产出器 ----------
function tryProduce(i){
  const it = state.board[i];
  if (!it || !it.isProducer) return;
  const now = Date.now();
  if (it.cdEnd > now) {
    toast('冷却中…'); return;
  }
  if (state.energy < CONFIG.PRODUCER_TAP_COST) {
    toast('体力不足，等一下下'); return;
  }
  if (it.uses <= 0){
    if (it.cdEnd <= now){
      const refill = PRODUCERS[it.id].refillMs || 10000;
      it.cdEnd = now + refill;
      setTimeout(() => { it.uses = PRODUCERS[it.id].cap; it.cdEnd = 0; renderBoard(); }, refill);
      toast(`补货中（${Math.round(refill/1000)}秒）`);
      renderBoard();
    }
    return;
  }
  const def = PRODUCERS[it.id];
  const emptyIdx = findEmpty();
  if (emptyIdx < 0){
    toast('棋盘满了，先合成一些吧'); return;
  }
  state.stats.tapCount++;
  if (def.product === '__random_L3'){
    const pool = ['fossil3','relic3','cat3'];
    let placed = 0;
    for (let k=0;k<3;k++){
      const slot = findEmpty();
      if (slot < 0) break;
      state.board[slot] = makeItem(pool[Math.floor(Math.random()*pool.length)]);
      placed++;
    }
    toast(`🎁 宝箱开出 ${placed} 件珍品!`);
  } else {
    state.board[emptyIdx] = makeItem(def.product);
    spawnFloat(i, emptyIdx, def.product);
  }
  it.uses -= 1;
  state.energy -= CONFIG.PRODUCER_TAP_COST;
  it.cdEnd = now + def.cooldown;

  if (state.tutorial.step === 1 && it.id === 'P_cat') advanceTutorial(2);
  else if (state.tutorial.step === 2 && it.id === 'P_cat') advanceTutorial(3);

  renderBoard();
  updateHUD();
  updateGuide();
  if (typeof renderCommissions === 'function') renderCommissions();
}
function spawnFloat(fromIdx, toIdx, productId){
  if (!productId) return;
  const cells = $board.querySelectorAll('.cell');
  if (!cells[fromIdx] || !cells[toIdx]) return;
  const fromRect = cells[fromIdx].getBoundingClientRect();
  const toRect = cells[toIdx].getBoundingClientRect();
  const def = ITEMS[productId];
  const fo = document.createElement('div');
  fo.className = 'float-out';
  fo.style.cssText += sprite(def.row, def.col)+`;left:${fromRect.left + fromRect.width/2 - 18}px;top:${fromRect.top + fromRect.height/2 - 18}px`;
  fo.style.setProperty('--dx', (toRect.left - fromRect.left)+'px');
  fo.style.setProperty('--dy', (toRect.top - fromRect.top)+'px');
  document.body.appendChild(fo);
  setTimeout(()=>fo.remove(), 600);
}

// ---------- 飞向博物馆动画 ----------
function flyExhibitToBgSlot(itemId, fromCellIdx){
  const def = ITEMS[itemId];
  // 找到这个 chain 在背景里的对应小展位
  const slots = document.querySelectorAll('.bg-slot[data-chain="'+def.chain+'"]');
  // 优先选空展位，没有就随机一个
  let target = Array.from(slots).find(s => s.dataset.empty === '1') || slots[0];
  if (!target) return;

  const cells = $board.querySelectorAll('.cell');
  const fromEl = cells[fromCellIdx];
  if (!fromEl) return;
  const fromRect = fromEl.getBoundingClientRect();
  const toRect = target.getBoundingClientRect();

  const fly = document.createElement('div');
  fly.className = 'fly-to-museum start';
  fly.style.cssText += sprite(def.row, def.col);
  fly.style.left = (fromRect.left + fromRect.width/2 - 24) + 'px';
  fly.style.top  = (fromRect.top + fromRect.height/2 - 24) + 'px';
  document.body.appendChild(fly);

  // 拖尾粒子
  let trailCount = 0;
  const trailTimer = setInterval(() => {
    trailCount++;
    const r = fly.getBoundingClientRect();
    const t = document.createElement('div');
    t.className = 'fly-trail';
    t.style.left = (r.left + r.width/2 - 4) + 'px';
    t.style.top = (r.top + r.height/2 - 4) + 'px';
    document.body.appendChild(t);
    setTimeout(()=>t.remove(), 600);
    if (trailCount > 12) clearInterval(trailTimer);
  }, 60);

  // 触发飞行
  requestAnimationFrame(() => {
    fly.classList.remove('start');
    fly.classList.add('fly');
    fly.style.left = (toRect.left + toRect.width/2 - 24) + 'px';
    fly.style.top  = (toRect.top + toRect.height/2 - 24) + 'px';
  });

  // 飞到 → 展位金光
  setTimeout(() => {
    target.classList.add('shine');
    setTimeout(()=>target.classList.remove('shine'), 1200);
    fly.remove();
    clearInterval(trailTimer);
    // 涨经验
    addExp(def.lv * 4);
  }, 900);
}

// =====================================================
// ============ 委托系统（关卡主线）============
// 每只委托猫指定 1 个目标：① 展品（合出指定 lv 的展品 ×1） ② 装饰（合出配方）
// 完成后展品自动入馆 / 装饰自动布置，并给金币+图纸奖励
// =====================================================

// 委托猫的小脸（用于卡片头像）— 5 种花色随机
const COMMISSION_CATS = [
  { name:'三花喵',  fur:'#F4D08C', face:'#FFFFFF' },
  { name:'橘咪',    fur:'#E89C5C', face:'#FBE3C2' },
  { name:'灰团子',  fur:'#9AA0A6', face:'#D4D8DC' },
  { name:'黑炭',    fur:'#3D3530', face:'#86756B' },
  { name:'雪球',    fur:'#FAFAFA', face:'#F4F0E8' },
];

// 委托文案模板（按目标类型/等级分池）
const COMMISSION_LINES = {
  exhibit: [
    '听说馆里要添镇馆宝？我想看看「${n}」！',
    '路过看到广告，「${n}」展品什么时候上架？',
    '我家祖上传下话，「${n}」很值得一看～',
    '能在馆里给我留个「${n}」的位置吗？',
    '咕～想见见传说中的「${n}」。',
  ],
  decor: [
    '馆里要是摆上「${n}」会舒服很多吧？',
    '听说「${n}」配着看展品最有氛围～',
    '想看到「${n}」装点这一馆。',
    '可以帮我布置一件「${n}」吗？',
  ],
};

// 按馆长等级返回可生成的委托池
function getCommissionPool(){
  const pool = [];
  const lv = state.mlv || 1;

  // === 展品委托：根据已解锁的馆和等级范围 ===
  Object.entries(HALLS).forEach(([hk, h]) => {
    if (!state.unlocked[hk]) return;
    // 等级越高，能委托越高阶展品
    let maxLv = 3;
    if (lv >= 4)  maxLv = 4;
    if (lv >= 7)  maxLv = 5;
    if (lv >= 12) maxLv = 6;
    if (lv >= 18) maxLv = 7;
    for (let l = 3; l <= maxLv; l++){
      const id = `${h.chain}${l}`;
      if (!ITEMS[id]) continue;
      // 已经在该馆放满的展品就不再委托
      const inHall = (state.exhibits[hk] || []).filter(e => e === id).length;
      if (inHall >= 4) continue;
      pool.push({ kind:'exhibit', hall:hk, target:id, lv:l });
    }
  });

  // === 装饰委托：根据已解锁的馆 + 还未布置的装饰 ===
  Object.entries(DECOR).forEach(([hk, list]) => {
    if (!state.unlocked[hk]) return;
    list.forEach(d => {
      // 已经布置过的装饰不再出现
      if ((state.decor[hk] || []).includes(d.id)) return;
      // 早期玩家不要直接出顶级装饰
      const need = d.recipe[0];
      const needDef = ITEMS[need.id];
      if (!needDef) return;
      if (lv < 3  && needDef.lv >= 4) return;
      if (lv < 8  && needDef.lv >= 5) return;
      if (lv < 12 && needDef.lv >= 6) return;
      if (lv < 18 && needDef.lv >= 7) return;
      pool.push({ kind:'decor', hall:hk, target:d.id, lv: needDef.lv, recipe: d.recipe });
    });
  });

  return pool;
}

// 创建一个委托（不入栈，仅返回数据）
function makeCommission(){
  const pool = getCommissionPool();
  if (pool.length === 0) return null;
  // 加权抽取：高阶优先 + 展品比装饰更易出现
  // 权重 = 基础权重 × lv 加成
  // 展品基础 = 3，装饰基础 = 1（让"想看 XX 展品"成为主流委托）
  // lv 加成：lv 越高权重越大（lv^1.5），鼓励玩家追高阶
  const weighted = pool.map(p => {
    const base = p.kind === 'exhibit' ? 3 : 1;
    const lvBoost = Math.pow(p.lv, 1.5);
    return { item: p, w: base * lvBoost };
  });
  const totalW = weighted.reduce((s, x) => s + x.w, 0);
  let r = Math.random() * totalW;
  let pick = weighted[0].item;
  for (const x of weighted){
    r -= x.w;
    if (r <= 0){ pick = x.item; break; }
  }
  const cat = COMMISSION_CATS[Math.floor(Math.random() * COMMISSION_CATS.length)];

  let title, lineKey, name;
  if (pick.kind === 'exhibit'){
    name = ITEMS[pick.target].name;
    lineKey = 'exhibit';
    title = `想看「${name}」镇馆`;
  } else {
    const decorDef = DECOR[pick.hall].find(d => d.id === pick.target);
    name = decorDef.name;
    lineKey = 'decor';
    title = `想要「${name}」`;
  }
  const lines = COMMISSION_LINES[lineKey];
  const line = lines[Math.floor(Math.random() * lines.length)].replace('${n}', name);

  // 奖励 = 金币 + 图纸（随等级 / 是否装饰）
  let goldReward = 0, planReward = 0;
  if (pick.kind === 'exhibit'){
    goldReward = { 3:120, 4:280, 5:700, 6:2000, 7:6000 }[pick.lv] || 100;
    planReward = { 3:1, 4:1, 5:2, 6:5, 7:12 }[pick.lv] || 0;
  } else {
    goldReward = { 1:80, 2:150, 3:320, 4:700, 5:1600, 6:4500, 7:12000 }[pick.lv] || 100;
    planReward = ({ 1:0, 2:0, 3:1, 4:2, 5:2, 6:6, 7:15 })[pick.lv] || 0;
  }

  return {
    id: 'cm_' + Date.now() + '_' + Math.random().toString(36).slice(2,6),
    cat, title, line,
    kind: pick.kind,
    hall: pick.hall,
    target: pick.target,
    lv: pick.lv,
    recipe: pick.recipe || null,    // 装饰才有
    goldReward, planReward,
    createdAt: Date.now(),
  };
}

// 在空槽里生成一张委托
function spawnCommission(){
  if (state.commissions.length >= state.commissionSlots) return null;
  const c = makeCommission();
  if (!c) return null;
  state.commissions.push(c);
  return c;
}

// 检查棋盘上是否已经凑够该委托的素材
function isCommissionReady(cm){
  const counts = countBoardItems();
  if (cm.kind === 'exhibit'){
    return (counts[cm.target] || 0) >= 1;
  } else {
    // decor：所有 recipe 项都凑齐
    return cm.recipe.every(r => (counts[r.id] || 0) >= r.count);
  }
}

// 数棋盘上各物品数量（不含产出器）
function countBoardItems(){
  const counts = {};
  state.board.forEach(c => {
    if (!c || c.isProducer) return;
    if (c.id && ITEMS[c.id]){
      counts[c.id] = (counts[c.id] || 0) + 1;
    }
  });
  return counts;
}

// 完成委托：消耗棋盘对应素材 → 入馆/布置 → 发奖励
function completeCommission(idx){
  const cm = state.commissions[idx];
  if (!cm) return;
  if (!isCommissionReady(cm)){ toast('素材还没合够喵～'); return; }

  // —— 1. 消耗棋盘素材 ——
  const need = cm.kind === 'exhibit'
    ? [{ id: cm.target, count: 1 }]
    : cm.recipe;
  need.forEach(req => {
    let left = req.count;
    for (let i = 0; i < state.board.length && left > 0; i++){
      const c = state.board[i];
      if (c && c.id === req.id){
        state.board[i] = null;
        left--;
      }
    }
  });

  // —— 2. 入馆 / 布置 ——
  let landMsg = '';
  if (cm.kind === 'exhibit'){
    const exArr = state.exhibits[cm.hall];
    const slotIdx = exArr.findIndex(e => !e);
    if (slotIdx >= 0){
      exArr[slotIdx] = cm.target;
      landMsg = `「${ITEMS[cm.target].name}」已入馆`;
    } else {
      landMsg = `「${ITEMS[cm.target].name}」已收藏（馆已满）`;
    }
  } else {
    if (!state.decor[cm.hall].includes(cm.target)){
      state.decor[cm.hall].push(cm.target);
    }
    const decorDef = DECOR[cm.hall].find(d => d.id === cm.target);
    landMsg = `「${decorDef.name}」已布置`;
  }

  // —— 3. 发奖励 ——
  state.gold += cm.goldReward;
  state.plan += cm.planReward;
  state.commissionTotalDone++;
  toast(`🎁 委托完成！${landMsg} +${cm.goldReward}🪙${cm.planReward?` +${cm.planReward}📜`:''}`);

  // —— 4. 移除委托 + 立即生成新的（不留空） ——
  state.commissions.splice(idx, 1);
  setTimeout(() => { spawnCommission(); renderCommissions(); }, 800);

  renderBoard();
  renderBgExhibits();
  updateHUD();
  renderCommissions();
}

// 拒接委托：花 100 金币换一张
function refreshCommission(idx){
  if (state.gold < 100){ toast('金币不够喵（需要 100🪙）'); return; }
  state.gold -= 100;
  state.commissions.splice(idx, 1);
  spawnCommission();
  updateHUD();
  renderCommissions();
}

// 解锁第 N 个委托槽
function unlockCommissionSlot(){
  const cur = state.commissionSlots;
  if (cur >= 3){ toast('委托槽已满'); return; }
  const cost = cur === 1 ? { gold: 500, plan: 1 } : { gold: 1500, plan: 3 };
  if (state.gold < cost.gold || state.plan < cost.plan){
    toast(`需要 ${cost.gold}🪙 + ${cost.plan}📜`);
    return;
  }
  state.gold -= cost.gold;
  state.plan -= cost.plan;
  state.commissionSlots++;
  spawnCommission();   // 立刻填满新槽
  updateHUD();
  renderCommissions();
  toast(`🎉 委托槽 +1（现 ${state.commissionSlots} 个）`);
}

// —— 委托猫小头像（卡片左侧）——
// 用 SVG 画一个简化的猫脸（毛色由 cat 数据决定）
function commissionCatHead(cat){
  const fur = cat.fur, face = cat.face;
  return `<svg viewBox="0 0 40 40">
    <ellipse cx="20" cy="36" rx="9" ry="1.6" fill="rgba(0,0,0,.18)"/>
    <!-- 头 -->
    <circle cx="20" cy="22" r="13" fill="${fur}" stroke="#3D2818" stroke-width="1.4"/>
    <!-- 脸（白底） -->
    <ellipse cx="20" cy="25" rx="9" ry="7" fill="${face}"/>
    <!-- 耳朵 -->
    <path d="M 10,14 L 8,5 L 16,11 Z" fill="${fur}" stroke="#3D2818" stroke-width="1.2" stroke-linejoin="round"/>
    <path d="M 30,14 L 32,5 L 24,11 Z" fill="${fur}" stroke="#3D2818" stroke-width="1.2" stroke-linejoin="round"/>
    <path d="M 11,12 L 11.5,8 L 14,11 Z" fill="#F8B4BD"/>
    <path d="M 29,12 L 28.5,8 L 26,11 Z" fill="#F8B4BD"/>
    <!-- 眼睛 -->
    <ellipse cx="15" cy="22" rx="1.6" ry="2.2" fill="#3D2818"/>
    <ellipse cx="25" cy="22" rx="1.6" ry="2.2" fill="#3D2818"/>
    <circle cx="15.4" cy="21.4" r=".55" fill="#FFFFFF"/>
    <circle cx="25.4" cy="21.4" r=".55" fill="#FFFFFF"/>
    <!-- 鼻子 -->
    <path d="M 18.5,27 L 21.5,27 L 20,28.5 Z" fill="#F0A8AE"/>
    <!-- 嘴 -->
    <path d="M 20,28.5 L 20,30" stroke="#3D2818" stroke-width=".8"/>
    <path d="M 20,30 Q 17,31.5 15.5,30.5" stroke="#3D2818" stroke-width=".8" fill="none"/>
    <path d="M 20,30 Q 23,31.5 24.5,30.5" stroke="#3D2818" stroke-width=".8" fill="none"/>
    <!-- 胡须 -->
    <path d="M 12,27 L 7,26.5" stroke="#3D2818" stroke-width=".5"/>
    <path d="M 12,29 L 7,29.5" stroke="#3D2818" stroke-width=".5"/>
    <path d="M 28,27 L 33,26.5" stroke="#3D2818" stroke-width=".5"/>
    <path d="M 28,29 L 33,29.5" stroke="#3D2818" stroke-width=".5"/>
  </svg>`;
}

// —— 委托卡渲染 ——
function renderCommissions(){
  const root = document.getElementById('commissions');
  if (!root) return;
  let html = '';
  state.commissions.forEach((cm, idx) => {
    const ready = isCommissionReady(cm);
    let targetIcon = '', targetName = '', progressText = '';
    if (cm.kind === 'exhibit'){
      const def = ITEMS[cm.target];
      targetIcon = `<div class="icon-bg" style="${sprite(def.row, def.col)}"></div>`;
      targetName = def.name;
      const counts = countBoardItems();
      const have = counts[cm.target] || 0;
      progressText = `${have}/1`;
    } else {
      const decorDef = DECOR[cm.hall].find(d => d.id === cm.target);
      targetIcon = `<span style="font-size:18px">${decorDef.emoji}</span>`;
      targetName = decorDef.name;
      const counts = countBoardItems();
      // 取最短木板：所有 recipe 项里完成度最低的那个
      const parts = cm.recipe.map(r => `${Math.min(counts[r.id] || 0, r.count)}/${r.count}`).join(' · ');
      progressText = parts;
    }
    const reward = `+${cm.goldReward}🪙${cm.planReward ? ` +${cm.planReward}📜` : ''}`;
    html += `
      <div class="cm-card ${ready ? 'ready' : ''}" data-idx="${idx}">
        <div class="cm-cat">${commissionCatHead(cm.cat)}</div>
        <div class="cm-info">
          <div class="cm-name">${cm.cat.name}</div>
          <div class="cm-line">${cm.line}</div>
          <div class="cm-target">
            <div class="tg-ic">${targetIcon}</div>
            <span class="tg-name">${targetName}</span>
            <span class="tg-prog ${ready ? 'ok' : ''}">${progressText}</span>
          </div>
          <div class="cm-reward">奖励：${reward}</div>
        </div>
        <div class="cm-actions">
          <button class="cm-do" data-act="do" data-idx="${idx}">${ready ? '🎁 完成' : '未达成'}</button>
          <button class="cm-skip" data-act="skip" data-idx="${idx}" title="花 100🪙 换一张">换 ✕</button>
        </div>
      </div>
    `;
  });
  // 扩槽提示
  if (state.commissionSlots < 3){
    const cost = state.commissionSlots === 1 ? '500🪙 + 1📜' : '1500🪙 + 3📜';
    html += `<div class="cm-slot-add" id="cm-slot-add"><b>+</b>解锁第 ${state.commissionSlots+1} 个委托槽（${cost}）</div>`;
  }
  root.innerHTML = html;

  // 绑定事件
  root.querySelectorAll('.cm-do').forEach(btn => {
    btn.addEventListener('click', e => {
      const idx = parseInt(btn.dataset.idx, 10);
      const cm = state.commissions[idx];
      if (!cm) return;
      if (!isCommissionReady(cm)){ toast('素材还没合够喵～'); return; }
      // 完成动画
      const card = btn.closest('.cm-card');
      if (card) card.classList.add('fulfilled');
      setTimeout(() => completeCommission(idx), 350);
    });
  });
  root.querySelectorAll('.cm-skip').forEach(btn => {
    btn.addEventListener('click', e => {
      const idx = parseInt(btn.dataset.idx, 10);
      refreshCommission(idx);
    });
  });
  const addBtn = document.getElementById('cm-slot-add');
  if (addBtn) addBtn.addEventListener('click', unlockCommissionSlot);
}

// ---------- 订单 ----------
let orderSeq = 1;
// 订单小猫的多色调色板（布偶/灰白/三花/奶油白/黑白/玳瑁，全部走 SVG palette 对象）
const CAT_PALETTES = [
  // 布偶（默认棕白）
  { brown:'#C9A88E', brownDk:'#8B6F4E', white:'#FBF4E8', whiteSh:'#E8DDC9', pink:'#F0A8AE' },
  // 灰白
  { brown:'#9AA3B0', brownDk:'#5A6271', white:'#F5F7FA', whiteSh:'#DDE2EA', pink:'#E8A5AC' },
  // 三花（橙+黑+白）
  { brown:'#E89A5C', brownDk:'#3D2818', white:'#FFFCF2', whiteSh:'#E8DDC2', pink:'#F0A8AE' },
  // 奶油白
  { brown:'#F0DCB0', brownDk:'#A88848', white:'#FFFEF5', whiteSh:'#E8DEB8', pink:'#E8A5AC' },
  // 黑白
  { brown:'#3D2818', brownDk:'#1A1410', white:'#FFFFFF', whiteSh:'#D8D2C8', pink:'#E8A5AC' },
  // 玳瑁
  { brown:'#A85020', brownDk:'#5A2510', white:'#F4D8B4', whiteSh:'#D8B888', pink:'#F0A8AE' },
];
function spawnOrder(){
  if (state.orders.length >= CONFIG.ORDER_MAX) return;
  if (!state.tutorial.done && state.tutorial.step < 4) return;
  const chains = ['cat'];
  if (state.unlocked.fossil) chains.push('fossil');
  if (state.unlocked.relic) chains.push('relic');
  const chain = chains[Math.floor(Math.random()*chains.length)];
  // 零工订单只要 L1/L2 素材（L3+ 走委托卡）
  const lv = Math.random() < 0.6 ? 1 : 2;
  const need = [{ id: `${chain}${lv}`, count: lv === 1 ? 2 : 1 }];
  if (Math.random() < 0.3){
    need.push({ id: `${chain}1`, count: 1 });
  }
  // 奖励减半（旧版 L2=10 / L3=25 → 现在 L1=5 / L2=10）
  const reward = lv === 2 ? 10 : 5;
  state.orders.push({
    id: orderSeq++,
    palette: Math.floor(Math.random()*CAT_PALETTES.length),
    need, reward,
    expireAt: Date.now() + CONFIG.ORDER_TIMEOUT,
  });
  renderOrders();
  updateGuide();
}
function checkOrders(){
  for (let i = state.orders.length - 1; i >= 0; i--){
    if (canFulfill(state.orders[i])) fulfillOrder(i);
  }
}
function canFulfill(order){
  const counts = countBoard();
  return order.need.every(n => (counts[n.id]||0) >= n.count);
}
function countBoard(){
  const m = {};
  state.board.forEach(it => { if (it && !it.isProducer) m[it.id] = (m[it.id]||0)+1; });
  return m;
}
function fulfillOrder(idx){
  const o = state.orders[idx];
  // 零工订单只消耗素材换金币（L3+ 入馆完全交给委托卡）
  o.need.forEach(n => {
    let left = n.count;
    for (let i = 0; i < state.board.length && left > 0; i++){
      const it = state.board[i];
      if (it && !it.isProducer && it.id === n.id){
        state.board[i] = null; left--;
      }
    }
  });
  state.gold += o.reward;
  state.stats.orderDone++;
  addExp(o.reward);
  toast(`✓ 零工完成 +${o.reward}🪙`);
  state.orders.splice(idx, 1);
  if (state.tutorial.step === 4) advanceTutorial(5);
  renderOrders();
  renderBoard();
  renderCommissions();   // 委托卡进度可能变化（素材消耗）
  updateHUD();
  updateGuide();
}

// 经验/升级
function addExp(amount){
  state.mexp += amount;
  while (state.mexp >= EXP_PER_LEVEL){
    state.mexp -= EXP_PER_LEVEL;
    state.mlv++;
    onLevelUp();
  }
  updateLvBar();
}
function onLevelUp(){
  toast(`🎉 馆长升至 第${state.mlv}级！`);
  // 大猫一起欢呼
  if (typeof setCatState === 'function'){
    setCatState('cheer');
    setTimeout(() => setCatState('idle'), 2200);
  }
  // 等级达标时不再自动解锁，只提示去升级面板
  if (state.mlv === 5 && !state.unlocked.fossil){
    showModal('🔓 自然馆 解锁条件达成', '<p>馆长达到 <b>5 级</b>，自然馆开放购买。</p><p>前往右上角 ⚙️ 升级面板，花 <b>2000🪙</b> 解锁。</p>');
  }
  if (state.mlv === 12 && !state.unlocked.relic){
    showModal('🔓 古董馆 解锁条件达成', '<p>馆长达到 <b>12 级</b>，古董馆开放购买。</p><p>前往右上角 ⚙️ 升级面板，花 <b>8000🪙</b> 解锁。</p>');
  }
}
function updateLvBar(){
  const pct = (state.mexp / EXP_PER_LEVEL) * 100;
  document.getElementById('lv-fill').style.width = pct + '%';
}

const $orders = document.getElementById('orders-bar');
function renderOrders(){
  $orders.innerHTML = '';
  if (state.orders.length === 0){
    $orders.innerHTML = '<div style="display:inline-block;padding:14px 6px;color:#B8AC97;font-size:12px">😴 暂无客人，先专心合成吧～</div>';
    return;
  }
  const title = document.createElement('div'); title.className='o-title'; title.textContent='零工·小猫想要：'; $orders.appendChild(title);
  state.orders.forEach((o,i) => {
    const card = document.createElement('div');
    card.className = 'order-card';
    if (canFulfill(o)) card.classList.add('ready');
    const palette = CAT_PALETTES[o.palette || 0];
    const ready = canFulfill(o);
    const catState = ready ? 'cheer' : 'sit';
    card.innerHTML = `<div class="cat-face">${kittyHTML(catState, '32px', palette)}</div>
      <div class="o-says">${ready?'就要这个！':'要这个'}</div>
      <div class="order-need">${o.need.map(n=>{
        const def = ITEMS[n.id];
        if (!def) return '';
        const url = (typeof ICON_URLS!=='undefined' && ICON_URLS[def.row] && ICON_URLS[def.row][def.col]) || '';
        return `<div class="ni"><img src="${url}" alt="${def.name}" title="${def.name}"/></div>${n.count>1?'×'+n.count:''}`;
      }).join('')}</div>
      <div class="reward">+${o.reward}🪙</div>`;
    $orders.appendChild(card);
  });
}

// ---------- 背景层小展位（虚化博物馆里看到的展品概览） ----------
function renderBgExhibits(){
  const $bg = document.getElementById('bg-exhibits');
  $bg.innerHTML = '';
  // 只展示已解锁、且至少摆了 1 个展品的展厅（空馆不在背景里露出）
  // 例外：初始的猫咪馆永远展示，引导玩家摆第一个展品
  const display = [];
  Object.entries(HALLS).forEach(([k,h]) => {
    if (!state.unlocked[k]) return;
    const hasAny = (state.exhibits[k] || []).some(e => e);
    if (!hasAny && k !== 'cat') return;
    // 取该展厅前 3 个展位
    state.exhibits[k].slice(0, 3).forEach((ex, idx) => {
      display.push({ chain: k, slotIdx: idx, ex });
    });
  });
  display.forEach(d => {
    const slot = document.createElement('div');
    slot.className = 'bg-slot' + (d.ex ? '' : ' empty');
    slot.dataset.chain = d.chain;
    slot.dataset.slotIdx = d.slotIdx;
    slot.dataset.empty = d.ex ? '0' : '1';
    if (d.ex){
      const def = ITEMS[d.ex];
      const ic = document.createElement('div');
      ic.className = 'ic';
      ic.style.cssText = sprite(def.row, def.col);
      slot.appendChild(ic);
    }
    $bg.appendChild(slot);
  });
}

// ---------- HUD ----------
function updateHUD(){
  document.getElementById('gold').textContent = state.gold;
  document.getElementById('plan').textContent = state.plan;
  document.getElementById('mlv').textContent = state.mlv;
  document.getElementById('energy').textContent = state.energy;
  const $emax = document.getElementById('energy-max');
  if ($emax) $emax.textContent = getEnergyMax();
  const elapsed = Date.now() - state.lastEnergyTs;
  const pct = Math.min(100, (elapsed / CONFIG.ENERGY_RECOVER_MS) * 100);
  document.getElementById('energy-bar-fill').style.width = pct+'%';
  // 更新经营按钮红点
  if (typeof updateBizDots === 'function') updateBizDots();
  // 博物馆按钮红点
  const counts = countBoard();
  let canDonate = false;
  Object.entries(HALLS).forEach(([k,h]) => {
    if (!state.unlocked[k]) return;
    const hasSlot = state.exhibits[k].includes(null);
    if (!hasSlot) return;
    if (h.pool.some(id => counts[id] > 0)) canDonate = true;
  });
  document.getElementById('museum-dot').classList.toggle('show', canDonate);
}

// ---------- 任务条引导 ----------
function updateGuide(){
  const $gt = document.getElementById('guide-text');
  const tut = state.tutorial;
  if (!tut.done){
    if (tut.step === 1) { $gt.innerHTML = '👆 <b>点击下方棋盘里的「🐾 猫窝」</b>，会产出一个「猫爪印」'; return; }
    if (tut.step === 2) { $gt.innerHTML = '👆 <b>再点一次猫窝</b>，让棋盘上有两个相同的「猫爪印」'; return; }
    if (tut.step === 3) { $gt.innerHTML = '👇 <b>把一个猫爪印拖到另一个猫爪印上</b>，合成升级！'; return; }
    if (tut.step === 4) { $gt.innerHTML = '🎯 顶部出现零工小猫了，<b>合成出对应物品</b>会自动完成'; return; }
  }
  // 优先展示委托卡进度（关卡主线）
  if (state.commissions && state.commissions.length > 0){
    const ready = state.commissions.find(c => isCommissionReady(c));
    if (ready){
      $gt.innerHTML = `✨ <b>右下委托卡可以完成了</b> · 点「🎁 完成」收下奖励`;
      return;
    }
    const cm = state.commissions[0];
    const tname = cm.kind === 'exhibit' ? ITEMS[cm.target].name : DECOR[cm.hall].find(d=>d.id===cm.target).name;
    $gt.innerHTML = `🐈 ${cm.cat.name} 想要「${tname}」· 看右下委托卡进度`;
    return;
  }
  if (state.orders.length > 0){
    const ready = state.orders.find(canFulfill);
    if (ready){
      $gt.innerHTML = `✨ 有零工可交付了 · 自动完成`;
      return;
    }
    const o = state.orders[0];
    const need = o.need.map(n => `<b>${ITEMS[n.id].name}</b>`).join(' + ');
    $gt.innerHTML = `🐱 零工小猫要 ${need} · 合成它 +${o.reward}🪙`;
    return;
  }
  if (state.energy < 5){
    $gt.innerHTML = `😴 体力较低，<b>等待体力恢复</b>或继续合成现有物品`;
    return;
  }
  $gt.innerHTML = `🎯 跟着<b>右下委托卡</b>合成指定物品 · 完成可获得展品/装饰`;
}

function advanceTutorial(toStep){
  state.tutorial.step = toStep;
  if (toStep === 5){
    state.tutorial.done = true;
    showModal('🎓 新手教学完成！', `
      <p class="center">现在你已经掌握了核心玩法：</p>
      <div class="step-list">
        ① <b>点产出器</b>（猫窝/矿堆/遗址）→ 出 一阶 材料<br>
        ② <b>相同物品拖到一起</b>→ 合成升级<br>
        ③ <b>右下委托卡</b>会告诉你小猫想要什么 · 合出来即可入馆<br>
        ④ 顶部 <b>零工条</b>是副业 · 合 L1/L2 换零钱<br>
        ⑤ 馆长 第5级 / 第12级 → 解锁<b>自然馆 / 古董馆</b>
      </div>
      <p class="center">💡 想看博物馆？<br><b>下滑棋盘面板</b>或点<b>右上按钮</b></p>
    `);
    // 教程完成的瞬间立刻生成第一张委托
    if (state.commissions.length === 0) spawnCommission();
    renderCommissions();
  }
  updateGuide();
  renderBoard();
}

// ---------- toast & modal ----------
function toast(text){
  const t = document.createElement('div');
  t.className = 'toast'; t.textContent = text;
  document.getElementById('app').appendChild(t);
  setTimeout(()=>t.remove(), 1400);
}
function showModal(title, html){
  const mask = document.createElement('div');
  mask.className = 'modal-mask';
  mask.innerHTML = `<div class="modal"><h2>${title}</h2>${html}<button class="btn">知道啦</button></div>`;
  mask.querySelector('.btn').onclick = () => mask.remove();
  document.body.appendChild(mask);
}

// ---------- 棋盘面板 收起/展开 ----------
const $panel = document.getElementById('merge-panel');
const $bg = document.getElementById('museum-bg');

function setPanelCollapsed(collapsed){
  state.panelCollapsed = collapsed;
  $panel.classList.toggle('collapsed', collapsed);
  // 展开棋盘 → 博物馆背景虚化；收起棋盘 → 博物馆清晰
  $bg.classList.toggle('dimmed', !collapsed);
}

// 拉手点击 + 拖拽
const $handle = document.getElementById('panel-handle');
let panelDrag = null;
$handle.addEventListener('pointerdown', e => {
  panelDrag = { startY: e.clientY, startCollapsed: state.panelCollapsed, moved: false };
});
document.addEventListener('pointermove', e => {
  if (!panelDrag) return;
  const dy = e.clientY - panelDrag.startY;
  if (Math.abs(dy) > 8) panelDrag.moved = true;
});
document.addEventListener('pointerup', e => {
  if (!panelDrag) return;
  const dy = e.clientY - panelDrag.startY;
  if (panelDrag.moved){
    if (dy > 40) setPanelCollapsed(true);
    else if (dy < -40) setPanelCollapsed(false);
  } else {
    // 点击切换
    setPanelCollapsed(!state.panelCollapsed);
  }
  panelDrag = null;
});

// ---------- 博物馆详情浮层 ----------
const $hallOverlay = document.getElementById('hall-overlay');
document.getElementById('museum-btn').addEventListener('click', () => {
  // 打开博物馆面板时自动收起棋盘，让博物馆背景和大猫露出来
  setPanelCollapsed(true);
  $hallOverlay.classList.add('show');
  renderMuseum();
  // 启动访客系统
  setTimeout(onHallChanged, 200);
});
document.getElementById('hall-close').addEventListener('click', () => {
  $hallOverlay.classList.remove('show');
  // 关闭博物馆面板时自动重新展开棋盘
  setPanelCollapsed(false);
  // 停掉访客系统
  stopVisitorSystem();
});

function renderMuseum(){
  const $overlay = document.getElementById('hall-overlay');
  $overlay.dataset.hall = state.currentHall;
  const $title = document.getElementById('hall-title');
  if ($title){
    const hallNameMap = { cat:'猫咪馆', fossil:'自然馆', relic:'古董馆' };
    $title.textContent = hallNameMap[state.currentHall] || '展厅';
  }
  // 清掉旧锁定遮罩
  const oldMask = $overlay.querySelector('.hall-locked-mask');
  if (oldMask) oldMask.remove();

  const $ht = document.getElementById('hall-tabs');
  $ht.innerHTML = '';
  Object.entries(HALLS).forEach(([key, h]) => {
    const unlocked = state.unlocked[key];
    const tab = document.createElement('div');
    tab.className = 'hall-tab' + (state.currentHall === key ? ' active' : '');
    tab.textContent = unlocked ? h.name : `${h.name} 🔒`;
    // 即使锁定也允许点 tab 进入查看（看锁定遮罩）
    tab.onclick = () => { state.currentHall = key; renderMuseum(); onHallChanged(); };
    $ht.appendChild(tab);
  });

  const counts = countBoard();
  const hall = HALLS[state.currentHall];
  const isHallUnlocked = state.unlocked[state.currentHall];
  const slotCount = state.slotsUnlocked[state.currentHall] || 6;
  const $tip = document.getElementById('hall-tip');
  const buff = (state.decor[state.currentHall] || []).reduce((s, did) => {
    const d = (DECOR[state.currentHall] || []).find(x => x.id === did);
    return s + (d ? d.buff : 0);
  }, 0);

  if (!isHallUnlocked){
    $tip.innerHTML = `🔒 此展厅尚未开放`;
  } else {
    const hasItem = hall.pool.some(id => counts[id] > 0);
    const buffText = buff > 0 ? `· 装饰加成 <b>+${Math.round(buff*100)}%</b>` : '';
    if (hasItem){
      $tip.innerHTML = `✨ 你有可捐赠的展品！点击<b>金光闪烁的展柜</b>放入 ${buffText}`;
    } else {
      const hasFilled = (state.exhibits[state.currentHall] || []).some(e=>e);
      if (hasFilled){
        $tip.innerHTML = `🐱 访客驻足展柜会贡献金币 · 展品越多越高级，访客越多越赚 ${buffText}`;
      } else {
        $tip.innerHTML = `当前没有 ${hall.name.replace('馆','')} 类的 三阶以上 展品 · <b>先去棋盘合成</b> ${buffText}`;
      }
    }
  }

  // 渲染展柜：8 个槽位分两排（远 4 + 近 4），idx 0-3 远排、4-7 近排
  const $rowFar = document.getElementById('cases-far');
  const $rowNear = document.getElementById('cases-near');
  if (!$rowFar || !$rowNear) return;
  $rowFar.innerHTML = '';
  $rowNear.innerHTML = '';
  for (let idx = 0; idx < SLOT_MAX; idx++){
    const slot = document.createElement('div');
    if (idx >= slotCount){
      // 锁定柜：未购买的扩展位
      const expandIdx = idx - 6;
      const cost = SLOT_EXPAND_COST[expandIdx] || 9999;
      const can = isHallUnlocked && state.gold >= cost;
      slot.className = 'exhibit-slot slot-locked' + (can ? '' : ' disabled');
      slot.innerHTML = `
        <div class="case-glass">
          <div class="ex-icon">🔒</div>
        </div>
        <div class="case-base">
          <div class="ex-label">扩展展柜</div>
          <div class="ex-cost">${cost}🪙</div>
        </div>`;
      if (can) slot.onclick = () => buyExhibitSlot(state.currentHall);
      else slot.onclick = () => toast(isHallUnlocked ? '金币不足' : '先解锁此展厅');
      // 分发到远/近排
      (idx < 4 ? $rowFar : $rowNear).appendChild(slot);
      continue;
    }
    const ex = state.exhibits[state.currentHall][idx];
    slot.className = 'exhibit-slot' + (ex ? ' filled' : '');
    if (ex){
      const def = ITEMS[ex];
      const url = (typeof ICON_URLS!=='undefined' && ICON_URLS[def.row] && ICON_URLS[def.row][def.col]) || '';
      // 展柜上显示的是"访客驻足时给的金币"（与 VISITOR_TYPES 的 coin 关联，按阶数估算平均）
      // 阶数越高，能吸引到的高 coin 访客越多，平均 ≈ 等于该阶可吸引的访客权重均值
      const visitorAvg = def.lv >= 4 ? '5~10' : def.lv >= 3 ? '2~5' : '1~2';
      slot.innerHTML = `
        <div class="case-glass">
          <div class="ex-icon"><img src="${url}" alt="${def.name}"/></div>
        </div>
        <div class="case-base">
          <div class="ex-label">${def.name} · ${['一','二','三','四','五'][def.lv-1]}阶</div>
          <div class="ex-cost">${visitorAvg}🪙/位</div>
        </div>`;
    } else {
      const candidates = hall.pool.filter(id => counts[id] > 0);
      if (candidates.length > 0 && isHallUnlocked){
        const c = candidates[candidates.length - 1];
        const def = ITEMS[c];
        const cost = EXHIBIT_COST[def.lv];
        const can = state.gold >= cost.gold && state.plan >= cost.plan;
        slot.classList.toggle('disabled', !can);
        slot.classList.add('action');
        const url = (typeof ICON_URLS!=='undefined' && ICON_URLS[def.row] && ICON_URLS[def.row][def.col]) || '';
        slot.innerHTML = `
          <div class="case-glass">
            <div class="ex-icon" style="opacity:.65"><img src="${url}" alt="${def.name}"/></div>
          </div>
          <div class="case-base">
            <div class="ex-label">捐赠「${def.name}」</div>
            <div class="ex-cost">${cost.gold}🪙 + ${cost.plan}📜</div>
          </div>`;
        if (can) slot.onclick = () => { console.log('[donate] click', state.currentHall, idx, c); donateExhibit(state.currentHall, idx, c); };
        else slot.onclick = () => { console.log('[donate] disabled, gold/plan not enough', state.gold, state.plan, cost); toast(`金币或图纸不足（需${cost.gold}🪙+${cost.plan}📜）`); };
      } else {
        slot.classList.add('empty-hint');
        slot.innerHTML = `
          <div class="case-glass">
            <div class="ex-icon">+</div>
          </div>
          <div class="case-base">
            <div class="ex-label">空展位</div>
            <div class="ex-cost">三阶以上 ${hall.name.replace('馆','')}展品</div>
          </div>`;
      }
    }
    // 分发到远/近排
    (idx < 4 ? $rowFar : $rowNear).appendChild(slot);
  }

  // 装饰条
  renderDecorBar();

  // 锁定的馆：在最上面盖一层遮罩，显示解锁条件
  if (!isHallUnlocked){
    const mask = document.createElement('div');
    mask.className = 'hall-locked-mask';
    const lvOk = state.mlv >= hall.unlockLv;
    const goldOk = state.gold >= hall.unlockGold;
    const canUnlock = lvOk && goldOk;
    mask.innerHTML = `
      <div class="lock-ico">🔒</div>
      <div class="lock-title">${hall.name} · 尚未开放</div>
      <div class="lock-cond">
        馆长等级 <b>${state.mlv}/${hall.unlockLv}</b> ${lvOk?'✓':'✗'}<br>
        所需金币 <b>${hall.unlockGold}🪙</b> ${goldOk?'✓':'✗'}
      </div>
      <button class="lock-btn ${canUnlock?'':'disabled'}">${canUnlock?`解锁 · 花费 ${hall.unlockGold}🪙`:'条件未达成'}</button>
    `;
    mask.querySelector('.lock-btn').onclick = () => {
      if (!lvOk){ toast(`馆长需达到 ${hall.unlockLv} 级`); return; }
      if (!goldOk){ toast(`金币不足，还差 ${hall.unlockGold - state.gold}🪙`); return; }
      unlockHall(state.currentHall);
    };
    $overlay.appendChild(mask);
  }
}

// 渲染底部装饰条
function renderDecorBar(){
  const $bar = document.getElementById('hall-decor-bar');
  if (!$bar) return;
  const hk = state.currentHall;
  const isUnlocked = state.unlocked[hk];
  const owned = state.decor[hk] || [];
  const list = DECOR[hk] || [];
  const buff = owned.reduce((s, did) => {
    const d = list.find(x => x.id === did);
    return s + (d ? d.buff : 0);
  }, 0);
  $bar.innerHTML = `<div class="deco-title">🎨 装饰</div>` +
    list.map(d => {
      const got = owned.includes(d.id);
      return `<div class="deco-item ${got?'owned':''} ${isUnlocked?'':'locked-hall'}" data-deco="${d.id}" title="${d.name}">
        <span>${d.emoji}</span>
        ${got?'':`<span class="deco-cost">${d.cost}</span>`}
      </div>`;
    }).join('') +
    `<div class="deco-buff">+${Math.round(buff*100)}%</div>`;
  $bar.querySelectorAll('.deco-item').forEach(el => {
    el.onclick = () => buyDecor(hk, el.dataset.deco);
  });
}
function donateExhibit(hallKey, slotIdx, itemId){
  const def = ITEMS[itemId];
  const cost = EXHIBIT_COST[def.lv];
  if (state.gold < cost.gold || state.plan < cost.plan) return;
  for (let i = 0; i < state.board.length; i++){
    const it = state.board[i];
    if (it && !it.isProducer && it.id === itemId){
      state.board[i] = null; break;
    }
  }
  state.gold -= cost.gold;
  state.plan -= cost.plan;
  state.exhibits[hallKey][slotIdx] = itemId;
  toast(`🎉「${def.name}」入馆!`);
  addExp(def.lv * 10);
  // 让橘猫蹭过去
  catWalkTo(hallKey);
  // 关闭面板让玩家看到背景里展品出现 + 金光
  setTimeout(() => {
    $hallOverlay.classList.remove('show');
    renderBgExhibits();
    setTimeout(() => {
      const slots = document.querySelectorAll('.bg-slot[data-chain="'+hallKey+'"]');
      const target = slots[slotIdx];
      if (target){
        target.classList.add('shine');
        setTimeout(()=>target.classList.remove('shine'), 1200);
      }
    }, 50);
  }, 350);
  updateHUD();
  renderMuseum();
  renderBoard();
  // 新展品入馆后刷新访客系统（如果博物馆面板还开着）
  if ($hallOverlay && $hallOverlay.classList.contains('show')){
    setTimeout(onHallChanged, 400);
  }
}

// =====================================================
// ============ 经营玩法：解锁/扩柜/装饰/升级/商店 ============
// =====================================================

// 1) 解锁新馆
function unlockHall(hallKey){
  const hall = HALLS[hallKey];
  if (!hall || state.unlocked[hallKey]) return;
  if (state.mlv < hall.unlockLv){ toast(`需馆长 ${hall.unlockLv} 级`); return; }
  if (state.gold < hall.unlockGold){ toast(`金币不足`); return; }
  state.gold -= hall.unlockGold;
  state.unlocked[hallKey] = true;
  showModal(`🎉 ${hall.name} 开放！`,
    `<p>恭喜你扩大了博物馆！</p><p><b>${hall.name}</b>正式开张，对应链路的合成产物现在可以陈列于此。</p>`);
  toast(`🎉 ${hall.name} 已解锁！`);
  updateHUD();
  renderBgExhibits();
  renderMuseum();
}

// 2) 购买展柜扩容（每馆从 6 → 12）
function buyExhibitSlot(hallKey){
  if (!state.unlocked[hallKey]){ toast('先解锁此展厅'); return; }
  const cur = state.slotsUnlocked[hallKey] || 6;
  if (cur >= SLOT_MAX){ toast('已扩展到上限'); return; }
  const cost = SLOT_EXPAND_COST[cur - 6];
  if (state.gold < cost){ toast(`差 ${cost - state.gold}🪙`); return; }
  state.gold -= cost;
  state.slotsUnlocked[hallKey] = cur + 1;
  // 扩展 exhibits 数组
  while (state.exhibits[hallKey].length < state.slotsUnlocked[hallKey]){
    state.exhibits[hallKey].push(null);
  }
  toast(`🎉 ${HALLS[hallKey].name} 新增展柜！`);
  updateHUD();
  renderMuseum();
}

// 3) 购买装饰
function buyDecor(hallKey, decorId){
  if (!state.unlocked[hallKey]){ toast('先解锁此展厅'); return; }
  const owned = state.decor[hallKey] || [];
  if (owned.includes(decorId)){ toast('已拥有'); return; }
  const d = (DECOR[hallKey] || []).find(x => x.id === decorId);
  if (!d) return;
  if (state.gold < d.cost){ toast(`差 ${d.cost - state.gold}🪙`); return; }
  state.gold -= d.cost;
  if (!state.decor[hallKey]) state.decor[hallKey] = [];
  state.decor[hallKey].push(decorId);
  toast(`🎨 ${d.name} 已布置 +${Math.round(d.buff*100)}% 产出`);
  updateHUD();
  renderMuseum();
}

// 4) 棋盘扩容
function buyBoardExpand(){
  const next = state.boardTier + 1;
  if (next >= BOARD_TIERS.length){ toast('棋盘已到上限'); return; }
  const cost = BOARD_TIERS[next].cost;
  if (state.gold < cost){ toast(`差 ${cost - state.gold}🪙`); return; }
  state.gold -= cost;
  const oldH = BOARD_TIERS[state.boardTier].rows;
  const newH = BOARD_TIERS[next].rows;
  state.boardTier = next;
  // 把旧 board（W*oldH）扩到 W*newH（行追加在底部）
  const W = CONFIG.BOARD_W;
  const newBoard = Array(W * newH).fill(null);
  for (let i = 0; i < state.board.length && i < newBoard.length; i++){
    newBoard[i] = state.board[i];
  }
  state.board = newBoard;
  toast(`📐 棋盘扩展为 ${W}×${newH}！`);
  updateHUD();
  renderBoard();
  renderUpgrade();
}

// 5) 能量上限升级
function buyEnergyUpgrade(){
  const next = state.energyTier + 1;
  if (next >= ENERGY_TIERS.length){ toast('能量已到上限'); return; }
  const cost = ENERGY_TIERS[next].cost;
  if (state.gold < cost){ toast(`差 ${cost - state.gold}🪙`); return; }
  state.gold -= cost;
  state.energyTier = next;
  state.energy = getEnergyMax(); // 升级时回满
  toast(`⚡ 能量上限提升至 ${getEnergyMax()}`);
  updateHUD();
  renderUpgrade();
}

// 6) 限时商店：每天刷新
function refreshShopIfNeeded(){
  const today = new Date().toISOString().slice(0, 10);
  if (state.shop.day !== today){
    state.shop.day = today;
    state.shop.boughtIdx = [];
    // 强制每日免费金币包 + 随机抽 2 个其他
    const free = SHOP_POOL.find(x => x.free);
    const others = SHOP_POOL.filter(x => !x.free);
    // 洗牌取 2
    const pool = [...others].sort(() => Math.random() - 0.5).slice(0, 2);
    state.shop.items = [free, ...pool].map(x => ({ ...x }));
  }
}

function buyShopItem(idx){
  refreshShopIfNeeded();
  if (state.shop.boughtIdx.includes(idx)){ toast('今日已领'); return; }
  const it = state.shop.items[idx];
  if (!it) return;
  if (!it.free && state.gold < it.cost){ toast(`差 ${it.cost - state.gold}🪙`); return; }
  if (!it.free) state.gold -= it.cost;
  state.shop.boughtIdx.push(idx);
  // 发奖
  if (it.type === 'gold'){
    state.gold += it.value;
    toast(`💰 +${it.value}🪙`);
  } else if (it.type === 'energy'){
    state.energy = Math.min(getEnergyMax(), state.energy + it.value);
    toast(`⚡ +${it.value} 能量`);
  } else if (it.type === 'plan'){
    state.plan += it.value;
    toast(`📜 +${it.value} 图纸`);
  } else if (it.type === 'item'){
    // 随机三阶展品到棋盘空位
    const pool = ['cat3','fossil3','relic3'].filter(id => state.unlocked[ITEMS[id].chain]);
    const pickId = pool.length ? pool[Math.floor(Math.random()*pool.length)] : 'cat3';
    const empty = state.board.findIndex(c => !c);
    if (empty < 0){ toast('棋盘已满，无法获得'); state.gold += it.cost; state.shop.boughtIdx.pop(); return; }
    state.board[empty] = makeItem(pickId);
    toast(`🎁 获得 ${ITEMS[pickId].name}`);
    renderBoard();
  } else if (it.type === 'order_refresh'){
    state.orders = [];
    setTimeout(() => spawnOrder(), 100);
    setTimeout(() => spawnOrder(), 600);
    toast(`🔄 订单已刷新`);
    renderOrders();
  }
  updateHUD();
  renderShop();
}

// =====================================================
// ============ 经营浮层渲染 ============
// =====================================================

function renderUpgrade(){
  const $body = document.getElementById('upgrade-body');
  if (!$body) return;
  const rows = [];
  // 馆解锁
  rows.push(`<div class="biz-row section">🏛️ 展厅解锁</div>`);
  ['fossil','relic'].forEach(hk => {
    const h = HALLS[hk];
    const owned = state.unlocked[hk];
    const lvOk = state.mlv >= h.unlockLv;
    const goldOk = state.gold >= h.unlockGold;
    const can = lvOk && goldOk && !owned;
    const action = owned
      ? `<button class="biz-action owned" disabled>已解锁</button>`
      : `<button class="biz-action ${can?'':'disabled'}" data-act="unlock-${hk}">${h.unlockGold}🪙</button>`;
    const cond = owned ? '已开放' : `馆长 ${state.mlv}/${h.unlockLv} · 金币 ${state.gold}/${h.unlockGold}`;
    rows.push(`<div class="biz-row ${owned?'locked':''}">
      <div class="biz-ic">🏛️</div>
      <div class="biz-info">
        <div class="biz-name">解锁「${h.name}」</div>
        <div class="biz-desc">${cond}</div>
      </div>
      ${action}
    </div>`);
  });
  // 棋盘扩容
  rows.push(`<div class="biz-row section">📐 棋盘扩容</div>`);
  const bt = state.boardTier;
  if (bt + 1 < BOARD_TIERS.length){
    const next = BOARD_TIERS[bt+1];
    const can = state.gold >= next.cost;
    rows.push(`<div class="biz-row">
      <div class="biz-ic">📐</div>
      <div class="biz-info">
        <div class="biz-name">棋盘扩展为 5×${next.rows}</div>
        <div class="biz-desc">当前 5×${BOARD_TIERS[bt].rows} · 增加 ${(next.rows-BOARD_TIERS[bt].rows)*5} 格</div>
      </div>
      <button class="biz-action ${can?'':'disabled'}" data-act="board-expand">${next.cost}🪙</button>
    </div>`);
  } else {
    rows.push(`<div class="biz-row">
      <div class="biz-ic">📐</div>
      <div class="biz-info"><div class="biz-name">棋盘已到上限 5×8</div></div>
      <button class="biz-action owned" disabled>满级</button>
    </div>`);
  }
  // 能量升级
  rows.push(`<div class="biz-row section">⚡ 能量上限</div>`);
  const et = state.energyTier;
  if (et + 1 < ENERGY_TIERS.length){
    const next = ENERGY_TIERS[et+1];
    const can = state.gold >= next.cost;
    rows.push(`<div class="biz-row">
      <div class="biz-ic">⚡</div>
      <div class="biz-info">
        <div class="biz-name">能量上限 ${next.max}</div>
        <div class="biz-desc">当前 ${ENERGY_TIERS[et].max} · 升级回满</div>
      </div>
      <button class="biz-action ${can?'':'disabled'}" data-act="energy-up">${next.cost}🪙</button>
    </div>`);
  } else {
    rows.push(`<div class="biz-row">
      <div class="biz-ic">⚡</div>
      <div class="biz-info"><div class="biz-name">能量已到上限 100</div></div>
      <button class="biz-action owned" disabled>满级</button>
    </div>`);
  }
  $body.innerHTML = rows.join('');
  // 绑定按钮
  $body.querySelectorAll('[data-act]').forEach(btn => {
    btn.onclick = () => {
      if (btn.classList.contains('disabled')) return;
      const act = btn.dataset.act;
      if (act.startsWith('unlock-')){ unlockHall(act.slice(7)); renderUpgrade(); }
      else if (act === 'board-expand'){ buyBoardExpand(); }
      else if (act === 'energy-up'){ buyEnergyUpgrade(); }
    };
  });
}

function renderShop(){
  refreshShopIfNeeded();
  const $body = document.getElementById('shop-body');
  if (!$body) return;
  $body.innerHTML = state.shop.items.map((it, i) => {
    const bought = state.shop.boughtIdx.includes(i);
    let actionHtml;
    if (bought){
      actionHtml = `<button class="biz-action owned" disabled>已购</button>`;
    } else if (it.free){
      actionHtml = `<button class="biz-action free" data-shop="${i}">免费领</button>`;
    } else {
      const can = state.gold >= it.cost;
      actionHtml = `<button class="biz-action ${can?'':'disabled'}" data-shop="${i}">${it.cost}🪙</button>`;
    }
    return `<div class="biz-row">
      <div class="biz-ic">${it.icon}</div>
      <div class="biz-info">
        <div class="biz-name">${it.label}</div>
        <div class="biz-desc">${it.free?'每日限领 1 次':'限时商品'}</div>
      </div>
      ${actionHtml}
    </div>`;
  }).join('');
  $body.querySelectorAll('[data-shop]').forEach(btn => {
    btn.onclick = () => {
      if (btn.classList.contains('disabled')) return;
      buyShopItem(parseInt(btn.dataset.shop));
    };
  });
}

// 绑定升级 / 商店按钮
function bindBizButtons(){
  const $upBtn = document.getElementById('upgrade-btn');
  const $shopBtn = document.getElementById('shop-btn');
  const $upOv = document.getElementById('upgrade-overlay');
  const $shopOv = document.getElementById('shop-overlay');
  if ($upBtn) $upBtn.onclick = () => {
    setPanelCollapsed(true);
    renderUpgrade();
    $upOv.classList.add('show');
  };
  if ($shopBtn) $shopBtn.onclick = () => {
    setPanelCollapsed(true);
    renderShop();
    $shopOv.classList.add('show');
  };
  document.querySelectorAll('[data-close]').forEach(btn => {
    btn.onclick = () => {
      const tid = btn.dataset.close;
      const el = document.getElementById(tid);
      if (el) el.classList.remove('show');
      setPanelCollapsed(false);
    };
  });
  // 点遮罩关闭
  [$upOv, $shopOv].forEach(ov => {
    if (!ov) return;
    ov.addEventListener('click', e => {
      if (e.target === ov){ ov.classList.remove('show'); setPanelCollapsed(false); }
    });
  });
}

// 红点提示：升级有可买项 / 商店有未领免费/可买项
function updateBizDots(){
  const $up = document.getElementById('upgrade-dot');
  const $shop = document.getElementById('shop-dot');
  if (!$up || !$shop) return;
  // 升级红点：任意一个升级项可买
  let hasUp = false;
  ['fossil','relic'].forEach(hk => {
    const h = HALLS[hk];
    if (!state.unlocked[hk] && state.mlv >= h.unlockLv && state.gold >= h.unlockGold) hasUp = true;
  });
  if (state.boardTier+1 < BOARD_TIERS.length && state.gold >= BOARD_TIERS[state.boardTier+1].cost) hasUp = true;
  if (state.energyTier+1 < ENERGY_TIERS.length && state.gold >= ENERGY_TIERS[state.energyTier+1].cost) hasUp = true;
  $up.classList.toggle('show', hasUp);
  // 商店红点：有未领免费
  refreshShopIfNeeded();
  let hasShop = false;
  state.shop.items.forEach((it, i) => {
    if (state.shop.boughtIdx.includes(i)) return;
    if (it.free) hasShop = true;
  });
  $shop.classList.toggle('show', hasShop);
}

// ---------- 橘猫游荡（CSS 卡通猫·状态机） ----------
const $cat = document.getElementById('cat-wander');
let catTimer = null;       // 闲置切换 sit/lay 的定时器
let catWalkTimer = null;   // 走完路 → 切 idle 的定时器

function setCatState(state, faceDir){
  // state: walk | idle | sit | lay | cheer
  $cat.classList.remove('walk','idle','sit','lay','cheer');
  $cat.classList.add(state);
  if (faceDir === 'l'){ $cat.classList.remove('face-r'); $cat.classList.add('face-l'); }
  else if (faceDir === 'r'){ $cat.classList.remove('face-l'); $cat.classList.add('face-r'); }
}
function getCatLeftPct(){
  // 解析当前 left（百分比字符串）
  const v = $cat.style.left || '35%';
  return parseFloat(v) || 35;
}
function catWalkToPct(targetPct, onArrive){
  const cur = getCatLeftPct();
  const dir = targetPct > cur ? 'r' : 'l';
  setCatState('walk', dir);
  $cat.style.left = targetPct + '%';
  if (catWalkTimer) clearTimeout(catWalkTimer);
  // CSS transition 是 3.5s，留点缓冲
  catWalkTimer = setTimeout(() => {
    setCatState('idle');
    if (onArrive) onArrive();
  }, 3600);
}

// 捐赠时：橘猫蹭到对应展厅区域 → 蹦跳欢呼
function catWalkTo(chainKey){
  const positions = { cat: 25, fossil: 50, relic: 72 };
  const pos = positions[chainKey] != null ? positions[chainKey] : 50;
  catWalkToPct(pos, () => {
    setCatState('cheer');
    setTimeout(() => setCatState('idle'), 2400);
  });
}

// 自由游荡：随机走/坐/趴循环
function startCatWander(){
  // 初始化时给大猫注入 SVG（只注入一次）
  if (!$cat.querySelector('svg')){
    $cat.innerHTML = kittySVG();
  }
  const tick = () => {
    if (catWalkTimer) clearTimeout(catWalkTimer);
    const r = Math.random();
    if (r < 0.55){
      // 走到一个随机点
      const x = 15 + Math.random() * 70;
      catWalkToPct(x, () => scheduleNext(2500 + Math.random()*2500));
    } else if (r < 0.8){
      // 坐下
      setCatState('sit');
      scheduleNext(3500 + Math.random()*2500);
    } else {
      // 趴下
      setCatState('lay');
      scheduleNext(4500 + Math.random()*3000);
    }
  };
  const scheduleNext = (ms) => {
    if (catTimer) clearTimeout(catTimer);
    catTimer = setTimeout(tick, ms);
  };
  // 启动：先走一段
  setCatState('walk');
  scheduleNext(500);
}

// ---------- 主循环 ----------
function tick(){
  const now = Date.now();
  if (state.energy < getEnergyMax()){
    const elapsed = now - state.lastEnergyTs;
    if (elapsed >= CONFIG.ENERGY_RECOVER_MS){
      const gained = Math.floor(elapsed / CONFIG.ENERGY_RECOVER_MS);
      state.energy = Math.min(getEnergyMax(), state.energy + gained);
      state.lastEnergyTs += gained * CONFIG.ENERGY_RECOVER_MS;
    }
  } else {
    state.lastEnergyTs = now;
  }
  let passive = 0;
  Object.entries(state.exhibits).forEach(([hk, arr]) => {
    let hallSum = 0;
    arr.forEach(ex => { if (ex) hallSum += EXHIBIT_REWARD_GOLD_PER_MIN[ITEMS[ex].lv] || 0; });
    // 装饰 buff（每个 +5%，叠加）
    const buff = (state.decor[hk] || []).reduce((s, did) => {
      const d = (DECOR[hk] || []).find(x => x.id === did);
      return s + (d ? d.buff : 0);
    }, 0);
    passive += hallSum * (1 + buff);
  });
  // === 访客系统调整：基础被动产出降到 30%（保底无人时也有少量收益）===
  // 真正大头在访客驻足产币（spawnCoinFromVisitor）
  passive *= 0.3;
  if (passive > 0){
    state._passiveAcc = (state._passiveAcc || 0) + passive / 60;
    if (state._passiveAcc >= 1){
      const add = Math.floor(state._passiveAcc);
      state.gold += add;
      state._passiveAcc -= add;
    }
  }
  state.orders = state.orders.filter(o => o.expireAt > now);
  updateHUD();
}

// ---------- 启动 ----------
function start(){
  const saved = localStorage.getItem(CONFIG.SAVE_KEY);
  if (saved){
    try {
      const s = JSON.parse(saved);
      Object.assign(state, s);
    } catch(e){}
  }
  // 兼容旧存档：补齐新字段
  if (!state.slotsUnlocked) state.slotsUnlocked = { cat:6, fossil:6, relic:6 };
  // 兼容：以前 SLOT_MAX=12，现在改 8，超过 8 的截断（保留前 8 个数据）
  Object.keys(state.slotsUnlocked).forEach(hk => {
    if (state.slotsUnlocked[hk] > SLOT_MAX) state.slotsUnlocked[hk] = SLOT_MAX;
  });
  if (!state.decor) state.decor = { cat:[], fossil:[], relic:[] };
  if (typeof state.boardTier !== 'number') state.boardTier = 0;
  if (typeof state.energyTier !== 'number') state.energyTier = 0;
  if (!state.shop) state.shop = { day:'', items:[], boughtIdx:[] };
  // 委托系统兼容
  if (typeof state.commissionSlots !== 'number') state.commissionSlots = 1;
  if (!Array.isArray(state.commissions)) state.commissions = [];
  if (typeof state.commissionTotalDone !== 'number') state.commissionTotalDone = 0;
  // 确保 exhibits 数组长度匹配 slotsUnlocked，并截断超长数据
  Object.keys(state.exhibits).forEach(hk => {
    if (state.exhibits[hk].length > SLOT_MAX){
      state.exhibits[hk] = state.exhibits[hk].slice(0, SLOT_MAX);
    }
    while (state.exhibits[hk].length < (state.slotsUnlocked[hk] || 6)){
      state.exhibits[hk].push(null);
    }
  });

  if (!state.board || state.board.length === 0) initBoard();

  setPanelCollapsed(true);  // 默认收起合成台 · 看博物馆全景
  renderBoard();
  renderOrders();
  renderBgExhibits();
  updateHUD();
  updateLvBar();
  startCatWander();
  bindBizButtons();

  if (!state.tutorial.done && state.tutorial.step === 0){
    showModal('🐱 欢迎来到猫咪博物馆', `
      <p class="center">你是这座博物馆的<b>馆长</b>。</p>
      <p class="center">通过<b>合成</b>得到珍贵展品，招待小猫客人，让博物馆越来越大！</p>
      <div class="step-list">
        🎮 <b>3 步玩法</b><br>
        ① 点棋盘上的<b>产出器</b>出材料<br>
        ② 把<b>两个相同的拖到一起</b>合成升级<br>
        ③ 合到 <b>三阶以上</b> 自动飞向身后博物馆
      </div>
      <p class="center" style="font-size:12px;color:#999">跟着上方<b>橙色任务条</b>一步步做就行</p>
    `);
    state.tutorial.step = 1;
    updateGuide();
    renderBoard();
  } else {
    updateGuide();
  }

  setInterval(tick, 1000);
  setInterval(renderBoard, 1000);
  function scheduleOrder(){
    const wait = CONFIG.ORDER_INTERVAL_MIN + Math.random() * (CONFIG.ORDER_INTERVAL_MAX - CONFIG.ORDER_INTERVAL_MIN);
    setTimeout(() => { spawnOrder(); checkOrders(); scheduleOrder(); }, wait);
  }
  scheduleOrder();
  if (state.tutorial.done) setTimeout(spawnOrder, 2000);

  // —— 委托系统启动 ——
  // 把空缺的委托槽都先填满（首次启动 / 老存档兼容）
  while (state.commissions.length < state.commissionSlots){
    if (!spawnCommission()) break;
  }
  renderCommissions();

  setInterval(() => {
    try { localStorage.setItem(CONFIG.SAVE_KEY, JSON.stringify(state)); } catch(e){}
  }, 5000);
}
window.addEventListener('load', start);

// =====================================================
// ============ 访客系统（Step 1）============
// 5 种参观猫，从入口进 → 走到展柜前驻足 → 冒气泡 → 产币 → 离场
// 只在博物馆面板打开时运行
// =====================================================

// 5 种参观猫的配置
// palette 用于复用 kittySVG 的色板（通过传入对象 override 默认色）
// accessory 是额外的 SVG 配件（戴在头上的帽/眼镜/项圈）
const VISITOR_TYPES = {
  // 路人猫：橘白家猫，最普通
  passer: {
    name: '路人猫',
    weight: 50,                // 出现概率权重
    palette: { brown:'#E89A5C', brownDk:'#A85020', white:'#FFFCF2', whiteSh:'#E8DDC2', pink:'#F0A8AE' },
    accessory: '',             // 无配件
    coin: 1,                   // 每次驻足产币
    stayMs: [3000, 4500],      // 驻足时长区间（毫秒）
    bubbles: ['喵～挺有意思', '哇好看', '不错不错', '😺'],
    chainPref: null,           // 偏好（null=随机）
    minLv: 1,                  // 看几阶以上展品
  },
  // 学生猫：浅灰带学士帽
  student: {
    name: '学生猫',
    weight: 25,
    palette: { brown:'#9AA3B0', brownDk:'#5A6271', white:'#F5F7FA', whiteSh:'#DDE2EA', pink:'#E8A5AC' },
    accessory: 'cap',          // 学士帽
    coin: 2,
    stayMs: [3500, 5000],
    bubbles: ['这个考试会考！', '📚 笔记一下', '原来如此', '研究研究'],
    chainPref: null,
    minLv: 1,
  },
  // 老绅士猫：黑白燕尾服 + 单片眼镜
  gentleman: {
    name: '老猫绅士',
    weight: 12,
    palette: { brown:'#3D2818', brownDk:'#1A1410', white:'#FFFFFF', whiteSh:'#D8D2C8', pink:'#E8A5AC' },
    accessory: 'monocle',
    coin: 3,
    stayMs: [5000, 7000],
    bubbles: ['咳咳，老夫见过更好的', '尚可', '依稀想起年轻时…', '👴 不错'],
    chainPref: 'relic',        // 偏爱古董馆
    minLv: 2,
  },
  // VIP 富贵猫：白色长毛 + 金冠
  vip: {
    name: 'VIP贵宾',
    weight: 8,
    palette: { brown:'#F0DCB0', brownDk:'#A88848', white:'#FFFEF5', whiteSh:'#E8DEB8', pink:'#E8A5AC' },
    accessory: 'crown',
    coin: 10,
    stayMs: [4000, 5500],
    bubbles: ['本喵满意 👑', '勉强入眼', '收下了', '✨ 极品'],
    chainPref: null,
    minLv: 4,                   // 只看 4 阶以上
  },
  // 学者猫：棕毛 + 圆眼镜
  scholar: {
    name: '学者猫',
    weight: 5,
    palette: { brown:'#A85020', brownDk:'#5A2510', white:'#F4D8B4', whiteSh:'#D8B888', pink:'#F0A8AE' },
    accessory: 'glasses',
    coin: 5,
    stayMs: [6000, 8000],
    bubbles: ['让本博士鉴定一下…', '🤓 有意思', '存档存档', '这是真品'],
    chainPref: 'fossil',        // 偏爱化石
    minLv: 2,
    bonusPlan: 0.15,            // 15% 概率额外 +1 图纸
  },
};

// 配件 SVG（叠加在头上）
function accessorySVG(type){
  switch(type){
    case 'cap': // 学士帽
      return `<g transform="translate(50,18)">
        <rect x="-14" y="-2" width="28" height="4" fill="#1A1410"/>
        <path d="M -18,0 L 18,0 L 14,-2 L -14,-2 Z" fill="#1A1410"/>
        <rect x="-1" y="-2" width="2" height="-8" fill="#FFD080" transform="translate(0,-2)"/>
        <circle cx="0" cy="-9" r="2.5" fill="#FFD080"/>
      </g>`;
    case 'monocle': // 单片眼镜（右眼）
      return `<g>
        <circle cx="62" cy="44" r="7" fill="none" stroke="#1A1410" stroke-width="1.4"/>
        <path d="M 69,46 L 73,52" stroke="#1A1410" stroke-width="1.2"/>
      </g>`;
    case 'crown': // 金皇冠
      return `<g transform="translate(50,16)">
        <path d="M -14,2 L -10,-8 L -5,2 L 0,-12 L 5,2 L 10,-8 L 14,2 L 12,6 L -12,6 Z"
              fill="#FFD080" stroke="#8A6332" stroke-width="1.2" stroke-linejoin="round"/>
        <circle cx="0" cy="-12" r="1.6" fill="#E84545"/>
        <circle cx="-10" cy="-8" r="1.2" fill="#4080E8"/>
        <circle cx="10" cy="-8" r="1.2" fill="#4080E8"/>
      </g>`;
    case 'glasses': // 圆眼镜
      return `<g>
        <circle cx="38" cy="44" r="6" fill="none" stroke="#1A1410" stroke-width="1.6"/>
        <circle cx="62" cy="44" r="6" fill="none" stroke="#1A1410" stroke-width="1.6"/>
        <path d="M 44,44 L 56,44" stroke="#1A1410" stroke-width="1.4"/>
      </g>`;
    default: return '';
  }
}

// 生成访客 SVG（用 kittySVG 接收 palette + 注入 accessory）
function visitorSVG(typeKey){
  const t = VISITOR_TYPES[typeKey];
  const baseSvg = kittySVG(t.palette);
  const acc = accessorySVG(t.accessory);
  if (!acc) return baseSvg;
  // 把 acc 插在 svg 关闭前
  return baseSvg.replace('</svg>', acc + '</svg>');
}

// 按权重抽一个类型
function pickVisitorType(){
  const total = Object.values(VISITOR_TYPES).reduce((s,t)=>s+t.weight, 0);
  let r = Math.random() * total;
  for (const [key, t] of Object.entries(VISITOR_TYPES)){
    r -= t.weight;
    if (r <= 0) return key;
  }
  return 'passer';
}

// 访客状态
const visitorState = {
  list: [],          // 当前在场的访客
  spawnTimer: null,
  visitedCount: 0,   // 累计接待
  popularity: 0,     // 当前人气分（在场访客数 + 加权）
};

// 获取当前展厅的可参观展柜列表（已陈列展品的位置）
// 现在 visitors-floor 在 museum-aisle 内部，展柜在 aisle 上方/下方
// 访客只能在 aisle 内走，所以"驻足点"是展柜在 aisle 内的投影位置
function getVisitableSlots(){
  const $floor = document.getElementById('visitors-floor');
  if (!$floor) return [];
  const floorR = $floor.getBoundingClientRect();
  // 远柜（在 aisle 上方）→ 驻足点 = aisle 顶部 + 偏移
  // 近柜（在 aisle 下方）→ 驻足点 = aisle 底部 - 偏移
  const farSlots = document.querySelectorAll('#cases-far .exhibit-slot.filled');
  const nearSlots = document.querySelectorAll('#cases-near .exhibit-slot.filled');
  const list = [];
  farSlots.forEach((slot) => {
    const r = slot.getBoundingClientRect();
    list.push({
      el: slot,
      x: r.left - floorR.left + r.width / 2,    // 展柜中心 x（相对 aisle）
      y: floorR.height * 0.20,                  // 远柜驻足：aisle 顶部 20% 处
      depth: 'far',
    });
  });
  nearSlots.forEach((slot) => {
    const r = slot.getBoundingClientRect();
    list.push({
      el: slot,
      x: r.left - floorR.left + r.width / 2,
      y: floorR.height * 0.78,                  // 近柜驻足：aisle 底部 22% 处
      depth: 'near',
    });
  });
  return list;
}

// 决定一只访客该去哪个展柜
function chooseTargetSlot(typeKey){
  const t = VISITOR_TYPES[typeKey];
  const slots = getVisitableSlots();
  if (!slots.length) return null;

  // 收集每个展柜对应的展品阶数（从 state.exhibits 推导）
  const hk = state.currentHall;
  const exhibits = state.exhibits[hk] || [];
  // 远柜对应 idx 0-3，近柜对应 idx 4-7
  // 但 .filled 只取已陈列的——按 DOM 顺序对应非空展品
  const farFilledIdx = [];   // 远柜中已 filled 的 idx
  const nearFilledIdx = [];
  for (let i = 0; i < 4; i++) if (exhibits[i]) farFilledIdx.push(i);
  for (let i = 4; i < 8; i++) if (exhibits[i]) nearFilledIdx.push(i);

  // 过滤：满足该访客的 minLv
  const ok = [];
  let farPtr = 0, nearPtr = 0;
  slots.forEach((s) => {
    let exId;
    if (s.depth === 'far'){ exId = exhibits[farFilledIdx[farPtr++]]; }
    else { exId = exhibits[nearFilledIdx[nearPtr++]]; }
    if (!exId) return;
    const def = ITEMS[exId];
    if (!def) return;
    if (def.lv < t.minLv) return;
    ok.push({ ...s, exId, lv: def.lv });
  });
  if (!ok.length) return null;
  // 随机一个（高阶展品稍微加权）
  const weights = ok.map(s => s.lv);
  const total = weights.reduce((a,b)=>a+b,0);
  let r = Math.random() * total;
  for (let i = 0; i < ok.length; i++){
    r -= weights[i];
    if (r <= 0) return ok[i];
  }
  return ok[0];
}

// 生成一只访客
function spawnVisitor(){
  const $hallOv = document.getElementById('hall-overlay');
  if (!$hallOv || !$hallOv.classList.contains('show')) return;
  const $floor = document.getElementById('visitors-floor');
  if (!$floor) return;

  // 在场上限：根据已陈列展品数量决定
  const filledCount = (state.exhibits[state.currentHall] || []).filter(e=>e).length;
  const maxVisitors = Math.min(6, Math.max(1, filledCount + 1));
  if (visitorState.list.length >= maxVisitors) return;

  const typeKey = pickVisitorType();
  const target = chooseTargetSlot(typeKey);
  if (!target) return;  // 没有可看的展品，不生成

  const t = VISITOR_TYPES[typeKey];
  const el = document.createElement('div');
  el.className = 'visitor entering';
  // 起始：左侧入口外（aisle 中部高度）
  const floorRect = $floor.getBoundingClientRect();
  const startY = floorRect.height * 0.5 - 23;  // aisle 垂直中心，23 是访客一半高度
  el.style.left = '-50px';
  el.style.top = startY + 'px';
  el.innerHTML = visitorSVG(typeKey);
  // 气泡占位
  const bubble = document.createElement('div');
  bubble.className = 'bubble';
  el.appendChild(bubble);

  $floor.appendChild(el);

  const visitor = {
    el, bubble, typeKey, type: t,
    target, state: 'entering',
    startY,
    spawnTime: Date.now(),
  };
  visitorState.list.push(visitor);
  visitorState.visitedCount++;

  // 步骤 1：入场（淡入 + 走到入口内侧）
  requestAnimationFrame(() => {
    el.classList.remove('entering');
    el.classList.add('live', 'walking');
    // 走到入口内（aisle 左侧 50px 处，垂直居中）
    el.style.left = '50px';
    el.style.top = startY + 'px';
    setTimeout(() => walkToTarget(visitor), 800);
  });
}

// 走到目标展柜前
function walkToTarget(visitor){
  if (!visitor.el.isConnected) return;
  const $floor = document.getElementById('visitors-floor');
  if (!$floor) return cleanupVisitor(visitor);

  // 目标位置（驻足点已经是合理的位置，访客中心对齐）
  const tx = visitor.target.x - 23;       // 23 是访客一半宽度
  const ty = visitor.target.y - 23;       // y 也是中心点

  visitor.state = 'walking';
  visitor.el.classList.remove('gazing');
  visitor.el.classList.add('walking');
  // 朝向：根据 dx 决定
  const curLeft = parseFloat(visitor.el.style.left) || 0;
  if (tx > curLeft) visitor.el.classList.remove('face-l');
  else visitor.el.classList.add('face-l');

  // 深度分层（基于目标的 depth 标记）
  visitor.el.classList.remove('depth-far','depth-mid','depth-near');
  if (visitor.target.depth === 'far') visitor.el.classList.add('depth-far');
  else visitor.el.classList.add('depth-near');

  visitor.el.style.left = tx + 'px';
  visitor.el.style.top = ty + 'px';

  // 4.2s 走到（match transition）
  setTimeout(() => gazeAtExhibit(visitor), 4300);
}

// 驻足看展
function gazeAtExhibit(visitor){
  if (!visitor.el.isConnected) return cleanupVisitor(visitor);
  const $hallOv = document.getElementById('hall-overlay');
  if (!$hallOv || !$hallOv.classList.contains('show')) return cleanupVisitor(visitor);

  visitor.state = 'gazing';
  visitor.el.classList.remove('walking');
  visitor.el.classList.add('gazing');

  // 展柜亮起
  if (visitor.target.el){
    visitor.target.el.classList.add('action');
    setTimeout(() => visitor.target.el && visitor.target.el.classList.remove('action'), 2500);
  }

  // 冒气泡（随机选一句）
  const txt = visitor.type.bubbles[Math.floor(Math.random() * visitor.type.bubbles.length)];
  visitor.bubble.textContent = txt;
  visitor.bubble.classList.remove('show');
  void visitor.bubble.offsetWidth;  // 重启动画
  visitor.bubble.classList.add('show');

  // 1.5s 后产币
  setTimeout(() => spawnCoinFromVisitor(visitor), 1500);

  // 驻足时长
  const stay = visitor.type.stayMs[0] + Math.random() * (visitor.type.stayMs[1] - visitor.type.stayMs[0]);
  setTimeout(() => leaveVisitor(visitor), stay);
}

// 访客头顶飞出金币 → 飘向顶部金币计数
function spawnCoinFromVisitor(visitor){
  if (!visitor.el.isConnected) return;
  const r = visitor.el.getBoundingClientRect();
  const coinAmount = visitor.type.coin;

  // 计算落点（顶部金币显示）
  const goldEl = document.getElementById('gold');
  const goldRect = goldEl ? goldEl.getBoundingClientRect() : { left: window.innerWidth/2, top: 24, width:0, height:0 };

  const coin = document.createElement('div');
  coin.className = 'coin-pop start';
  coin.textContent = '+' + coinAmount;
  coin.style.left = (r.left + r.width/2 - 14) + 'px';
  coin.style.top  = (r.top - 10) + 'px';
  document.body.appendChild(coin);

  requestAnimationFrame(() => {
    coin.classList.remove('start');
    coin.classList.add('fly');
    coin.style.left = (goldRect.left + goldRect.width/2 - 14) + 'px';
    coin.style.top  = (goldRect.top + goldRect.height/2 - 14) + 'px';
  });
  setTimeout(() => coin.remove(), 1100);

  // 实际加金币（落到顶部时）
  setTimeout(() => {
    state.gold += coinAmount;
    // 学者偶尔送图纸
    if (visitor.type.bonusPlan && Math.random() < visitor.type.bonusPlan){
      state.plan += 1;
      toast('🤓 学者赠 +1📜');
    }
    // 顶部金币计数轻微跳动
    if (goldEl){
      goldEl.style.transition = 'transform .15s';
      goldEl.style.transform = 'scale(1.3)';
      setTimeout(() => goldEl.style.transform = '', 200);
    }
    updateHUD();
  }, 900);
}

// 离场
function leaveVisitor(visitor){
  if (!visitor.el.isConnected) return cleanupVisitor(visitor);
  visitor.state = 'leaving';
  visitor.el.classList.remove('gazing');
  visitor.el.classList.add('walking', 'leaving');
  // 朝右走出（往右出口）
  visitor.el.classList.remove('face-l');
  const $floor = document.getElementById('visitors-floor');
  const floorW = $floor ? $floor.getBoundingClientRect().width : 400;
  visitor.el.style.left = (floorW + 60) + 'px';
  visitor.el.style.top = visitor.startY + 'px';
  setTimeout(() => cleanupVisitor(visitor), 3200);
}

function cleanupVisitor(visitor){
  if (visitor.el && visitor.el.parentElement) visitor.el.remove();
  const i = visitorState.list.indexOf(visitor);
  if (i >= 0) visitorState.list.splice(i, 1);
  updatePopularity();
}

// 人气分计算 = 在场人数 * 1 + VIP/学者额外加权
function updatePopularity(){
  let pop = 0;
  visitorState.list.forEach(v => {
    pop += 1;
    if (v.typeKey === 'vip') pop += 3;
    else if (v.typeKey === 'scholar' || v.typeKey === 'gentleman') pop += 1;
  });
  visitorState.popularity = pop;
  const $cnt = document.getElementById('pop-count');
  const $st = document.getElementById('pop-stars');
  if ($cnt) $cnt.textContent = pop;
  if ($st){
    let stars;
    if (pop >= 12) stars = '⭐⭐⭐⭐⭐';
    else if (pop >= 8) stars = '⭐⭐⭐⭐';
    else if (pop >= 5) stars = '⭐⭐⭐';
    else if (pop >= 2) stars = '⭐⭐';
    else stars = '⭐';
    $st.textContent = stars;
  }
}

// 启停访客系统
function startVisitorSystem(){
  stopVisitorSystem();  // 先清掉旧的
  // 立即生成 1-2 只
  setTimeout(spawnVisitor, 300);
  setTimeout(spawnVisitor, 1500);
  // 周期生成
  visitorState.spawnTimer = setInterval(() => {
    spawnVisitor();
    updatePopularity();
  }, 4000);
}
function stopVisitorSystem(){
  if (visitorState.spawnTimer){
    clearInterval(visitorState.spawnTimer);
    visitorState.spawnTimer = null;
  }
  // 清掉所有在场访客
  const $floor = document.getElementById('visitors-floor');
  if ($floor) $floor.innerHTML = '';
  visitorState.list = [];
  updatePopularity();
}

// 当展厅切换时刷新访客（清掉重启）
function onHallChanged(){
  stopVisitorSystem();
  // 该馆已解锁且有展品才启动
  const hk = state.currentHall;
  if (state.unlocked[hk]){
    const hasExhibit = (state.exhibits[hk] || []).some(e => e);
    if (hasExhibit){
      // 等 grid 渲染完再启动
      setTimeout(startVisitorSystem, 400);
    }
  }
}

// 双击顶栏复位（保留作为隐藏入口）
document.querySelector('.topbar').addEventListener('dblclick', () => {
  if (confirm('清空存档重新开始?')){
    localStorage.removeItem(CONFIG.SAVE_KEY);
    location.reload();
  }
});

// 设置面板
(function bindSettings(){
  const $btn   = document.getElementById('settings-btn');
  const $mask  = document.getElementById('settings-mask');
  const $close = document.getElementById('set-close');
  const $reset = document.getElementById('set-restart');
  const $exp   = document.getElementById('set-export');
  if (!$btn || !$mask) return;
  const open  = () => { $mask.style.display = 'flex'; };
  const close = () => { $mask.style.display = 'none'; };
  $btn.addEventListener('click', open);
  $close.addEventListener('click', close);
  $mask.addEventListener('click', e => { if (e.target === $mask) close(); });
  // 二次确认：点一次变红警告，3 秒内再点才真清档
  let armed = false, armTimer = null;
  const origText = $reset.innerHTML;
  $reset.addEventListener('click', () => {
    if (!armed){
      armed = true;
      $reset.innerHTML = '⚠️ 再点一次确认清档（3s）';
      $reset.style.background = 'linear-gradient(180deg,#FFD500,#E89A00)';
      $reset.style.color = '#5C1010';
      armTimer = setTimeout(() => {
        armed = false;
        $reset.innerHTML = origText;
        $reset.style.background = 'linear-gradient(180deg,#E84545,#A82020)';
        $reset.style.color = '#FFFBEF';
      }, 3000);
      return;
    }
    clearTimeout(armTimer);
    try { localStorage.removeItem(CONFIG.SAVE_KEY); } catch(_){}
    location.reload();
  });
  $exp.addEventListener('click', () => {
    const data = localStorage.getItem(CONFIG.SAVE_KEY) || '{}';
    navigator.clipboard?.writeText(data).then(
      () => toast('✓ 存档已复制到剪贴板'),
      () => {
        // fallback
        const ta = document.createElement('textarea');
        ta.value = data; document.body.appendChild(ta); ta.select();
        try { document.execCommand('copy'); toast('✓ 存档已复制'); } catch(_){ toast('复制失败'); }
        document.body.removeChild(ta);
      }
    );
  });
})();
