# K3 - Answerability

Status: `CONTENT_READY_FOR_IMPLEMENTATION`

Target: `site/wissen/answerability.html`  
Jira: `PXK-58`  
Scene: existing Scene 3 remains.

## Editorial title

**Answerability: Beantwortet Ihre Website konkrete Fragen?**

## Lead

Eine Website kann technisch lesbar sein und trotzdem eine einfache Kundenfrage nicht klar beantworten. Pixelkiez verwendet **Answerability** deshalb als eigenen Arbeitsbegriff: Wie direkt, explizit, kontextreich und nachvollziehbar beantwortet eine Seite eine konkrete Frage? Das ist kein offizieller Google-, OpenAI- oder KI-Score und keine Garantie fuer eine Zitierung.

## Abschnitt: Lesbar ist nicht gleich antwortfaehig.

Technische Lesbarkeit beantwortet zunaechst die Frage, ob ein System an den Inhalt herankommt. Answerability beginnt einen Schritt spaeter: Steht die gesuchte Information so auf der Seite, dass sie ohne unnoetige Rekonstruktion verstanden werden kann?

Beispiel: Ein Betrieb schreibt an mehreren Stellen, er sei "regional fuer Kunden da", nennt auf einer anderen Seite Potsdam und beschreibt auf einer dritten Seite seine Leistungen. Ein Mensch kann daraus vielleicht erschliessen, dass die Leistung in Potsdam angeboten wird. Eine explizite Antwort waere einfacher: "Wir bieten Leistung X in Potsdam und Umgebung an."

Beides kann technisch lesbar sein. Nur die zweite Variante beantwortet die konkrete Frage unmittelbar. Genau diese Differenz beschreibt unser Arbeitsmodell.

Fuer Pixelkiez besteht Answerability aus fuenf getrennten Dimensionen:

1. **Fragebezug:** Wird die konkrete Informationsabsicht tatsaechlich adressiert?
2. **Explizitheit:** Steht die Antwort wuerdlich auf der Seite oder muss sie aus verstreuten Hinweisen erschlossen werden?
3. **Lokaler Kontext:** Sind Bedingungen, Ort, Zielgruppe, Zeitraum oder Ausnahmen nahe genug an der Aussage, um Mehrdeutigkeit zu vermeiden?
4. **Faktische Stuetzung:** Ist nachvollziehbar, worauf eine belastbare Behauptung beruht?
5. **Maschinelle Verfuegbarkeit:** Ist die relevante Information im tatsaechlich erreichbaren Text/Dokumentpfad vorhanden?

Diese Dimensionen sind eine redaktionelle Diagnosehilfe, kein externes Rankingmodell.

## Abschnitt: Was eine Antwort explizit macht.

Eine gute Antwort nennt nicht nur ein Schlagwort. Sie verbindet die fuer die Frage notwendigen Elemente in einem verstaendlichen Zusammenhang.

Aus "Photovoltaik · Berlin · Beratung" wird zum Beispiel erst dann eine eindeutige Antwort auf "Beraten Sie Unternehmen in Berlin zu Photovoltaik?", wenn Leistung, Zielgruppe und Ort logisch zusammengehoeren. Je mehr ein Leser zwischen Seiten, Karten oder losen Textbausteinen kombinieren muss, desto groesser wird der Interpretationsspielraum.

Explizit bedeutet dabei nicht, jede Seite in eine FAQ-Sammlung umzubauen. Ein klarer Absatz unter einer passenden Ueberschrift kann genauso gut funktionieren. Wichtig ist, dass eine wesentliche Information fuer sich verstaendlich bleibt und die benoetigten Einschraenkungen nicht an einer weit entfernten Stelle versteckt sind.

Google dokumentiert, dass Search-Snippets an die jeweilige Anfrage angepasst und primaer aus Seiteninhalt erzeugt werden koennen. Daraus folgt, dass der Seiteninhalt konkrete Informationen enthalten muss, wenn sie als passender Ausschnitt dienen sollen. Es folgt **nicht**, dass ein bestimmtes Absatzformat automatisch besser rankt oder von generativen Systemen haeufiger zitiert wird.

## Abschnitt: Kontext und Mehrdeutigkeit.

Viele schlechte Antworten sind nicht falsch, sondern unvollstaendig. Typische fehlende Kontexte sind:

- **Ort:** Gilt die Leistung in Berlin, deutschlandweit oder nur vor Ort?
- **Zielgruppe:** Fuer Privatkunden, Unternehmen oder beide?
- **Bedingung:** Ist etwas immer enthalten oder nur in einem bestimmten Paket?
- **Zeit:** Gilt eine Angabe aktuell oder stammt sie aus einem alten Beitrag?
- **Begriff:** Meint "Service" Beratung, Wartung oder einen konkreten Tarif?

Gute Informationsarchitektur haelt solche Zusammenhaenge moeglichst lokal. Das ist auch fuer Retrieval- und QA-Systeme plausibel relevant, weil sie haeufig mit Ausschnitten statt mit einer kompletten Website arbeiten. Die Forschung zeigt zudem, dass Sprachmodelle lange Kontexte nicht immer gleich robust nutzen; die Position relevanter Information kann in getesteten Settings eine Rolle spielen. Daraus machen wir aber keine starre Webregel wie "jede Antwort muss im ersten Satz stehen". Die sichere Konsequenz lautet nur: Wichtige Informationen sollten nicht unnoetig ueber grosse, mehrdeutige Kontexte verteilt werden.

## Abschnitt: Belege und faktische Stuetzung.

Answerability endet nicht bei einer selbstbewussten Formulierung. Je nach Thema braucht eine Aussage nachvollziehbare Stuetzung.

Bei einer Unternehmenswebsite kann das bedeuten:

- Leistungsumfang konkret beschreiben statt nur mit Superlativen zu werben;
- Zertifikate oder Partner nur nennen, wenn sie tatsaechlich bestehen;
- Daten und Kennzahlen mit Quelle, Zeitraum und Bezugsrahmen versehen;
- fachliche Aussagen auf belastbare Quellen zurueckfuehren;
- Preise, Verfuegbarkeit oder Fristen mit ihren Bedingungen nennen;
- bei Messwerten offenlegen, was tatsaechlich gemessen wurde.

Ein Beleg macht eine Seite nicht automatisch sichtbarer. Er macht die Aussage fuer Leser und Pruefer nachvollziehbarer. In kontrollierten GEO- und Retrieval-Forschungen koennen evidenzreiche Passagen Vorteile in bestimmten Messungen zeigen; daraus darf Pixelkiez keine generelle Zitationsgarantie fuer reale Plattformen ableiten.

## Abschnitt: Wie Pixelkiez Answerability einschaetzt.

Pixelkiez sollte Answerability zunaechst **qualitativ und dimensionsbezogen** pruefen. Fuer eine zentrale Kundenfrage wird dokumentiert:

| Dimension | Prueffrage |
|---|---|
| Fragebezug | Adressiert die Seite genau diese Frage oder nur ein benachbartes Thema? |
| Explizitheit | Ist die Antwort woertlich/inhaltlich vorhanden oder nur erschliessbar? |
| Kontext | Sind notwendige Bedingungen und Begriffe im selben sinnvollen Abschnitt vorhanden? |
| Stuetzung | Sind materielle Fakten belegbar oder nachvollziehbar eingegrenzt? |
| Verfuegbarkeit | Ist der relevante Text im geprueften Abruf-/Renderingpfad vorhanden? |

Das Ergebnis kann beispielsweise `klar`, `teilweise`, `nur erschlossen` oder `nicht belegt` lauten. Ein numerischer Answerability-Score sollte erst eingefuehrt werden, wenn Messmethode, Coverage und Validierung definiert sind. Bis dahin ist die Diagnose absichtlich transparenter als eine scheinexakte Zahl.

## Scene-3 caption - approved revision

**Szene 3 - Frage trifft Website.** Eine Website kann technisch lesbar sein und trotzdem keine klare Antwort liefern. Im Pixelkiez-Arbeitsmodell steigt die Antwortfaehigkeit, wenn die relevante Information explizit, im passenden lokalen Kontext, maschinell erreichbar und bei materiellen Aussagen nachvollziehbar gestuetzt vorliegt. Daraus folgt keine Ranking- oder Zitierungsgarantie.

## Public source note

Recommended visible sources:

1. Google - `Control your snippets` (`SRC-GGL-010`)
2. Google - SEO Guide for Web Developers (`SRC-GGL-004`)
3. Liu et al. - `Lost in the Middle`, TACL 2024 (`LIT-002`) - only for limitations of long-context use, not as a web ranking rule.

## Implementation guardrails

- Keep `Answerability` explicitly labeled as a Pixelkiez working model.
- Do not state that headings, lists, tables or FAQ markup increase AI citation probability.
- Do not turn `Lost in the Middle` into a universal `put all answers first` instruction.
- Do not add a numeric score in this slice.
