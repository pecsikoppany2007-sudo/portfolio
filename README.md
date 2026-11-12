# kettő – portfólió

kopi és Domi saját bemutatkozó oldala. Statikus oldal: a `site/` mappa megy ki (Netlify: publish directory = `site`, lásd `netlify.toml`).

## Felépítés
- `src/main.js` – görgetés (Lenis), szakaszok, kurzor, munkák megnyitása, hangkapcsoló
- `src/field.js` – kb. 23 ezer fénypont (Three.js), alakzatok: „kettő” felirat, pontpadló a munkák alatt, gyűrűk, a Menet 4 jele, bolygó, boríték; kurzornyom, hipersebesség-csíkok
- `src/reel.js` – a munkák tekercse: domború képernyők, görgetésre a következő jobbról lentről fordul be, az előző balra fent távozik; váltás közben a kép sorai szétcsúsznak, a távoli képernyő LED-pontokból áll
- `src/city.js` – a Kapcsolat előtti város: két toronyfal kódból (dobozok, pontablakok), a kamera lesüllyed és elfordul, a falak egymásba fordulnak, egy ablakból kapu nyílik a Kapcsolatra
- `src/build.js` – az oldal a látogató szeme előtt épül fel (munkamenetenként egyszer; `?build` mindig, `?nobuild` soha)
- `src/extras.js` – vendégkurzorok, kurzorraj, szöveg kijelölése, a kurzor alatt vastagodó címek
- `src/sound.js` – szintetizált hangok, alapból kikapcsolva
- `site/img/oldal/` – a munkáink teljes oldalas képei (a munkába belépve görgethetők)

## Fordítás és teszt
```
npm install
npx esbuild src/main.js --bundle --minify --format=esm --target=es2020 --outfile=site/js/main.js
cd site && python3 -m http.server 8200
node teszt/v8-final.js /tmp/ki      # átadás előtti teljes kör
node teszt/v8.js /tmp/ki "a:w0,b:c.5"  # egy-egy kép: w<k> = k. munka, c<p> = város 0..1
```
Rejtett fps-mérő: írd be az oldalon, hogy `fps`. Kiadásnál emeld a `?v=N` számot az index.html-ben.

## Még kitöltendő
Valódi e-mail, telefon, impresszum (lábléc), árak.
