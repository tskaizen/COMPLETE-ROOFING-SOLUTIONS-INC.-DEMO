# Complete Roofing Solutions: demo rebuild talking points

Owner: George Jacobazzi. Live site: https://my-roofer.com/ . Phone (561) 848-7663. 5678 N Military Trl, West Palm Beach, FL 33407. License CCC1328211.
George said they are renovating the site and want a calculator. This demo answers that directly.

## Pages
| Page | File | What it does |
|---|---|---|
| Home | index.html | Animated hero (tile roof installs row by row), trust bar, 5 services + estimate tile, how it works, animated roof layer cross section, storm/emergency band (rain, wind, lightning), awards, manufacturer marquee, service area, CTA |
| Instant estimate | quote.html | 4 step quoting platform with live roof preview, price range and itemized lines; sends the lead with the estimate attached |
| Residential | services/residential.html | Tile, shingle, metal, flat options, FAQ |
| Roof replacement | services/roof-replacement.html | 4 step process, FAQ |
| Roof repair | services/roof-repair.html | Leaks, storm, flashing, flat roof repair, FAQ |
| Commercial | services/commercial.html | TPO, mod bit, metal, coatings, FAQ |
| Maintenance | services/maintenance.html | Inspections, tune ups, plans, FAQ |
| About | about.html | Since 1985, four generations, George, awards, brands |
| Contact | contact.html | Lead form with ?service= prefill, phone, address, area |

## Problems on the current site (my-roofer.com)
- Footer copyright still reads "Copyright . COMPANY" (template text never filled in).
- "What Our Clients Say" section shows no testimonials.
- Footer map link points to 4252 Westroads Dr, but the listed address is 5678 N Military Trl.
- Years in business disagree: "over 35 years" in one section, "since 1985" in another.
- No email address, no online estimate, no calculator. Every visitor has to call.

## What the new design does
- The calculator is the main action on every page (header, hero, mobile bar, each service option links in with the project preselected).
- Leads arrive with the full estimate attached (material, roof area, tear off, decking, skylights), so George's office calls back already knowing the job.
- Motion graphics are built in code (SVG + CSS), so they load fast, look sharp on any screen, and stop for visitors who turn motion off.
- Uses their real logo, award list, license number, manufacturer logos and hero video from their current site.

## Calculator rates (must confirm with George before launch)
All rates live at the top of `assets/js/quote.js` in `RATES`. Defaults come from public 2026 Florida and Palm Beach County cost guides (HomeAdvisor, Fixr, Instant Roofer, Roofing Calculator). They are starting assumptions, not his pricing.
- Shingle $5 to $7.50 / sq ft, concrete tile $10 to $15, clay tile $12 to $19, metal $10 to $17, flat $7 to $12
- Tear off by material, second layer surcharge, permit allowance $450 to $900, skylights $650 to $1,200 each, deck sheets $85 to $125 each
- Commercial: TPO, mod bit, metal, coating restoration
- Repair and tune up ranges
Pitch, roof complexity and stories apply multipliers. Results round to $100.

## Brand notes
- Colors are set as tokens in `assets/css/styles.css :root` (slate, tile orange, sand). Sample the real logo colors and swap `--tile`, `--slate`, `--sand` if they differ.
- Fonts: Barlow Semi Condensed (headings), Source Sans 3 (body).

## Before launch checklist
- [ ] George confirms every rate in `RATES`
- [ ] Download the logo and manufacturer images into `assets/img/` instead of hotlinking their Webflow CDN
- [ ] Set `SITE.FORM_ENDPOINT` in `assets/js/main.js` (Formspree or their CRM)
- [ ] Add real testimonials and job photos (none on the current site)
- [ ] Confirm hours and an email address
- [ ] Remove the DEMO banner, `noindex` meta tags and `robots.txt` Disallow when going live
