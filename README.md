# FlyTale 🌍✈️

**FlyTale** — turistlar va sayohatchilar uchun interaktiv 3D globus. Dunyodagi tarixiy joylar va sayohat markazlari
globusda belgilangan; joy bosilganda kichik samolyot katta doira (great-circle) yoyi bo'ylab o'sha
joyga uchadi, kamera unga ergashadi, qo'ngach esa joy haqida to'liq ma'lumot va rasmlar ochiladi.

**Texnologiyalar:** React 19 · Vite · TypeScript · react-globe.gl (Three.js) · Framer Motion · Tailwind CSS v4

---

## O'rnatish va ishga tushirish

Talab: **Node.js 20+** (LTS tavsiya etiladi).

```bash
npm install          # bog'liqliklarni o'rnatish
npm run dev          # ishlab chiqish serveri: http://localhost:5173
npm run build        # tip tekshiruvi + production build (dist/ papkasiga)
npm run preview      # tayyor build'ni lokal ko'rish
npm run validate:data  # places.json tuzilmasini tekshirish
```

`dist/` papkasini istalgan statik hostingga (Vercel, Netlify, Nginx, GitHub Pages) joylash mumkin.

## Imkoniyatlar

| Bo'lim | Nima bor |
| --- | --- |
| Globus | Blue Marble teksturasi, atmosfera nuri, yulduzli osmon; **haqiqiy vaqt / kunduz / tun** rejimlari (tunda shahar chiroqlari — maxsus shader) |
| Boshqaruv | Bo'sh turganda o'zi sekin aylanadi; sichqoncha/barmoq bilan aylantirish va kattalashtirish; klaviatura (strelkalar, `+`/`−`, `/` — qidiruv, `Esc`) |
| Nuqtalar | Turkum bo'yicha rangli, porlab turuvchi nuqtalar; ustiga olib borilganda nomi va mamlakati; O'zbekiston joylari oltin halqa bilan ajratilgan; uzoqlashganda **klasterlash** |
| Samolyot | Great-circle yoyi, 3D samolyot yo'nalishi yoyga mos buriladi, oltin iz (trail), kamera ergashadi va oxirida yaqinlashadi; masofaga qarab 2–4 s |
| Animatsiyasiz | "Animatsiyasiz" tugmasi va tizimdagi `prefers-reduced-motion` qo'llab-quvvatlanadi |
| Panel | Kompyuterda o'ngdan, telefonda pastdan (tortib yopiladi); galereya (karusel, swipe, kattalashtirish), davri, UNESCO belgisi, tarix, faktlar, amaliy ma'lumot, ovozli o'qish, Google Maps, sevimlilar, ulashish, yaqin joylar |
| Rasmlar | Wikimedia Commons API orqali; har bir rasm ostida **muallif va litsenziya**; lazy-loading; yuklanmasa — girih naqshli zaxira tasvir |
| Qidiruv / filtr | 3 tildagi nom, shahar, mamlakat va teglar bo'yicha; turkum, mamlakat, qit'a, UNESCO, sevimlilar filtrlari |
| Sayohat | "Tasodifiy sayohat", "Mening marshrutim" (tartibni o'zgartirish, umumiy masofa, ketma-ket uchish) |
| Tillar | O'zbek (lotin), Rus, Ingliz; tanlov `localStorage`'da saqlanadi |
| Havola | `?place=registan` — sahifa ochilganda samolyot shu joyga uchadi ("Ulashish" shu havolani beradi) |

## Fayllar tuzilmasi

```
├── index.html
├── public/
│   ├── favicon.svg
│   └── textures/              # Yer, tungi chiroqlar, yulduzli osmon teksturalari
├── scripts/
│   └── validate-places.mjs    # places.json validatori
└── src/
    ├── main.tsx               # kirish nuqtasi
    ├── App.tsx                # holat va oqim: uchish, marshrut, intro, klaviatura
    ├── index.css              # Tailwind tema, glassmorphism, nuqta uslublari
    ├── components/
    │   ├── Globe.tsx          # 3D globus, kunduz/tun shader, nuqtalar, klasterlash
    │   ├── PlaneAnimation.ts  # samolyot modeli, yoy, iz, kamera ergashishi
    │   ├── PlacePanel.tsx     # joy haqidagi panel
    │   ├── Gallery.tsx        # Wikimedia galereya + lightbox + zaxira tasvir
    │   ├── SearchBar.tsx      # qidiruv (combobox, klaviatura bilan)
    │   ├── Filters.tsx        # turkum / mamlakat / qit'a filtrlari
    │   ├── RoutePanel.tsx     # "Mening marshrutim"
    │   ├── TripPlanner.tsx    # viza, yo'l, xarajatlar kalkulyatori, hamkorlar
    │   ├── ViewMenu.tsx       # "Ko'rinish" menyusi: yoritish va qatlamlar
    │   ├── Toolbar.tsx        # til tanlash
    │   └── Overlays.tsx       # Intro, uchish HUD, toast, legenda
    ├── data/                  # ⬅ ma'lumot qatlami (UI'dan alohida)
    │   ├── types.ts           # Place, L10n, Category, ...
    │   ├── places.json        # 64 ta joy
    │   ├── placesRepository.ts# manba abstraksiyasi (JSON → keyin API/baza)
    │   └── countries.ts       # mamlakat → qit'a, nomlar, bayroqlar
    ├── services/wikimedia.ts  # Commons API, kesh
    ├── i18n/                  # tarjimalar va kontekst
    ├── hooks/                 # localStorage, media query, Web Speech
    └── lib/                   # geo hisoblar, klasterlash, filtrlar, ikonlar
```

## Yangi joy qo'shish

1. `src/data/places.json` massiviga yangi obyekt qo'shing:

```jsonc
{
  "id": "mir-i-arab",                 // noyob, kichik lotin harflari va "-"
  "name":    { "uz": "…", "ru": "…", "en": "…" },
  "country": "UZ",                    // ISO 3166-1 alpha-2 kodi
  "city":    { "uz": "Buxoro", "ru": "Бухара", "en": "Bukhara" },
  "lat": 39.7752, "lng": 64.4153,     // o'nlik gradus (Google Maps'dan olish mumkin)
  "category": "religious",            // historic | museum | religious | nature | modern | city
  "era":     { "uz": "1530-yillar", "ru": "1530-е", "en": "1530s" },
  "unesco": true,
  "short":   { "uz": "2–3 gap", "ru": "…", "en": "…" },
  "history": { "uz": "Batafsil tarix", "ru": "…", "en": "…" },
  "facts": [ { "uz": "…", "ru": "…", "en": "…" } ],   // 3–5 ta
  "hours": null,                      // aniq bilmasangiz — null ("Tekshirish kerak" chiqadi)
  "price": null,
  "bestSeason": { "uz": "…", "ru": "…", "en": "…" },
  "wikimediaQuery": "Mir-i-Arab Madrasa Bukhara",  // Commons'da inglizcha qidiruv so'zi
  "tags": ["bukhara", "madrasa"]
}
```

2. Agar mamlakat yangi bo'lsa — `src/data/countries.ts` dagi `COUNTRY_CONTINENT` (va o'zbekcha nom uchun
   `UZ_FALLBACK`) ga qo'shing.
3. `npm run validate:data` — xatolarni ko'rsatadi.
4. `wikimediaQuery` ni https://commons.wikimedia.org da sinab ko'ring: natijalar joyga mos bo'lishi kerak.

> **Aniqlik qoidasi:** ishonchingiz komil bo'lmagan sana, raqam, ish vaqti yoki narxni yozmang —
> `null` qoldiring. Ish vaqti va narxlar tez o'zgargani uchun boshlang'ich to'plamda ular ataylab
> `null` (faqat Britaniya muzeyining bepul kirishi ko'rsatilgan).

## Sayohat rejasi: narx, viza, hamkorlar

Har bir joy panelida **«Sayohat va narx»** bo'limi bor. U quyidagilarni ko'rsatadi:
O'zbekiston fuqarolari uchun viza holati, masofa va yo'l vaqti, borib-kelish narxi, turar joy va jami taxminiy xarajat.
Foydalanuvchi jo'nash shahri, sanasi, kechalar soni, kishilar soni va uslubni (tejamkor, o'rtacha, qulay) tanlaydi.

| Fayl | Nima uchun |
| --- | --- |
| `src/data/travel.json` | Mamlakatlar bo'yicha viza holati (`domestic`, `free`, `evisa`, `required`, `check`) va narx darajasi (1–4); jo'nash aeroportlari; hisob-kitob modeli koeffitsientlari; `lastReviewed` sanasi |
| `src/data/partners.json` | Hamkor turoperatorlar ro'yxati (hozir bo'sh) |
| `src/config.ts` | Loyiha egasining aloqa ma'lumotlari («Hamkor bo'ling» havolasi uchun) |
| `src/lib/tripCost.ts` | Hisoblash mantig'i va tashqi havolalar (Google Flights, Booking.com, railway.uz) |

**Muhim:** narxlar **taxminiy model** asosida hisoblanadi, ular haqiqiy narx emas.
Haqiqiy narxni foydalanuvchi panelidagi havolalar orqali ko'radi.
Kirish chiptalari va viza to'lovi hisobga kiritilmagan, ular «tekshirish kerak» deb ko'rsatiladi.
Viza qoidalari o'zgarib turadi, shuning uchun `travel.json` ni muntazam yangilab, `lastReviewed` sanasini o'zgartiring.
Ishonchingiz komil bo'lmagan mamlakat uchun `"visa": "check"` qo'ying.
So'mda ham ko'rsatish uchun `usdToUzs` ga joriy kursni yozing.

**Hamkor qo'shish** (`src/data/partners.json`):

```json
{
  "id": "silk-tour",
  "name": "Silk Tour MChJ",
  "countries": ["TR", "AE"],
  "services": ["visa", "tour", "flight", "hotel"],
  "description": { "uz": "…", "ru": "…", "en": "…" },
  "phone": "+998 …",
  "telegram": "silktour_uz",
  "website": "https://…",
  "verified": true
}
```

`countries: ["*"]` qo'yilsa, hamkor barcha yo'nalishlarda ko'rinadi.
«Ariza matnini tayyorlash» tugmasi foydalanuvchi tanlagan parametrlar bilan tayyor xabarni nusxalaydi, foydalanuvchi uni hamkorga yuboradi.

## Ilova sifatida o'rnatish (PWA)

Saytga kirgandan 4 soniya o'tib «FlyTale ilovasini o'rnating» taklifi chiqadi. «Keyinroq» bosilsa, taklif 7 kun ko'rsatilmaydi.
Taklifni «Yordam» menyusidan istalgan payt qayta ochish mumkin.

| Qurilma / brauzer | Qanday o'rnatiladi |
| --- | --- |
| Android (Chrome, Edge, Samsung Internet), kompyuter (Chrome, Edge) | «O'rnatish» tugmasi — bir bosishda |
| iPhone / iPad (Safari) | Yo'riqnoma ko'rsatiladi: Ulashish → Bosh ekranga qo'shish |
| Firefox (kompyuter) | Brauzer PWA o'rnatishni qo'llamaydi — taklif chiqmaydi |

Fayllar: `public/manifest.webmanifest`, `public/sw.js` (Service Worker), `src/lib/pwa.ts`, `src/components/InstallPrompt.tsx`.

- **HTTPS majburiy:** ilova faqat `https://` saytda (va `localhost`da) o'rnatiladi. Vercel va Netlify HTTPS'ni avtomatik beradi.
- **Yangi versiya chiqarganda** `public/sw.js` ichidagi `CACHE` nomini o'zgartiring (`flytale-v2`, …), aks holda eski fayllar keshda qolishi mumkin.

## Bazaga o'tish

Komponentlar ma'lumotni faqat `loadPlaces()` orqali oladi (`src/data/placesRepository.ts`).

- Eng oddiy yo'l: `.env` faylida `VITE_PLACES_API_URL=https://…/places` bering — endpoint `Place[]` qaytarsa,
  ilova avtomatik API'dan o'qiydi (`.env.example` ga qarang).
- Boshqa manba (Supabase, Firebase, GraphQL) uchun `PlacesSource` interfeysini amalga oshiring va
  `placesSource` ni almashtiring. `places.json` ni bazaga import qilish uchun boshlang'ich ma'lumot sifatida ishlatish mumkin.

## Unumdorlik

- Samolyot, yoy va iz Three.js sahnasida **imperativ** chiziladi — uchish paytida React har kadrda qayta render qilmaydi.
- Telefonda teksturalar 2048 px gacha kichraytiriladi, pixel ratio ≤ 1.5, antialias o'chiriladi.
- Globusning orqa tomonidagi nuqtalar yashiriladi (chizilmaydi va Tab bilan tanlanmaydi).
- Klasterlar faqat masshtab "pog'onasi" o'zgarganda qayta hisoblanadi.
- `places.json` va Three.js alohida bo'laklarga (chunk) ajratilgan; Wikimedia javoblari `sessionStorage`'da keshlanadi.

## Mualliflik huquqi

- Yer teksturalari: NASA Blue Marble / Black Marble (jamoat mulki), `three-globe` misollari orqali.
- Rasmlar: Wikimedia Commons — har biri o'z muallifi va litsenziyasi bilan ko'rsatiladi.
- Shriftlar: Unbounded, Manrope, Noto Color Emoji (Google Fonts, SIL OFL).
