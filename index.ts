import bodyParser from 'body-parser'
import express, { Request, Response } from 'express'

import { SnakeInfo, Move, Direction, GameRequest, GameState, Coordinates, GridNode } from './types'

const PORT = process.env.PORT || 3000

const app = express()
app.use(bodyParser.json())

app.get('/', handleIndex)
app.post('/start', handleStart)
app.post('/move', handleMove)
app.post('/end', handleEnd)

app.listen(PORT, () => console.log(`TypeScript Battlesnake Server listening at http://127.0.0.1:${PORT}`))

function handleIndex(request: Request, response: Response<SnakeInfo>) {
    const battlesnakeInfo: SnakeInfo = {
        apiversion: '1',
        author: '',
        color: '#888888',
        head: 'default',
        tail: 'default',
    }
    response.status(200).json(battlesnakeInfo)
}

function handleStart(request: GameRequest, response: Response) {
    const gameData = request.body

    console.log('START')
    response.status(200).send('ok')
}

function handleMove(request: GameRequest, response: Response<Move>) {
    const gameData = request.body

    const pathToFood = findPathToFood(gameData);
    let move = findBestMove(gameData);
    if(pathToFood[0]) {
        move = findDirection(gameData.you.head, pathToFood[0].position);
    }

    response.status(200).send({
        move: move,
    })
}

function findPathToFood(state: GameState): GridNode[] {
    const grid: GridNode[][] = initGrid(state);
    return search(grid, state.you.head, state.board.food[0], state.you.body);
}

function initGrid(state: GameState): GridNode[][] {
    const grid: GridNode[][] = new Array();
    for(let xPos = 0; xPos <= state.board.width; xPos++) {
        grid[xPos] = [];
        for(let yPos = 0; yPos <= state.board.height; yPos++) {
            grid[xPos][yPos] = {
                position: {x: xPos, y: yPos},
                g: 0,
                h: 0,
                f: 0,
                parent: null
            }
        }
    }
    return grid;
}

function findDirection(head: Coordinates, position: Coordinates): 'up' | 'down' | 'left' | 'right' {
    if(position.x < head.x) {
        return 'left';
    } else if(position.x > head.x) {
        return 'right';
    } else if(position.y < head.y) {
        return 'down';
    } else {
        return 'up';
    }
}

// only use this if there is no food out
function findBestMove(state: GameState): 'up' | 'down' | 'left' | 'right' {
    // don't run into self 
    let up = 0;
    let right = 0;
    let down = 0;
    let left = 0;
    for(let i=0; i<state.you.body.length; i++) {
        if(state.you.head.x - 1 == state.you.body[i].x) {
            left += state.you.body.length - i;
        } else if(state.you.head.x + 1 == state.you.body[i].x) {
            right += state.you.body.length - i;
        } else if(state.you.head.y - 1 == state.you.body[i].y) {
            down += state.you.body.length - i;
        } else if(state.you.head.y + 1 == state.you.body[i].y) {
            up += state.you.body.length - i;
        }
    }
    
    if(up <= right && up <= down && up <= left) {
        return 'up';
    } else if(right <= up && right <= down && right <= left) {
        return 'right';
    } else if(down <= up && down <= right && down <= left) {
        return 'down';
    } else {
        return 'left';
    }
}

function handleEnd(request: GameRequest, response: Response) {
    const gameData = request.body

    console.log('END')
    response.status(200).send('ok')
}


function initPathfinding(grid: GridNode[][]) {
    for(var xPos = 0; xPos < grid.length; xPos++) {
        for(var yPos = 0; yPos < grid[xPos].length; yPos++) {
            grid[xPos][yPos].position = {x: xPos, y: yPos};
            grid[xPos][yPos].f = 0;
            grid[xPos][yPos].g = 0;
            grid[xPos][yPos].h = 0;
            grid[xPos][yPos].parent = null;
        }  
    }
}

function search(grid: GridNode[][], start: Coordinates, end: Coordinates, obstacles: Coordinates[]): GridNode[] {
    console.log("STARTING SEARCH to position", end, " FROM position ", start);
    initPathfinding(grid);

    var openList: GridNode[] = [];
    var closedList: Coordinates[] = [];
    const startNode: GridNode = {
        position: start,
        g: 99,
        h: 99,
        f: 99,
        parent: null
    }
    openList.push(startNode);

    while(openList.length > 0) {

        var lowInd = 0;
        for(var i=0; i<openList.length; i++) {
            if(openList[i].f < openList[lowInd].f) { 
                lowInd = i; 
            }
        }
        let currentNode: GridNode = openList[lowInd];

        // End case
        if(currentNode.position.x == end.x && currentNode.position.y == end.y) {
            let curr = currentNode;
            let ret = [];
            while(curr.parent) {
                ret.push(curr);
                curr = curr.parent;
            }
            return ret.reverse();
        }

        // Normal case
        const indexToRemove: number = openList.indexOf(currentNode);
        if (indexToRemove > -1) {
            openList.splice(indexToRemove, 1);
        }
        closedList.push(currentNode.position);
        const neighbors: GridNode[] = findNeighbors(grid, currentNode);

        for(var i=0; i<neighbors.length;i++) {
            const neighbor: GridNode = neighbors[i];
            if(closedList.indexOf(neighbor.position) >= 0 || obstacles.indexOf(neighbor.position) >= 0) { // also check obstacles 
                continue;
            }

            let gScore = currentNode.g + 1;
            let gScoreIsBest = false;

            if(openList.indexOf(neighbor) <= -1) {
                gScoreIsBest = true;
                neighbor.h = heuristic(neighbor.position, currentNode.position);
                openList.push(neighbor);
            }
            else if(gScore < neighbor.g) {
                gScoreIsBest = true;
            }

            if(gScoreIsBest) {
                neighbor.parent = currentNode;
                neighbor.g = gScore;
                neighbor.f = neighbor.g + neighbor.h;
            }
        }
    }

    // No result was found
    return [];
}

function heuristic(pos0: Coordinates, pos1: Coordinates) {
    var d1 = Math.abs (pos1.x - pos0.x);
    var d2 = Math.abs (pos1.y - pos0.y);
    return d1 + d2;
}

function findNeighbors(grid: GridNode[][], node: GridNode): GridNode[] {
    const ret: GridNode[] = [];
    var x = node.position.x;
    var y = node.position.y;

    if(grid[x-1] && grid[x-1][y]) {
    ret.push(grid[x-1][y]);
    }
    if(grid[x+1] && grid[x+1][y]) {
    ret.push(grid[x+1][y]);
    }
    if(grid[x][y-1] && grid[x][y-1]) {
    ret.push(grid[x][y-1]);
    }
    if(grid[x][y+1] && grid[x][y+1]) {
    ret.push(grid[x][y+1]);
    }
    return ret;
}