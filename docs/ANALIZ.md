# camhare.com: Mevcut Site Analizi

*İnceleme: 5 Kasım 2026. Canlı site, WooCommerce Store API ve iPhone 13 (390 px) emülasyonu üzerinden yapıldı.*

## Özet: Müşterinin en büyük şikâyeti

**Site satış ya da talep üretmiyor; ziyaretçi için bir çıkmaz sokak.** İlgilenen bir ziyaretçinin siteden ilerleyebileceği tek bir yol yok:

| Kontrol | Bulgu |
|---|---|
| Satın alma | 94 ürünün 93'ü `purchasable: false`, tüm fiyatlar 0 TL. Sepet ya da teklif butonu yok. |
| İletişim formu | `/iletisim` sayfasında **form yok**, sadece adres ve numaralar var. |
| Telefon linki (her sayfada) | `href="http://+90 530 861 95 85"` → **bozuk**. Tıklayınca hata sayfası açılıyor, arama başlamıyor. |
| E-posta linki | `href="http://info@camhare.com"` → **bozuk**. E-posta istemcisi açılmıyor. |
| WhatsApp | İletişim için WhatsApp butonu yok, ürün sayfasında sadece "paylaş" ikonu var. |
| İngilizce | `/en/` adresi **Türkçe ana sayfayı** döndürüyor (WPML yarım kurulmuş). İhracat ve turist kitlesi siteyi okuyamıyor. |

Sonuç olarak markanın asıl gelir kaynakları olan B2B, ihracat ve VIP projelerin sitede hiçbir giriş noktası yok.

## Mobil deneyim (öncelik 1)

- **Ana sayfa 8 sn'de yükleniyor** (iPhone emülasyonu, `load`). Ürün sayfasında TTFB 5,8 sn.
- Sayfa başına **19 CSS + 35 JS** dosyası yükleniyor (Elementor + WooCommerce + WPML + Dokan).
- Slider görselleri **2048×588 (3,5:1) yatay banner** ve her biri ~1 MB. 390 px ekranda 110 px yüksekliğinde bir şeride dönüşüyor, üzerindeki yazılar okunmuyor.
- Ana sayfa sadece slider + 3 kategori kutusundan oluşuyor. Marka hikâyesi, atölye ya da 24 ayar altın vurgusu yok.
- Ürün sayfasının ilk ekranında görsel ve "☆☆☆☆☆ (0 Yorum)" var, **aksiyon butonu yok**. Açıklama TR ve ENG blokları halinde art arda dökülmüş.

## Katalog ve veri kalitesi

| Alan | Durum |
|---|---|
| Toplam ürün | 94 kayıt (93 gerçek ürün + 1 sistem kaydı) |
| **Sistem ürünü sızıntısı** | Dokan eklentisinin *"Reverse Withdrawal Payment — do not delete"* ürünü **Osmanlı Koleksiyonları altında herkese açık** listeleniyor. |
| SKU | 94/94 boş |
| Ölçü / özellik (attributes) | 94/94 boş |
| Görsel | 7 ürün görselsiz, 77 ürün tek görselli |
| Hikâye metni | ✅ ~80 üründe TR + EN hikâye var. **En değerli içerik varlığı bu**, ama sunumu kötü. |
| Kategori verisi | Bazı ürünlerde kategori kayıtları tekrarlıyor ya da boş dönüyor (API'de 5× aynı kategori). |
| Telif yılı | "Copyright © 2021" |

## Teknik altyapı

WordPress 7.1 + WooCommerce 11.2 + Elementor 4.3 + WPML 4.4.10 + Dokan (çok satıcılı pazar yeri eklentisi, ihtiyaç dışı). Görseller 2021–2022'den kalma. `xmlrpc.php` açık. İletişim formu eklentisi yok.

## Prototipin bu sorunlara cevabı

| Sorun | Prototipteki çözüm |
|---|---|
| Talep yolu yok | Her üründe **"Seçkime ekle"** var. Seçkim sayfası bir teklif formuna dönüşüyor. Talep türü (kurumsal, otel, müze, ihracat, protokol, kişiye özel), adet ve not alınıyor. |
| Bozuk tel/mail | Doğru `tel:` / `mailto:` linkleri, ayrıca kopyala butonu |
| WhatsApp yok | Ürün, seçkim ve form bazında **hazır mesajlı WhatsApp VIP** (ürün adı + SKU + adet otomatik ekleniyor) |
| Mobilde aksiyon yok | Ürün sayfasında başparmak bölgesinde **sabit aksiyon çubuğu** (Seçkime ekle + WhatsApp) |
| Slider okunmuyor | Tam genişlik koyu "fırın" hero'su. Canlı sitede yerini atölye videosu alacak. |
| İngilizce yok | TR / EN / AR (RTL) dil anahtarı. 80 ürün hikâyesi TR ve EN olarak ayrıştırıldı. |
| SKU / ölçü yok | Önerilen SKU şeması `CH-OSM-001`, `CH-ANA-001`, `CH-BRD-001` ve teknik detay tablosu. Ölçüler şimdilik **örnek değer**, atölyeden alınacak. |
| Fiyat ve kargo riski | Fiyat talep üzerine. Sigortalı teslimat ve sertifika anlatımı ürün sayfasında. |
| Katalog | PDF katalog talebi de lead (e-posta) topluyor. |

## Atölyeden istenecek içerik (canlıya geçiş için)

1. 87 ürünün gerçek ölçüleri (yükseklik, çap, ağırlık) ve sınırlı üretim adetleri
2. Atölye videosu (fırın/ateş, fırça ile altın uygulaması), dikey ve yatay kesim, 30–45 sn
3. Ürün fotoğraflarının yenilenmesi: 4:5 ve 1:1, nötr zemin, her ürün için en az 3 açı + detay
4. Görselsiz 6 ürünün fotoğrafları: Sancak-ı Alem Kılıç, Osmanlı Tören Kalkanı, Nazar Gondol, Kutsal 7 Din Vazo, Hanedan Bardak Grubu, Şifa Kesme Kase
5. Üç katın gerçek kullanımı (prototipte varsayım olarak Tasarım / Tezhip & altın / Fırın & sevkiyat yazıldı)
6. Kurumsal referanslar ve izinli VIP projeler (ör. Instagram'daki ünlü sporcu projesi) için vaka çalışması izinleri
7. Sertifika örneği ve kutu/sandık fotoğrafları
8. Arapça hikâye çevirileri
