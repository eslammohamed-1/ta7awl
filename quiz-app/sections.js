/** نطاقات id مستخرجة من ترتيب الكتاب (ملف OCR) ومطابقة JSON */
window.QUIZ_SECTIONS = [
  { key: "cyber", titleAr: "نموذج اختبار الأمن السيبراني", titleEn: "Cybersecurity", startId: 1, endId: 35 },
  { key: "it", titleAr: "أساسيات تكنولوجيا المعلومات ونظم التشغيل", titleEn: "IT & Operating Systems", startId: 36, endId: 62 },
  { key: "word", titleAr: "معالج النصوص (Word)", titleEn: "Word Processor", startId: 63, endId: 90 },
  { key: "ppt", titleAr: "العروض التقديمية (PowerPoint)", titleEn: "Presentations", startId: 91, endId: 98 },
  { key: "excel", titleAr: "جداول البيانات (Excel)", titleEn: "Spreadsheets", startId: 99, endId: 143 },
  { key: "access", titleAr: "أساسيات قواعد البيانات (Access)", titleEn: "Database Fundamentals", startId: 144, endId: 162 },
  { key: "mobile", titleAr: "تطبيقات الموبايل", titleEn: "Mobile Apps", startId: 163, endId: 217 },
  { key: "search", titleAr: "البحث على الإنترنت", titleEn: "Internet Search", startId: 218, endId: 246 },
  { key: "network", titleAr: "شبكات", titleEn: "Networking", startId: 247, endId: 273 },
  { key: "elearning", titleAr: "نماذج أسئلة التعليم عن بعد", titleEn: "Distance Learning", startId: 274, endId: 333 },
  { key: "digital", titleAr: "تحول رقمي / حوسبة سحابية وأدوات", titleEn: "Digital & Cloud Tools", startId: 334, endId: 383 },
];

/**
 * شم النسيم — نطاقات id من ترتيب `questions-sham-el-nesim.json` ومطابقة عناوين
 * «أهم أسئلة» في ملف OCR (شم النسيم … _OCR.txt). الملف الأخير يصل حتى id ≈ 2020.
 */
window.QUIZ_SECTIONS_SHAM = [
  {
    key: "all",
    titleAr: "كل الأسئلة (شم النسيم)",
    titleEn: "All",
    startId: 1,
    endId: Number.MAX_SAFE_INTEGER,
  },
  {
    key: "sham_it_tf",
    titleAr: "أساسيات تكنولوجيا المعلومات — صح وخطأ",
    titleEn: "IT — True/False",
    startId: 1,
    endId: 82,
  },
  {
    key: "sham_it_mcq",
    titleAr: "أساسيات تكنولوجيا المعلومات — اختيار من متعدد",
    titleEn: "IT — MCQ",
    startId: 83,
    endId: 151,
  },
  {
    key: "sham_cyber",
    titleAr: "الأمن السيبراني (كتلة إنجليزية / تعريفات)",
    titleEn: "Cybersecurity block",
    startId: 152,
    endId: 186,
  },
  {
    key: "sham_word_practical",
    titleAr: "وورد — عملي تفاعلي",
    titleEn: "Word — practical",
    startId: 187,
    endId: 205,
  },
  {
    key: "sham_word_tf",
    titleAr: "وورد — صح وخطأ",
    titleEn: "Word — T/F",
    startId: 206,
    endId: 349,
  },
  {
    key: "sham_word_mcq",
    titleAr: "وورد — اختيار من متعدد",
    titleEn: "Word — MCQ",
    startId: 350,
    endId: 444,
  },
  {
    key: "sham_word_match",
    titleAr: "وورد — توصيل",
    titleEn: "Word — matching",
    startId: 445,
    endId: 506,
  },
  {
    key: "sham_ppt",
    titleAr: "العروض التقديمية (بوربوينت)",
    titleEn: "PowerPoint",
    startId: 507,
    endId: 783,
  },
  {
    key: "sham_excel",
    titleAr: "جداول البيانات (إكسل)",
    titleEn: "Excel",
    startId: 784,
    endId: 968,
  },
  {
    key: "sham_access",
    titleAr: "أساسيات قواعد البيانات (أكسيس)",
    titleEn: "Access",
    startId: 969,
    endId: 1273,
  },
  {
    key: "sham_mobile",
    titleAr: "تطبيقات الهاتف المحمول (الموبايل)",
    titleEn: "Mobile",
    startId: 1274,
    endId: 1759,
  },
  {
    key: "sham_cloud",
    titleAr: "الحوسبة السحابية",
    titleEn: "Cloud computing",
    startId: 1760,
    endId: 1819,
    /** سؤال PaaS/IaaS (id 1906) وارد في JSON بين كتل الشبكات — يُحسب ضمن السحابة */
    ranges: [
      [1760, 1819],
      [1906, 1906],
    ],
  },
  {
    key: "sham_network",
    titleAr: "شبكات",
    titleEn: "Networking",
    startId: 1820,
    endId: 2020,
    ranges: [
      [1820, 1905],
      [1907, 2020],
    ],
  },
];
