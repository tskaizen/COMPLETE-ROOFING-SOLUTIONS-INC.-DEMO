# Complete Roofing Solutions: demo site

Static site, no build step. Open `index.html` or serve the folder with GitHub Pages.

```
index.html  quote.html  about.html  contact.html
services/   residential, roof-replacement, roof-repair, commercial, maintenance
assets/css/styles.css   all styling, tokens on :root
assets/js/main.js       menu, dropdown, reveal, forms (SITE config at top)
assets/js/quote.js      instant estimate calculator (RATES config at top)
IMPROVEMENTS.md         talking points for the pitch, not part of the site
```

Edit prices in `RATES` at the top of `assets/js/quote.js`. Set the form endpoint in `SITE.FORM_ENDPOINT` in `assets/js/main.js`.
