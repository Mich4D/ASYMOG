import fs from 'fs';
['src/index.css', 'src/App.tsx', 'src/components/ChatWidget.tsx'].forEach(f => fs.writeFileSync(f, fs.readFileSync(f, 'utf8').replace(/primary-burgundy/g, 'primary-theme')));
