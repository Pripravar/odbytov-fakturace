# Odbytová fakturace — online tabulka

Sdílená webová appka pro **měsíční fakturaci staveb**. Nahrazuje desítky e-mailů před
uzávěrkou jednou živou tabulkou: každá stavba má řádek, vyplňují se částky a stav se počítá sám.

Stejný stack jako mapy staveb: jeden `index.html` na **GitHub Pages** + **Firebase Realtime
Database** + přihlášení Google. Žádný build.

## Jak to funguje

Tabulka staveb (jeden řádek = jedna stavba). Postup:

1. **Předpokládaná částka** — vyplní příprava.
2. **Odsouhlasená částka** — po odsouhlasení vyplní schvalovatel.
3. **Ekonomka „Vzít na vědomí"** → tím se **řádek zamkne** (už nejde měnit; odemknout může
   jen ekonomka/admin). Hotovo.

Stav v posledním sloupci se odvozuje automaticky:
`—` (nezadáno) → *čeká na odsouhlasení* → *čeká na ekonomku* → *Vzato na vědomí 🔒*.

### Stavba (stálé údaje) vs. měsíční sloupce

**Stavba** (číselník, stálé): kód · název · **Stavbyvedoucí** · **Objednatel** · **Poznámka**.
Edituje se přes modal po kliknutí na název stavby. Předvyplněno v `STAVBY_SEED` v `index.html`.

**Měsíční sloupce** (vyplňují se za každý měsíc) řízené konfigurací `COLUMNS` —
**přidání sloupce = jeden řádek**. Aktuálně v pořadí: Fakturuje se (**povinná volba Ano/Ne** —
dokud někdo nevybere, řádek svítí „Rozhodnout") · Řeší (tento měsíc) · Předpoklad · Odsouhlaseno ·
Podpisy soupisů – termín (datum) · Podpisy soupisů – pozn. · V ESticonu (ano/ne) ·
Posláno na posta@rsd.cz (ano/ne) · Fakturaci posílá. U každého vyplněného pole je **razítko
kdo+kdy**. Částky se zobrazují po tisících (1 250 000). Typy: `amount`, `text`, `date`, `check`,
`yesno`; každý má `roles` = kdo smí editovat.

Sloupce jsou **roztahovatelné** (tažením za pravý okraj záhlaví, jako v Excelu); šířky se ukládají
v prohlížeči. **Poznámka ke stavbě** se zobrazuje celá ve full-width řádku pod každou stavbou.

**Více objednatelů:** pole Objednatel u stavby může obsahovat víc objednatelů oddělených „+"
(např. `KSUS+město`). Každý objednatel pak dostane **vlastní řádek** se samostatnými částkami,
stavem i „vzato na vědomí" — fakturuje se každému zvlášť. Řádky jednoho stavby jsou spojené
modrým pruhem; kód/název/stavbyvedoucí je jen na prvním.

## Role (podle e-mailu)

`priprava` · `schvalovatel` · `ekonomka` · `admin`. Kdo co smí (admin smí vše):

| Akce | Role |
|---|---|
| Předpoklad, Podpisy, ESticon | příprava, schvalovatel, admin |
| Odsouhlasená částka | schvalovatel, admin |
| Vzít na vědomí + zamknout/odemknout řádek | ekonomka, admin |
| Uzavřít/odemknout celý měsíc | ekonomka, admin |

Role se ukládá v `fakturace/uzivatele/<uid>/role`. Po prvním přihlášení dostane uživatel
`priprava`; **admin mu roli povýší** v Console. E-maily v `ADMIN_EMAILS` (v `index.html`) jsou
admin automaticky — sem dej hlavní účet, aby šlo nastavovat role ostatním.

## Dva zámky

- **Zámek řádku** — automaticky po „Vzít na vědomí". Daný řádek je read-only; odemkne ekonomka/admin.
- **Zámek měsíce** — tlačítko 🔒 *Uzavřít* (ekonomka/admin). Celý měsíc read-only; odemkne admin.

## Demo mód (vyzkoušení bez backendu)

Dokud `FIREBASE_CONFIG.apiKey` obsahuje `PLACEHOLDER`, běží appka **lokálně** (localStorage,
přepínač rolí vpravo nahoře, bez přihlášení) — pro vyzkoušení. Po vyplnění reálné konfigurace
se přepne na sdílenou Firebase + přihlašovací bránu.

## Nasazení (poprvé)

**Uživatel** (účty, Blaze, OAuth — v Firebase konzoli):
1. GitHub repo + zapnout **Pages** (větev `main`, root).
2. Firebase projekt, Realtime DB v **europe-west1**.
3. **Authentication → Sign-in method:** zapnout **Google** i **Phone**.
   - Doménu Pages (`<user>.github.io`) přidat do *Authorized domains*.
   - **Phone → SMS region policy:** povolit jen **Česko (+420)** (ochrana proti zneužití SMS).
4. **Web app** (Project settings) → zkopírovat `FIREBASE_CONFIG`.
5. **Blaze** (✓ máš) + **Storage → Get started** (kvůli zálohám).

**V kódu (Claude/ty):**
6. Vlož reálný `FIREBASE_CONFIG` do `index.html` (apiKey už **nesmí** obsahovat `PLACEHOLDER`).
   Doplň admin e-maily do `ADMIN_EMAILS`.
7. Nasaď DB pravidla: `firebase deploy --only database` (z `cloud-function/`).
8. Nasaď zálohy: `cd cloud-function && npm install && firebase deploy --only functions`.
9. Push do repa → Pages publikuje za 1–2 min.

## Přihlášení

Dvě metody (obě vedou do stejné appky, identita = `uid`):
- **Google** (firemní účet) — tlačítko „Přihlásit přes Google".
- **Telefon / SMS** — jen **české číslo (+420, 9 číslic)**; reCAPTCHA + kód z SMS.
  Vyžaduje zapnutý **Phone** provider + Blaze. SMS jen do ČR řeší jednak validace v appce
  (`+420`), jednak *SMS region policy* v konzoli.

## Zálohy (Cloud Functions)

Dvě naplánované funkce (`cloud-function/index.js`, region europe-west1, čas Europe/Prague),
zálohují celou DB do **privátního** Storage (`zalohy/db-<čas>.json` + `db-latest.json`):
- **`backupDatabaseDaily`** — každý den 3:00 (pojistka).
- **`backupDatabaseUzaverka`** — **každé 2 hodiny ve dnech 7.–14.** (čas uzávěrky).

Deploy obou: `firebase deploy --only functions`. Při prvním deployi naplánované funkce
Firebase zapne Cloud Scheduler + Pub/Sub API (uživatel potvrdí v konzoli). Ověření:
Functions → funkce → Testing, nebo Cloud Scheduler → Force run → ve Storage přibude `zalohy/`.

## Datový model

```
fakturace/
  obdobi/<YYYY-MM>/
    zamceno, zamkl:{uid,jmeno,kdy}
    radky/<stavbaId>/
      predpoklad, odsouhlaseno, podpisy, esticon, odesilatel           # dle COLUMNS
      <klíč>By:{uid,jmeno,kdy}                                          # razítko vyplnění
      naVedomi:{uid,jmeno,kdy}                                          # = zámek řádku
  stavby/<id>/{kod, nazev, resi, objednatel, poradi}
  uzivatele/<uid>/{jmeno, email, role}
```

## Bezpečnost

- Čtení i zápis **jen pro přihlášené** (`database.rules.json`).
- Zámek měsíce i zámek řádku (na vědomí) vynucené i v pravidlech; částky musí být čísla.
- Per-sloupcové role hlídá UI (malý důvěryhodný tým, do ~15 lidí).
- Denní záloha celé DB do **privátního** Storage (`zalohy/`), nikdy do repa.

## Fáze 2 (nápady)

Správa rolí přímo v UI, vlastní sloupce přidávané z aplikace (zatím přes `COLUMNS` v kódu),
export schválené fakturace do Excel/CSV + tisk PDF, FCM notifikace „čeká na můj krok",
historie změn (audit log), hromadný import seznamu staveb.
