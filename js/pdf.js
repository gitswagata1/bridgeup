/* ============================================================
   BridgeUp — per-chapter PDF study guides via jsPDF (lazy-loaded).
   Renders a chapter's overview, objectives, takeaways, practice,
   and full lesson content into a downloadable .pdf.
   ============================================================ */

const PDF = {
  URL: "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js",
  _loading: null,

  ensure() {
    if (window.jspdf && window.jspdf.jsPDF) return Promise.resolve(window.jspdf.jsPDF);
    if (this._loading) return this._loading;
    this._loading = new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = this.URL;
      s.onload = () => resolve(window.jspdf.jsPDF);
      s.onerror = () => reject(new Error("Could not load the PDF library. Check your connection."));
      document.head.appendChild(s);
    });
    return this._loading;
  }
};

function _hexToRgb(hex) {
  const m = hex.replace("#", "");
  return [parseInt(m.slice(0, 2), 16), parseInt(m.slice(2, 4), 16), parseInt(m.slice(4, 6), 16)];
}

/* Real handbook chapter -> PDF (CS50-style scaffolding + faithful content). */
async function generateChapterPDF(chapter, meta) {
  const jsPDF = await PDF.ensure();
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const M = 48;
  const MAXW = W - M * 2;
  const [r, g, b] = _hexToRgb(({ 1: "#3b82f6", 2: "#6366f1", 3: "#0ea5e9", 4: "#14b8a6", 5: "#8b5cf6", 6: "#f59e0b", 7: "#ec4899", 8: "#10b981", 9: "#ef4444" })[chapter.ch] || "#3b82f6");
  let y = 0;

  const footer = () => {
    const page = doc.internal.getNumberOfPages();
    doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.setTextColor(150);
    doc.text("BridgeUp · The Python Handbook", M, H - 24);
    doc.text("Page " + page, W - M, H - 24, { align: "right" });
  };
  const need = (h) => { if (y + h > H - 54) { footer(); doc.addPage(); y = M; } };
  const secHeading = (txt) => {
    need(38); y += 6;
    doc.setFont("helvetica", "bold"); doc.setFontSize(13); doc.setTextColor(r, g, b);
    doc.splitTextToSize(txt, MAXW).forEach(ln => { need(17); doc.text(ln, M, y); y += 17; });
    doc.setDrawColor(r, g, b); doc.setLineWidth(1.2); doc.line(M, y, M + 30, y); y += 14;
  };
  const para = (txt) => {
    doc.setFont("helvetica", "normal"); doc.setFontSize(10.5); doc.setTextColor(60);
    doc.splitTextToSize(txt, MAXW).forEach(ln => { need(14.5); doc.text(ln, M, y); y += 14.5; });
    y += 5;
  };
  const bullet = (txt) => {
    doc.setFont("helvetica", "normal"); doc.setFontSize(10.5); doc.setTextColor(60);
    const lines = doc.splitTextToSize(txt, MAXW - 16);
    lines.forEach((ln, i) => { need(14.5); doc.text(i === 0 ? "•" : " ", M + 2, y); doc.text(ln, M + 16, y); y += 14.5; });
    y += 2;
  };
  const code = (txt) => {
    const lines = [];
    txt.split("\n").forEach(l => doc.splitTextToSize(l || " ", MAXW - 24).forEach(w => lines.push(w)));
    const boxH = lines.length * 12 + 14;
    need(boxH + 6);
    doc.setFillColor(244, 246, 250); doc.setDrawColor(220, 226, 236);
    doc.roundedRect(M, y, MAXW, boxH, 4, 4, "FD");
    doc.setFont("courier", "normal"); doc.setFontSize(9); doc.setTextColor(30, 40, 60);
    let cy = y + 15;
    lines.forEach(l => { doc.text(l, M + 10, cy); cy += 12; });
    y += boxH + 8;
  };

  /* cover */
  doc.setFillColor(r, g, b); doc.rect(0, 0, W, 104, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold"); doc.setFontSize(10);
  doc.text("BRIDGEUP  ·  THE PYTHON HANDBOOK", M, 40);
  doc.setFontSize(21);
  doc.text("Chapter " + chapter.ch + ": " + chapter.title, M, 70);
  doc.setFont("helvetica", "normal"); doc.setFontSize(11.5);
  doc.text(chapter.sections.length + " lessons", M, 90);
  y = 132;

  /* CS50-style scaffolding from chapter metadata */
  if (meta) {
    if (meta.overview) { secHeading("Overview"); para(meta.overview); y += 6; }
    if (meta.objectives) { secHeading("What you'll learn"); meta.objectives.forEach(o => bullet(o)); y += 8; }
    if (meta.takeaways) { secHeading("Key takeaways"); meta.takeaways.forEach(t => bullet(t)); y += 8; }
    if (meta.practice) { secHeading("Practice challenges"); meta.practice.forEach((pr, i) => bullet((i + 1) + ".  " + pr)); y += 8; }
    if (meta.docs) { secHeading("Further reading — official Python docs"); para(meta.docs.title); para(meta.docs.url); y += 6; }
    need(60); secHeading("Lessons");
  }

  chapter.sections.forEach(s => {
    secHeading((s.num ? s.num + "  " : "") + s.title);
    s.blocks.forEach(bk => { if (bk.t === "p") para(bk.x); else code(bk.x); });
  });

  footer();
  const slug = chapter.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  doc.save("BridgeUp-Handbook-Chapter-" + chapter.ch + "-" + slug + ".pdf");
}

/* Completion certificate — A4 landscape, issued with the student's
   name, date, XP earned and a deterministic verification code. */
async function generateCertificatePDF(user, xp) {
  const jsPDF = await PDF.ensure();
  const doc = new jsPDF({ unit: "pt", format: "a4", orientation: "landscape" });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const blue = [59, 130, 246], teal = [20, 184, 166], ink = [18, 28, 48], muted = [110, 125, 152];
  const cx = W / 2;

  /* ground + double border */
  doc.setFillColor(250, 251, 253); doc.rect(0, 0, W, H, "F");
  doc.setDrawColor(...blue); doc.setLineWidth(3); doc.roundedRect(26, 26, W - 52, H - 52, 10, 10);
  doc.setDrawColor(...teal); doc.setLineWidth(1); doc.roundedRect(36, 36, W - 72, H - 72, 8, 8);

  /* brand */
  doc.setFont("helvetica", "bold"); doc.setFontSize(13); doc.setTextColor(...blue);
  doc.text("BRIDGE", cx - 4, 74, { align: "right" });
  doc.setTextColor(...teal); doc.text("UP", cx - 4, 74);
  doc.setFont("helvetica", "normal"); doc.setFontSize(8.5); doc.setTextColor(...muted);
  doc.text("LEARN PYTHON, THE RIGHT WAY  ·  VIT VELLORE", cx, 90, { align: "center" });

  /* title */
  doc.setFont("times", "bold"); doc.setFontSize(34); doc.setTextColor(...ink);
  doc.text("Certificate of Completion", cx, 150, { align: "center" });
  doc.setDrawColor(...teal); doc.setLineWidth(1.5); doc.line(cx - 90, 164, cx + 90, 164);

  /* recipient */
  doc.setFont("helvetica", "normal"); doc.setFontSize(12.5); doc.setTextColor(...muted);
  doc.text("This certifies that", cx, 205, { align: "center" });
  doc.setFont("times", "bolditalic"); doc.setFontSize(30); doc.setTextColor(...blue);
  doc.text(user.name, cx, 245, { align: "center" });
  doc.setDrawColor(210, 218, 232); doc.setLineWidth(.8); doc.line(cx - 180, 258, cx + 180, 258);

  /* body */
  doc.setFont("helvetica", "normal"); doc.setFontSize(12.5); doc.setTextColor(...ink);
  doc.text("has successfully completed the full BridgeUp Python course", cx, 288, { align: "center" });
  doc.setFontSize(11); doc.setTextColor(...muted);
  doc.text("The Python Handbook — 8 chapters, 99 lessons, all quizzes passed and every coding challenge solved", cx, 308, { align: "center" });
  doc.setFont("helvetica", "bold"); doc.setFontSize(11); doc.setTextColor(...teal);
  doc.text(xp + " XP earned", cx, 330, { align: "center" });

  /* footer: date · signature · verification */
  const date = new Date().toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
  let code = 0;
  for (const ch of user.email + "|" + date) code = (code * 31 + ch.charCodeAt(0)) >>> 0;
  const y = H - 108;
  doc.setDrawColor(190, 200, 216); doc.setLineWidth(.8);
  doc.line(96, y, 268, y); doc.line(W - 268, y, W - 96, y);
  doc.setFont("helvetica", "normal"); doc.setFontSize(10); doc.setTextColor(...ink);
  doc.text(date, 182, y - 8, { align: "center" });
  doc.text("the.swagata", W - 182, y - 8, { align: "center" });
  doc.setFontSize(8.5); doc.setTextColor(...muted);
  doc.text("DATE OF COMPLETION", 182, y + 14, { align: "center" });
  doc.text("BRIDGEUP  ·  VIT VELLORE", W - 182, y + 14, { align: "center" });
  doc.text("Verification: BU-" + code.toString(36).toUpperCase(), cx, H - 52, { align: "center" });

  const slug = user.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  doc.save("BridgeUp-Certificate-" + slug + ".pdf");
}
