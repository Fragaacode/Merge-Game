let boxes = [];
let currentBox = null;
let maxLevel = 1;
let score = 0;
let highScore = 0;
let scoreText;

let gameOverTimer = null;
let gameIsOver = false;

const BASE_SIZE = 60;
const GAME_OVER_Y = 100;
const GAME_OVER_TIME = 1500;


// ===================
// MENU
// ===================

class MenuScene extends Phaser.Scene {

  constructor() {
    super('MenuScene');
  }

  preload() {
    // Cargar fondo
    this.load.image('bg', 'assets/images/fondo2.png');
  }

  create() {
    const width = this.scale.width;
    const height = this.scale.height;

    // Fondo proporcional
    const bg = this.add.image(width / 2, height / 2, 'bg');
    const scaleX = width / bg.width;
    const scaleY = height / bg.height;
    const scale = Math.max(scaleX, scaleY); // cubre todo el canvas
    bg.setScale(scale);
    bg.setDepth(-10);

    // Opcional: un overlay oscuro semi-transparente si querés
    this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.2).setDepth(-9);

    // Título con sombra
    this.add.text(
      width / 2+10,
      120,
      'JUEGOFRUTODRILLO ',
      {
        fontSize: '35px',
        color: '#ffffff',
        fontStyle: 'bold italic',
        shadow: {
          offsetX: 7,
          offsetY: 8,
          color: '#000000',
          blur: 9,
          stroke: true,
          fill: true
        }
      }
    ).setOrigin(0.5).setDepth(2);

    // Record
    const record = localStorage.getItem('mergeHighScore') || 0;
    this.add.text(
      width / 2,
      180,
      'Record: ' + record,
      {
        fontSize: '20px',
        color: '#ffffff',
        fontStyle: 'bold italic',
        shadow: {
          offsetX: 1,
          offsetY: 1,
          color: '#000000',
          blur: 9,
          stroke: true,
          fill: true
        }
      }
    ).setOrigin(0.5).setDepth(2);

    // Botón JUGAR
    const btn = this.add.circle(
      width / 2,
      height / 2 - 50,
      60,
      1,
      0x4CAF50
    ).setInteractive().setDepth(1);

    const btnText = this.add.text(
      width / 2,
      height / 2 - 50,
      'JUGAR',
      {
        fontSize: '22px',
        color: '#ffffff',
        fontStyle: 'bold italic',
        shadow: {
          offsetX: 1,
          offsetY: 1,
          color: '#000000',
          blur: 1,
          stroke: true,
          fill: true
        }
      }
    ).setOrigin(0.5).setDepth(2);

    // Botón RESET (más abajo para que no se superponga)
    const resetBtn = this.add.circle(
      width / 2,
      height / 2 + 90, // baja más el botón RESET
      60,
      1,
      0x4CAF50,
    ).setInteractive().setDepth(1);
    const resetText = this.add.text(
      width / 2,
      height / 2 + 90,
      'Arrancar\n a pelo',
      {
        fontSize: '22px',
        color: '#ffffff',
        fontStyle: 'bold italic',
        shadow: {
          offsetX: 1,
          offsetY: 1,
          color: '#000000',
          blur: 1,
          stroke: true,
          fill: true
        }
      }
    ).setOrigin(0.5).setDepth(2);
    resetBtn.on('pointerdown', () => {
      localStorage.removeItem('mergeGameState');
      // Solo feedback de texto, NO cambiar color ni opacidad
      resetText.setText('Al toke\n  ñeri');
      this.time.delayedCall(900, () => {
        resetText.setText('Arrancar\n  a pelo');
      });
    });

    // Acción al tocar
    btn.on('pointerdown', () => {
      this.scene.start('GameScene');
    });

    // Hint para móvil
    this.add.text(
      width / 2,
      height - 60,
      'Tocá para jugar',
      {
        fontSize: '14px',
        color: '#ffffff',
        shadow: {
          offsetX: 1,
          offsetY: 1,
          color: '#000000',
          blur: 1,
          stroke: true,
          fill: true
        }
      }
    ).setOrigin(0.5).setDepth(2);
  }
}



// ===================
// GAME
// ===================

class GameScene extends Phaser.Scene {

  constructor() {
    super('GameScene');
  }

  preload() {

    this.load.image('bggame', 'assets/images/fondo.png');
    for (let i = 1; i <= 10; i++) {

      this.load.image(
        'lvl' + i,
        'assets/images/lvl' + i + '.png'
      );

      this.load.audio(
        'lvl' + i,
        'assets/sounds/lvl' + i + '.mp3'
      );
    }
    
  }


  create() {

    const bg = this.add.image(this.scale.width / 2, this.scale.height / 2, 'bggame');
    bg.setDisplaySize(this.scale.width, this.scale.height);
    bg.setDepth(-10);

    // Overlay semitransparente para que se vea el juego
    const overlay = this.add.rectangle(
      this.scale.width / 2,
      this.scale.height / 2,
      this.scale.width,
      this.scale.height,
      0x000000,
      0.25
    );
    overlay.setDepth(-5);

    // ────────────────────────────────────────────────
    // 1. DEFINIR LAS MEDIDAS DEL CUBO (esto es lo que faltaba)
    // ────────────────────────────────────────────────
    const w = this.scale.width;
    const h = this.scale.height;

    this.cubeWidth  = w * 0.8;           // ancho visible
    this.cubeHeight = h * 0.8;          // alto (ajustado para que quepa bien)
    this.cubeDepth  = 20;                // profundidad para la perspectiva 3D
    this.cubeX      = w / 2;             // centro horizontal
    this.cubeY      = h - this.cubeHeight / 2 - 30;  // posición vertical

    // Límites para el movimiento del círculo actual y spawn
    this.cubeLimits = {
      minX: this.cubeX - this.cubeWidth / 2 + BASE_SIZE / 2,
      maxX: this.cubeX + this.cubeWidth / 2 - BASE_SIZE / 2,
      topY: 80,                            // altura donde aparecen los nuevos
      bottomY: this.cubeY + this.cubeHeight / 2 - BASE_SIZE / 2
    };

    // Esquinas del cubo (para dibujar los bordes)
    const left   = this.cubeX - this.cubeWidth / 2;
    const right  = this.cubeX + this.cubeWidth / 2;
    const top    = this.cubeY - this.cubeHeight / 2;
    const bottom = this.cubeY + this.cubeHeight / 2;

    // ────────────────────────────────────────────────
    // 2. DIBUJO DEL RECIPIENTE: caja de vidrio 3D transparente
    // ────────────────────────────────────────────────
    const graphics = this.add.graphics().setDepth(-2);

    // Colores y transparencias para efecto "vidrio"
    const colorCara = 0xffffff; // blanco para caras
    const colorBorde = 0x4ecdc4; // cian suave para bordes
    const alphaCara = 0.13; // transparencia de las caras
    const alphaBorde = 0.45;
    const alphaReflejo = 0;

    // Puntos del cubo en perspectiva
    const p1 = { x: left + this.cubeDepth+20, y: top -15 }; // esquina sup izq (fondo)
    const p2 = { x: right - this.cubeDepth-20, y: top -15}; // esquina sup der (fondo)
    const p3 = { x: right, y: bottom }; // esquina inf der (frente)
    const p4 = { x: left, y: bottom }; // esquina inf izq (frente)
    const p5 = { x: left, y: top }; // esquina sup izq (frente)
    const p6 = { x: right, y: top }; // esquina sup der (frente)

    // Fondo (cara superior)
    graphics.fillStyle(colorCara, alphaCara);
    graphics.beginPath();
    graphics.moveTo(p1.x, p1.y);
    graphics.lineTo(p2.x, p2.y);
    graphics.lineTo(p6.x, p6.y);
    graphics.lineTo(p5.x, p5.y);
    graphics.closePath();
    graphics.fillPath();

    // Lateral izquierdo
    graphics.fillStyle(colorCara, alphaCara);
    graphics.beginPath();
    graphics.moveTo(p5.x, p5.y);
    graphics.lineTo(p1.x, p1.y);
    graphics.lineTo(p4.x, p4.y);
    graphics.closePath();
    graphics.fillPath();

    // Lateral derecho
    graphics.fillStyle(colorCara, alphaCara);
    graphics.beginPath();
    graphics.moveTo(p2.x, p2.y);
    graphics.lineTo(p6.x, p6.y);
    graphics.lineTo(p3.x, p3.y);
    graphics.closePath();
    graphics.fillPath();

    // Base (cara inferior)
    graphics.fillStyle(colorCara, alphaCara);
    graphics.beginPath();
    graphics.moveTo(p4.x, p4.y);
    graphics.lineTo(p3.x, p3.y);
    graphics.lineTo(p6.x, p6.y);
    graphics.lineTo(p5.x, p5.y);
    graphics.closePath();
    graphics.fillPath();

    // Reflejo sutil en la cara superior
    graphics.fillStyle(0xffffff, alphaReflejo);
    graphics.beginPath();
    graphics.moveTo(p1.x + 10, p1.y + 8);
    graphics.lineTo(p2.x - 10, p2.y + 8);
    graphics.lineTo(p2.x - 30, p2.y + 18);
    graphics.lineTo(p1.x + 30, p1.y + 18);
    graphics.closePath();
    graphics.fillPath();

    // Bordes resaltados
    graphics.lineStyle(3, colorBorde, alphaBorde);
    graphics.beginPath();
    graphics.moveTo(p1.x, p1.y);
    graphics.lineTo(p2.x, p2.y);
    graphics.lineTo(p3.x, p3.y);
    graphics.lineTo(p4.x, p4.y);
    graphics.lineTo(p1.x, p1.y);
    graphics.moveTo(p1.x, p1.y);
    graphics.lineTo(p5.x, p5.y);
    graphics.lineTo(p6.x, p6.y);
    graphics.lineTo(p2.x, p2.y);
    graphics.moveTo(p5.x, p5.y);
    graphics.lineTo(p4.x, p4.y);
    graphics.lineTo(p3.x, p3.y);
    graphics.lineTo(p6.x, p6.x);
    graphics.strokePath();
// Puntos traseros inferiores (base del cubo atrás)
const p7 = { x: left + this.cubeDepth +20, y: bottom-80 };  // trasero izq abajo
const p8 = { x: right - this.cubeDepth -20, y: bottom -80}; // trasero der abajo

// Líneas diagonales desde el frente hacia atrás
graphics.lineStyle(3, colorBorde, alphaBorde);
graphics.beginPath();
graphics.moveTo(p4.x, p4.y); // frente izq abajo
graphics.lineTo(p7.x, p7.y); // trasero izq abajo
graphics.moveTo(p3.x, p3.y); // frente der abajo
graphics.lineTo(p8.x, p8.y); // trasero der abajo
graphics.strokePath();

// Líneas verticales traseras hacia el techo
graphics.moveTo(p7.x, p7.y); // trasero izq abajo
graphics.lineTo(p1.x, p1.y); // trasero izq arriba
graphics.moveTo(p8.x, p8.y); // trasero der abajo
graphics.lineTo(p2.x, p2.y); // trasero der arriba
// Línea que une p7 y p8 en el piso trasero
graphics.moveTo(p7.x, p7.y);
graphics.lineTo(p8.x, p8.y);
graphics.strokePath();
    // Reset variables
    boxes = [];
    currentBox = null;
    maxLevel = 1;
    score = 0;
    gameIsOver = false;
    gameOverTimer = null;
    highScore = localStorage.getItem('mergeHighScore') || 0;

    // Unlock audio
    this.input.once('pointerdown', () => {
      this.sound.unlock();
    });

    // Paredes físicas (solo una vez)
    const wallThickness = 40;
    this.matter.add.rectangle(left - wallThickness / 2, this.cubeY, wallThickness, this.cubeHeight + 100, { isStatic: true });
    this.matter.add.rectangle(right + wallThickness / 2, this.cubeY, wallThickness, this.cubeHeight + 100, { isStatic: true });
    this.matter.add.rectangle(this.cubeX, bottom + wallThickness / 2, this.cubeWidth + wallThickness, wallThickness, { isStatic: true });

    // Línea peligro (solo una vez)
    this.dangerLine = this.add.rectangle(this.cubeX, GAME_OVER_Y, this.cubeWidth, 4, 0xff0000);
    this.dangerLine.setAlpha(0);

    // ScoreText (solo una vez)
    scoreText = this.add.text(
      20,
      15,
      '',
      {
        fontSize: '22px',
        color: '#ffffff',
        fontStyle: 'bold italic',
        stroke: '#000000',
        strokeThickness: 4,
        shadow: { offsetX: 2, offsetY: 2, color: '#000000', blur: 5, fill: true }
      }
    ).setDepth(6);

    // ────────────────────────────────────────────────
    // CARGAR ESTADO GUARDADO (con seguridad total)
    // ────────────────────────────────────────────────
    const savedState = localStorage.getItem('mergeGameState');
    let loaded = false;
    if (savedState) {
      try {
        const state = JSON.parse(savedState);
        score = state.score || 0;
        highScore = state.highScore || 0;
        maxLevel = state.maxLevel || 1;
        boxes = [];
        let restoredCurrentBox = null;
        let restoredCurrentBoxIndex = (typeof state.currentBoxIndex === 'number') ? state.currentBoxIndex : -1;
        if (state.boxes && Array.isArray(state.boxes)) {
          state.boxes.forEach((savedBox, i) => {
            const box = this.matter.add.image(savedBox.x, savedBox.y, 'lvl' + savedBox.level);
            box.setOrigin(0.5, 0.5);
            box.setDisplaySize(savedBox.size, savedBox.size);
            box.setCircle(savedBox.size / 2);
            box.setBounce(0.1);
            box.setFriction(0.02);
            box.setDensity(0.001);
            box.level = savedBox.level;
            box.size = savedBox.size;
            box.merging = false;
            if (i === restoredCurrentBoxIndex) {
              box.setStatic(true);
              restoredCurrentBox = box;
            } else {
              box.setStatic(false);
            }
            boxes.push(box);
            this.time.delayedCall(0, () => {
              makeCircleMask(this, box, savedBox.size);
            });
          });
        }
        currentBox = restoredCurrentBox;
        loaded = true;
        updateScoreText();
        // Si no hay bloque flotante restaurado, crear uno nuevo
        if (!currentBox) {
          spawnNewBox(this);
        }
      } catch (e) {
        localStorage.removeItem('mergeGameState');
      }
    }
    if (!loaded) {
      score = 0;
      highScore = localStorage.getItem('mergeHighScore') || 0;
      maxLevel = 1;
      boxes = [];
      spawnNewBox(this);
    }
    updateScoreText();

    // Soltar
    this.input.on('pointerdown', () => {
      if (currentBox && !gameIsOver) {
        currentBox.setStatic(false);
        currentBox = null;
        this.time.delayedCall(600, () => {
          spawnNewBox(this);
        });
      }
    });

    // Colisiones
    this.matter.world.on('collisionstart', (event) => {
      if (gameIsOver) return;
      event.pairs.forEach(pair => {
        const a = pair.bodyA.gameObject;
        const b = pair.bodyB.gameObject;
        if (!a || !b) return;
        tryMerge(this, a, b);
      });
    });

    // Botón volver al menú (esquina superior derecha, pequeño y transparente)
    const backBtn = this.add.circle(
      this.scale.width - 32, // margen derecho
      32, // margen superior
      22, // radio pequeño
      0x000000,
      0.32 // bastante transparente
    ).setInteractive().setScrollFactor(0).setDepth(20);
    const backIcon = this.add.text(
      this.scale.width - 32,
      32,
      '⮌', // flecha de retroceso
      {
        fontSize: '22px',
        color: '#ffffff',
        fontStyle: 'bold',
        align: 'center',
        shadow: {
          offsetX: 1,
          offsetY: 1,
          color: '#000000',
          blur: 2,
          stroke: true,
          fill: true
        }
      }
    ).setOrigin(0.5).setDepth(21);
    backBtn.on('pointerdown', () => {
      this.scene.start('MenuScene');
    });
  }


  update() {

    if (gameIsOver) return;


    // Mover bloque actual
    if (currentBox) {
    const x = Phaser.Math.Clamp(this.input.x, this.cubeLimits.minX, this.cubeLimits.maxX);
    currentBox.setPosition(x, currentBox.y);
}

    // Peligro
    let danger = false;

    boxes.forEach(box => {

      if (box.maskShape) {
        box.maskShape.setPosition(box.x, box.y);
      }

      const r = box.size / 2;

      const amount =
        (GAME_OVER_Y - (box.y - r)) / box.size;

      if (amount >= 0.8 && !box.isStatic()) {
        danger = true;
      }
    });


    this.dangerLine.setAlpha(danger ? 1 : 0);


    if (danger && !gameOverTimer) {

      gameOverTimer = this.time.delayedCall(
        GAME_OVER_TIME,
        () => triggerGameOver(this)
      );
    }


    if (!danger && gameOverTimer) {

      gameOverTimer.remove();
      gameOverTimer = null;
    }

  }
}


// ===================
// CONFIG
// ===================

const config = {
  type: Phaser.AUTO,
  width: 360,
  height: 640,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH
  },
  physics: {
    default: 'matter',
    matter: {
      gravity: { y: 1 }
    }
  },
  scene: [
    MenuScene,
    GameScene
  ]
};
new Phaser.Game(config);


// ===================
// FUNCIONES
// ===================

function spawnNewBox(scene) {

  const level = getRandomLevel();
  const size = getSizeByLevel(level);

  const box = scene.matter.add.image(scene.cubeX, scene.cubeLimits.topY, 'lvl' + level);
  box.setDisplaySize(size, size);
  box.setCircle(size / 2);

  box.setBounce(0.1);
  box.setFriction(0.02);
  box.setDensity(0.001);

  box.setStatic(true);

  box.level = level;
  box.size = size;
  box.merging = false;

  boxes.push(box);
  currentBox = box;


  if (level === 1) {
    scene.sound.play('lvl1', { volume: 0.5 });
  }


  scene.time.delayedCall(0, () => {
    makeCircleMask(scene, box, size);
    saveGameState();
  });
}


function tryMerge(scene, a, b) {

  if (!a || !b) return;
  if (!a.active || !b.active) return;
  if (a.level !== b.level) return;
  if (a.merging || b.merging) return;


  a.merging = true;
  b.merging = true;

  a.setStatic(true);
  b.setStatic(true);


  const newLevel = a.level + 1;


// Detiene todos los sonidos activos (incluye merges anteriores, pero no rompe nada)
scene.sound.stopAll();

// Reproducir el último merge
const newSoundKey = 'lvl' + newLevel;
if (scene.cache.audio.exists(newSoundKey)) {
  scene.sound.play(newSoundKey);
}
  score += Math.pow(newLevel, 3) * 5;

  updateScoreText();


  const x = (a.x + b.x) / 2;
  const y = (a.y + b.y) / 2;


  if (a.maskShape) a.maskShape.destroy();
  if (b.maskShape) b.maskShape.destroy();


  boxes = boxes.filter(o => o !== a && o !== b);


  scene.time.delayedCall(10, () => {
    a.destroy();
    b.destroy();
    createMergedBox(scene, x, y, newLevel);
    saveGameState();
  });
}


function createMergedBox(scene, x, y, level) {

  const size = getSizeByLevel(level);

  const box =
    scene.matter.add.image(x, y, 'lvl' + level);

  box.setDisplaySize(size, size);
  box.setCircle(size / 2);

  box.setBounce(0.1);
  box.setFriction(0.02);
  box.setDensity(0.001);

  box.level = level;
  box.size = size;
  box.merging = false;

  boxes.push(box);


  scene.time.delayedCall(0, () => {
    makeCircleMask(scene, box, size);
    saveGameState();
  });
}


function getSizeByLevel(level) {
  return BASE_SIZE * (1 + (level - 1) * 0.18);
}


function getRandomLevel() {

  const maxDrop = Math.max(1, maxLevel - 1);

  let pool = [];

  for (let i = 1; i <= maxDrop; i++) {

    const w = Math.floor(20 / Math.pow(2, i - 1));

    for (let j = 0; j < w; j++) {
      pool.push(i);
    }
  }

  return Phaser.Utils.Array.GetRandom(pool);
}


function makeCircleMask(scene, image, size) {

  const g = scene.make.graphics({
    x: image.x,
    y: image.y,
    add: false
  });

  g.fillStyle(0xffffff);
  g.fillCircle(0, 0, size / 2);

  image.setMask(g.createGeometryMask());

  image.maskShape = g;
}


function triggerGameOver(scene) {

  if (gameIsOver) return;

  gameIsOver = true;


  if (score > highScore) {

    highScore = score;

    localStorage.setItem(
      'mergeHighScore',
      highScore
    );
  }


  scene.matter.world.pause();


  const t = scene.add.text(
  scene.cubeX,          // ← cambio
  scene.cubeY,          // ← cambio
  'PERDISTEDRILLO PTE\nTocá para volver',
  { fontSize: '26px', color: '#ff0000', align: 'center' }
).setOrigin(0.5)


  scene.input.once('pointerdown', () => {
    scene.scene.start('MenuScene');
  });
  localStorage.removeItem('mergeGameState');

}


function updateScoreText() {
  if (score > highScore) {
    highScore = score;
    localStorage.setItem('mergeHighScore', highScore);
  }
  scoreText.setText(
    `Score: ${score}\nRecord: ${highScore}`
  );
}
function saveGameState() {
  const currentBoxIndex = boxes.indexOf(currentBox);
  const state = {
    score,
    highScore,
    maxLevel,
    boxes: boxes.map(box => ({
      level: box.level,
      x: box.x,
      y: box.y,
      size: box.size
    })),
    currentBoxIndex
  };
  localStorage.setItem('mergeGameState', JSON.stringify(state));
}