document.addEventListener('DOMContentLoaded', (event) => {
    const grid = document.getElementById('grid');
    const messageElement = document.getElementById('message');
    const scoreElement = document.getElementById('score');
    const timerElement = document.getElementById('timer');
    const resultMessageElement = document.getElementById('resultMessage');
    const resetButton = document.getElementById('resetButton');
    const resultModal = document.getElementById('resultModal');
    const numRows = 12;
    const numCols = 12;
    const gameTime = 180;
    let score = 0;
    let countdown;
    let startCell, endCell;
    let file, folder;
    let hitWall = false;
    let reachedFolder = false;
    let timeLeft = gameTime;


    function generateMaze() {
        const maze = Array.from({ length: numRows }, () => Array(numCols).fill(1));
        const stack = [[1, 1]];
        const directions = [
            [0, 1], [1, 0], [0, -1], [-1, 0]
        ];

        maze[1][1] = 0;

        while (stack.length) {
            const [x, y] = stack[stack.length - 1];
            const shuffledDirs = directions.sort(() => Math.random() - 0.5);
            let moved = false;

            for (const [dx, dy] of shuffledDirs) {
                const nx = x + dx * 2;
                const ny = y + dy * 2;

                if (nx > 0 && nx < numRows - 1 && ny > 0 && ny < numCols - 1 && maze[nx][ny] === 1) {
                    maze[x + dx][y + dy] = 0;
                    maze[nx][ny] = 0;
                    stack.push([nx, ny]);
                    moved = true;
                    break;
                }
            }

            if (!moved) {
                stack.pop();
            }
        }

        // Marquer la cellule de début et de fin
        startCell = [1, 1];
        endCell = [numRows - 2, numCols - 2];
        maze[endCell[0]][endCell[1]] = 0;

        // S'assurer qu'au moins une cellule adjacente au dossier est libre
        const adjacentCells = [
            [endCell[0] - 1, endCell[1]],
            [endCell[0] + 1, endCell[1]],
            [endCell[0], endCell[1] - 1],
            [endCell[0], endCell[1] + 1]
        ];
        adjacentCells.forEach(([x, y]) => {
            if (x > 0 && x < numRows - 1 && y > 0 && y < numCols - 1) {
                maze[x][y] = 0;
            }
        });

        return maze;
    }

    function createMazeGrid(maze) {
        grid.innerHTML = '';
        for (let i = 0; i < maze.length; i++) {
            for (let j = 0; j < maze[i].length; j++) {
                const cell = document.createElement('div');
                cell.className = 'cell';
                if (maze[i][j] === 1) {
                    cell.classList.add('wall');
                } else if (i === startCell[0] && j === startCell[1]) {
                    cell.classList.add('draggable');
                    cell.setAttribute('draggable', 'true');
                    cell.id = 'file';
                    cell.innerHTML = '<img src="file-icon.png" alt="File Icon">';
                } else if (i === endCell[0] && j === endCell[1]) {
                    cell.classList.add('droptarget');
                    cell.id = 'folder';
                    cell.innerHTML = '<img src="folder-icon.png" alt="Folder Icon">';
                }
                grid.appendChild(cell);
            }
        }
    }

    function initializeGame() {
        const maze = generateMaze();
        createMazeGrid(maze);
        file = document.getElementById('file');
        folder = document.getElementById('folder');
        hitWall = false;
        reachedFolder = false;
        attachEventListeners();
    }

    function attachEventListeners() {
        file.setAttribute('data-x', 0);
        file.setAttribute('data-y', 0);
        file.style.transform = 'translate(0px, 0px)';

        interact('.draggable').unset();

        interact('.draggable')
            .draggable({
                inertia: true,
                modifiers: [
                    interact.modifiers.restrict({
                        restriction: 'parent',
                        endOnly: true,
                    }),
                ],
                autoScroll: true,
                onmove: dragMoveListener,
            });

        interact('.cell').dropzone({
            accept: '.draggable',
            overlap: 0.75,
            ondragenter: handleDragEnter,
        });
    }

    function dragMoveListener(event) {
        const target = event.target;
        const x = (parseFloat(target.getAttribute('data-x')) || 0) + event.dx;
        const y = (parseFloat(target.getAttribute('data-y')) || 0) + event.dy;

        target.style.transform = `translate(${x}px, ${y}px)`;
        target.setAttribute('data-x', x);
        target.setAttribute('data-y', y);
    }

    function handleDragEnter(event) {
        if (event.target.classList.contains('wall') && !hitWall) {
            hitWall = true;
            file.classList.add('error'); // Ajouter le fond rouge
            file.style.transform = 'translate(0px, 0px)'; // Réinitialiser la position
            file.setAttribute('data-x', 0);
            file.setAttribute('data-y', 0);
            updateScore(-1); // Décrémenter le score de 1
            displayMessage('Oups ! Vous avez touché un mur.', false);
        } else if (event.target.id === 'folder' && !reachedFolder) {
            reachedFolder = true;
            folder.classList.add('success'); // Ajouter le fond vert
            updateScore(1); // Incrémenter le score de 1
            displayMessage('Bravo ! Vous avez atteint le dossier.', true);
        }
    }

    function displayMessage(message, isWin) {
        messageElement.innerText = message;
        //messageElement.style.display = 'inline';
        let count = 0;
        const interval = setInterval(() => {
            count++;
            if (count >= 10) {
                clearInterval(interval);
                //messageElement.style.display = 'none';
                messageElement.innerText = "Placez le fichier dans le dossier.";
                file.classList.remove('error'); // Supprimer le fond rouge
                folder.classList.remove('success'); // Supprimer le fond vert
                if (isWin) {
                    initializeGame();
                } else {
                    resetDragAndDrop();
                }
                hitWall = false;
                reachedFolder = false;
            }
        }, 100);
    }

    function updateScore(value) {
        score += value;
        scoreElement.innerText = `Score: ${score}`;
    }

    function startTimer() {
        timerElement.innerText = formatTime(timeLeft);

        countdown = setInterval(() => {
            timeLeft--;
            timerElement.innerText = formatTime(timeLeft);

            if (timeLeft <= 0) {
                timeLeft = 0;
                endGame();
            }
        }, 1000);
    }

    function formatTime(seconds) {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `Temps restant: ${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
    }

    function endGame() {
        if (score <= 0)
        {
            resultMessageElement.innerHTML = `🙀🙀 Ton score : ${score} 🙀🙀 <br> Essai encore.`;
        }
        else if (score <10)
        {
            resultMessageElement.innerHTML = `🤒 Ton score : ${score} 🤒 <br> Tu peux aller plus loin. `;
        }
        else if (score <30)
        {
            resultMessageElement.innerHTML = `😌 Ton score : ${score} 😌 <br> Tu es sur la bonne voie. `;
        }
        else if (score <60)
        {
            resultMessageElement.innerHTML = `👍 Ton score : ${score} 👍 <br> Tu y es presque. `;
        }
        else
        {
            resultMessageElement.innerHTML = `🤩 Ton score : ${score} 🤩 <br> Bravo `;
        }
        resultMessageElement.style.display = 'block';
        resetButton.style.display = 'inline';
        resultModal.style.display = 'inline';
        file.classList.add('error'); // Rendre le fichier non-déplaçable
        interact('.draggable').unset();
    }

    function resetDragAndDrop() {
        file.style.transform = 'translate(0px, 0px)';
        file.setAttribute('data-x', 0);
        file.setAttribute('data-y', 0);

        // Réattacher les événements de drag and drop
        attachEventListeners();
    }

    window.resetGame = function() {
        score = 0;
        scoreElement.innerText = 'Score: 0';
        resultMessageElement.style.display = 'none';
        resetButton.style.display = 'none';
        resultModal.style.display = 'none'; // Effacer la modale
        initializeGame();
        timeLeft = gameTime;
    };

    initializeGame();
    startTimer();
});
