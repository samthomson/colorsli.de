import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RotateCcw, Trophy, Settings2 } from 'lucide-react';
import { cn } from '@/lib/utils';

type Color = string | null;
type Board = Color[][];

const COLORS = [
  '#ef4444', // red
  '#3b82f6', // blue
  '#10b981', // green
  '#f59e0b', // amber
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#f97316', // orange
];

function createRandomBoard(size: number): Board {
  const totalCells = size * size;
  const groupsOfFour = Math.floor(totalCells / 4);
  
  // Determine how many colors to use based on grid size
  // We want to use colors that divide evenly into the number of groups
  let numColors = COLORS.length;
  
  // Find the best number of colors that creates balanced distribution
  // Priority: use fewer colors for smaller grids, more for larger
  if (groupsOfFour <= 4) {
    numColors = 1; // 4x4 or smaller: 1 color
  } else if (groupsOfFour <= 9) {
    numColors = Math.min(3, COLORS.length); // 6x6: up to 3 colors
  } else if (groupsOfFour <= 16) {
    numColors = Math.min(4, COLORS.length); // 8x8: up to 4 colors
  } else if (groupsOfFour <= 25) {
    numColors = Math.min(5, COLORS.length); // 10x10: up to 5 colors
  } else {
    numColors = Math.min(6, COLORS.length); // 12x12: up to 6 colors
  }
  
  // Calculate how many groups of 4 per color
  const groupsPerColor = Math.floor(groupsOfFour / numColors);
  const remainder = groupsOfFour % numColors;
  
  // Create array with balanced color distribution
  const colors: Color[] = [];
  for (let i = 0; i < numColors; i++) {
    const color = COLORS[i];
    const groups = groupsPerColor + (i < remainder ? 1 : 0);
    for (let j = 0; j < groups; j++) {
      colors.push(color, color, color, color);
    }
  }
  
  // Shuffle the colors
  for (let i = colors.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [colors[i], colors[j]] = [colors[j], colors[i]];
  }
  
  // Create board
  const board: Board = [];
  let colorIndex = 0;
  for (let row = 0; row < size; row++) {
    const rowArray: Color[] = [];
    for (let col = 0; col < size; col++) {
      rowArray.push(colors[colorIndex++] || null);
    }
    board.push(rowArray);
  }
  
  return board;
}

function checkMatches(board: Board): { row: number; col: number }[] {
  const matches: { row: number; col: number }[] = [];
  const size = board.length;
  const cleared = new Set<string>();
  
  // Check horizontal matches - only exact groups of 4
  for (let row = 0; row < size; row++) {
    for (let col = 0; col <= size - 4; col++) {
      const color = board[row][col];
      if (!color) continue;
      
      // Check if this is exactly 4 in a row (not part of a longer sequence)
      const isFourInRow = 
        board[row][col + 1] === color &&
        board[row][col + 2] === color &&
        board[row][col + 3] === color &&
        (col === 0 || board[row][col - 1] !== color) && // Not preceded by same color
        (col + 4 >= size || board[row][col + 4] !== color); // Not followed by same color
      
      if (isFourInRow) {
        const cellKeys = [
          `${row},${col}`,
          `${row},${col + 1}`,
          `${row},${col + 2}`,
          `${row},${col + 3}`
        ];
        
        // Only add if none of these cells are already marked for clearing
        if (!cellKeys.some(key => cleared.has(key))) {
          cellKeys.forEach(key => cleared.add(key));
          matches.push(
            { row, col },
            { row, col: col + 1 },
            { row, col: col + 2 },
            { row, col: col + 3 }
          );
        }
      }
    }
  }
  
  // Check vertical matches - only exact groups of 4
  for (let col = 0; col < size; col++) {
    for (let row = 0; row <= size - 4; row++) {
      const color = board[row][col];
      if (!color) continue;
      
      // Check if this is exactly 4 in a column (not part of a longer sequence)
      const isFourInCol =
        board[row + 1][col] === color &&
        board[row + 2][col] === color &&
        board[row + 3][col] === color &&
        (row === 0 || board[row - 1][col] !== color) && // Not preceded by same color
        (row + 4 >= size || board[row + 4][col] !== color); // Not followed by same color
      
      if (isFourInCol) {
        const cellKeys = [
          `${row},${col}`,
          `${row + 1},${col}`,
          `${row + 2},${col}`,
          `${row + 3},${col}`
        ];
        
        // Only add if none of these cells are already marked for clearing
        if (!cellKeys.some(key => cleared.has(key))) {
          cellKeys.forEach(key => cleared.add(key));
          matches.push(
            { row, col },
            { row: row + 1, col },
            { row: row + 2, col },
            { row: row + 3, col }
          );
        }
      }
    }
  }
  
  return matches;
}

function checkBlocked(board: Board): { row: number; col: number }[] {
  const blocked: { row: number; col: number }[] = [];
  const size = board.length;
  
  // Check for horizontal sequences of 5+
  for (let row = 0; row < size; row++) {
    let currentColor: Color = null;
    let count = 0;
    let startCol = 0;
    
    for (let col = 0; col <= size; col++) {
      const color = col < size ? board[row][col] : null;
      
      if (color === currentColor && color !== null) {
        count++;
      } else {
        // Sequence ended, check if it was 5+
        if (count >= 5 && currentColor !== null) {
          for (let i = startCol; i < startCol + count; i++) {
            blocked.push({ row, col: i });
          }
        }
        currentColor = color;
        count = 1;
        startCol = col;
      }
    }
  }
  
  // Check for vertical sequences of 5+
  for (let col = 0; col < size; col++) {
    let currentColor: Color = null;
    let count = 0;
    let startRow = 0;
    
    for (let row = 0; row <= size; row++) {
      const color = row < size ? board[row][col] : null;
      
      if (color === currentColor && color !== null) {
        count++;
      } else {
        // Sequence ended, check if it was 5+
        if (count >= 5 && currentColor !== null) {
          for (let i = startRow; i < startRow + count; i++) {
            blocked.push({ row: i, col });
          }
        }
        currentColor = color;
        count = 1;
        startRow = row;
      }
    }
  }
  
  return blocked;
}

function isGameComplete(board: Board): boolean {
  return board.every(row => row.every(cell => cell === null));
}

export function ColourSlideGame() {
  const [gridSize, setGridSize] = useState(10);
  const [board, setBoard] = useState<Board>(() => createRandomBoard(10));
  const [dragging, setDragging] = useState<{ 
    type: 'row' | 'col' | 'undecided'; 
    index: number; 
    startX: number;
    startY: number;
    offsetX: number;
    offsetY: number;
  } | null>(null);
  const [matching, setMatching] = useState<{ row: number; col: number }[]>([]);
  const [blocked, setBlocked] = useState<{ row: number; col: number }[]>([]);
  const [isComplete, setIsComplete] = useState(false);
  const [moveCount, setMoveCount] = useState(0);

  const resetGame = useCallback((size: number) => {
    setBoard(createRandomBoard(size));
    setGridSize(size);
    setMatching([]);
    setBlocked([]);
    setIsComplete(false);
    setMoveCount(0);
  }, []);

  useEffect(() => {
    const matches = checkMatches(board);
    const blockedCells = checkBlocked(board);
    
    setBlocked(blockedCells);
    
    if (matches.length > 0) {
      setMatching(matches);
      
      // Clear matches after animation
      setTimeout(() => {
        setBoard(prevBoard => {
          const newBoard = prevBoard.map(row => [...row]);
          matches.forEach(({ row, col }) => {
            newBoard[row][col] = null;
          });
          return newBoard;
        });
        setMatching([]);
        
        // Check if game is complete
        setTimeout(() => {
          setBoard(currentBoard => {
            if (isGameComplete(currentBoard)) {
              setIsComplete(true);
            }
            return currentBoard;
          });
        }, 100);
      }, 600);
    }
  }, [board]);

  const handleMouseDown = (rowIndex: number, colIndex: number, clientX: number, clientY: number) => {
    setDragging({ 
      type: 'undecided', 
      index: rowIndex * gridSize + colIndex, 
      startX: clientX, 
      startY: clientY,
      offsetX: 0,
      offsetY: 0
    });
  };

  const handleMouseMove = (clientX: number, clientY: number) => {
    if (!dragging) return;
    
    const offsetX = clientX - dragging.startX;
    const offsetY = clientY - dragging.startY;
    
    let newDragging = { ...dragging, offsetX, offsetY };
    
    // Determine direction if undecided
    if (dragging.type === 'undecided') {
      const absX = Math.abs(offsetX);
      const absY = Math.abs(offsetY);
      
      // Need at least 5px movement to decide direction
      if (absX > 5 || absY > 5) {
        if (absX > absY) {
          // Horizontal movement - drag the row
          const rowIndex = Math.floor(dragging.index / gridSize);
          newDragging = { ...newDragging, type: 'row', index: rowIndex };
        } else {
          // Vertical movement - drag the column
          const colIndex = dragging.index % gridSize;
          newDragging = { ...newDragging, type: 'col', index: colIndex };
        }
      }
    }
    
    setDragging(newDragging);
    
    // Only snap if we've decided on a direction
    if (newDragging.type === 'undecided') return;
    
    // Get the container element to calculate cell size
    const gridElement = document.querySelector('[data-grid]');
    if (!gridElement) return;
    
    const rect = gridElement.getBoundingClientRect();
    const cellSize = newDragging.type === 'row' ? 
      rect.width / gridSize : 
      rect.height / gridSize;
    
    // Threshold for snapping to next position (70% of cell size for "sticky" feel)
    const threshold = cellSize * 0.7;
    
    const offset = newDragging.type === 'row' ? offsetX : offsetY;
    
    if (Math.abs(offset) > threshold) {
      const direction = offset > 0 ? 1 : -1;
      
      setBoard(prevBoard => {
        const newBoard = prevBoard.map(row => [...row]);
        
        if (newDragging.type === 'row') {
          const row = newBoard[newDragging.index];
          if (direction > 0) {
            // Slide right
            const last = row.pop()!;
            row.unshift(last);
          } else {
            // Slide left
            const first = row.shift()!;
            row.push(first);
          }
        } else {
          // Slide column
          const col = newDragging.index;
          const column = newBoard.map(row => row[col]);
          
          if (direction > 0) {
            // Slide down
            const last = column.pop()!;
            column.unshift(last);
          } else {
            // Slide up
            const first = column.shift()!;
            column.push(first);
          }
          
          column.forEach((val, i) => {
            newBoard[i][col] = val;
          });
        }
        
        return newBoard;
      });
      
      setMoveCount(prev => prev + 1);
      // Reset start position but keep dragging active
      setDragging({ ...newDragging, startX: clientX, startY: clientY, offsetX: 0, offsetY: 0 });
    }
  };

  const handleMouseUp = () => {
    setDragging(null);
  };

  return (
    <Card className="w-full max-w-4xl shadow-2xl">
      <CardHeader className="space-y-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
            Colour Slide
          </CardTitle>
          {isComplete && (
            <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
              <Trophy className="h-6 w-6" />
              <span className="font-semibold">Complete!</span>
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <Settings2 className="h-4 w-4 text-muted-foreground" />
            <Select value={gridSize.toString()} onValueChange={(val) => resetGame(parseInt(val))}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="6">6x6</SelectItem>
                <SelectItem value="8">8x8</SelectItem>
                <SelectItem value="10">10x10</SelectItem>
                <SelectItem value="12">12x12</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="text-sm text-muted-foreground">
            Moves: <span className="font-semibold text-foreground">{moveCount}</span>
          </div>
          
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => resetGame(gridSize)}
            className="ml-auto"
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            New Game
          </Button>
        </div>
        
        {blocked.length > 0 ? (
          <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/20 p-3 rounded-md border border-red-200 dark:border-red-800">
            <span className="font-bold text-lg">!</span>
            <p>
              <strong>5+ in a row detected!</strong> Break them apart - you need exactly 4 to match.
            </p>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Slide rows and columns to match 4 colors in a row. Click and drag to slide!
          </p>
        )}
      </CardHeader>
      
      <CardContent>
        <div 
          className="relative mx-auto"
          style={{ 
            maxWidth: `${Math.min(600, gridSize * 50)}px`,
          }}
          onMouseMove={(e) => handleMouseMove(e.clientX, e.clientY)}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onTouchMove={(e) => {
            if (dragging) {
              const touch = e.touches[0];
              handleMouseMove(touch.clientX, touch.clientY);
            }
          }}
          onTouchEnd={handleMouseUp}
        >
          <div 
            data-grid
            className="grid gap-1 select-none"
            style={{
              gridTemplateColumns: `repeat(${gridSize}, minmax(0, 1fr))`,
            }}
          >
            {board.map((row, rowIndex) => (
              row.map((color, colIndex) => {
                const isMatching = matching.some(m => m.row === rowIndex && m.col === colIndex);
                const isBlocked = blocked.some(b => b.row === rowIndex && b.col === colIndex);
                const isDraggingRow = dragging?.type === 'row' && dragging?.index === rowIndex;
                const isDraggingCol = dragging?.type === 'col' && dragging?.index === colIndex;
                const isDraggingThis = isDraggingRow || isDraggingCol;
                
                // Calculate transform based on drag offset
                let transform = '';
                if (dragging && isDraggingThis) {
                  if (isDraggingRow) {
                    transform = `translateX(${dragging.offsetX}px)`;
                  } else if (isDraggingCol) {
                    transform = `translateY(${dragging.offsetY}px)`;
                  }
                }
                
                return (
                  <div
                    key={`${rowIndex}-${colIndex}`}
                    className={cn(
                      'aspect-square rounded-full relative',
                      color ? 'cursor-move' : 'border-2 border-dashed border-gray-300 dark:border-gray-600',
                      isMatching && 'scale-125 animate-pulse shadow-lg',
                      isBlocked && 'ring-2 ring-red-500 ring-offset-1 animate-pulse',
                      isDraggingThis ? 'transition-none' : 'transition-all duration-200',
                      isDraggingRow && !isBlocked && 'ring-2 ring-purple-500 shadow-xl scale-105',
                      isDraggingCol && !isBlocked && 'ring-2 ring-blue-500 shadow-xl scale-105'
                    )}
                    style={{
                      backgroundColor: color || 'transparent',
                      transform,
                    }}
                    onMouseDown={(e) => {
                      if (color) {
                        e.preventDefault();
                        handleMouseDown(rowIndex, colIndex, e.clientX, e.clientY);
                      }
                    }}
                    onTouchStart={(e) => {
                      if (color) {
                        const touch = e.touches[0];
                        handleMouseDown(rowIndex, colIndex, touch.clientX, touch.clientY);
                      }
                    }}
                  >
                    {isBlocked && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="text-white text-xs font-bold drop-shadow-[0_1px_1px_rgba(0,0,0,0.8)]">
                          !
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            ))}
          </div>
          

        </div>
      </CardContent>
    </Card>
  );
}
