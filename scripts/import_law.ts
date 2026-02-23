import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';

const db = new Database('bot.db');

// Khmer to Arabic numerals map
const khmerNumerals: { [key: string]: string } = {
  '០': '0', '១': '1', '២': '2', '៣': '3', '៤': '4',
  '៥': '5', '៦': '6', '៧': '7', '៨': '8', '៩': '9'
};

function toArabic(khmerStr: string): string {
  return khmerStr.replace(/[០-៩]/g, (c) => khmerNumerals[c]);
}

function main() {
  const files = ['law_text_part1.txt', 'law_text_part2.txt', 'law_text_part3.txt'];
  let fullText = '';

  for (const file of files) {
    const filePath = path.join(process.cwd(), file);
    if (fs.existsSync(filePath)) {
      fullText += fs.readFileSync(filePath, 'utf-8') + '\n';
    } else {
      console.warn(`Warning: ${file} not found.`);
    }
  }

  if (!fullText) {
    console.error('No law text found!');
    return;
  }
  
  // Regex to find articles
  // Matches "មាត្រា [Khmer Number] [Title/Content]"
  // We use a lookahead to stop at the next "មាត្រា" or end of string
  const articleRegex = /មាត្រា\s+([០-៩]+)([\s\S]*?)(?=មាត្រា\s+[០-៩]+|$)/g;

  let match;
  let count = 0;

  const insert = db.prepare('INSERT OR REPLACE INTO rules (keyword, response_type, content) VALUES (?, ?, ?)');

  while ((match = articleRegex.exec(fullText)) !== null) {
    const khmerNum = match[1];
    const contentBody = match[2].trim();
    const arabicNum = toArabic(khmerNum);
    
    const fullContent = `មាត្រា ${khmerNum}${contentBody}`;
    const keywordArabic = `Cri ${arabicNum}`;
    const keywordKhmer = `Cri ${khmerNum}`;

    try {
      // Insert for Arabic Numeral (e.g., Cri 1)
      insert.run(keywordArabic, 'text', fullContent);
      
      // Insert for Khmer Numeral (e.g., Cri ១)
      insert.run(keywordKhmer, 'text', fullContent);
      
      count++;
    } catch (e) {
      console.error(`Error inserting Article ${arabicNum}:`, e);
    }
  }

  console.log(`Successfully imported ${count} articles (with dual keywords).`);
}

main();
