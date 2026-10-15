# Inventory image review — 9 October 2026

Sources: `talomart-inventory-import-staging.xlsx` and `images_doc_1.docx` supplied by the owner. The workbook has 28 rows with image-page references. The Word file has 29 embedded images; page numbers and embedded image numbers differ after blank pages, so each match was checked visually.

## Published

The 17 products below were published from the workbook's selling price, crossed-out original price and quantity. Descriptions and specifications were limited to what the supplied photos show. Images are in the public `product-images` Supabase Storage bucket. The publication is idempotent by SKU; it does not update existing products.

| SKU | Product | Photo |
| --- | --- | --- |
| TLM-INV-0055 | S11 Wired Earphones | image21.jpeg |
| TLM-INV-0106 | ABJ A-C253 3.1A Charger | image8.png |
| TLM-INV-0125 | X8 Car FM Modulator | image5.png |
| TLM-INV-0152 | ABJ OXN Mini Pod Earbuds | image17.jpeg |
| TLM-INV-0161 | OFIA HT-086 Neckband Earphones | image1.png |
| TLM-INV-0183 | Weile WL-806MV Stereo Headphones | image20.jpeg |
| TLM-INV-0198 | SanDisk Cruzer Blade 32GB USB Drive | image12.jpeg |
| TLM-INV-0246 | Amaya A-AD032 3.1A Charger | image6.png |
| TLM-INV-0249 | Apex AP-12C 45W Charger | image27.jpeg |
| TLM-INV-0270 | M10 Wireless Earbuds | image26.jpeg |
| TLM-INV-0324 | PowerKing 4-Socket Extension with USB | image23.jpeg |
| TLM-INV-0330 | Amaya ACD-X51 4-in-1 Cable | image9.png |
| TLM-INV-0338 | Boost 2GB microSD Card | image7.png |
| TLM-INV-0341 | Pro3 Plus Wireless Earbuds | image16.jpeg |
| TLM-INV-0343 | Boost 8GB microSD Card | image11.jpeg |
| TLM-INV-0350 | AFNO X30 Wired Earphones | image22.jpeg |
| TLM-INV-0355 | Boost 4GB microSD Card | image19.jpeg |

## Held for owner confirmation

No catalogue records were created for these 11 rows. The photo and POS label are not a safe, exact customer-facing match, or the pictured brand/connector requires confirmation.

| Source product (SKU) | Reason |
| --- | --- |
| iPhone 17 Pro Max (TLM-INV-0023) | Photo shows a charger-and-cable kit, not the phone. |
| ORAIMO WATCH 6 R (TLM-INV-0037) | Packaging appears to say Watch 6 Lite, not Watch 6 R. |
| iPhone 14 Pro Max (TLM-INV-0086) | Photo shows a charger-and-cable kit, not the phone. |
| Vonex X10 (TLM-INV-0105) | Pictured phone model appears to be A803, not X10. |
| Discovery 5c (TLM-INV-0128) | Pictured battery code BL-5CD does not exactly match the POS label. |
| Mp3 Player (TLM-INV-0206) | Photo shows an HM25 car FM modulator, not a standalone MP3 player. |
| Anti Bend iPhone (TLM-INV-0267) | D82L cable photo does not clearly establish a Lightning/iPhone connector. |
| oraimo type-c charger 10w (TLM-INV-0271) | Pictured cable is Micro-USB, not Type-C. |
| Oraimo Original 10w Charger Micro (TLM-INV-0317) | Micro-USB matches, but pack says 6A rather than 10W; confirm the model and rating. |
| Samsung C to C Cable (TLM-INV-0319) | Photo is a generic S23 USB-C cable pack; Samsung branding/origin is not established. |
| 45W PD Adapter (TLM-INV-0347) | Photo carries Samsung branding; confirm authenticity before listing with that photo. |

Before further publication, reconcile the physical stock counts against the workbook, particularly the high-quantity memory cards and earphones. A crossed-out original price should be retained only if it is a genuine previous selling price.
