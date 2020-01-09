//create canvas
const canvas = document.getElementById('tetris')
//const context = canvas.getContext('2d',{alpha: false})
const context = canvas.getContext('2d')

// colors for the pieces
// these are the classic game colors
const colors = [
    null,
    'red',
    'purple',
    'white',
    'blue',
    'cyan',
    'green',
    'yellow'
]

// this is the model for the static blocks
const arena = createMatrix(12, 20)

// this is the model for the falling piece
// initialize with an 'I' @ (4,0)
const player = {
    pos: {x: 4, y: 0},
    matrix: createPiece('I'),
    score : 0
}

// map keyboard controls 
document.addEventListener('keydown', event => {
    if (event.keyCode === 37) {
        playerMove(-1);
    } else if (event.keyCode === 39) {
        playerMove(1);
    } else if (event.keyCode === 40) {
        playerDrop();
    } else if (event.keyCode === 81) {
        playerRotate(-1);
    } else if (event.keyCode === 87) {
        playerRotate(1);
    } else if  (event.keyCode === 82) {
        fastDrop()
    }
});

canvas.addEventListener('click', event => {
    // handler for clicks/taps in the canvas
    console.log(event)
    console.log(`cw: ${canvas.width} ch: ${canvas.height}`)
    console.log(`click_x: ${event.clientX} click_y: ${event.clientY}`)
})

// MODEL FUNCTIONS
// create a falling piece
function createPiece(type) {
    if (type === 'I') {
        return [
            [0, 1, 0, 0],
            [0, 1, 0, 0],
            [0, 1, 0, 0],
            [0, 1, 0, 0],
        ]
    } else if (type === 'L') {
        return [
            [0, 2, 0],
            [0, 2, 0],
            [0, 2, 2],
        ]
    } else if (type === 'J') {
        return [
            [0, 3, 0],
            [0, 3, 0],
            [3, 3, 0],
        ]
    } else if (type === 'O') {
        return [
            [4, 4],
            [4, 4],
        ]
    } else if (type === 'Z') {
        return [
            [5, 5, 0],
            [0, 5, 5],
            [0, 0, 0],
        ]
    } else if (type === 'S') {
        return [
            [0, 6, 6],
            [6, 6, 0],
            [0, 0, 0],
        ]
    } else if (type === 'T') {
        return [
            [0, 7, 0],
            [7, 7, 7],
            [0, 0, 0],
        ]
    }
}

function arenaSweep() {
    let rowCount = 1
    outer: for (let y = arena.length -1; y > 0; --y) {
        for (let x = 0; x < arena[y].length; ++x) {
            if (arena[y][x] === 0) {
                continue outer
            }
        }

        const row = arena.splice(y, 1)[0].fill(0)
        arena.unshift(row)
        ++y

        rowCount = 2

        player.score +=  100


    }
}

function updateScore() {
    document.getElementById('score').innerHTML = player.score

}

function createMatrix(w, h) {
    const matrix = []
    while (h--) {
        matrix.push(new Array(w).fill(0))
    }
    return matrix
}

// check for collisions of walls - fires on left or right move and on rotate
function collide(arena, player) {
    const m = player.matrix
    const o = player.pos
    for (let y = 0; y < m.length; ++y) {
        for (let x = 0; x < m[y].length; ++x) {
            if (m[y][x] !== 0 &&
               (arena[y + o.y] &&
                arena[y + o.y][x + o.x]) !== 0) {
                return true
            }
        }
    }
    return false
}

// adds the falling piece to the arena
function merge (arena, player) {
    player.matrix.forEach((row, y) => { 
        row.forEach((value, x) => {
            if (value !== 0) {
                arena[y + player.pos.y][x + player.pos.x] = value
            }
        })
    })
}

// drops pieces - this starts a new drop
function playerReset() {
    const pieces = 'TJLOSZI'
    player.matrix = createPiece(pieces[pieces.length * Math.random() | 0])
    player.pos.y = 0
    player.pos.x = (arena[0].length / 2 | 0) -
                   (player.matrix[0].length / 2 | 0)
    if (collide(arena, player)) {
        arena.forEach(row => row.fill(0))
        player.score = 0
    }
}

// checks for collision inside of arena
function playerDrop() {
    player.pos.y++
    if (collide(arena, player)){
        player.pos.y--
        merge(arena, player)
        playerReset()
        arenaSweep()
        updateScore()
        dropInterval = 500
    }
    dropCounter = 0
}

function fastDrop() {
    setTimeout(fastSpeed)
    if  (collide(arena, player)){
        player.pos.y--
        merge(arena, player)
        playerReset()
        arenaSweep()
    }
}

function fastSpeed() {

    dropInterval = 0.1
}

//move a falling piece in x-axis
function playerMove(dir) {
    player.pos.x += dir
    if (collide(arena, player)){
        player.pos.x -= dir
    }
}

// rotate a falling piece
function playerRotate(dir) {
    const pos = player.pos.x
    let offset = 1
    rotate(player.matrix, dir)
    while (collide(arena, player)) {
        player.pos.x += offset
        offset = -(offset + (offset > 0 ? 1 : -1));
        if (offset > player.matrix[0].length) {
            rotate(player.matrix, -dir)
            player.pos.x = pos
            return
        }
    }
}

function rotate(matrix, dir) {
    for (let y = 0; y < matrix.length; ++y) {
        for (let x = 0; x < y; ++x) {
            [
                matrix[x][y],
                matrix[y][x],
            ] = [
                matrix[y][x],
                matrix[x][y],
            ];
        }
    }

    if (dir > 0) {
        matrix.forEach(row => row.reverse());
    } else {
        matrix.reverse();
    }
}

// VIEW FUNCTIONS
//draws the entire canvas
function draw() {
    //context.fillStyle = 'black'
    //context.fillRect(0, 0, canvas.width, canvas.height)
    context.clearRect(0, 0, canvas.width, canvas.height)

    drawMatrix(arena, {x: 0, y: 0})
    drawMatrix(player.matrix, player.pos)
}

//draw a matrix starting at offset - either the arena @ (0,0) or the falling piece at (x,y)
function drawMatrix(matrix, offset) {
    matrix.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value !== 0) {
                // compute drawing coordinates
                // model x-axis runs from 0 to 11
                // model y-axis runs from 0 to 19
                let block_size = 20
                let x1 = (x + offset.x) * block_size
                let y1 = (y + offset.y) * block_size
                // draw the colored block
                context.fillStyle = colors[value]
                context.fillRect(x1, y1, block_size, block_size)
                // draw a grey border
                context.lineWidth = 1
                context.strokeStyle = 'grey'
                context.strokeRect(x1, y1, block_size, block_size)
            }
        })
    })
}

// THIS STARTS THE MAIN GAME LOOP
// game initialization
let dropCounter = 0
let dropInterval = 500 // 0.5 seconds
let lastTime = 0

// main game loop function
function update(time = 0) {
    const deltaTime = time - lastTime
    //console.log(deltaTime)
    lastTime=time

    dropCounter  += deltaTime
    if (dropCounter > dropInterval) {
        playerDrop()
        dropCounter = 0
    } 
    draw()
    requestAnimationFrame(update)
    return deltaTime
}

// entry call to kick off the game
update()
