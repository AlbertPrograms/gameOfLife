/**
 * Type definitions
 */
/**
 * Playing field class
 */
// Data structure for storing game state info
class PlayingField {
    constructor(cells) {
        this.cells = cells || [];
    }
    // Returns true if there's life at {x, y} coordinates, false otherwise
    hasLifeAt(coords) {
        return (this.cells.length > 0 && // Empty cell array should return false as well
            this.cells.filter((cell) => cell.x === coords.x && cell.y === coords.y && cell.hasLife).length > 0);
    }
    // Returns true if there's cell info stored in the class instance with {x, y} coordinates
    hasCellAt(coords) {
        return (this.cells.length > 0 && // Empty cell array should return false as well
            this.cells.filter((cell) => cell.x === coords.x && cell.y === coords.y).length > 0);
    }
    // Returns the index of cell at {x, y} coordinates from this.cells, -1 if not found
    findCellAt(coords) {
        return this.cells.findIndex((cell) => cell.x === coords.x && cell.y === coords.y);
    }
    // Adds life at the given coordinates if there isn't life
    addLifeAt(coords) {
        if (this.cells.length && this.findCellAt(coords) !== -1) {
            this.cells[this.findCellAt(coords)].hasLife = true;
        }
        else {
            this.cells.push(Object.assign({}, coords, { hasLife: true }));
        }
    }
    // Kills life at the given coordinates if there is life
    killLifeAt(coords) {
        if (this.cells.length && this.findCellAt(coords) !== -1) {
            this.cells.splice(this.findCellAt(coords), 1);
        }
    }
    // Determines whether the cell will have life next round
    cellLivesNextRound(cell) {
        const { x, y } = cell;
        let neighbors = 0;
        // Examine a 3x3 block around the cell in analysis
        for (let i = -1; i <= 1; i++) {
            for (let j = -1; j <= 1; j++) {
                // Don't examine the cell itself
                if (i === 0 && j === 0)
                    continue;
                // Increment neighbors if cell at coordinates has life
                if (this.hasLifeAt({ x: x + i, y: y + j })) {
                    neighbors++;
                }
            }
        }
        // 2 neighbors = survive, 3 neighbors = create
        return (neighbors === 2 && cell.hasLife) || neighbors === 3;
    }
    // Expands the cells array with every neighboring cell of the life holding
    // cells to inspect every valid candidate for life in the next round
    expandCellsWithNeighbors() {
        this.cells.forEach((cell) => {
            const { x, y } = cell;
            // Expand a 3x3 block around the cell in analysis
            for (let i = -1; i <= 1; i++) {
                for (let j = -1; j <= 1; j++) {
                    // Don't expand to the cell itself
                    if (i === 0 && j === 0)
                        continue;
                    // Add neighbor to cells array if it's not stored yet
                    if (!this.hasCellAt({ x: x + i, y: y + j })) {
                        this.cells.push({ x: x + i, y: y + j, hasLife: false });
                    }
                }
            }
        });
    }
    // Toggles cell life at the given coordinates
    toggleCell(coords) {
        if (this.hasLifeAt(coords)) {
            this.killLifeAt(coords);
        }
        else {
            this.addLifeAt(coords);
        }
    }
    // Returns a new PlayingField instance with cells of the next generation
    spawnNew() {
        // With this we can inspect every valid candidate for life in the next round
        this.expandCellsWithNeighbors();
        // Map the cell array to the next generation with the cellLivesNextRound
        // function, then filter out the 'lifeless' cells so only important info is stored
        const cells = this.cells
            .map((cell) => {
            return {
                x: cell.x,
                y: cell.y,
                hasLife: this.cellLivesNextRound(cell)
            };
        })
            .filter((cell) => cell.hasLife);
        this.cells = this.cells.filter((cell) => cell.hasLife);
        return new PlayingField(cells);
    }
    // Returns a new PlayingFiled instance with all the cells
    // that are present in otherField but not in the current one
    getDifferenceCells(otherField) {
        const differenceCells = [];
        otherField.getCells().forEach((cell) => {
            if (!this.hasLifeAt(cell)) {
                differenceCells.push(cell);
            }
        });
        return differenceCells;
    }
    // Returns the cells inside the playing field
    getCells() {
        return this.cells.map(d => d);
    }
    getClone() {
        return new PlayingField(this.getCells());
    }
}
/**
 * Game class
 */
class Game {
    /**
     *
     * Methods
     *
     */
    constructor(element) {
        /**
         * Game class fields
         */
        // Draw Controls
        this.scale = 1;
        this.dx = 0;
        this.dy = 0;
        this.speed = 1;
        this.handlersAssigned = false;
        this.playing = false;
        this.lifeColor = '#64b440';
        // Draw constants
        this.gridColor = '#646464';
        this.backgroundColor = '#ffffff';
        this.gridLineWidth = 2;
        this.cellSize = 30;
        this.container = element;
        this.fieldElement = element.querySelector('canvas');
        this.controlsElement = element.querySelector('.controls');
        this.width = this.fieldElement.offsetWidth;
        this.height = this.fieldElement.offsetHeight;
        this.fieldElement.width = this.width;
        this.fieldElement.height = this.height;
        this.initPlayingField();
    }
    /**
     * Initializer methods
     */
    // Draw grid, request the initial cells, create OK button,
    // then create a playing field with them and store it
    initPlayingField() {
        this.playingFields = [];
        this.currentPlayingField = new PlayingField();
        // Store field state in the array
        this.playingFields.push(this.currentPlayingField);
        this.drawGrid();
        this.initControls();
    }
    // Initialize the controls to their current values
    initControls() {
        [
            ['speed', this.speed.toString()],
            ['zoom', (this.scale * 5).toString()],
            ['generation', this.playingFields.length.toString()],
            ['color', this.lifeColor]
        ].forEach((controlPair) => {
            const elem = this.controlsElement.querySelector('#' + controlPair[0]);
            elem.value = controlPair[1];
        });
        this.assignControls();
    }
    // Creates the game controls and assign their handlers to them
    assignControls() {
        // Initialize click to toggle life handler
        this.stop();
        // Assign event handlers if they haven't been assigned yet
        if (this.handlersAssigned)
            return;
        this.handlersAssigned = true;
        [
            ['startStop', 'onclick', this.startStopHandler],
            ['step', 'onclick', this.stepHandler],
            ['reset', 'onclick', this.resetHandler],
            ['killUnseen', 'onclick', this.killUnseenHandler],
            ['save', 'onclick', this.saveHandler],
            ['load', 'onchange', this.loadHandler],
            ['speed', 'onchange', this.speedHandler],
            ['zoom', 'onchange', this.zoomHandler],
            ['generation', 'onchange', this.generationHandler],
            ['color', 'onkeyup', this.colorHandler]
        ].forEach((controlDescription) => {
            const elem = this.controlsElement.querySelector('#' + controlDescription[0]);
            const event = controlDescription[1];
            const listener = controlDescription[2];
            elem[event] = () => listener.bind(this)(elem);
        });
        // Remove default context menu from right click and add pan instead
        this.fieldElement.oncontextmenu = (event) => event.preventDefault();
        this.fieldElement.onmousedown = this.panningHandler.bind(this);
    }
    /**
     * Event handler methods
     */
    // Listens for mouse clicks on the field to toggle cells
    populationWatcher(event) {
        // Store previous state for redraw
        const previousField = this.currentPlayingField.getClone();
        this.currentPlayingField.toggleCell(this.pixelsToCoordinates({ x: event.clientX, y: event.clientY }));
        // Redraw
        this.draw(previousField);
        this.draw();
    }
    // Starts or stops playback of the game
    startStopHandler(startStopButton) {
        if (startStopButton.innerText === 'Start') {
            this.start();
        }
        else {
            this.stop();
        }
    }
    // Creates a new generation without starting playback
    stepHandler() {
        // Only request the step if playback is not enabled
        if (!this.playing)
            this.play(true);
    }
    // Resets the field and deletes generation history
    resetHandler() {
        this.playingFields = [];
        this.initPlayingField();
        this.updateGeneration();
    }
    // Kills off cells that are not visible on the field
    killUnseenHandler() {
        // Filter for living cells that are in bounds (visible)
        const newCells = this.currentPlayingField
            .getCells()
            .filter((cell) => this.coordsInBounds(cell));
        // Spawn new playing field with the filtered cells
        this.currentPlayingField = new PlayingField(newCells);
        this.playingFields.push(this.currentPlayingField);
    }
    // Saves the playing field state and history
    saveHandler() {
        // Create JSON data
        const json = JSON.stringify({
            playingFields: this.playingFields,
            currentPlayingField: this.currentPlayingField
        });
        // Create blob object from JSON data
        const blob = new Blob([json], { type: 'text/plain' });
        // Create anchor with blob data as download
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'gameOfLife_save.txt';
        // Add anchor to document, click it to init download then remove it
        document.body.appendChild(a);
        a.click();
        a.outerHTML = '';
    }
    // Saves the playing field state and history
    loadHandler(fileInput) {
        // @ts-ignore - modern browsers will have FileReader, but checking anyways
        if (typeof window.FileReader !== 'function' || !fileInput.files) {
            alert('The File APIs are not fully supported in this browser.');
            return;
        }
        // Parse the loaded data and make it active
        const fileLoaded = (e) => {
            const result = e.target.result;
            const loadedGame = JSON.parse(result);
            // Set the playing field and history to the loaded values
            this.playingFields = loadedGame.playingFields.map((field) => new PlayingField(field.cells));
            this.currentPlayingField = new PlayingField(loadedGame.currentPlayingField.cells);
            // Redraw with the new data and update the generation slider
            this.drawGrid();
            this.draw();
            this.updateGeneration();
        };
        // Catch any IO errors
        try {
            // Select the file and load it with the FileReader
            const file = fileInput.files[0];
            const fileReader = new FileReader();
            fileReader.onload = fileLoaded;
            fileReader.readAsText(file);
        }
        catch (e) {
            console.error(e);
            alert('Error loading file');
        }
    }
    // Modifies playback speed
    speedHandler(speedSlider) {
        this.speed = parseInt(speedSlider.value);
    }
    // Sets the field's zoom value
    zoomHandler(zoomSlider) {
        this.scale = parseInt(zoomSlider.value) / 5;
        this.drawGrid();
        this.draw();
    }
    // Handles the generation slider for history playback
    generationHandler(generationSlider) {
        // Fetch the generation according to the slider value
        const generation = parseInt(generationSlider.value);
        this.currentPlayingField = this.playingFields[generation - 1];
        // Redraw the whole field
        this.drawGrid();
        this.draw();
    }
    // Handles the color input field, instantly changes color on valid hex format input
    colorHandler(colorInput) {
        // Small delay so it registers the text result after the keypress
        setTimeout(() => {
            const colorString = colorInput.value;
            // Check if it's a valid hex color code (case insensitive)
            if (!/^#[0-9a-f]{6}$/i.test(colorString))
                return;
            // Don't refresh if it's the same color
            if (colorString === this.lifeColor)
                return;
            this.lifeColor = colorString;
            // After changing the color, draw everything again with the new color
            this.draw();
        }, 0);
    }
    // Handles right click activated panning of the field
    panningHandler(event) {
        // Only watch right click
        if (event.buttons !== 2)
            return;
        // Prevent contextmenu
        event.preventDefault();
        // Click starting position
        const x0 = event.clientX;
        const y0 = event.clientY;
        // Watch for release of the button
        this.fieldElement.onmouseup = (event) => {
            event.preventDefault();
            // Remove release watcher
            this.fieldElement.onmouseup = null;
            // Difference of release vs start coordinates
            const coords = {
                x: event.clientX - x0,
                y: event.clientY - y0
            };
            this.pan(coords);
        };
    }
    // Sets the offset of the field view then redraws it
    pan(coords) {
        this.dx += coords.x;
        this.dy += coords.y;
        this.drawGrid();
        this.draw();
    }
    /**
     * Playback methods
     */
    // Start/continue game
    start() {
        const startStopButton = this.controlsElement.querySelector('#startStop');
        // Turn into stop button
        startStopButton.innerText = 'Stop';
        // Disable toggle life function
        this.fieldElement.onclick = null;
        // Start play cycle
        this.playing = true;
        this.play();
        // Disable generation slider
        const generationSlider = this.controlsElement.querySelector('#generation');
        generationSlider.disabled = true;
    }
    // Stop game
    stop() {
        const startStopButton = this.controlsElement.querySelector('#startStop');
        // Add toggle life with clicking function
        this.fieldElement.onclick = this.populationWatcher.bind(this);
        // Turn into start button
        startStopButton.innerText = 'Start';
        // Stop play cycle
        this.playing = false;
        // Enable generation slider
        const generationSlider = this.controlsElement.querySelector('#generation');
        generationSlider.disabled = false;
    }
    // Spawns new generations of fields, stores the old ones in
    // an array for playback, calls draw functions
    play(step = false) {
        if (!this.playing && !step)
            return;
        // Store the previous field state for comparision (what needs to be erased)
        // This way there's no need to redraw the whole grid on new generations
        const previousField = this.currentPlayingField;
        // Spawn the new generation and set it as current
        this.currentPlayingField = this.currentPlayingField.spawnNew();
        // Store field state in the array
        this.playingFields.push(this.currentPlayingField);
        // Clear the blocks no longer needed using the difference of the current
        // and previous playing field
        this.draw(previousField);
        // Finally draw the new generation and update the generation slider
        this.draw();
        this.updateGeneration();
        // Don't prepare the next generation if only a step was required
        if (!step)
            setTimeout(this.play.bind(this), 1000 / this.speed);
    }
    // Updates the generation slider on creating a new one
    updateGeneration() {
        const generationSlider = this.controlsElement.querySelector('#generation');
        // Set max and current values to the newest generation
        generationSlider.value = generationSlider.max = this.playingFields.length.toString();
    }
    /**
     * Coordinate - pixel calculation methods
     */
    // Translate game coordinates to canvas pixel positions
    coordinatesToPixels(coords, relative = false // Used for drawing the grid regardless of offset
    ) {
        const { x, y } = coords;
        const offset = {
            x: relative ? this.dx % this.cellSize : this.dx,
            y: relative ? this.dy % this.cellSize : this.dy
        };
        return {
            x: (x * this.cellSize + offset.x) * this.scale,
            y: (y * this.cellSize + offset.y) * this.scale
        };
    }
    // Translate canvas pixel positions into game coordinates
    pixelsToCoordinates(pixelCoords) {
        const { x, y } = pixelCoords;
        return {
            x: Math.floor((x - this.dx * this.scale) / this.cellSize / this.scale),
            y: Math.floor((y - this.dy * this.scale) / this.cellSize / this.scale)
        };
    }
    // One cell's size added to the edges is how far we need to draw
    coordsInBounds(coords) {
        const { width, height, cellSize, scale } = this;
        const pixelCoords = this.coordinatesToPixels(coords);
        const xInBounds = pixelCoords.x >= 0 - cellSize * scale &&
            pixelCoords.x <= width + cellSize * scale;
        const yInBounds = pixelCoords.y >= 0 - cellSize * scale &&
            pixelCoords.y <= height + cellSize * scale;
        return xInBounds && yInBounds;
    }
    /**
     * Drawing methods
     */
    // Create the grid layout of the playing field taking into account scale and offset
    drawGrid() {
        const { width, height, gridColor, backgroundColor, gridLineWidth, cellSize, scale } = this;
        const context = this.fieldElement.getContext('2d');
        // Create full canvas solid rect with grid color
        context.fillStyle = gridColor;
        context.beginPath();
        context.rect(0, 0, width, height);
        context.fill();
        context.closePath();
        // Fill solid rect with background colored rects, resulting in a grid
        context.fillStyle = backgroundColor;
        context.beginPath();
        // Starting from -1 to the other edge + 1 so the edge
        // rows are visible even with the field having offset
        for (let i = -1; i < Math.ceil(width / cellSize / scale) + 1; i++) {
            for (let j = -1; j < Math.ceil(height / cellSize / scale) + 1; j++) {
                const pixelCoords = this.coordinatesToPixels({ x: i, y: j }, true);
                context.rect(pixelCoords.x + (gridLineWidth / 2) * scale, pixelCoords.y + (gridLineWidth / 2) * scale, (cellSize - gridLineWidth / 2) * scale, (cellSize - gridLineWidth / 2) * scale);
            }
        }
        context.fill();
        context.closePath();
    }
    // Draws the playing field cells, or background colored cells
    // if the parameter is given to save resources on redraw
    draw(oldField) {
        // Don't draw without existing cells unless it's a clearing draw
        if (oldField === undefined && !this.currentPlayingField.getCells().length)
            return;
        const { gridLineWidth, lifeColor, backgroundColor, cellSize, scale } = this;
        const context = this.fieldElement.getContext('2d');
        let cells;
        let cellSizeFactor;
        if (oldField === undefined) {
            // Regular draw (life color circles)
            context.fillStyle = lifeColor;
            cellSizeFactor = 0.35;
            cells = this.currentPlayingField.getCells();
        }
        else {
            // Clearing draw (background color larger circles)
            context.fillStyle = backgroundColor;
            // Bigger circle size than living cell so aliasing artifacts don't remain visible
            cellSizeFactor = 0.42;
            // Get the cells that are no longer alive
            cells = this.currentPlayingField.getDifferenceCells(oldField);
        }
        cells.forEach((cell) => {
            const pixelCoords = this.coordinatesToPixels({ x: cell.x, y: cell.y });
            // Don't bother drawing what can't be seen
            if (this.coordsInBounds(cell)) {
                context.beginPath();
                context.arc(pixelCoords.x + (cellSize / 2) * scale, pixelCoords.y + (cellSize / 2) * scale, (cellSize * cellSizeFactor - gridLineWidth) * scale, 0, Math.PI * 2);
                context.fill();
                context.closePath();
            }
        });
    }
}
new Game(document.querySelector('.game'));
