# n8n — وكيل واتساب يرسل إيميلات (WhatsApp → AI Agent → Gmail)

الملف: [`whatsapp-email-agent.json`](whatsapp-email-agent.json) (اسمه داخل n8n: «My workflow 17»، غير مفعّل `active: false`).
الاستيراد: في n8n افتح Workflows ← Import from File واختر الملف، ثم اربط الحسابات الأربعة.

## كيف يعمل

```
WhatsApp Trigger ──► AI Agent ──► Send message (WhatsApp)
                      ▲      ▲
     OpenAI Chat Model┘      └ Send a message in Gmail (أداة)
```

| العقدة | النوع | الإعداد |
|---|---|---|
| WhatsApp Trigger | `whatsAppTrigger` | يستقبل `messages` الواردة |
| AI Agent | `langchain.agent` v2.2 | بدون تعليمات نظام (الإعدادات فارغة) |
| OpenAI Chat Model | `lmChatOpenAi` | `gpt-4.1-mini` |
| Send a message in Gmail | `gmailTool` (أداة للوكيل) | المستلم والعنوان والنص يحددها الوكيل عبر `$fromAI`، مع توقيع «abdallah» |
| Send message | `whatsApp` (send) | يرد على واتساب |

الحسابات المطلوبة (مراجع فقط، لا توجد أسرار في الملف): WhatsApp OAuth account، WhatsApp account، OpenAi account، Gmail account.

## ⚠️ نواقص يجب إصلاحها قبل التشغيل

1. **Send message**: `phoneNumberId` فارغ، ونص الرسالة `"er"` (نص تجريبي). اجعل النص `{{ $json.output }}` (رد الوكيل)، وحدد رقم المرسل والمستلم (`{{ $('WhatsApp Trigger').item.json.messages[0].from }}`).
2. **AI Agent**: لا يوجد مصدر للنص. الوكيل يتوقع `chatInput` بينما واتساب يرسل النص في `messages[0].text.body`؛ اختر «Define below» واكتب: `{{ $json.messages[0].text.body }}`، وأضف System Message توضح متى يرسل إيميلًا.
3. **التوقيع**: غيّر `sign off with abdallah` إلى اسمك.
4. **الأمان**: الوكيل يستطيع الإرسال لأي عنوان يكتبه أي شخص يراسل الرقم. قيّد المرسلين المسموح لهم (عقدة IF على رقم المرسل) أو اطلب تأكيدًا قبل الإرسال.
5. لا توجد ذاكرة محادثة؛ أضف Window Buffer Memory إذا أردت أن يتذكر الرسائل السابقة.

## ⚙️ ملاحظات التطبيق (لـ Claude عند الطلب)

- عند طلب «جهّز/أصلح workflow واتساب»: طبّق الإصلاحات أعلاه على نسخة جديدة من JSON ولا تضع أي مفاتيح أو توكنات داخل الملف.
- n8n غير متاح في هذه البيئة السحابية؛ التشغيل والاختبار يكونان في نسخة n8n الخاصة بالمستخدم.
