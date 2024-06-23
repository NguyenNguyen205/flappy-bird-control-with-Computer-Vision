const CONFIG_WIDTH = 600;
const CONFIG_HEIGHT = 600;
const PIPE_DISTANCE_BETWEEN_Y = CONFIG_HEIGHT / 6;
const PIPES_IN_SCENE = 3;
const PIPE_DISTANCE_BETWEEN_X = CONFIG_WIDTH / PIPES_IN_SCENE;
const BIRD_OFFSET_X = CONFIG_WIDTH / 2;

let bg;
let bird;
let pipes;
let state;
let gameLoopFn;
let up;
let scoreText;
let gameOver = false;
let score = 0;
let mess = "";
import { io } from "https://cdn.socket.io/4.7.5/socket.io.esm.min.js";
const socket = io("http://localhost:5501");

// Aliases
let { Application } = PIXI;
let loader = PIXI.Loader.shared;
let { resources } = PIXI.Loader.shared;
let { Sprite } = PIXI;
let { Text } = PIXI;

// Create a Pixi Application
let app = new Application({
  width: CONFIG_WIDTH,
  height: CONFIG_HEIGHT,
  antialias: true,
  transparent: false,
  resolution: window.devicePixelRatio || 1,
  autoDensity: true,
});

// Add the canvas that Pixi automatically created for you to the HTML document
document.querySelector("#canva").appendChild(app.view);

// Load images and sounds and then run the `setup` callback function
loader
  .add("bgImg", "static/images/bg.png")
  .add("birdImg", "static/images/bird.png")
  .add("pipeImg", "static/images/pipe.png")
  // .add("bird-sound", "assets/sounds/woosh.mp3")
  // .add("crash-sound", "assets/sounds/ding.mp3")
  .load(setup);

// Receive touch signal and jump the bird
socket.on("noti", (res) => {
  if (res !== mess) {
    mess = res;
    if (res === "yes") {
      bird.vy = -2;
      bird.rotation = -0.5;
      const ul = document.getElementById("input");
      const li = document.createElement("li");
      li.innerHTML = `<img src="/static/images/up.png" alt="">`;
      ul.insertBefore(li, ul.firstChild);
    }
  }
});

// Set up the environment
function setup() {
  // Get and set highest score
  document.getElementById("maxScore").innerHTML = localStorage.getItem("score");
  // Initialize the game sprites, set the game state to `play`
  //  and start the 'gameLoop'
  bg = new Sprite(resources.bgImg.texture);
  // make bg cover stage
  // need to add children to stage before the stage has a width and height,
  //  can't use app.stage.width yet - it has no children
  bg.width = CONFIG_WIDTH;
  bg.height = CONFIG_HEIGHT;
  app.stage.addChild(bg);
  // An array to store all of the pipes
  pipes = [];

  // create the pipes
  const numberOfpipes = PIPES_IN_SCENE * 2 + 2;
  let pipeDistanceBtn = PIPE_DISTANCE_BETWEEN_X + BIRD_OFFSET_X; // offset of bird from left along x-axis
  let heightDiff = randomInt(-PIPE_DISTANCE_BETWEEN_Y, PIPE_DISTANCE_BETWEEN_Y);
  // pipes in 4 pairs
  for (let i = 0; i < numberOfpipes; i++) {
    // Make a pipe
    const pipe = new Sprite(resources.pipeImg.texture);
    // placement position based on the center of the sprite - not top, left corner (default)
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
      // rotate 180 deg
      pipe.rotation = Math.PI;
    }
    pipe.vx = 1;

    // Push the pipe into the `pipes` array
    pipes.push(pipe);
    // Add the pipe to the game canvas stage
    app.stage.addChild(pipe);
  }

  bird = new Sprite(resources.birdImg.texture);
  // center bird on screen
  bird.anchor.set(0.5, 0.5);
  bird.position.set(CONFIG_WIDTH / 2, CONFIG_HEIGHT / 2);
  bird.vy = 0;
  // Add the bird to the stage
  app.stage.addChild(bird);

  // add score text
  document.getElementById("score").innerHTML = `${score}`;
  // scoreText = new Text(`Score: ${score}`);
  // app.stage.addChild(scoreText);
  // scoreText.position.set(16, 16);

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

  // Set the game state - state is especially useful if there are other levels, screens, ect.
  state = play;

  // Start the game loop by adding the `gameLoop` function to
  // Pixi's `ticker` and providing it with a `delta` argument.
  gameLoopFn = (delta) => gameLoop(delta);
  app.ticker.add(gameLoopFn);

  // listen for a window resize event
  window.addEventListener("resize", resize);

  // call it manually once - make sure the stage is correctly sized on page load
  resize();
}

function gameLoop(delta) {
  if (gameOver) {
    pipes.forEach((pipe) => {
      pipe.vx = 0;
    });
    // give time for the bird bounce to complete
    // window.setInterval(() => {
    //   app.ticker.remove(gameLoopFn);
    // }, 3000);
    // console.log("Game over");
    startGameRestart();
  }
  // Runs the current game `state` in a loop and renders the sprites
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
    document.getElementById("input").innerHTML = `
       <li style="visibility: hidden;"><img src="{{ url_for('static', filename='images/up.png') }}" alt=""></li>
    `;
    bg = null;
    bird = null;
    pipes = [];
    state = null;
    gameLoopFn = null;
    up = null;
    scoreText = null;
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

function play(delta) {
  // All the game logic goes here
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
      // make sound only play once
      if (gameOver === false) {
        // PIXI.sound.play("crash-sound");
      }
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

  // margins for centering
  // const horizontalMargin = (screenWidth - enlargedWidth) / 2;
  // const verticalMargin = (screenHeight - enlargedHeight) / 2;

  // css to set the sizes and margins
  app.view.style.width = `${enlargedWidth}px`;
  app.view.style.height = `${enlargedHeight}px`;
  // // app.view.style.marginLeft =
  // //   app.view.style.marginRight = `${horizontalMargin}px`;
  // app.view.style.marginTop =
  //   app.view.style.marginBottom = `${verticalMargin}px`;
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

function setScore() {
  score += 1;
  document.getElementById("score").innerHTML = `${score}`;
}

const throttledSetScore = debounce(setScore, 100);

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

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
      li.innerHTML = `<img src="/static/images/up.png" alt="">`;
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
  // Define the variables we'll need to calculate
  let hit;

  // hit will determine whether there's a collision
  hit = false;

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
  // - r1.halfWidth, -r1.halfHeight -> I added -> make collision when bird hits exactly
  const vx = r1.centerX - r2.centerX - r1.halfWidth;
  const vy = r1.centerY - r2.centerY - r1.halfHeight;

  // Figure out the combined half-widths and half-heights
  const combinedHalfWidths = r1.halfWidth + r2.halfWidth;
  const combinedHalfHeights = r1.halfHeight + r2.halfHeight;

  // Check for a collision on the x-axis
  if (Math.abs(vx) < combinedHalfWidths) {
    // A collision might be occurring. Check for a collision on the y-axis
    if (Math.abs(vy) < combinedHalfHeights) {
      // There's definitely a collision happening
      hit = true;
    } else {
      // There's no collision on the y-axis
      hit = false;
    }
  } else {
    // There's no collision on the x-axis
    hit = false;
  }

  // `hit` will be either `true` or `false`
  return hit;
}
