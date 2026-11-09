// بيانات مترو القاهرة (الخطوط 1 و2 و3) — المصدر: قوائم المحطات الرسمية/ويكيبيديا + وزارة النقل.
// كل محطة ليها id ثابت (slug) بنستخدمه في الـ graph والـ URL.

// aliases = أسماء قديمة أو إملاء بديل، بتستخدم في البحث بس (مش في العرض).
const s = (id, ar, en, aliases = []) => ({ id, ar, en, aliases })

export const STATIONS = Object.fromEntries(
  [
    // ---------- الخط الأول: حلوان ↔ المرج الجديدة ----------
    s('helwan', 'حلوان', 'Helwan'),
    s('ain-helwan', 'عين حلوان', 'Ain Helwan'),
    // اتغيّر اسمها مع تغيير اسم الجامعة (2026) — المصدر في docs/DATA.md
    s('helwan-university', 'جامعة العاصمة', 'Capital University', ['جامعة حلوان', 'Helwan University']),
    s('wadi-hof', 'وادي حوف', 'Wadi Hof'),
    s('hadayek-helwan', 'حدائق حلوان', 'Hadayek Helwan'),
    s('el-maasara', 'المعصرة', 'El-Maasara'),
    s('tora-el-asmant', 'طرة الأسمنت', 'Tora El-Asmant'),
    s('kozzika', 'كوتسيكا', 'Kozzika', ['كوتسكا']),
    s('tora-el-balad', 'طرة البلد', 'Tora El-Balad'),
    s('sakanat-el-maadi', 'ثكنات المعادي', 'Sakanat El-Maadi'),
    s('maadi', 'المعادي', 'Maadi'),
    s('hadayek-el-maadi', 'حدائق المعادي', 'Hadayek El-Maadi'),
    s('dar-el-salam', 'دار السلام', 'Dar El-Salam'),
    s('el-zahraa', 'الزهراء', "El-Zahraa'"),
    s('mar-girgis', 'مار جرجس', 'Mar Girgis'),
    s('el-malek-el-saleh', 'الملك الصالح', 'El-Malek El-Saleh'),
    s('sayeda-zeinab', 'السيدة زينب', 'Al-Sayeda Zeinab'),
    s('saad-zaghloul', 'سعد زغلول', 'Saad Zaghloul'),
    s('sadat', 'السادات', 'Sadat'),
    s('nasser', 'جمال عبدالناصر', 'Nasser'),
    s('orabi', 'عرابي', 'Orabi'),
    s('shohadaa', 'الشهداء', 'Al-Shohadaa'),
    s('ghamra', 'غمرة', 'Ghamra'),
    s('el-demerdash', 'الدمرداش', 'El-Demerdash'),
    s('manshiet-el-sadr', 'منشية الصدر', 'Manshiet El-Sadr'),
    s('kobri-el-qobba', 'كوبري القبة', 'Kobri El-Qobba'),
    s('hammamat-el-qobba', 'حمامات القبة', 'Hammamat El-Qobba'),
    s('saray-el-qobba', 'سراي القبة', 'Saray El-Qobba'),
    s('hadayeq-el-zaitoun', 'حدائق الزيتون', 'Hadayeq El-Zaitoun'),
    s('helmeyet-el-zaitoun', 'حلمية الزيتون', 'Helmeyet El-Zaitoun'),
    s('el-matareyya', 'المطرية', 'El-Matareyya'),
    s('ain-shams', 'عين شمس', 'Ain Shams'),
    s('ezbet-el-nakhl', 'عزبة النخل', 'Ezbet El-Nakhl'),
    s('el-marg', 'المرج', 'El-Marg'),
    s('new-el-marg', 'المرج الجديدة', 'New El-Marg'),

    // ---------- الخط الثاني: المنيب ↔ شبرا الخيمة ----------
    s('el-mounib', 'المنيب', 'El-Mounib'),
    s('sakiat-mekky', 'ساقية مكي', 'Sakiat Mekky'),
    s('omm-el-masryeen', 'أم المصريين', 'Omm El-Masryeen'),
    s('el-giza', 'الجيزة', 'El Giza'),
    s('faisal', 'فيصل', 'Faisal'),
    s('cairo-university', 'جامعة القاهرة', 'Cairo University'),
    s('el-bohoth', 'البحوث', 'El Bohoth'),
    s('dokki', 'الدقي', 'Dokki'),
    s('opera', 'الأوبرا', 'Opera'),
    // السادات: موجودة فوق (تبادل مع الخط 1)
    s('mohamed-naguib', 'محمد نجيب', 'Mohamed Naguib'),
    s('attaba', 'العتبة', 'Attaba'),
    // الشهداء: موجودة فوق (تبادل مع الخط 1)
    s('masarra', 'مسرة', 'Masarra'),
    s('rod-el-farag', 'روض الفرج', 'Rod El-Farag'),
    s('st-teresa', 'سانت تريزا', 'St. Teresa', ['سانتا تريزا']),
    s('khalafawy', 'الخلفاوي', 'Khalafawy'),
    s('mezallat', 'المظلات', 'Mezallat'),
    s('kolleyyet-el-zeraa', 'كلية الزراعة', 'Kolleyyet El-Zeraa'),
    s('shubra-el-kheima', 'شبرا الخيمة', 'Shubra El-Kheima'),

    // ---------- الخط الثالث: عدلي منصور ↔ (روض الفرج | جامعة القاهرة) ----------
    s('adly-mansour', 'عدلي منصور', 'Adly Mansour'),
    s('haykestep', 'الهايكستب', 'El Haykestep'),
    s('omar-ibn-el-khattab', 'عمر بن الخطاب', 'Omar Ibn El-Khattab'),
    s('qobaa', 'قباء', 'Qobaa'),
    s('hesham-barakat', 'هشام بركات', 'Hesham Barakat'),
    s('el-nozha', 'النزهة', 'El-Nozha'),
    s('nadi-el-shams', 'نادي الشمس', 'Nadi El-Shams'),
    s('alf-maskan', 'ألف مسكن', 'Alf Maskan'),
    s('heliopolis-square', 'ميدان هليوبوليس', 'Heliopolis Square'),
    s('haroun', 'هارون', 'Haroun'),
    s('al-ahram', 'الأهرام', 'Al-Ahram'),
    s('koleyet-el-banat', 'كلية البنات', 'Koleyet El-Banat'),
    s('stadium', 'الإستاد', 'Stadium'),
    s('fair-zone', 'أرض المعارض', 'Fair Zone'),
    s('abbassia', 'العباسية', 'Abbassia'),
    s('abdou-pasha', 'عبده باشا', 'Abdou Pasha'),
    s('el-geish', 'الجيش', 'El Geish'),
    s('bab-el-shaaria', 'باب الشعرية', 'Bab El Shaaria'),
    // العتبة وجمال عبدالناصر: موجودين فوق
    s('maspero', 'ماسبيرو', 'Maspero'),
    s('safaa-hegazy', 'صفاء حجازي', 'Safaa Hegazy'),
    s('kit-kat', 'الكيت كات', 'Kit Kat'),
    // فرع روض الفرج
    s('sudan', 'السودان', 'Sudan'),
    s('imbaba', 'إمبابة', 'Imbaba'),
    s('el-bohy', 'البوهي', 'El-Bohy'),
    s('el-qawmia', 'القومية العربية', 'El-Qawmia'),
    s('ring-road', 'الطريق الدائري', 'Ring Road'),
    s('rod-el-farag-corridor', 'محور روض الفرج', 'Rod El-Farag Corridor'),
    // فرع جامعة القاهرة
    s('tawfikia', 'التوفيقية', 'Tawfikia'),
    s('wadi-el-nile', 'وادي النيل', 'Wadi El Nile'),
    s('gamat-el-dowal', 'جامعة الدول العربية', 'Gamat El Dowal'),
    s('boulak-el-dakrour', 'بولاق الدكرور', 'Boulak El Dakrour'),

    // ---------- مونوريل شرق النيل: إستاد القاهرة ↔ مدينة العدالة ----------
    // الـ id بيبدأ بـ m- عشان مايتلخبطش مع محطات المترو اللي ليها نفس الاسم
    // (مثلًا «هشام بركات» في المونوريل مكان تاني خالص غير «هشام بركات» في المترو).
    // المصدر والترتيب: docs/DATA.md § المونوريل
    s('m-stadium', 'إستاد القاهرة', 'Cairo Stadium', ['الاستاد']),
    s('m-hesham-barakat', 'هشام بركات', 'Hesham Barakat'),
    s('m-al-azhar-university', 'جامعة الأزهر', 'Al Azhar University'),
    s('m-seventh-district', 'الحي السابع', '7th District'),
    s('m-ahmed-ismail', 'المشير أحمد إسماعيل', 'Marshal Ahmed Ismail'),
    s('m-jehan-sadat', 'جيهان السادات', 'Jehan Sadat'),
    s('m-tantawi', 'المشير طنطاوي', 'Marshal Tantawi'),
    s('m-one-ninety', 'وان ناينتي', 'One Ninety'),
    s('m-air-force-hospital', 'المستشفى الجوي', 'Air Force Hospital'),
    s('m-el-narges', 'النرجس', 'El Narges', ['El Nargus']),
    s('m-investors', 'المستثمرين', 'Investors'),
    s('m-lotus', 'اللوتس', 'Al Lotus'),
    s('m-golden-square', 'جولدن سكوير', 'Golden Square'),
    s('m-beit-el-watan', 'بيت الوطن', 'Beit El Watan'),
    s('m-fattah-aleem', 'مسجد الفتاح العليم', 'Al-Fattah Al-Aleem Mosque'),
    s('m-r1', 'حي R1', 'R1 District'),
    s('m-r2', 'حي R2', 'R2 District'),
    s('m-cbd', 'حي المال والأعمال', 'Central Business District', ['CBD']),
    s('m-arts-culture', 'مدينة الفنون والثقافة', 'Arts & Culture City'),
    s('m-government-district', 'الحي الحكومي', 'Government District'),
    s('m-misr-mosque', 'مسجد مصر', 'Misr Mosque'),
    s('m-justice-city', 'مدينة العدالة', 'Justice City'),
  ].map((st) => [st.id, st]),
)

export const LINES = {
  1: { id: 1, ar: 'الخط الأول', color: '#1d5fc9', terminals: ['حلوان', 'المرج الجديدة'] },
  2: { id: 2, ar: 'الخط الثاني', color: '#d8322c', terminals: ['المنيب', 'شبرا الخيمة'] },
  3: { id: 3, ar: 'الخط الثالث', color: '#12904f', terminals: ['عدلي منصور', 'روض الفرج / جامعة القاهرة'] },
  ENM: { id: 'ENM', ar: 'مونوريل شرق النيل', color: '#189ca6', mode: 'monorail', terminals: ['إستاد القاهرة', 'مدينة العدالة'] },
}

const L1 = [
  'helwan', 'ain-helwan', 'helwan-university', 'wadi-hof', 'hadayek-helwan', 'el-maasara',
  'tora-el-asmant', 'kozzika', 'tora-el-balad', 'sakanat-el-maadi', 'maadi', 'hadayek-el-maadi',
  'dar-el-salam', 'el-zahraa', 'mar-girgis', 'el-malek-el-saleh', 'sayeda-zeinab', 'saad-zaghloul',
  'sadat', 'nasser', 'orabi', 'shohadaa', 'ghamra', 'el-demerdash', 'manshiet-el-sadr',
  'kobri-el-qobba', 'hammamat-el-qobba', 'saray-el-qobba', 'hadayeq-el-zaitoun',
  'helmeyet-el-zaitoun', 'el-matareyya', 'ain-shams', 'ezbet-el-nakhl', 'el-marg', 'new-el-marg',
]

const L2 = [
  'el-mounib', 'sakiat-mekky', 'omm-el-masryeen', 'el-giza', 'faisal', 'cairo-university',
  'el-bohoth', 'dokki', 'opera', 'sadat', 'mohamed-naguib', 'attaba', 'shohadaa', 'masarra',
  'rod-el-farag', 'st-teresa', 'khalafawy', 'mezallat', 'kolleyyet-el-zeraa', 'shubra-el-kheima',
]

// الخط الثالث بيتفرع عند الكيت كات. بنمثّله كـ "خدمتين" بيشتركوا في الجذع (trunk).
export const L3_TRUNK = [
  'adly-mansour', 'haykestep', 'omar-ibn-el-khattab', 'qobaa', 'hesham-barakat', 'el-nozha',
  'nadi-el-shams', 'alf-maskan', 'heliopolis-square', 'haroun', 'al-ahram', 'koleyet-el-banat',
  'stadium', 'fair-zone', 'abbassia', 'abdou-pasha', 'el-geish', 'bab-el-shaaria', 'attaba',
  'nasser', 'maspero', 'safaa-hegazy', 'kit-kat',
]
const L3_BRANCH_A = ['sudan', 'imbaba', 'el-bohy', 'el-qawmia', 'ring-road', 'rod-el-farag-corridor']
const L3_BRANCH_B = ['tawfikia', 'wadi-el-nile', 'gamat-el-dowal', 'boulak-el-dakrour', 'cairo-university']

const MONORAIL_EAST_NILE = [
  'm-stadium', 'm-hesham-barakat', 'm-al-azhar-university', 'm-seventh-district', 'm-ahmed-ismail',
  'm-jehan-sadat', 'm-tantawi', 'm-one-ninety', 'm-air-force-hospital', 'm-el-narges', 'm-investors',
  'm-lotus', 'm-golden-square', 'm-beit-el-watan', 'm-fattah-aleem', 'm-r1', 'm-r2', 'm-cbd',
  'm-arts-culture', 'm-government-district', 'm-misr-mosque', 'm-justice-city',
]

/**
 * "الخدمة" (service) = مسار قطار حقيقي من طرف لطرف.
 * `line` = رقم الخط للعرض واللون. الخط 3 ليه خدمتين (3A و3B).
 * `trunkEnd` = آخر index للجذع المشترك (للخط 3 فقط) — بيساعدنا نحدد اتجاه القطار.
 */
// `minutesEndToEnd` = زمن الرحلة من أول الخدمة لآخرها، زي ما المشغّل بينشره (المصدر في docs/DATA.md).
// المحرك بيقسمه على عدد الخطوات عشان يطلع معدل ثابت لكل محطة على الخط ده.
export const SERVICES = [
  { id: '1', line: 1, stations: L1, endpoints: ['حلوان', 'المرج الجديدة'], minutesEndToEnd: 79 },
  { id: '2', line: 2, stations: L2, endpoints: ['المنيب', 'شبرا الخيمة'], minutesEndToEnd: 38 },
  {
    id: '3A', line: 3, stations: [...L3_TRUNK, ...L3_BRANCH_A],
    endpoints: ['عدلي منصور', 'محور روض الفرج'], trunkEnd: L3_TRUNK.length - 1,
    minutesEndToEnd: 60,
  },
  {
    id: '3B', line: 3, stations: [...L3_TRUNK, ...L3_BRANCH_B],
    endpoints: ['عدلي منصور', 'جامعة القاهرة'], trunkEnd: L3_TRUNK.length - 1,
    minutesEndToEnd: 58,
  },
  {
    // TODO(verify) زمن الرحلة الكاملة: المصادر بتقول 60–70 دقيقة، واخترنا أقل رقم (docs/DATA.md)
    id: 'ENM', line: 'ENM', mode: 'monorail', stations: MONORAIL_EAST_NILE,
    endpoints: ['إستاد القاهرة', 'مدينة العدالة'], minutesEndToEnd: 60,
  },
]

/**
 * روابط مشي بين محطتين مختلفتين (مش نفس المحطة).
 * TODO(verify) مدة المشي تقدير: المسافة حوالي 154 متر خط مستقيم حسب OSM، والتقدير المتفق عليه 5 دقايق.
 */
export const TRANSFER_LINKS = [{ a: 'stadium', b: 'm-stadium', walkMinutes: 5 }]

export const BRANCH_A = L3_BRANCH_A
export const BRANCH_B = L3_BRANCH_B

// أسعار التذاكر الرسمية — سارية من 27 مارس 2026 (وزارة النقل). الحد الأقصى = عدد المحطات.
export const FARE_EFFECTIVE = '27 مارس 2026'
export const FARE_BRACKETS = [
  { maxStations: 9, price: 10 },
  { maxStations: 16, price: 12 },
  { maxStations: 23, price: 15 },
  { maxStations: 39, price: 20 },
]

// ---- أنظمة التسعير: كل وسيلة ليها تذكرة وشرايح لوحدها ----
// TODO(verify) مفيش مصدر بيذكر تذكرة موحدة مترو + مونوريل، فبنفترض تذكرتين منفصلتين.
// TODO(verify) عد محطات المونوريل: بنفترض إنه شامل الطرفين زي المترو («حتى 22 محطة» = الخط كله).
export const FARE_SYSTEMS = {
  metro: { ar: 'مترو', effective: FARE_EFFECTIVE, brackets: FARE_BRACKETS },
  monorail: {
    ar: 'مونوريل',
    effective: '6 مايو 2026',
    brackets: [
      { maxStations: 5, price: 20 },
      { maxStations: 10, price: 40 },
      { maxStations: 15, price: 55 },
      { maxStations: 22, price: 80 },
    ],
  },
}
