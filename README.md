# CAMHARE: Concierge E-Ticaret Prototipi

Camhare (Beykoz, 2005'ten beri cam ve porselen üzerine 24 ayar altın el işçiliği) için **mobile-first**, **fiyatsız lüks e-ticaret** ("Price on Request") prototipi.

- Mevcut site analizi: [`docs/ANALIZ.md`](docs/ANALIZ.md)
- Gerçek katalog: camhare.com'dan alınan **87 ürün**, 135 görsel, TR/EN hikâyeler

## Çalıştırma

Build adımı yok. `index.html` dosyasını tarayıcıda açmanız yeterli. Ya da:

```bash
python3 -m http.server 8080
```

GitHub Pages: *Settings → Pages → Deploy from branch → `main` / root*.

## Sayfalar (hash yönlendirme)

| Rota | İçerik |
|---|---|
| `#` | Ana sayfa: fırın hero, Maison, 3 koleksiyon, üç katlı atölye, seçilmiş eserler, Bespoke, "Nasıl çalışır", PDF katalog |
| `#koleksiyon`, `#c-osmanli`, `#c-anadolu`, `#c-bardak` | Liste: arama (ad / motif / SKU), tip filtresi, hızlı "+ Seçkime ekle" |
| `#p-<slug>` | Ürün detayı: kaydırmalı galeri, SKU, fiyat talep üzerine, 24K rozetleri, hikâye, teknik tablo, sertifika, bakım, teslimat, aynı seri |
| `#seckim` | Seçkim (teklif sepeti): adet, not, lead formu, WhatsApp ile gönderme |
| `#ozel-uretim` | Bespoke & kurumsal: segmentler + logo yüklemeli proje formu |
| `#atolye` | Atölye / Hakkımızda |
| `#iletisim` | Çalışan tel/mail/WhatsApp linkleri + kopyala butonu, yol tarifi, form |

## Tasarım sistemi

- 0 px radius, gölge yok, 1 px çizgiler
- Cormorant Garamond (başlık) + Plus Jakarta Sans (arayüz). Arapça için Noto Naskh Arabic
- Renkler: porselen `#f3f4f1`, kaide `#e7e9e5`, mürekkep `#111614`, **24K altın `#a5814a`** (tek vurgu), logo teali `#1d6b6e` (focus), gece `#0d1110` (atölye bölümleri)
- Ürün fotoğrafları beyaz fonlu olduğu için `mix-blend-mode: multiply` ile kaide rengine oturtuluyor; ayrı bir fotoğraf rötuşu gerekmiyor.

## Dosyalar

```
index.html
assets/app.css        tasarım sistemi + bileşenler (mobile-first, 720 / 1080 px kırılımlar)
assets/app.js         yönlendirme, seçkim, formlar, WhatsApp, fırın canvas'ı
assets/i18n.js        TR / EN / AR arayüz metinleri
assets/data.js        üretilmiş katalog (elle düzenlemeyin)
assets/img/p/         ürün görselleri (900 px, camhare.com'dan)
tools/build_catalog.py  data.js + görselleri camhare.com Store API dökümünden üretir
tools/raw/            Store API JSON dökümü (5 Kasım 2026)
tools/build_artifact.py tek dosya önizleme sürümü üretir (dist/)
docs/ANALIZ.md        mevcut site analizi
```

## Prototip varsayımları (canlıdan önce doğrulanacak)

- **Ölçüler örnektir** (tip bazında). Ürün sayfasında da dipnotla belirtiliyor.
- SKU'lar önerilen şemadır: `CH-{OSM|ANA|BRD}-{000}`.
- Atölyenin 3 katının işlevleri varsayımdır.
- Formlar veri göndermez. Canlıda e-posta, CRM (ör. HubSpot) ve WhatsApp Business API'ye bağlanacak.
- Hero'daki canvas animasyonu, çekilecek atölye videosunun yerini tutuyor.

## Canlıya geçiş önerisi

Altyapı Shopify (ya da Webflow/Wix Studio CMS) olacak. "Seçkime ekle" Shopify'da *Draft Order / Quote* akışına bağlanır. Kargo operasyonu hazır olduğunda fiyat görünürlüğü ve ödeme tek ayarla açılır.
