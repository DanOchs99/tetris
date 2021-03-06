// play mode - multi = multiplayer   single = do not accept rows from other players
const playmode = document.getElementById('playmode')
let MULTIPLAYER_MODE = false
if (playmode.value == 'multi') {
    MULTIPLAYER_MODE = true
}

// false = standard mode; true = enable mobile ui debugging outputs
const devmode_switch = document.getElementById('devmode')
let DEBUG_MOBILEUI = false
if (devmode_switch.value == 'true') {
    DEBUG_MOBILEUI = true
}

//get the canvas, create a context for drawing on it
const canvas = document.getElementById('tetris')
const canvasNext = document.getElementById('nextPiece')
//const context = canvas.getContext('2d',{alpha: false})
const context = canvas.getContext('2d')
const contextNext = canvasNext.getContext('2d')

const socket = io()

const rot_counterclock_button = document.getElementById('rot_counterclock_button')
const fast_drop_button = document.getElementById('fast_drop_button')
const rot_clockwise_button = document.getElementById('rot_clockwise_button')

// colors for the pieces
const colors = [
    null,
    '#DF332F',    // 1 = red = 'I'
    '#356EB3',    // 2 = blue = 'L'
    '#EE8A18',    // 3 = orange = 'J'
    '#26AE8A',    // 4 = green = 'O'
    '#EABA18',    // 5 = yellow = 'Z'
    '#814494',    // 6 = purple = 'S'
    '#F6F8FF',     // 7 = white = 'T'

    '#D8681C',    // 8 = darker orange  = J
    '#21426F',     // 9 = daker blue = L
    '#AE2721',      // 10 = darker red = I
    '#198565',      // 11 = darker green = O
    '#BB9921',       // 12 = darker yellow = z
    '#74348B',         // 13  = darker purple = s
    '#808080'      // 14 = grey for badRow
]

// this is the model for the static blocks
const arena = createMatrix(12, 20)

// this is the model for the falling piece
// gets initialized by playerReset()
const player = {
    // where is the falling piece on the board
    pos: {x: 0, y: 0},
    // definitions of the falling piece and the next piece to drop
    matrix: null,
    next: null,
    // the player's current score
    // TODO move this someplace else, shouldn't belong to this object
    score: 0,
    level: 0,
    lines: 0,
    // name of the current falling piece and next piece to drop
    piece: '',
    nextpiece: '',
    // (x,y) offset from top left corner of falling piece matrix to center (in drawing buffer px)
    // lx = left hit box x-offset from center, lt = top left hitbox, lb = bottom left hitbox
    // rx = right hit box x-offset from center, rt = top right hitbox, rb = bottom right hitbox
    // drop = start of drop piece hitbox, px below the center point
    touch_offset: {x: 0, y: 0, lx: 10, lt: 40, lb: 40, rx: 10, rt: 40, rb: 40, drop: 40}
}

// map keyboard controls 
document.addEventListener('keydown', event => {
    if (event.keyCode === 37) {
        if (!firedSubmit) {
            playerMove(-1); }
    } else if (event.keyCode === 39) {
        if (!firedSubmit) {
            playerMove(1); }
    } else if (event.keyCode === 40) {
        if (!firedSubmit) {
            playerDrop(); }
    } else if (event.keyCode === 81) {
        if (!firedSubmit) {
            playerRotate(-1); }
    } else if (event.keyCode === 87) {
        if (!firedSubmit) {
            playerRotate(1); }
    } else if  (event.keyCode === 82) {
        if (!firedSubmit) {
            fastDrop() }
    }
});

// event handler for clicks/taps in the canvas
canvas.addEventListener('click', event => {
    // translate to pixel buffer coords
    let click_x = ((event.clientX - event.target.offsetLeft) / event.target.offsetWidth) * canvas.width
    let click_y = ((event.clientY - event.target.offsetTop) / event.target.offsetHeight) * canvas.height
    let piece_x = (player.pos.x * 20) + player.touch_offset.x
    let piece_y = (player.pos.y * 20) + player.touch_offset.y
    if (click_y > (piece_y + player.touch_offset.drop)) {
        playerDrop()
    }
    else if ((click_y > (piece_y - player.touch_offset.rt)) && (click_y < (piece_y + player.touch_offset.rb)) && (click_x > (piece_x + player.touch_offset.rx))) {
        playerMove(1);
    }
    else if ((click_y > (piece_y - player.touch_offset.lt)) && (click_y < (piece_y + player.touch_offset.lb)) && (click_x < (piece_x - player.touch_offset.lx))) {
        playerMove(-1);
    }
})

// event handlers for button controls below the main canvas
rot_counterclock_button.addEventListener('click', event => {
    if (!firedSubmit) {
        playerRotate(-1); }
})
rot_clockwise_button.addEventListener('click', event => {
    if (!firedSubmit) {
        playerRotate(1); }
})
fast_drop_button.addEventListener('click', event => {
    if (!firedSubmit) {
        fastDrop(); }
})

// MODEL FUNCTIONS
// create a falling piece
function createPiece(type) {
    if (type === 'I') {
        return [
            [0, 1, 0, 0],
            [0, 10, 0, 0],
            [0, 1, 0, 0],
            [0, 10, 0, 0],
        ]
    } else if (type === 'L') {
        return [
            [0, 9, 0],
            [0, 2, 0],
            [0, 9, 2],
        ]
    } else if (type === 'J') {
        return [
            [0, 8, 0],
            [0, 3, 0],
            [3, 8, 0],
        ]
    } else if (type === 'O') {
        return [
            [4, 11],
            [11, 4],
        ]
    } else if (type === 'Z') {
        return [
            [12, 5, 0],
            [0, 12, 5],
            [0, 0, 0],
        ]
    } else if (type === 'S') {
        return [
            [0, 6, 13],
            [13, 6, 0],
            [0, 0, 0],
        ]
    } else if (type === 'T') {
        return [
            [0, 6, 0],
            [6, 13, 6],
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
        player.lines++
        if (player.lines%3===0) {
            player.level++
        }
        sendRow()
    }
}

// add a random row to bottom of arena
function addRow() {
    if (badrowCounter > badrowInterval) {
        arena.shift()

        let badRow = [14,14,14,14,14,14,14,14,14,14,14,14]
        let randomHole = Math.floor(12 * Math.random())
        badRow[randomHole] = 0
        arena.push(badRow)

        badrowCounter = 0

        refreshView = true
    }      
}

// broadcast an add row message to other players
function sendRow() {
    socket.emit('tetris', "USER:ADD_ROW")
}

// receiver for add row messages
socket.on('tetris', (msg_rcvd) => {
    if (msg_rcvd == "ADD_ROW" && MULTIPLAYER_MODE) {
        addRow();
    }
})

// send connect message 
socket.on('connect', function () {
    // send a connect message
    socket.emit('tetris', `USER:USER_JOINED`);
})

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
    if (!firedSubmit) {
        const pieces = 'TJLOSZI'
        dropInterval = 600 - (player.level*25)
        let rand_piece = ''
        if (player.next === null) {
            rand_piece = pieces[Math.floor(pieces.length * Math.random())]
            player.matrix = createPiece(rand_piece)
            player.piece = rand_piece
        }  else {
            player.matrix = player.next
            player.piece = player.nextpiece
        }
        rand_piece = pieces[Math.floor(pieces.length * Math.random())]
        player.next = createPiece(rand_piece)
        player.nextpiece = rand_piece
    
        player.pos.y = 0
        player.pos.x = (arena[0].length / 2 | 0) -
                   (player.matrix[0].length / 2 | 0)
        setTouchOffset()

        if (collide(arena, player)) {
            postScore()
            firedSubmit = true
            submitScore()
        }
        refreshView = true
    }
    else {
        dropInterval = 1000
    }
}

// move falling piece down one row
function playerDrop() {
    player.pos.y++
    if (collide(arena, player)){
        player.pos.y--
        merge(arena, player)
        arenaSweep()
        updateScore()
        playerReset()
    }
    dropCounter = 0
    refreshView = true
}

function fastDrop() {
    dropInterval = 20;
}

//move a falling piece in x-axis
function playerMove(dir) {
    player.pos.x += dir
    let pM_refresh = true

    if (collide(arena, player)){
        player.pos.x -= dir
        pM_refresh = false
    }

    if (!refreshView) {
        if (pM_refresh) {
            refreshView = true
        }
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
    refreshView = true
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

function setTouchOffset() {
    // player.pos * 20 gives the upper left corner of the falling pice matrix
    // set touch offset such that (player.pos*20)+touch_offset gives us the center
    // of the falling piece matrix

    // the hit box boundaries are currently always:
    // left: 10 px to left, 40 px above, 40 px below
    // right: 10 px to right, 40 px above, 40 px below 
    // drop: 40 px below center point

    // they could adjust by piece; for some pieces (like 'I') would be even better
    // if adjusted by rotation state

    if (player.piece == 'T') {
        player.touch_offset.x = 30
        player.touch_offset.y = 30
    }
    else if (player.piece == 'J') {
        player.touch_offset.x = 30
        player.touch_offset.y = 30
    }
    else if (player.piece == 'L') {
        player.touch_offset.x = 30
        player.touch_offset.y = 30
    }
    else if (player.piece == 'O') {
        player.touch_offset.x = 20
        player.touch_offset.y = 20
    }
    else if (player.piece == 'S') {
        player.touch_offset.x = 30
        player.touch_offset.y = 30
    }
    else if (player.piece == 'Z') {
        player.touch_offset.x = 30
        player.touch_offset.y = 30
    }
    else if (player.piece == 'I') {
        player.touch_offset.x = 40
        player.touch_offset.y = 40
    }
    else {    // this should never fire
        player.touch_offset.x = 0
        player.touch_offset.y = 0
    }
}

// SCORE FUNCTIONS
function submitScore() {
    document.getElementById("scoreForm").submit();
}

function updateScore() {
    document.getElementById('showScore').innerHTML = player.score
    document.getElementById('showLevel').innerHTML = player.level
    document.getElementById('lines').innerHTML = player.lines
}

function postScore() {
    document.getElementById('score').value = player.score
    document.getElementById('level').value = player.level
}

// VIEW FUNCTIONS
//re-draws both the game board and the next piece canvases
function draw() {
    //clear the main canvas
    context.clearRect(0, 0, canvas.width, canvas.height)

    drawMatrix(arena, {x: 0, y: 0})
    drawMatrix(player.matrix, player.pos)
    drawMatrixNext(player.next, {x: 1, y:1})
}

// draw the next piece
function drawMatrixNext(matrix, offset) {
    contextNext.fillStyle = "black"
    contextNext.fillRect(0,0, canvasNext.width, canvasNext.height)

    matrix.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value !== 0) {
                // compute drawing coordinates
                let block_size = 20
                let x1 = (x + offset.x) * block_size
                let y1 = (y + offset.y) * block_size
                // draw the colored block
                contextNext.fillStyle = colors[value]
                contextNext.fillRect(x1, y1, block_size, block_size)
                // draw a white border
                contextNext.lineWidth = 2
                contextNext.strokeStyle = '#FFFFFF'
                context.beginPath()
                contextNext.strokeRect(x1, y1, block_size, block_size)
            }
        })
    })
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
                // draw a white border
                context.lineWidth = 2
                context.strokeStyle = '#FFFFFF'
                context.beginPath()
                context.strokeRect(x1, y1, block_size, block_size)
            }
        })
    })
    if (DEBUG_MOBILEUI) {
        context.lineWidth = 1
        context.strokeStyle = 'cyan'
        // draw an 'x' @ player.pos
        let line = []
        line.push(((player.pos.x * 20) + player.touch_offset.x) - 5)
        line.push(((player.pos.y * 20) + player.touch_offset.y) - 5)
        line.push(((player.pos.x * 20) + player.touch_offset.x) + 5)
        line.push(((player.pos.y * 20) + player.touch_offset.y) + 5)
        clipToArena(line)
        if (line) {
            context.beginPath()
            context.moveTo(line[0],line[1])
            context.lineTo(line[2],line[3])
            context.stroke()
        }
        line = []
        line.push(((player.pos.x * 20) + player.touch_offset.x) + 5)
        line.push(((player.pos.y * 20) + player.touch_offset.y) - 5)
        line.push(((player.pos.x * 20) + player.touch_offset.x) - 5)
        line.push(((player.pos.y * 20) + player.touch_offset.y) + 5)
        clipToArena(line)
        if (line) {
            context.beginPath()
            context.moveTo(line[0], line[1])
            context.lineTo(line[2], line[3])
            context.stroke()
        }

        // drop hit box
        line = []
        line.push(0)
        if (((player.pos.y * 20) + player.touch_offset.x + player.touch_offset.drop) > 400) {
            line.push(400) 
        }
        else {
            line.push((player.pos.y * 20) + player.touch_offset.x + player.touch_offset.drop)
        }
        line.push(canvas.width)
        line.push(canvas.height - line[1])
        context.beginPath()
        context.rect(line[0], line[1], line[2], line[3])
        context.stroke()

        context.strokeStyle = 'yellow'
        // left hit box
        line = []
        line.push(0)
        if (((player.pos.y * 20) + player.touch_offset.y - player.touch_offset.lt) < 0) {
            line.push(0) 
        }
        else {
            line.push((player.pos.y * 20) + player.touch_offset.y - player.touch_offset.lt)
        }
        if (((player.pos.x * 20) + player.touch_offset.x - player.touch_offset.lx) < 0) {
            line.push(0)
        }
        else {
            line.push((player.pos.x * 20) + player.touch_offset.x - player.touch_offset.lx)
        }
        if (((player.pos.y * 20) + player.touch_offset.y + player.touch_offset.lb) > canvas.height) {
            line.push(canvas.height - line[1])
        }
        else {
            line.push(((player.pos.y * 20) + player.touch_offset.y + player.touch_offset.lb) - line[1])
        }
        context.beginPath()
        context.rect(line[0], line[1], line[2], line[3])
        context.stroke()

        // right hit box
        line = []
        if (((player.pos.x * 20) + player.touch_offset.x + player.touch_offset.rx) > canvas.width) {
            line.push(canvas.width)
        }
        else {
            line.push((player.pos.x * 20) + player.touch_offset.x + player.touch_offset.rx)
        }
        if (((player.pos.y * 20) + player.touch_offset.y - player.touch_offset.rt) < 0) {
            line.push(0) 
        }
        else {
            line.push((player.pos.y * 20) + player.touch_offset.y - player.touch_offset.rt)
        }
        line.push(canvas.width-line[0])
        if (((player.pos.y * 20) + player.touch_offset.y + player.touch_offset.rb) > canvas.height) {
            line.push(canvas.height - line[1])
        }
        else {
            line.push(((player.pos.y * 20) + player.touch_offset.y + player.touch_offset.rb) - line[1])
        }
        context.beginPath()
        context.rect(line[0], line[1], line[2], line[3])
        context.stroke()
    }
}

// take an array [x1,y1,x2,y2] representing a line to draw and clip to the edges of the game board
// if line is completely off the board set line to null
function clipToArena(line) {
    // if line is in bounds return immediately
    if (line[0]>=0 && line[0]<=canvas.width && line[1]>=0 && line[1]<=canvas.height &&
        line[2]>=0 && line[2]<=canvas.width && line[3]>=0 && line[3]<=canvas.height) {
            return
    }
    // if both endpoints are off the board; set line to null then return
    if ((line[0]<0 || line[0]>canvas.width) && (line[1]<0 || line[1]>canvas.height) &&
        (line[2]<0 || line[2]>canvas.width) && (line[3]<0 || line[3]>canvas.height)) {
            line = null
            return
    }
    // clip the line to edge of the canvas
    let z = (line[3]-line[1])/(line[2]-line[0])
    if (line[0] < 0) {
        line[1] = (z*(0-line[0]))+line[1]
        line[0] = 0
    } else if (line[0] > canvas.width) {
        line[1] = (z*(canvas.width-line[0]))+line[1]
        line[0] = canvas.width    
    }
    if (line[1] < 0) {
        line[0] = ((0-line[1])/z)+line[0]
        line[1] = 0
    } else if (line[1] > canvas.height) {
        line[0] = ((canvas.height-line[1])/z)+line[0]
        line[1] = canvas.height    
    }
    if (line[2] < 0) {
        line[3] = (z*(0-line[2]))+line[3]
        line[2] = 0
    } else if (line[2] > canvas.width) {
        line[3] = (z*(canvas.width-line[2]))+line[3]
        line[2] = canvas.width
    }
    if (line[3] < 0) {
        line[2] = ((0-line[3])/z)+line[2]
        line[3] = 0
    } else if (line[3] > canvas.height) {
        line[2] = ((canvas.height-line[3])/z)+line[2]
        line[3] = canvas.height
    }
}

// THIS STARTS THE MAIN GAME LOOP
// game initialization
let dropCounter = 0
let dropInterval = 0 // this gets set in playerDrop
let badrowCounter = 0
let badrowInterval = 5000 // 5 seconds
let lastTime = 0
let refreshView = true
let inPlayerReset = false
let firedSubmit = false

if (DEBUG_MOBILEUI) {
    var frame_count = 0
    var refresh_count = 0
}

// main game loop function
function update(time = 0) {
    // 'time' is provided by requestAnimationFrame, DOMHighResTimeStamp in milliseconds
    const deltaTime = time - lastTime    // calc dTime for this cycle

    dropCounter  += deltaTime    // increment the falling piece move timer
    if (dropCounter > dropInterval) {    // time to move the falling piece
        playerDrop()
    }

    badrowCounter += deltaTime

    if (DEBUG_MOBILEUI) {
        let curr_sec = Math.floor(time / 1000)
        let last_sec = Math.floor(lastTime / 1000)
        if (curr_sec == last_sec) {
            frame_count += 1
            if (refreshView) {
                refresh_count += 1
            }
        } 
        else {
            console.log(`Time: ${last_sec}   Frame counter: ${frame_count}   Refresh counter: ${refresh_count}`)
            frame_count = 1
            if (refreshView) {
                refresh_count = 1
            }
            else {
                refresh_count = 0
            }
        }
    }

    // redraw the view if the model has changed
    if (refreshView) {
        draw()
        refreshView = false
    }

    lastTime = time
    requestAnimationFrame(update)

    return deltaTime
}

// entry calls to kick off the game
playerReset()
update()
