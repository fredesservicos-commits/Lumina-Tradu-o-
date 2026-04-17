import admZip from 'adm-zip';
import path from 'path';
import fs from 'fs';

const zip = new admZip();

const files = [
  'server.js',
  'server.ts',
  'package.json',
  'package-lock.json',
  'startup.sh',
  'web.config'
];

const folders = [
  'dist'
];

files.forEach(file => {
  if (file === 'startup.sh') {
    let content = fs.readFileSync(path.join(process.cwd(), file), 'utf8');
    content = content.replace(/\r/g, ''); // Força line endings para Linux (\n)
    zip.addFile(file, Buffer.from(content, 'utf8'));
  } else {
    zip.addLocalFile(path.join(process.cwd(), file));
  }
});

folders.forEach(folder => {
  zip.addLocalFolder(path.join(process.cwd(), folder), folder);
});

zip.writeZip('deploy_linux.zip');
console.log('Zip created with forward slashes (Linux compatible)');
