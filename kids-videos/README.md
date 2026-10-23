# خراريف يدّوه — Emirati kids' story videos

Full-story animated episodes for ages 3–6, rendered entirely from code: an Emirati grandmother (يدّوه) tells a
**خروفة**, the traditional Emirati story elders tell children, with an Emirati cast, a sung hook and Arabic narration.
Each episode is one `story.json`; the engine turns it into a finished 1080p MP4 with voices, music, sound effects and
burned-in Arabic subtitles.

| Episode | Title | Teaches | Length |
| --- | --- | --- | --- |
| 01 | زعفران يبحث عن ماما (Zafran looks for Mama) | counting to 3, big vs small, helping others | ~3:50 |

## Build an episode

```bash
pip install piper-tts pycairo numpy        # plus ffmpeg (with libass + rubberband) and Arabic fonts:
apt-get install ffmpeg fonts-noto-core     # Noto Sans Arabic / Noto Kufi Arabic
./fetch-voices.sh                          # Arabic neural voices into .models/
python3 engine/build_audio.py episodes/01-zafran     # voices, music, timeline, subtitles
python3 engine/render.py episodes/01-zafran          # -> episodes/01-zafran/build/01-zafran.mp4
python3 engine/render.py episodes/01-zafran --frame 70   # one PNG preview at 70s
```

A 4-minute episode renders in a few minutes on 4 cores. `build/` and `.models/` are not committed.

## The format (what the most-watched kids' channels do)

Every episode follows the same beats, so a new episode is mostly writing a new `story.json`:

1. **Cold open with the problem (0–5 s).** A character in trouble before any logo, so the child stays.
2. **Short branded intro.** يدّوه in the majlis: «حيّاكم يا أحبابي… عندي لكم خروفة», then the title card and jingle.
3. **One simple problem, three helpers.** Each helper gives one clue. The same structure repeats three times.
4. **A sung hook that repeats.** The same tune and words come back after every helper (three times in ep. 01), then
   change for the finale. Lyrics are on screen as karaoke so parents can sing along.
5. **Learning inside the play.** Counting out loud with big numerals popping up, comparing big and small. Never a lesson
   tone.
6. **Talk to the viewer.** A direct question with a pause and on-screen «؟». Asking the children questions mid-story is
   also how the traditional خروفة is told.
7. **Big happy ending.** Reunion, hearts, the whole cast dancing to the finale song, confetti.
8. **Outro recap.** يدّوه says in one line each what we learned, then «وخلصت الخروفة! إلى اللقاء».

Visual rules: saturated colours, thick dark outlines, big eyes, characters always moving a little (breathing,
blinking, bouncing), a white flash on every scene cut, subtitles large and outlined.

## Emirati heritage used in the stories

| Word | Meaning | Where it appears |
| --- | --- | --- |
| خروفة / خراريف | The folk tale elders tell children, opening with «كان يا ما كان»; tellers ask the children questions as they go | Series frame, intro and outro |
| يدّوه | Grandmother, the storyteller | Narrator, majlis scenes |
| البرقع | The gold-coloured face mask traditionally worn by older Emirati women | يدّوه's costume |
| الكندورة، الغترة، العقال | Boy's white robe, head cloth and black cord | حمدان |
| المخوّر، الشيلة | Girl's embroidered dress and head scarf | ميثاء |
| الحوار | A newborn camel calf | زعفران |
| الوضيحي | Local name for the Arabian oryx, from its bright white coat | The oryx helper |
| الشاهين | Falcon | The falcon helper |
| البرّ | The open desert | Narration |
| الفلج | Traditional water channel feeding palm groves | Where Mama is found |
| الغافة | Ghaf, the native desert tree | Falcon scene |
| السدو | Woven Bedouin textile | Mama camel's saddle blanket |
| المجلس، الدلّة | Sitting room, Arabic coffee pot | يدّوه's set |

Sources:
- فالح حنظل، «معجم الألفاظ العامية في دولة الإمارات العربية المتحدة» (1978), a standard reference for Emirati
  vocabulary ([Goodreads](https://www.goodreads.com/book/show/26725146),
  [الخليج](https://www.alkhaleej.ae/2021-02-04/المسلم-و-الغيص-اللهجة-الإماراتية-ذات-أصول-عربية-فصيحة/يوميات-ثقافية/ثقافة)).
- عبدالعزيز المسلم، «موسوعة الكائنات الخرافية في التراث الإماراتي», معهد الشارقة للتراث (2017)
  ([الجريدة](https://www.aljarida.com/articles/1617465673012996500/)). Good for future episodes based on real خراريف.
- «الخروفة» في قاموس اللهجة المحلية ([الاتحاد](https://www.aletihad.ae/news/دنيا/4176964/-الخروفة----قاموس-اللهجة-المحلية)).
- «الوضيحي» اسم المها العربي في الإمارات ([الإمارات اليوم](https://www.emaratalyoum.com/life/four-sides/2025-04-13-1.1935647)).
- البرقع الإماراتي ([الاتحاد](https://www.aletihad.ae/articleamp/33743/2019/البرقع-الإماراتي..-بصمةٌ-حيّةُ-في-الذاكرة)).
- مفردات المكان في لهجة أهل الإمارات: البرّ، السيح ([الاتحاد](https://www.aletihad.ae/articleamp/46495/2010/«المكان»-في-لهجة-أهل-الإمارات)).
- 50 مفردة للنخيل في اللهجة الإماراتية ([الخليج](https://www.alkhaleej.ae/2024-09-08/50-مفردة-للنخيل-في-اللهجة-الإماراتية/يوميات-ثقافية/ثقافة)).

Narration and dialogue are in simple فصحى (what the Arabic voices pronounce best), with Emirati words where a child
would hear them at home.

## Writing a new episode

Copy `episodes/01-zafran/story.json`. A scene has a background (`desert_dawn`, `desert_day`, `desert_ghaf`,
`desert_palms`, `oasis`, `majlis`), a cast with positions (x 0–1 across the screen), optional props (`palm`,
`prints_small`, `prints_big`), and beats played in order:

- `{"say": "H", "tts": "…"}`: a voiced line (fully voweled Arabic gives the best pronunciation), lip-synced
- `{"song": "refrain"}`: the sung hook; lyrics are defined once under `songs`
- `{"title": "…", "dur": 4}`, `{"pause": 1.0}`, `{"sfx": "pop|sparkle|boing|flap|wind"}`
- per beat: `move`, `emote` (happy/sad/surprised/love), `face` (left/right), `jump`, `reveal` (props), `big`
  (numeral pop-up), `ask` (viewer question), `point` (arrow at a prop), `hearts`

Characters: hamdan, maitha, yadda, zafran, mom, falcon, oryx, hare (`engine/characters.py`).

## Before publishing on YouTube

- Mark the channel and videos **Made for Kids**
  ([YouTube help](https://support.google.com/youtube/answer/9527654)).
- The voices are synthetic: tick YouTube's altered/synthetic content disclosure where it applies
  ([YouTube help](https://support.google.com/youtube/answer/14328491)).
- Monetisation requires original, non-repetitive content
  ([YouTube help](https://support.google.com/youtube/answer/1311392)). Each episode needs a new story, not a re-skin.
- Have an Emirati speaker review each script before release.
- **Replace the voices before monetising.** The pilot uses free piper Arabic models: `ar_JO-SA_dii-high` is
  CC BY-NC-SA 4.0 (non-commercial only), and `ar_JO-kareem-medium` has no clear licence. They are also Levantine-
  trained, not Emirati. For the real channel, record Emirati voice actors (best for children) or use a commercially
  licensed Emirati-Arabic TTS voice, then rebuild.
