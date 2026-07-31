/**
 * Chuyển mã LaTeX (đã lưu trong data-latex của công thức KaTeX — xem mathFormula.ts) thành công thức
 * Word THẬT (OMML, qua các lớp Math-, MathComponent của thư viện `docx`) khi xuất file .docx — thay vì
 * đi qua HTML/SVG do KaTeX render (không có ý nghĩa gì với Word, xuất ra chỉ còn lại chữ rời rạc mất
 * hết cấu trúc phân số/số mũ).
 *
 * Chỉ hỗ trợ đúng tập cú pháp mà app này thực sự sinh ra (xem FORMULA_TEMPLATES ở mathFormula.ts và
 * cách convertAiPlainMathNotation dựng \frac{}{}): \frac, ^, _, \sqrt, \sqrt[n]{}, \sum, \int, \vec,
 * \begin{cases}/pmatrix/bmatrix/vmatrix, và bảng ký hiệu Hy Lạp/toán học thông dụng. Không phải parser
 * LaTeX đầy đủ — gặp cú pháp lạ/không hỗ trợ thì rơi về hiển thị nguyên văn (MathRun chứa mã LaTeX
 * thô) thay vì crash cả việc xuất file.
 */
import {
  Math as DocxMath,
  MathComponent,
  MathFraction,
  MathRadical,
  MathRoundBrackets,
  MathSquareBrackets,
  MathCurlyBrackets,
  MathRun,
  MathSubScript,
  MathSuperScript,
  MathSubSuperScript,
  MathSum,
  MathIntegral,
} from 'docx';

/** AST trung gian (JS thuần) — tách khỏi bước dựng đối tượng docx để có thể GỘP các đoạn text liền
 * nhau (vd nhiều ký tự thường đứng cạnh nhau, mỗi ký tự vốn phải parse riêng để "^"/"_" chỉ bám đúng
 * 1 ký tự ngay trước theo đúng quy ước LaTeX) trước khi dựng MathRun — dựng xong không đọc lại được
 * nội dung một MathRun đã tạo (docx không có getter), nên phải gộp ở tầng AST trước. */
type MNode =
  | { kind: 'text'; value: string }
  | { kind: 'frac'; num: MNode[]; den: MNode[] }
  | { kind: 'sup'; base: MNode[]; sup: MNode[] }
  | { kind: 'sub'; base: MNode[]; sub: MNode[] }
  | { kind: 'subsup'; base: MNode[]; sub: MNode[]; sup: MNode[] }
  | { kind: 'sqrt'; radicand: MNode[]; degree?: MNode[] }
  | { kind: 'nary'; op: 'sum' | 'int'; body: MNode[]; sub?: MNode[]; sup?: MNode[] }
  | { kind: 'bracket'; type: 'round' | 'square' | 'curly' | 'curly-left-only'; inner: MNode[] };

/** Lệnh LaTeX không tham số → 1 ký tự Unicode tương ứng. Lệnh tên hàm (sin, cos, lim,...) CỐ TÌNH
 * không có trong bảng này — giữ nguyên tên chữ thường (fallback mặc định), đúng cách Word/KaTeX vẫn
 * hiển thị "sin", "lim" dạng chữ đứng thường, không phải ký hiệu. */
const SYMBOL_MAP: Record<string, string> = {
  times: '×', div: '÷', cdot: '·', pm: '±', mp: '∓',
  le: '≤', leq: '≤', ge: '≥', geq: '≥', ne: '≠', neq: '≠', approx: '≈', equiv: '≡',
  infty: '∞', to: '→', rightarrow: '→', Rightarrow: '⇒', leftarrow: '←', Leftarrow: '⇐', leftrightarrow: '↔',
  in: '∈', notin: '∉', subset: '⊂', subseteq: '⊆', supset: '⊃', cup: '∪', cap: '∩', emptyset: '∅', varnothing: '∅',
  forall: '∀', exists: '∃', neg: '¬', lnot: '¬',
  pi: 'π', alpha: 'α', beta: 'β', gamma: 'γ', delta: 'δ', epsilon: 'ε', varepsilon: 'ε',
  zeta: 'ζ', eta: 'η', theta: 'θ', iota: 'ι', kappa: 'κ', lambda: 'λ', mu: 'μ', nu: 'ν',
  xi: 'ξ', rho: 'ρ', sigma: 'σ', tau: 'τ', upsilon: 'υ', phi: 'φ', chi: 'χ', psi: 'ψ', omega: 'ω',
  Gamma: 'Γ', Delta: 'Δ', Theta: 'Θ', Lambda: 'Λ', Xi: 'Ξ', Sigma: 'Σ', Upsilon: 'Υ', Phi: 'Φ', Psi: 'Ψ', Omega: 'Ω', Pi: 'Π',
  circ: '∘', perp: '⊥', parallel: '∥', angle: '∠', triangle: '△', cong: '≅', sim: '∼',
  ldots: '…', cdots: '⋯', dots: '…', vdots: '⋮', ddots: '⋱',
  quad: '  ', qquad: '    ',
};

/** Cặp `\begin{env}...\end{env}` được hỗ trợ → loại ngoặc bao ngoài. `cases` chỉ có dấu ngoặc nhọn
 * TRÁI (quy ước hệ phương trình/định nghĩa theo trường hợp), không có `curly` (2 vế) như ma trận. */
const ENV_BRACKET_TYPE: Record<string, 'round' | 'square' | 'curly' | 'curly-left-only'> = {
  cases: 'curly-left-only',
  pmatrix: 'round',
  bmatrix: 'square',
  vmatrix: 'round', // không có dấu | | trong bộ MathComponent hỗ trợ — dùng ngoặc tròn thay thế, không mất nội dung.
  matrix: 'round',
};

class LatexParser {
  private pos = 0;
  constructor(private src: string) {}

  private peek(offset = 0): string {
    return this.src[this.pos + offset] ?? '';
  }
  private eof(): boolean {
    return this.pos >= this.src.length;
  }
  private skipSpaces(): void {
    while (!this.eof() && /\s/.test(this.peek())) this.pos++;
  }

  /** Gộp các node {kind:'text'} liền kề thành 1 node duy nhất — chỉ gộp ở tầng AST (xem comment MNode). */
  private static mergeText(nodes: MNode[]): MNode[] {
    const out: MNode[] = [];
    for (const n of nodes) {
      const last = out[out.length - 1];
      if (n.kind === 'text' && last && last.kind === 'text') {
        last.value += n.value;
      } else {
        out.push(n);
      }
    }
    return out;
  }

  /** Parse tới khi gặp `}` (không tiêu thụ) hoặc hết chuỗi — dùng cho nội dung trong {..} và top-level. */
  parseGroup(stopChars: string[] = []): MNode[] {
    const nodes: MNode[] = [];
    while (!this.eof() && !stopChars.includes(this.peek())) {
      const atom = this.parseAtomWithScripts();
      if (atom.length === 0) break; // an toàn — tránh vòng lặp vô hạn nếu gặp ký tự không xử lý được
      nodes.push(...atom);
    }
    return LatexParser.mergeText(nodes);
  }

  /** 1 nhóm `{...}` (bỏ dấu ngoặc) hoặc 1 atom đơn (không ngoặc) — dùng cho tham số lệnh (vd \frac). */
  private parseBraceGroup(): MNode[] {
    this.skipSpaces();
    if (this.peek() === '{') {
      this.pos++;
      const inner = this.parseGroup(['}']);
      if (this.peek() === '}') this.pos++;
      return inner;
    }
    return this.parseSingleAtom();
  }

  /** Lấy nguyên văn bên trong `{...}` (không parse) — dùng riêng cho \vec vì cần ghép mũi tên kết hợp
   * vào cuối chuỗi text, không thể "đọc lại" 1 MathRun đã dựng. */
  private captureBraceRawText(): string {
    this.skipSpaces();
    if (this.peek() !== '{') return this.parseSingleAtomRawText();
    this.pos++;
    let depth = 1;
    let out = '';
    while (!this.eof() && depth > 0) {
      const c = this.peek();
      if (c === '{') depth++;
      else if (c === '}') { depth--; if (depth === 0) { this.pos++; break; } }
      out += c;
      this.pos++;
    }
    return out;
  }

  private parseSingleAtomRawText(): string {
    if (this.eof()) return '';
    const c = this.peek();
    this.pos++;
    return c;
  }

  /** 1 atom KHÔNG kèm ^/_ hậu tố — lệnh (\frac, \sqrt,...), nhóm {..}, hoặc 1 ký tự thường. */
  private parseSingleAtom(): MNode[] {
    this.skipSpaces();
    if (this.eof()) return [];
    const c = this.peek();

    if (c === '\\') return this.parseCommand();
    if (c === '{') {
      this.pos++;
      const inner = this.parseGroup(['}']);
      if (this.peek() === '}') this.pos++;
      return inner;
    }
    // Dấu ngoặc tròn/vuông trần (không phải lệnh \left\right) — giữ nguyên như ký tự thường, KHÔNG
    // tự bọc MathRoundBrackets (tránh đoán sai phạm vi khi người dùng chỉ gõ "(" đơn lẻ không cặp).
    this.pos++;
    return [{ kind: 'text', value: c }];
  }

  /** Bắt cặp `_{...}` / `^{...}` đứng ngay sau — dùng riêng cho \sum/\int (không bọc atom trước đó
   * như quy ước hậu tố thường, mà làm subScript/superScript của chính toán tử nary). */
  private parseOptionalScripts(): { sub?: MNode[]; sup?: MNode[] } {
    let sub: MNode[] | undefined;
    let sup: MNode[] | undefined;
    for (let guard = 0; guard < 2; guard++) {
      this.skipSpaces();
      if (this.peek() === '_' && sub === undefined) {
        this.pos++;
        sub = this.parseBraceGroup();
      } else if (this.peek() === '^' && sup === undefined) {
        this.pos++;
        sup = this.parseBraceGroup();
      } else break;
    }
    return { sub, sup };
  }

  private parseCommand(): MNode[] {
    this.pos++; // consume '\'
    if (this.eof()) return [{ kind: 'text', value: '\\' }];

    // Lệnh 1 ký tự không phải chữ cái: \\ (chỉ có nghĩa trong ma trận, xử lý riêng ở parseEnvironment,
    // ở đây coi như xuống dòng/space), \{, \}, \, (khoảng trắng nhỏ), \  (space)...
    const c0 = this.peek();
    if (!/[a-zA-Z]/.test(c0)) {
      this.pos++;
      if (c0 === ',' || c0 === ';' || c0 === ' ') return [{ kind: 'text', value: ' ' }];
      if (c0 === '\\') return []; // xuống dòng ngoài ma trận — bỏ qua, không có ý nghĩa trong 1 dòng công thức
      return [{ kind: 'text', value: c0 }]; // \{, \}, \%, \_ ,...
    }

    let name = '';
    while (!this.eof() && /[a-zA-Z]/.test(this.peek())) {
      name += this.peek();
      this.pos++;
    }

    switch (name) {
      case 'frac': {
        const num = this.parseBraceGroup();
        const den = this.parseBraceGroup();
        return [{ kind: 'frac', num, den }];
      }
      case 'sqrt': {
        let degree: MNode[] | undefined;
        this.skipSpaces();
        if (this.peek() === '[') {
          this.pos++;
          degree = this.parseGroup([']']);
          if (this.peek() === ']') this.pos++;
        }
        const radicand = this.parseBraceGroup();
        return [{ kind: 'sqrt', radicand, degree }];
      }
      case 'sum':
      case 'int': {
        const { sub, sup } = this.parseOptionalScripts();
        const body = this.parseAtomWithScripts();
        return [{ kind: 'nary', op: name as 'sum' | 'int', body, sub, sup }];
      }
      case 'vec': {
        // Không có accent (mũi tên) thật trong bộ MathComponent cấp cao của docx — ghép ký tự mũi tên
        // kết hợp Unicode (U+20D7) vào cuối nội dung, hiển thị xấp xỉ đúng vị trí trong Word.
        const raw = this.captureBraceRawText();
        return [{ kind: 'text', value: `${raw}⃗` }];
      }
      case 'left':
      case 'right': {
        // \left( \right) v.v. — bỏ qua từ khoá canh chỉnh cỡ ngoặc, giữ lại đúng ký tự ngoặc theo sau.
        this.skipSpaces();
        if (this.peek() === '.') { this.pos++; return []; } // \left. / \right. — ẩn hẳn, không có ký tự
        return this.parseSingleAtom();
      }
      case 'begin':
        return this.parseEnvironment();
      case 'text':
      case 'mathrm':
      case 'mathbf': {
        const inner = this.parseBraceGroup();
        return inner;
      }
      default: {
        const symbol = SYMBOL_MAP[name];
        if (symbol) return [{ kind: 'text', value: symbol }];
        // Lệnh không nhận diện được (vd tên hàm sin/cos/lim/log, hoặc cú pháp lạ) — giữ nguyên tên
        // chữ thường, không mất nội dung.
        return [{ kind: 'text', value: name }];
      }
    }
  }

  private parseEnvironment(): MNode[] {
    this.skipSpaces();
    if (this.peek() !== '{') return [{ kind: 'text', value: '\\begin' }];
    this.pos++;
    let envName = '';
    while (!this.eof() && this.peek() !== '}') { envName += this.peek(); this.pos++; }
    if (this.peek() === '}') this.pos++;

    const endMarker = `\\end{${envName}}`;
    const endIdx = this.src.indexOf(endMarker, this.pos);
    const bodySrc = endIdx === -1 ? this.src.slice(this.pos) : this.src.slice(this.pos, endIdx);
    this.pos = endIdx === -1 ? this.src.length : endIdx + endMarker.length;

    // Mỗi dòng (\\) và mỗi cột (&) parse ĐỘC LẬP bằng 1 LatexParser con — công thức lồng trong ô vẫn
    // được chuyển đổi đúng (vd phân số trong 1 ô ma trận).
    const rows = bodySrc.split('\\\\').map(row =>
      row.split('&').map(cell => {
        const cellNodes = new LatexParser(cell.trim()).parseGroup();
        return cellNodes;
      })
    );

    // OMML cấp cao qua API docx không có khối "mảng nhiều dòng" tiện dụng — ghép các dòng bằng dấu
    // ";" và các cột bằng khoảng trắng, vẫn giữ ĐÚNG NỘI DUNG (kể cả công thức con trong từng ô), chỉ
    // không xếp thành lưới nhiều dòng như LaTeX gốc. Đây là giới hạn đã biết, chấp nhận được vì các
    // trường hợp ma trận/hệ phương trình trong đề thi hiếm và vẫn đọc hiểu được nội dung.
    const joined: MNode[] = [];
    rows.forEach((row, ri) => {
      row.forEach((cell, ci) => {
        if (ci > 0) joined.push({ kind: 'text', value: '   ' });
        joined.push(...cell);
      });
      if (ri < rows.length - 1) joined.push({ kind: 'text', value: '  ;  ' });
    });

    const bracketType = ENV_BRACKET_TYPE[envName] || 'round';
    return [{ kind: 'bracket', type: bracketType, inner: LatexParser.mergeText(joined) }];
  }

  /** 1 atom (lệnh/nhóm/ký tự) + tối đa 1 cặp `_{}`/`^{}` hậu tố bám ngay sau — đúng quy ước LaTeX:
   * "x^2y" nghĩa là (x mũ 2) rồi tới "y", không phải (xy) mũ 2 — nên atom KHÔNG ngoặc chỉ gồm 1 ký tự. */
  private parseAtomWithScripts(): MNode[] {
    const base = this.parseSingleAtom();
    if (base.length === 0) return [];

    let sub: MNode[] | undefined;
    let sup: MNode[] | undefined;
    for (let guard = 0; guard < 2; guard++) {
      this.skipSpaces();
      if (this.peek() === '_' && sub === undefined) {
        this.pos++;
        sub = this.parseBraceGroup();
      } else if (this.peek() === '^' && sup === undefined) {
        this.pos++;
        sup = this.parseBraceGroup();
      } else break;
    }

    if (sub && sup) return [{ kind: 'subsup', base, sub, sup }];
    if (sub) return [{ kind: 'sub', base, sub }];
    if (sup) return [{ kind: 'sup', base, sup }];
    return base;
  }
}

function nodesToMathComponents(nodes: MNode[]): MathComponent[] {
  const out: MathComponent[] = [];
  for (const n of nodes) {
    switch (n.kind) {
      case 'text':
        if (n.value) out.push(new MathRun(n.value));
        break;
      case 'frac':
        out.push(new MathFraction({
          numerator: nodesToMathComponents(n.num),
          denominator: nodesToMathComponents(n.den),
        }));
        break;
      case 'sup':
        out.push(new MathSuperScript({
          children: nodesToMathComponents(n.base),
          superScript: nodesToMathComponents(n.sup),
        }));
        break;
      case 'sub':
        out.push(new MathSubScript({
          children: nodesToMathComponents(n.base),
          subScript: nodesToMathComponents(n.sub),
        }));
        break;
      case 'subsup':
        out.push(new MathSubSuperScript({
          children: nodesToMathComponents(n.base),
          subScript: nodesToMathComponents(n.sub),
          superScript: nodesToMathComponents(n.sup),
        }));
        break;
      case 'sqrt':
        out.push(new MathRadical({
          children: nodesToMathComponents(n.radicand),
          degree: n.degree ? nodesToMathComponents(n.degree) : undefined,
        }));
        break;
      case 'nary': {
        const children = nodesToMathComponents(n.body);
        const subScript = n.sub ? nodesToMathComponents(n.sub) : undefined;
        const superScript = n.sup ? nodesToMathComponents(n.sup) : undefined;
        out.push(
          n.op === 'sum'
            ? new MathSum({ children, subScript, superScript })
            : new MathIntegral({ children, subScript, superScript })
        );
        break;
      }
      case 'bracket': {
        const inner = nodesToMathComponents(n.inner);
        if (n.type === 'curly-left-only') {
          // Không có API "1 vế ngoặc" cấp cao — thêm ký tự "{" làm MathRun đứng trước, không bọc vế phải.
          out.push(new MathRun('{'));
          out.push(...inner);
        } else if (n.type === 'square') {
          out.push(new MathSquareBrackets({ children: inner }));
        } else if (n.type === 'curly') {
          out.push(new MathCurlyBrackets({ children: inner }));
        } else {
          out.push(new MathRoundBrackets({ children: inner }));
        }
        break;
      }
    }
  }
  return out;
}

/** Chuyển 1 chuỗi LaTeX thành danh sách MathComponent (nội dung bên trong 1 khối <m:oMath>). Không
 * bao giờ throw — cú pháp không hỗ trợ/không hợp lệ sẽ rơi về hiển thị nguyên văn mã LaTeX gốc. */
export function latexToMathComponents(latex: string): MathComponent[] {
  try {
    const nodes = new LatexParser(latex).parseGroup();
    const components = nodesToMathComponents(nodes);
    return components.length > 0 ? components : [new MathRun(latex)];
  } catch {
    return [new MathRun(latex)];
  }
}

/** Chuyển 1 chuỗi LaTeX thành 1 khối công thức Word hoàn chỉnh (<m:oMath>), dùng trực tiếp làm
 * ParagraphChild — chèn xen lẫn TextRun bình thường trong cùng 1 đoạn văn. */
export function latexToDocxMath(latex: string): DocxMath {
  return new DocxMath({ children: latexToMathComponents(latex) });
}
