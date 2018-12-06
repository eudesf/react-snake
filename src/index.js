import React from 'react'
import ReactDOM from 'react-dom';
import './index.css';

const BOARD_WIDTH = 14;
const BOARD_HEIGHT = 16;
const INITIAL_SNAKE_LENGTH = 7;
const INITIAL_SPEED_TIMEOUT = 500;
const SPEED_INTERVAL = 3;

const SNAKE_LEFT_DIRECTION = 1;
const SNAKE_RIGHT_DIRECTION = 2;
const SNAKE_UP_DIRECTION = 3;
const SNAKE_DOWN_DIRECTION = 4;

const SNAKE_STATUS_WALKING = 1;
const SNAKE_STATUS_HIT_THE_WALL = 2;
const SNAKE_STATUS_HIT_ITSELF = 3;

const LEFT_KEYCODE = 37;
const UP_KEYCODE = 38
const RIGHT_KEYCODE = 39;
const DOWN_KEYCODE = 40;

function Cell(props) {
    let className = "cell";
    if (props.cell) {
        if (props.cell.hasSnake) {
            className += " snake";
        } else if (props.cell.hasFood) {
            className += " food";
        }
    }
    if (props.status === SNAKE_STATUS_HIT_THE_WALL) {
        className += " hit-the-wall";
    }
    if (props.status === SNAKE_STATUS_HIT_ITSELF) {
        className += " hit-itself";
    }
    return <div className={className}></div>
}

class Board extends React.Component {

    render() {
        let rows = [];
        for (let row = 0; row < this.props.height; row++) {
            let startCell = row * this.props.width;
            const rowCells = this.props.cells
                .slice(startCell, startCell + this.props.width)
                .map((cell, cellId) => {
                    return <Cell key={cellId} cell={cell} status={this.props.status}/> 
                });
            rows.push(
                <div className="board-row" key={row}>
                    {rowCells}
                </div>
            )
        }
        return (
            <div className="board">
                {rows}
            </div>
        );
    }
}

class Snake extends React.Component {
    constructor(props) {
        super(props);
        this.state = 
            this.createFood(
                this.handleHead(
                    this.buildInitialState(),
                    0,
                    0
                )
            );

        window.addEventListener("keypress", function(ev) {
            switch (ev.keyCode) {
                case LEFT_KEYCODE: this.changeDirection(SNAKE_LEFT_DIRECTION); break;
                case RIGHT_KEYCODE: this.changeDirection(SNAKE_RIGHT_DIRECTION); break;
                case UP_KEYCODE: this.changeDirection(SNAKE_UP_DIRECTION); break;
                case DOWN_KEYCODE: this.changeDirection(SNAKE_DOWN_DIRECTION); break;
            }
        }.bind(this));
    }

    componentDidMount() {
        setTimeout(() => this.gameLoop(), this.state.speed);
    }

    buildInitialState() {
        return {
            cells: Array(BOARD_WIDTH * BOARD_HEIGHT).fill(null),
            speed: INITIAL_SPEED_TIMEOUT,
            length: INITIAL_SNAKE_LENGTH,
            position: {
                x: 0,
                y: 0
            },
            status: SNAKE_STATUS_WALKING,
        }
    }

    calculateFoodPosition(cells) {
        const position = {
            x: Math.floor(Math.random() * BOARD_WIDTH),
            y: Math.floor(Math.random() * BOARD_HEIGHT),
        } 
        const cellId = positionToCellId(position);
        const cell = cells[cellId];
        if (cell && (cell.hasSnake || cell.hasFood)) {
            return this.calculateFoodPosition(cells);
        }
        return position;
    }

    changeDirection(direction) {
        if (canChangeDirection(direction, this.state.direction)) {
            this.props.direction = direction;
        }
    }

    checkCollision(cells, posX, posY) {
        if (posX < 0 
            || posY < 0 
            || posX >= BOARD_WIDTH 
            || posY >= BOARD_HEIGHT) {
            if (this.props.onCollision) {
                this.props.onCollision(SNAKE_STATUS_HIT_THE_WALL);
            }
            return SNAKE_STATUS_HIT_THE_WALL;
        }
        const cell = cells[positionToCellId({x: posX, y: posY})];
        if (cell && cell.hasSnake > 0) {
            if (this.props.onCollision) {
                this.props.onCollision(SNAKE_STATUS_HIT_ITSELF);
            }
            return SNAKE_STATUS_HIT_ITSELF;
        }
        return false;
    }

    checkHasFood(state) {
        const cellId = positionToCellId(state.position);
        const cell = state.cells[cellId];
        if (cell && cell.hasFood) {
            return cellId;
        }
        return false;
    }

    createFood(state) {
        const foodPosition = this.calculateFoodPosition(state.cells);
        const foodCellId = positionToCellId(foodPosition);
        const foodCell = state.cells[foodCellId] || {};
        const newFoodCell = Object.assign({}, foodCell);
        newFoodCell.hasFood = 1;

        const newState = Object.assign({}, state);
        newState.cells = newState.cells.slice();
        newState.cells[foodCellId] = newFoodCell;
        return newState;
    }

    eatFood(state, foodCellId) {
        const newState = this.createFood(state);
        newState.length++;
        newState.speed -= SPEED_INTERVAL;
        newState.cells[foodCellId].hasFood = null;
        if (this.props.onEat) {
            this.props.onEat();
        }
        return newState;
    }

    handleHead(state) {
        const cellId = positionToCellId(state.position);
        const newCells = state.cells.slice();
        newCells[cellId] = {
            hasSnake: state.length,
        }
        const newState = Object.assign({}, state);
        newState.cells = newCells;
        return newState;
    }

    handleCellsLifeTime(state) {
        const newState = Object.assign({}, state);
        newState.cells = state.cells.map(cell => {
            if (cell && cell.hasSnake > 0) {
                cell.hasSnake--;
            }
            return cell;
        });
        return newState;
    }

    handleFood(state) {
        const foodCellId = this.checkHasFood(state);
        if (foodCellId) {
            return this.eatFood(state, foodCellId);
        } else {
            return this.handleCellsLifeTime(state);
        }
    }

    handleMove(state) {
        let posX = state.position.x;
        let posY = state.position.y;
        switch (this.props.direction) {
        case SNAKE_LEFT_DIRECTION: posX--; break;
        case SNAKE_RIGHT_DIRECTION: posX++; break;
        case SNAKE_UP_DIRECTION: posY--; break;
        case SNAKE_DOWN_DIRECTION: posY++; break;
        }
        
        const collision = this.checkCollision(state.cells, posX, posY);
        if (collision) {
            this.setState({
                status: collision,
            });
            return false;
        }

        const newState = Object.assign({}, state);
        const newPosition = Object.assign({}, state.position);
        newPosition.x = posX;
        newPosition.y = posY;
        newState.position = newPosition;
        return newState;
    }

    gameLoop() {
        if (this.state.status === SNAKE_STATUS_WALKING) {
            const movedState = this.handleMove(this.state);
            if (movedState) {
                this.setState(
                    this.handleHead(
                        this.handleFood(
                            movedState            
                        )
                    )
                );
            }
            setTimeout(() => this.gameLoop(), this.state.speed);
        }
    }

    render() {
        return (
            <Board 
                width={BOARD_WIDTH}
                height={BOARD_HEIGHT}
                cells={this.state.cells}
                status={this.state.status}
            />
        );
    }

}

class Game extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            points: 0,
            status: "Snake walking! Take care!",
            direction: SNAKE_RIGHT_DIRECTION
        }
    }

    onEat() {
        this.setState({
            points: this.state.points + 1,
        })
    }

    onCollision(status) {
        let message;
        switch (status) {
        case SNAKE_STATUS_HIT_ITSELF: message = "You hit yourself!"; break;
        case SNAKE_STATUS_HIT_THE_WALL: message = "You hit the wall!"; break;
        default: message = "Unknown collision";
        }
        message += " Game Over!";
        this.setState({
            status: message
        });
    }

    changeDirection(direction) {
        if (canChangeDirection(direction, this.state.direction)) {
            this.setState({direction: direction})
        }
    }

    render() {
        return (
            <div>
                <div>
                    <h3>{this.state.status}</h3>
                    <p>Points: {this.state.points}</p>
                </div>
                <Snake 
                    onEat={() => this.onEat()}
                    onCollision={(collision) => this.onCollision(collision)}
                    direction={this.state.direction}
                />
                <div class="buttons">
                    <button onClick={() => this.changeDirection(SNAKE_UP_DIRECTION)}>^</button>
                    <button onClick={() => this.changeDirection(SNAKE_DOWN_DIRECTION)}>v</button>
                    <button onClick={() => this.changeDirection(SNAKE_LEFT_DIRECTION)}>&lt;</button>
                    <button onClick={() => this.changeDirection(SNAKE_RIGHT_DIRECTION)}>&gt;</button>
                </div>
            </div>
        );
    }
}

function canChangeDirection(direction, currentDirection) {
    return direction !== oppositeDirection(currentDirection)
}

function oppositeDirection(direction) {
    switch (direction) {
    case SNAKE_LEFT_DIRECTION: return SNAKE_RIGHT_DIRECTION; break;
    case SNAKE_RIGHT_DIRECTION: return SNAKE_LEFT_DIRECTION; break;
    case SNAKE_UP_DIRECTION: return SNAKE_DOWN_DIRECTION; break;
    case SNAKE_DOWN_DIRECTION: return SNAKE_UP_DIRECTION; break;
    }
}

function cellIdToPosition(cellId) {
    return {
        x: cellId % (BOARD_WIDTH + 1),
        y: Math.floor(cellId / BOARD_WIDTH),
    }
}

function positionToCellId(position) {
    return position.x + (position.y * BOARD_WIDTH);
}

ReactDOM.render(
    <Game />,
    document.getElementById('root')
)