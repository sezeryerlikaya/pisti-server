# Pişti Game Server

Pişti kart oyunu için Ably token auth + oda yönetimi sunucusu.

## Railway.app'e Deploy (Önerilen)

1. [railway.app](https://railway.app) → GitHub ile giriş yap
2. "New Project" → "Deploy from GitHub repo" → bu klasörü yükle
3. "Variables" sekmesine git → şu değişkeni ekle:
   ```
   ABLY_API_KEY = senin_ably_key_buraya
   ```
4. Deploy otomatik başlar. "Deployments" sekmesinden URL'yi al.
   Örnek: `https://pisti-server-production.up.railway.app`

## Render.com'a Deploy (Alternatif)

1. [render.com](https://render.com) → GitHub ile giriş yap
2. "New Web Service" → repo'yu bağla
3. Build Command: `npm install`
4. Start Command: `npm start`
5. Environment Variables → `ABLY_API_KEY` ekle
6. Deploy → URL'yi al

## Sonra ne yapacaksın?

pisti.html dosyasındaki şu satırı güncelle:
```js
const SERVER_URL = 'https://SENIN-RAILWAY-URLN.up.railway.app';
```

## Endpoints

- `GET  /token`        → Ably token al (client çağırır)
- `POST /room/create`  → Oda oluştur, kod al
- `GET  /room/:code`   → Oda var mı kontrol et
- `DELETE /room/:code` → Odayı kapat
