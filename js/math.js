/**
 * QuizJump - Math problem generation
 */
const QuizJumpMath = {
  generateAddition(maxSum = 12, score = 0, digitRange = null) {
    const effectiveMax = digitRange ? digitRange.max : Math.min(maxSum, 12 + Math.floor(score / 30));
    const minVal = digitRange ? digitRange.min : 1;
    const a = Math.floor(Math.random() * (effectiveMax - minVal + 1)) + minVal;
    const b = Math.floor(Math.random() * (effectiveMax - minVal + 1)) + minVal;
    const correct = a + b;
    const distractors = this.generateDistractors(correct, 3);
    const answers = [...distractors, correct];
    this.shuffle(answers);
    return { problem: `${a} + ${b} = ?`, correct, answers };
  },

  generateBossDistractors(correct, count = 5) {
    const used = new Set([correct]);
    const result = [];
    const offsets = [1, 2, 3, -1, -2, -3, 4, 5, -4, -5, 6, 7, -6, -7];
    for (const off of offsets) {
      if (result.length >= count) break;
      const v = correct + off;
      if (v >= 0 && v !== correct && !used.has(v)) {
        used.add(v);
        result.push(v);
      }
    }
    while (result.length < count) {
      const v = correct + (Math.floor(Math.random() * 21) - 10);
      if (v >= 0 && v !== correct && !used.has(v)) {
        used.add(v);
        result.push(v);
      }
    }
    return result.slice(0, count);
  },

  generateDistractors(correct, count) {
    const used = new Set([correct]);
    const result = [];
    const offsets = [1, 2, 3, -1, -2, -3, 4, 5, -4, -5];
    for (const off of offsets) {
      if (result.length >= count) break;
      const v = correct + off;
      if (v >= 0 && v !== correct && !used.has(v)) {
        used.add(v);
        result.push(v);
      }
    }
    while (result.length < count) {
      const v = correct + (Math.floor(Math.random() * 11) - 5);
      if (v >= 0 && v !== correct && !used.has(v)) {
        used.add(v);
        result.push(v);
      }
    }
    return result.slice(0, count);
  },

  shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
  },

  generateSubtraction(maxVal = 12, score = 0, digitRange = null) {
    const effectiveMax = digitRange ? digitRange.max : Math.min(maxVal, 12 + Math.floor(score / 30));
    const minVal = digitRange ? digitRange.min : 1;
    const a = Math.floor(Math.random() * (effectiveMax - minVal + 1)) + minVal;
    const b = Math.floor(Math.random() * (a - minVal + 1)) + minVal;
    const correct = a - b;
    const distractors = this.generateDistractors(correct, 3);
    const answers = [...distractors, correct];
    this.shuffle(answers);
    return { problem: `${a} \u2212 ${b} = ?`, correct, answers };
  },

  generateMultiplication(maxFactor = 5, score = 0, digitRange = null) {
    const effectiveMax = digitRange ? digitRange.max : Math.min(maxFactor, 5 + Math.floor(score / 50));
    const minVal = digitRange ? digitRange.min : 1;
    const a = Math.floor(Math.random() * (effectiveMax - minVal + 1)) + minVal;
    const b = Math.floor(Math.random() * (effectiveMax - minVal + 1)) + minVal;
    const correct = a * b;
    const distractors = this.generateDistractors(correct, 3);
    const answers = [...distractors, correct];
    this.shuffle(answers);
    return { problem: `${a} \u00D7 ${b} = ?`, correct, answers };
  },

  generateCombined(score = 0, digitRange = null) {
    const r = digitRange || { min: 1, max: 9 };
    const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
    const templates = [
      () => {
        const a = rand(r.min, r.max);
        const b = rand(r.min, r.max);
        const c = rand(r.min, Math.min(r.max, 9));
        return { expr: `${a} + ${b} \u00D7 ${c}`, correct: a + b * c };
      },
      () => {
        const a = rand(r.min, r.max);
        const b = rand(r.min, a);
        const c = rand(r.min, Math.min(r.max, 9));
        return { expr: `(${a} \u2212 ${b}) + ${c}`, correct: (a - b) + c };
      },
      () => {
        const a = rand(r.min, r.max);
        const b = rand(r.min, r.max);
        const c = rand(r.min, Math.min(r.max, 9));
        return { expr: `(${a} + ${b}) \u00D7 ${c}`, correct: (a + b) * c };
      },
    ];
    const t = templates[Math.floor(Math.random() * templates.length)]();
    const distractors = this.generateDistractors(t.correct, 3);
    const answers = [...distractors, t.correct];
    this.shuffle(answers);
    return { problem: t.expr + ' = ?', correct: t.correct, answers };
  },

  generate(settings = {}, score = 0, isBoss = false) {
    const mode = settings.mathMode || 'addition';
    const difficulty = settings.difficulty || 'easy';
    const digitRange = this.getDigitRange(difficulty);
    let result;

    if (mode === 'addition') {
      result = this.generateAddition(digitRange.max, score, digitRange);
    } else if (mode === 'subtraction') {
      result = this.generateSubtraction(digitRange.max, score, digitRange);
    } else if (mode === 'multiplication') {
      result = this.generateMultiplication(digitRange.max, score, digitRange);
    } else if (mode === 'combined') {
      result = this.generateCombined(score, digitRange);
    } else {
      result = this.generateAddition(12, score);
    }

    if (isBoss) {
      const distractors = this.generateBossDistractors(result.correct, 5);
      const answers = [...distractors, result.correct];
      this.shuffle(answers);
      return { ...result, answers };
    }
    return result;
  },

  getMultRange(difficulty) {
    return { easy: 5, medium: 10, hard: 12, 'extremely-hard': 20 }[difficulty] || 5;
  },

  getAdditionMaxSum(difficulty, score) {
    const base = { easy: 12, medium: 24, hard: 50, 'extremely-hard': 99 }[difficulty] || 12;
    return Math.min(base, 12 + Math.floor(score / 30));
  },

  getDigitRange(difficulty) {
    const ranges = {
      easy: { min: 1, max: 9 },
      medium: { min: 10, max: 99 },
      hard: { min: 100, max: 999 },
      'extremely-hard': { min: 1000, max: 9999 },
    };
    return ranges[difficulty] || ranges.easy;
  },
};
