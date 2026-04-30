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
  const colorsNeeded = Math.floor(totalCells / 4);
  
  // Create array with 4 of each color
  const colors: Color[] = [];
  for (let i = 0; i < colorsNeeded; i++) {
    const color = COLORS[i % COLORS.length];
    colors.push(color, color, color, color);
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
  
  // Check horizontal matches
  for (let row = 0; row < size; row++) {
    for (let col = 0; col <= size - 4; col++) {
      const color = board[row][col];
      if (color && 
          board[row][col + 1] === color &&
          board[row][col + 2] === color &&
          board[row][col + 3] === color) {
        matches.push(
          { row, col },
          { row, col: col + 1 },
          { row, col: col + 2 },
          { row, col: col + 3 }
        );
      }
    }
  }
  
  // Check vertical matches
  for (let col = 0; col < size; col++) {
    for (let row = 0; row <= size - 4; row++) {
      const color = board[row][col];
      if (color &&
          board[row + 1][col] === color &&
          board[row + 2][col] === color &&
          board[row + 3][col] === color) {
        matches.push(
          { row, col },
          { row: row + 1, col },
          { row: row + 2, col },
          { row: row + 3, col }
        );
      }
    }
  }
  
  // Remove duplicates
  const uniqueMatches = matches.filter((match, index) => {
    return matches.findIndex(m => m.row === match.row && m.col === match.col) === index;
  });
  
  return uniqueMatches;
}

function isGameComplete(board: Board): boolean {
  return board.every(row => row.every(cell => cell === null));
}

export function ColourSlideGame() {
  const [gridSize, setGridSize] = useState(10);
  const [board, setBoard] = useState<Board>(() => createRandomBoard(10));
  const [dragging, setDragging] = useState<{ 
    type: 'row' | 'col'; 
    index: number; 
    start: number;
    offset: number;
  } | null>(null);
  const [matching, setMatching] = useState<{ row: number; col: number }[]>([]);
  const [isComplete, setIsComplete] = useState(false);
  const [moveCount, setMoveCount] = useState(0);

  const resetGame = useCallback((size: number) => {
    setBoard(createRandomBoard(size));
    setGridSize(size);
    setMatching([]);
    setIsComplete(false);
    setMoveCount(0);
  }, []);

  useEffect(() => {
    const matches = checkMatches(board);
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

  const handleMouseDown = (type: 'row' | 'col', index: number, clientPos: number) => {
    setDragging({ type, index, start: clientPos, offset: 0 });
  };

  const handleMouseMove = (clientPos: number) => {
    if (!dragging) return;
    
    const offset = clientPos - dragging.start;
    
    // Update visual offset
    setDragging(prev => prev ? { ...prev, offset } : null);
    
    // Get the container element to calculate cell size
    const gridElement = document.querySelector('[data-grid]');
    if (!gridElement) return;
    
    const rect = gridElement.getBoundingClientRect();
    const cellSize = dragging.type === 'row' ? 
      rect.width / gridSize : 
      rect.height / gridSize;
    
    // Threshold for snapping to next position (70% of cell size for "sticky" feel)
    const threshold = cellSize * 0.7;
    
    if (Math.abs(offset) > threshold) {
      const direction = offset > 0 ? 1 : -1;
      
      setBoard(prevBoard => {
        const newBoard = prevBoard.map(row => [...row]);
        
        if (dragging.type === 'row') {
          const row = newBoard[dragging.index];
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
          const col = dragging.index;
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
      setDragging({ ...dragging, start: clientPos, offset: 0 });
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
        
        <p className="text-sm text-muted-foreground">
          Slide rows and columns to match 4 colors in a row. Click and drag to slide!
        </p>
      </CardHeader>
      
      <CardContent>
        <div 
          className="relative mx-auto"
          style={{ 
            maxWidth: `${Math.min(600, gridSize * 50)}px`,
          }}
          onMouseMove={(e) => handleMouseMove(dragging?.type === 'row' ? e.clientX : e.clientY)}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onTouchMove={(e) => {
            if (dragging) {
              const touch = e.touches[0];
              handleMouseMove(dragging.type === 'row' ? touch.clientX : touch.clientY);
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
                const isDraggingRow = dragging?.type === 'row' && dragging?.index === rowIndex;
                const isDraggingCol = dragging?.type === 'col' && dragging?.index === colIndex;
                const isDraggingThis = isDraggingRow || isDraggingCol;
                
                // Calculate transform based on drag offset
                let transform = '';
                if (dragging && isDraggingThis) {
                  if (isDraggingRow) {
                    transform = `translateX(${dragging.offset}px)`;
                  } else {
                    transform = `translateY(${dragging.offset}px)`;
                  }
                }
                
                return (
                  <div
                    key={`${rowIndex}-${colIndex}`}
                    className={cn(
                      'aspect-square rounded-full',
                      color ? 'cursor-move' : 'border-2 border-dashed border-gray-300 dark:border-gray-600',
                      isMatching && 'scale-125 animate-pulse shadow-lg',
                      isDraggingThis ? 'transition-none' : 'transition-all duration-200',
                      isDraggingRow && 'ring-2 ring-purple-500 shadow-xl scale-105',
                      isDraggingCol && 'ring-2 ring-blue-500 shadow-xl scale-105'
                    )}
                    style={{
                      backgroundColor: color || 'transparent',
                      transform,
                    }}
                    onMouseDown={(e) => {
                      if (color) {
                        handleMouseDown('row', rowIndex, e.clientX);
                      }
                    }}
                    onTouchStart={(e) => {
                      if (color) {
                        const touch = e.touches[0];
                        handleMouseDown('row', rowIndex, touch.clientX);
                      }
                    }}
                  />
                );
              })
            ))}
          </div>
          
          {/* Row indicators */}
          {board.map((_, rowIndex) => (
            <div
              key={`row-${rowIndex}`}
              className="absolute left-0 w-8 cursor-ew-resize opacity-0 hover:opacity-100 transition-opacity touch-none"
              style={{
                top: `${(rowIndex / gridSize) * 100}%`,
                height: `${100 / gridSize}%`,
              }}
              onMouseDown={(e) => {
                e.preventDefault();
                handleMouseDown('row', rowIndex, e.clientX);
              }}
              onTouchStart={(e) => {
                const touch = e.touches[0];
                handleMouseDown('row', rowIndex, touch.clientX);
              }}
            >
              <div className="w-full h-full flex items-center justify-center bg-purple-500/20 rounded-l">
                <div className="w-1 h-6 bg-purple-500 rounded" />
              </div>
            </div>
          ))}
          
          {/* Column indicators */}
          {board[0].map((_, colIndex) => (
            <div
              key={`col-${colIndex}`}
              className="absolute top-0 h-8 cursor-ns-resize opacity-0 hover:opacity-100 transition-opacity touch-none"
              style={{
                left: `${(colIndex / gridSize) * 100}%`,
                width: `${100 / gridSize}%`,
              }}
              onMouseDown={(e) => {
                e.preventDefault();
                handleMouseDown('col', colIndex, e.clientY);
              }}
              onTouchStart={(e) => {
                const touch = e.touches[0];
                handleMouseDown('col', colIndex, touch.clientY);
              }}
            >
              <div className="w-full h-full flex items-center justify-center bg-blue-500/20 rounded-t">
                <div className="h-1 w-6 bg-blue-500 rounded" />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
