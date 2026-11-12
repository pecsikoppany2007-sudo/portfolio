# kettő – portfólió

kopi és Domi saját bemutatkozó oldala. Statikus oldal: a `site/` mappa megy ki (Netlify: publish directory = `site`, lásd `netlify.toml`).

## Felépítés
- `src/main.js` – görgetés (Lenis), szakaszok, kurzor, munkák megnyitása, hangkapcsoló
- `src/field.js` – kb. 23 ezer fénypont (Three.js), alakzatok: „kettő” felirat, 8 munka ívelt képernyőn, gyűrűk, a Menet 4 jele, bolygó, boríték; kurzornyom, hipersebesség-csíkok
- `src/build.js` – az oldal a látogató szeme előtt épül fel (munkamenetenként egyszer; `?build` mindig, `?nobuild` soha)
- `src/extras.js` – vendégkurzorok, kurzorraj, szöveg kijelölése, a kurzor alatt vastagodó címek
- `src/sound.js` – szintetizált hangok, alapból kikapcsolva
- `site/img/oldal/` – a munkáink teljes oldalas képei (a munkába belépve görgethetők)

## Fordítás és teszt
```
npm install
npx esbuild src/main.js --bundle --minify --format=esm --target=es2020 --outfile=site/js/main.js
cd site && python3 -m http.server 8200
node teszt/v7.js
```
Rejtett fps-mérő: írd be az oldalon, hogy `fps`. Kiadásnál emeld a `?v=N` számot az index.html-ben.

## Még kitöltendő
Valódi e-mail, telefon, impresszum (lábléc), árak.
