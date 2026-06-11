import fs from 'fs';
import path from 'path';

const srcDir = 'c:/Users/arthu/Documents/LINE - PROJETO CORE/LINE OS/src';
const destDir = 'c:/Users/arthu/Documents/NGHUB OS/nghub-os';

const filesToCopy = [
  'components/BoardView.tsx',
  'components/ClickUpInterface.tsx',
  'components/ListView.tsx',
  'components/TaskDashboard.tsx',
  'components/ui/TaskModal.tsx',
  'components/ui/CreateTaskModal.tsx',
  'components/ui/ManageCardsModal.tsx',
  'hooks/useTasks.ts',
  'services/taskService.ts'
];

for (const file of filesToCopy) {
  const srcPath = path.join(srcDir, file);
  // O taskService vai para api/taskService.ts na NGHUB
  let destFile = file;
  if (file === 'services/taskService.ts') destFile = 'api/taskService.ts';

  const destPath = path.join(destDir, destFile);
  
  const destDirPath = path.dirname(destPath);
  if (!fs.existsSync(destDirPath)) {
    fs.mkdirSync(destDirPath, { recursive: true });
  }

  if (fs.existsSync(srcPath)) {
    fs.copyFileSync(srcPath, destPath);
    console.log(`Copiado: ${file} -> ${destFile}`);
  } else {
    console.warn(`Arquivo não encontrado na origem: ${srcPath}`);
  }
}

console.log('Cópia concluída.');
