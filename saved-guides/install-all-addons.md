# تثبيت جميع الإضافات المحفوظة — على جهازك

راجعتُ المستودعات الستة (نوفمبر ٢٠٢٦). نفّذ الأوامر على جهازك، داخل Claude Code أو في الطرفية حسب المذكور. ثبّت واحدة، أعد تشغيل Claude Code، وتأكد أنها تعمل، ثم انتقل للتالية.

الترتيب مقترح من الأكثر أمانًا إلى الأكثر حساسية.

---

## 1. Claude Code Setup — رسمي من Anthropic ✅ آمن

يحلّل مشروعك ويقترح hooks و skills و MCP servers وأوامر مناسبة. **للقراءة فقط**، لا يعدّل ملفات.

داخل Claude Code:
```
/plugin install claude-code-setup@claude-plugins-official
```
الاستخدام: «recommend automations for this project».

## 2. Agent Skills (addyosmani) ✅ آمن

25 مهارة هندسية: مراجعة كود، TDD، أسئلة المتطلبات…

داخل Claude Code:
```
/plugin marketplace add addyosmani/agent-skills
/plugin install agent-skills@addy-agent-skills
```
إن ظهر خطأ SSH استخدم: `/plugin marketplace add https://github.com/addyosmani/agent-skills.git`
أو من الطرفية: `npx skills add addyosmani/agent-skills` (أضف `--list` لتصفح المهارات قبل التثبيت).

## 3. Claude Mem ⚠️ يسجّل جلساتك

ذاكرة دائمة بين الجلسات (hooks + خدمة محلية + SQLite في `~/.claude-mem/`).

داخل Claude Code:
```
/plugin marketplace add thedotmack/claude-mem
/plugin install claude-mem
```
- يرسل محتوى الجلسات إلى نموذج لتلخيصها (cmem.ai أو مفتاحك أو خطة Anthropic — أنت تختار).
- Cloud Sync يرفع الذاكرة إلى cmem.ai إن فعّلته. استخدم `<private>` للمعلومات الحساسة.

## 4. Agent Reach ⚠️ يحتاج حذرًا

يتيح للوكيل قراءة منصات الإنترنت (يوتيوب، منصات خلف تسجيل دخول، منصات صينية…). المستودع بالصينية، والشرح الإنجليزي في `docs/README_en.md`.

داخل Claude Code، اطلب:
```
ثبّت Agent Reach من: https://raw.githubusercontent.com/Panniantong/Agent-Reach/main/docs/install.md
```
- ⚠️ الحزمة المسماة `agent-reach` على PyPI **ليست** هذا المشروع؛ لا تثبّت منها.
- لا تضع المفاتيح في المحادثة؛ استخدم `agent-reach configure groq-key` في طرفيتك.
- استخدامه مع حساباتك المسجّلة قد يخالف شروط بعض المنصات ويعرّض الحساب للحظر.

## 5. Strix 🔴 أداة اختبار اختراق

وكلاء ذكاء اصطناعي يجرون اختبارات اختراق على تطبيقاتك. يحتاج Docker ومفتاح LLM.

المهارات فقط (لـ Claude Code):
```
npx skills add usestrix/strix
```
الأداة الكاملة (الطرفية):
```
curl -sSL https://strix.ai/install | bash
export LLM_API_KEY="مفتاحك"
```
- **استخدمه فقط على أنظمة تملكها أو لديك إذن مكتوب باختبارها.** فحص مواقع الغير دون إذن مخالف للقانون.
- يستهلك رصيد مفتاح الـ LLM بسرعة.

## 6. FreeLLMAPI 🔴 يغيّر النموذج الذي يعمل خلف Claude Code

خادم محلي يجمع الطبقات المجانية لـ 34 مزوّدًا خلف واجهة واحدة. التثبيت: تطبيق macOS/Windows من صفحة Releases، أو Docker:
```
git clone https://github.com/tashfeenahmed/freellmapi && cd freellmapi && docker compose up -d
```
- إذا وجّهت Claude Code إليه (`setup-claude`) فلن يعمل Claude بعد ذلك، بل نماذج مجانية أخرى بجودة أقل.
- تحتاج إنشاء حسابات ومفاتيح عند كل مزوّد؛ استخدام عدة حسابات للالتفاف على حدود مجانية قد يخالف شروط بعضهم.
- الكتالوج المجاني يتأخر 30 يومًا؛ النسخة المدفوعة $19/سنة.
- **توصيتي: تخطَّه** إن كان هدفك استخدام Claude Code كما هو.

---

### لماذا لا تُثبَّت في جلسة Claude Code السحابية؟
الحاوية السحابية مؤقتة وتُحذف بعد الجلسة، فتضيع الإضافات وذاكرة Claude Mem معها. الإضافات تُثبَّت على جهازك ليبقى أثرها.
