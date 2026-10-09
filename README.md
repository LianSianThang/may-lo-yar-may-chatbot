# မေးလိုရာမေး Chatbot (Pure Frontend Edition)

> **၁၀၀% Pure Frontend** (HTML, CSS, JavaScript သီးသန့်) ဖြစ်ပြီး **Node.js, npm, backend server လုံးဝ မလိုပါ။**
> - **UI/UX:** Neo-brutalism Design System (Tailwind CSS CDN + `style.css`)
> - **Database:** Browser WebAssembly SQLite (`sql.js` CDN)
> - **Brain:** Google Gemini 3.5 Flash REST API (`fetch()`)
> - **Security:** Bring Your Own Key (BYOK) Architecture

---

## 📁 ဖိုင်ဖွဲ့စည်းပုံ (Project Structure)

ပရောဂျက်တွင် ဖိုင် (၃) ခုသာ ပါဝင်ပြီး အလွန်ရှင်းလင်းပါသည်-

```
မေးလိုရာမေး chatbot/
├── index.html        # Web page structure, Tailwind CDN, SQLite CDN
├── style.css         # Neo-brutalism styling, Hard shadows, Markdown tags
├── app.js            # SQLite database logic, Gemini 3.5 Flash REST API
└── README.md         # အသုံးပြုပုံ လမ်းညွှန်
```

---

## 🚀 စတင်အသုံးပြုပုံ (Quick Start)

Node.js သွင်းရန် သို့မဟုတ် command များ run ရန် မလိုပါ။

1. Folder ထဲရှိ **`index.html`** ဖိုင်ကို Mouse ဖြင့် **Double Click** နှိပ်၍ မည်သည့် Browser တွင်မဆို ဖွင့်လိုက်ပါ။
2. Sidebar အောက်ခြေရှိ **"🔑 Gemini API Key ထည့်ရန်"** ခလုတ်ကို နှိပ်ပြီး သင်၏ Gemini API Key ကို ထည့်သွင်းပါ။
   *(Key မရှိသေးပါက [Google AI Studio](https://aistudio.google.com/app/apikey) မှ အခမဲ့ ရယူနိုင်ပါသည်)*
3. **စတင်မေးမြန်းနိုင်ပါပြီ!**

---

## 🌟 အဓိက လုပ်ဆောင်ချက်များ

### ၁။ Browser-based SQLite Database (`sql.js`)
- Node.js မပါဘဲ Browser ထဲတွင် တကယ့် SQLite အစစ်ကို run ထားသည်။
- `sessions` (စကားဝိုင်းများ) နှင့် `messages` (မက်ဆေ့ခ်ျများ) ဇယားများဖြင့် Chat history ကို SQLite ထဲတွင် သိမ်းဆည်းသည်။
- Browser ကို Refresh လုပ်သော်လည်း စကားဝိုင်းဒေတာများ မပျောက်ပျက်အောင် `localStorage` ထဲတွင် အလိုအလျောက် sync လုပ်ပေးသည်။

### ၂။ Google Gemini 3.5 Flash Brain
- မြန်မာဘာသာစကား နားလည်နိုင်စွမ်း အလွန်ကောင်းမွန်သော `gemini-3.5-flash` မော်ဒယ်ကို တိုက်ရိုက် `fetch()` ဖြင့် ချိတ်ဆက်ထားသည်။
- ယခင် မေးမြန်းထားသော စကားဝိုင်းမှတ်တမ်း (Chat History) များကို ထည့်သွင်းစဉ်းစား၍ အဖြေပေးနိုင်သည်။

### ၃။ Neo-brutalism UI/UX (`neobrutalism.dev` စတိုင်)
- 2px/3px Black Borders, Zero-blur Hard Shadows (`box-shadow: 4px 4px 0px #000`)
- Tactile 3D Button Press Effects
- Mobile & Desktop Fully Responsive (Mobile Hamburger Drawer ပါဝင်သည်)

### ၄။ BYOK Security Architecture
- Code ထဲတွင် API Key မပါဝင်သောကြောင့် GitHub ပေါ်တင်လျှင်ဖြစ်စေ၊ Inspect (F12) ဖွင့်ကြည့်လျှင်ဖြစ်စေ သင့် Key ပေါက်ကြားမည့်အန္တရာယ် မရှိပါ။
- အသုံးပြုသူတစ်ဦးချင်းစီ၏ ဒေတာများသည် ထိုသူ့ Browser ထဲတွင်သာ ရှိနေပြီး Developer အပါအဝင် တခြားဘယ်သူမှ လှမ်းမမြင်နိုင်ပါ။

---

## 🌐 Vercel သို့ တင်နည်း (Hosting)

ဤပရောဂျက်သည် Pure Static Frontend ဖြစ်သောကြောင့်:
1. GitHub ပေါ်သို့ ဤဖိုင် (၃) ခုကို Push တင်ပါ။
2. [Vercel](https://vercel.com) သို့ သွားပြီး Project ကို Import လုပ်ကာ **Deploy** ကို နှိပ်လိုက်ရုံဖြင့် ကမ္ဘာတစ်ဝှမ်း Live အသုံးပြုနိုင်ပါပြီ!
