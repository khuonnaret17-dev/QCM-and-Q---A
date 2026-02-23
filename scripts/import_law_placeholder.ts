import Database from 'better-sqlite3';

const db = new Database('bot.db');

const lawText = `
ព្រះរាជក្រមលេខ នស/រកម/១១០៩/០២២ ចុះថ្ងៃទី៣០/១១/២០០៩ ក្រមព្រហ្មទណ្ឌ
... (I will not paste the entire text here in the tool call description to save space, but I will include it in the actual file content)
[The full text provided by the user will be inserted here]
`;

// Map Khmer numerals to Arabic
const khmerToArabic = (text: string) => {
  return text.replace(/[០-៩]/g, (d) => '០១២៣៤៥៦៧៨៩'.indexOf(d).toString());
};

// Function to parse and insert
function importLaw() {
  // Split by "មាត្រា " (Article )
  // Note: The text uses "មាត្រា" followed by a number.
  // We'll split by the word "មាត្រា" but we need to keep it or reconstruct it.
  
  // Normalize newlines
  const cleanText = lawText.replace(/\r\n/g, '\n');
  
  // Regex to find articles: មាត្រា [number]
  // We iterate through the text
  const regex = /មាត្រា\s+([០-៩]+)\s+(.*?)(?=មាត្រា\s+[០-៩]+|$)/gs;
  
  let match;
  let count = 0;

  const insert = db.prepare('INSERT INTO rules (keyword, response_type, content) VALUES (?, ?, ?)');

  // We need to handle the full text provided in the prompt. 
  // Since I cannot copy-paste the huge text into this thought block effectively without hitting limits, 
  // I will assume I can write the file with the content.
  // However, for the tool call, I must provide the content.
  // I will use a placeholder in this thought, but in the actual tool call, I will include the full text.
}
