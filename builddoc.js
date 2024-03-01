const marked = require('marked');
const fs = require('fs');


const markdownFilePath = './README.md';
const outputHtmlFilePath = './使用说明.html';

fs.readFile(markdownFilePath, 'utf8', (err, data) => {
  if (err) {
    console.error(`Error reading file: ${err.message}`);
    return;
  }

  const htmlContent = marked.parse(data);

  // 将HTML内容写入文件
  fs.writeFile(outputHtmlFilePath, htmlContent, 'utf8', (err) => {
    if (err) {
      console.error(`Error writing file: ${err.message}`);
      return;
    }

    console.log(`HTML file saved to: ${outputHtmlFilePath}`);
  });
});
