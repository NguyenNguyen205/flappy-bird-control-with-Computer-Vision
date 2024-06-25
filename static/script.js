// Import and setup socket io
import { io } from "https://cdn.socket.io/4.7.5/socket.io.esm.min.js";
const socket = io("http://localhost:5501");

// Define constants
const CONFIG_WIDTH = 600;
const CONFIG_HEIGHT = 600;
const PIPE_DISTANCE_BETWEEN_Y = CONFIG_HEIGHT / 6;
const PIPES_IN_SCENE = 3;
const PIPE_DISTANCE_BETWEEN_X = CONFIG_WIDTH / PIPES_IN_SCENE;
const BIRD_OFFSET_X = CONFIG_WIDTH / 2;

// Define state variables
let bg;
let bird;
let pipes;
let state;
let gameLoopFn;
let up;
let gameOver = false;
let score = 0;
let mess = "";
let countUp = 0;

// Aliases
let { Application } = PIXI;
let loader = PIXI.Loader.shared;
let { resources } = PIXI.Loader.shared;
let { Sprite } = PIXI;

// Create a Pixi Application
let app = new Application({
  width: CONFIG_WIDTH,
  height: CONFIG_HEIGHT,
  antialias: true,
  transparent: false,
  resolution: window.devicePixelRatio || 1,
  autoDensity: true,
});

// Setup socket io to receive hand gesture notification from the backend
socket.on("noti", (res) => {
  // If unchanged notification, do nothing
  if (res === mess) return;
  mess = res;
  // If notification is not a yes, do nothing
  if (res !== "yes") return;
  // Update bird position
  bird.vy = -2;
  bird.rotation = -0.5;
  // Add up elements
  const ul = document.getElementById("input");
  const li = document.createElement("li");
  // li.innerHTML = `<img src="/static/images/up.png" alt="">`;
  li.innerHTML = `&#8657`;
  ul.insertBefore(li, ul.firstChild);
});

// Add the canvas that Pixi automatically created for you to the HTML document
document.querySelector("#canva").appendChild(app.view);

// Load images and sounds and then run the `setup` callback function
loader
  .add("bgImg", "static/images/bg.png")
  .add("birdImg", "static/images/bird.png")
  .add("pipeImg", "static/images/pipe.png")
  .load(setup);

// Set up the environment
function setup() {
  // Get and set highest score
  document.getElementById("maxScore").innerHTML = localStorage.getItem("score");

  // Make bg cover stage
  bg = new Sprite(resources.bgImg.texture);
  bg.width = CONFIG_WIDTH;
  bg.height = CONFIG_HEIGHT;
  app.stage.addChild(bg);

  // An array to store all of the pipes
  pipes = [];

  // create and insert the pipes
  const numberOfpipes = PIPES_IN_SCENE * 2 + 2;
  let pipeDistanceBtn = PIPE_DISTANCE_BETWEEN_X + BIRD_OFFSET_X; // offset of bird from left along x-axis
  let heightDiff = randomInt(-PIPE_DISTANCE_BETWEEN_Y, PIPE_DISTANCE_BETWEEN_Y);
  for (let i = 0; i < numberOfpipes; i++) {
    const pipe = new Sprite(resources.pipeImg.texture);
    // placement position based on the center of the sprite
    pipe.anchor.set(0.5, 0.5);
    pipe.y = CONFIG_HEIGHT;

    if (i === 0) {
      pipe.x = pipeDistanceBtn;
      pipe.y += heightDiff;
    }

    // even
    if (i !== 0 && i % 2 === 0) {
      pipeDistanceBtn += PIPE_DISTANCE_BETWEEN_X;
      pipe.x = pipeDistanceBtn;
      pipe.y += heightDiff;
    }

    // odd
    if (i % 2 === 1) {
      pipe.x = pipeDistanceBtn;
      pipe.y += heightDiff - CONFIG_HEIGHT;
      heightDiff = randomInt(-PIPE_DISTANCE_BETWEEN_Y, PIPE_DISTANCE_BETWEEN_Y);
      pipe.rotation = Math.PI;
    }
    pipe.vx = 1;
    pipes.push(pipe);
    app.stage.addChild(pipe);
  }

  // Initialize bird object
  bird = new Sprite(resources.birdImg.texture);
  bird.anchor.set(0.5, 0.5);
  bird.position.set(CONFIG_WIDTH / 2, CONFIG_HEIGHT / 2);
  bird.vy = 0;
  app.stage.addChild(bird);

  // add score text
  document.getElementById("score").innerHTML = `${score}`;

  // Capture the keyboard arrow keys
  up = keyboard(["ArrowUp", "click", "touchstart"]);
  up.press = () => {
    bird.vy = -2;
    bird.rotation = -0.5;
    PIXI.sound.play("bird-sound"); // A bug as a feature
  };
  up.release = () => {
    bird.vy = 0;
  };

  // Set the game state
  state = play;

  // Start the game loop
  gameLoopFn = (delta) => gameLoop(delta);
  app.ticker.add(gameLoopFn);

  // listen for a window resize event
  window.addEventListener("resize", resize);

  // call it manually once - make sure the stage is correctly sized on page load
  resize();
}

function gameLoop(delta) {
  // If keyboard enter capture, then restart the games with pipes set to 0
  if (gameOver) {
    pipes.forEach((pipe) => {
      pipe.vx = 0;
    });
    startGameRestart();
  }
  play(delta);
}

const gameRestart = (event) => {
  if (!gameOver) return;
  if (event.key === "Enter") {
    app.ticker.remove(gameLoopFn);
    // Set highest score
    if (localStorage.getItem("score") == null) {
      localStorage.setItem("score", score);
    } else {
      let currentMaxScore = parseInt(localStorage.getItem("score"));
      if (score > currentMaxScore) {
        localStorage.setItem("score", score);
      }
    }

    // Reset every variables
    // document.getElementById("input").innerHTML = `
    //    <li style="visibility: hidden;"><img src="{{ url_for('static', filename='images/up.png') }}" alt=""></li>
    // `;
    document.getElementById("input").innerHTML = `<li>&#8657;</li>`;
    bg = null;
    bird = null;
    pipes = [];
    state = null;
    gameLoopFn = null;
    up = null;
    gameOver = false;
    score = 0;
    app = new Application({
      width: CONFIG_WIDTH,
      height: CONFIG_HEIGHT,
      antialias: true,
      transparent: false,
      resolution: window.devicePixelRatio || 1,
      autoDensity: true,
    });
    document.querySelector("#canva").replaceChildren();
    document.querySelector("#canva").appendChild(app.view);
    loader.reset();
    loader.load(setup);

    document.getElementById("manual").style.visibility = "hidden";
    console.log("Restarting");
    // app.ticker.add(gameLoopFn);
  }
};
function startGameRestart() {
  if (gameOver) {
    document.getElementById("manual").style.visibility = "visible";
  }

  window.addEventListener("keydown", gameRestart);
}

// Running game logic
function play(delta) {
  // gravity - bird falling
  bird.vy += 0.05;
  if (!gameOver) {
    bird.rotation += 0.01;
  }
  // change position based on velocity
  bird.y += bird.vy;

  // Contain the bird inside the stage
  const birdHitsSide = contain(bird, {
    x: bird.width,
    y: 0,
    width: app.stage.width,
    height: CONFIG_HEIGHT + bird.height / 2,
  });
  // If the bird hits the top or bottom of the stage, reverse
  // its direction - make it bounce - acceleration gradually decreases
  if (birdHitsSide === "top" || birdHitsSide === "bottom") {
    bird.vy *= -0.5;
  }

  // reposition pipes after they move out of the scene - illusion of continuous scene
  pipes.forEach((pipe) => {
    const pipeXPos = pipe.x;
    if (pipeXPos < -pipe.width) {
      pipe.x += CONFIG_WIDTH + PIPE_DISTANCE_BETWEEN_X;
    } else {
      // move pipes left
      pipe.x -= pipe.vx;
    }
    if (pipeXPos < BIRD_OFFSET_X + 10 && pipeXPos > BIRD_OFFSET_X) {
      // need to debounce so that only 1 point each time bird passes through gap in pipes
      throttledSetScore();
    }

    if (hitTestRectangle(bird, pipe.getBounds())) {
      // if (gameOver === false) {

      // }
      gameOver = true;
      // flip bird over
      bird.scale.y = -1;
      up.unsubscribe();
      // state = end;
    }
  });
}

// helper functions
// some are from - https://github.com/kittykatattack/learningPixi

// from - https://www.pixijselementals.com/#recipe-resize-your-game
function resize() {
  // current screen size
  const screenWidth = Math.max(
    document.documentElement.clientWidth,
    window.innerWidth || 0
  );
  const screenHeight = Math.max(
    document.documentElement.clientHeight,
    window.innerHeight || 0
  );

  // scale factor for our game canvas
  const scale = Math.min(
    screenWidth / CONFIG_WIDTH,
    screenHeight / CONFIG_HEIGHT
  );

  // scaled width and height
  const enlargedWidth = Math.floor(scale * CONFIG_WIDTH);
  const enlargedHeight = Math.floor(scale * CONFIG_HEIGHT);

  // css to set the sizes and margins
  app.view.style.width = `${enlargedWidth}px`;
  app.view.style.height = `${enlargedHeight}px`;
}

function debounce(callback, wait) {
  let timeoutId = null;
  return (...args) => {
    window.clearTimeout(timeoutId);
    timeoutId = window.setTimeout(() => {
      callback.apply(null, args);
    }, wait);
  };
}

// Displaying current score
function setScore() {
  score += 1;
  document.getElementById("score").innerHTML = `${score}`;
}

const throttledSetScore = debounce(setScore, 100);

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Initialize and running keyboard input events
function keyboard(value) {
  const key = {};
  key.value = value;
  key.isDown = false;
  key.isUp = true;
  key.press = undefined;
  key.release = undefined;

  key.downHandler = (event) => {
    if (
      key.value.includes(event.key) ||
      event.type === "click" ||
      event.type === "touchstart"
    ) {
      if (key.isUp && key.press) {
        key.press();
      }
      key.isDown = true;
      key.isUp = false;
      event.preventDefault();
    }
  };

  key.upHandler = (event) => {
    if (
      key.value.includes(event.key) ||
      event.type === "mouseup" ||
      event.type === "touchend"
    ) {
      if (key.isDown && key.release) {
        key.release();
      }
      key.isDown = false;
      key.isUp = true;
      const ul = document.getElementById("input");
      const li = document.createElement("li");
      // li.innerHTML = `<img src="/static/images/up.png" alt="">`;
      li.innerHTML = `&#8657;`;
      ul.insertBefore(li, ul.firstChild);
      event.preventDefault();
    }
  };

  // Attach event listeners
  const downListener = key.downHandler.bind(key);
  const upListener = key.upHandler.bind(key);

  window.addEventListener("keydown", downListener);
  window.addEventListener("keyup", upListener);
  window.addEventListener("click", downListener);
  window.addEventListener("mouseup", upListener);
  window.addEventListener("touchstart", downListener);
  window.addEventListener("touchend", upListener);

  // Detach event listeners
  key.unsubscribe = () => {
    window.removeEventListener("keydown", downListener);
    window.removeEventListener("keyup", upListener);
    window.removeEventListener("click", downListener);
    window.removeEventListener("mouseup", upListener);
    window.removeEventListener("touchstart", downListener);
    window.removeEventListener("touchend", upListener);
  };

  return key;
}

function contain(sprite, container) {
  let collision;

  // Left
  if (sprite.x < container.x) {
    sprite.x = container.x;
    collision = "left";
  }

  // Top
  if (sprite.y < container.y) {
    sprite.y = container.y;
    collision = "top";
  }

  // Right
  if (sprite.x + sprite.width > container.width) {
    sprite.x = container.width - sprite.width;
    collision = "right";
  }

  // Bottom
  if (sprite.y + sprite.height > container.height) {
    sprite.y = container.height - sprite.height;
    collision = "bottom";
  }

  // Return the `collision` value
  return collision;
}

function hitTestRectangle(r1, r2) {
  // Collision state
  let hit = false;

  // Find the center points of each sprite
  r1.centerX = r1.x + r1.width / 2;
  r1.centerY = r1.y + r1.height / 2;
  r2.centerX = r2.x + r2.width / 2;
  r2.centerY = r2.y + r2.height / 2;

  // Find the half-widths and half-heights of each sprite
  r1.halfWidth = r1.width / 2;
  r1.halfHeight = r1.height / 2;
  r2.halfWidth = r2.width / 2;
  r2.halfHeight = r2.height / 2;

  // Calculate the distance vector between the sprites
  const vx = r1.centerX - r2.centerX - r1.halfWidth;
  const vy = r1.centerY - r2.centerY - r1.halfHeight;

  const combinedHalfWidths = r1.halfWidth + r2.halfWidth;
  const combinedHalfHeights = r1.halfHeight + r2.halfHeight;

  // Check for a collision on the x-axis
  if (Math.abs(vx) < combinedHalfWidths) {
    // Check for a collision on the y-axis
    if (Math.abs(vy) < combinedHalfHeights) {
      hit = true;
    } else {
      hit = false;
    }
  } else {
    hit = false;
  }

  return hit;
}
