// test_skin_nlp.cjs
const keywords = ['nam', 'nữ', 'bà', 'chú tiểu', 'sư thầy', 'sư cô', 'cao tăng'];
const testComments = [
  'Nam mô Phật',
  'nam',
  'nữ',
  'con là nữ',
  'chú tiểu',
  'chú tiểu dễ thương',
  'Nam mô A Di Đà',
  'lạy phật bà',
  'con chào bà',
  'con là nam nha'
];

testComments.forEach(text => {
  const words = text.trim().split(/\s+/);
  if (words.length <= 3) {
    const matched = keywords.filter(k => text.toLowerCase().includes(k));
    console.log(`"${text}" (${words.length} words) -> Matched: [${matched.join(', ')}]`);
  } else {
    console.log(`"${text}" (>3 words, ignored)`);
  }
});
