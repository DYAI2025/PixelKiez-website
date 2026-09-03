# K4 - Entity Clarity / eindeutige Zuordnung

Status: `CONTENT_READY_WITH_TERMINOLOGY_DECISION_REQUIRED`

Current target route: `site/wissen/entity-trust.html`  
Jira: `PXK-58`  
Scene: existing Scene 4 remains after wording hardening.

## Terminology decision

Research verdict: **`Entity Trust` is misleading as a technical article title.** The evidence supports entity identification, disambiguation, consistency and resolution. It does not support a universal technical `trust` outcome or score.

Preferred public title:

**Entity Clarity: Weiss die Maschine, wer Sie sind?**

Alternative fully German title:

**Eindeutige Zuordnung: Weiss die Maschine, wer Sie sind?**

Do not automatically rename the route in the content implementation. A route change affects internal links, canonical/hreflang and release history and needs an explicit product decision.

## Lead

Ein Unternehmen taucht im Web an vielen Stellen auf: auf der eigenen Website, in strukturierten Daten, Branchenprofilen, Karten, Presseartikeln oder Partnerseiten. Fuer Such- und Informationssysteme besteht die Aufgabe darin, diese Angaben der richtigen Organisation, dem richtigen Ort und den richtigen Personen zuzuordnen. Pixelkiez nennt diese Qualitaet **Entity Clarity**. Sie reduziert Mehrdeutigkeit - sie ist aber kein versteckter Trust- oder Ranking-Score.

## Abschnitt: Weiss das System, wer Sie sind?

Bei einer Entity-Zuordnung geht es um eine einfache, aber wichtige Frage: Welche reale Organisation ist mit einem Namen, einer Website oder einer Information gemeint?

Das wird relevant, sobald Namen nicht eindeutig sind. "Mueller Consulting" kann mehrere Unternehmen bezeichnen. Ein Name allein reicht dann nicht immer, um Website, Standort, Telefonnummer, Leistungen und Personen sicher zusammenzufuehren.

Explizite Angaben koennen die Zuordnung erleichtern. Google dokumentiert fuer `Organization`-Structured-Data, dass solche Daten helfen koennen, administrative Details einer Organisation besser zu verstehen und sie in Suchergebnissen von anderen Organisationen zu unterscheiden. Das ist ein klarer, belegbarer Nutzen: **besser beschreiben und disambiguieren**.

Was daraus nicht folgt: dass Google oder ein anderes System fuer die Firma einen universellen Entity-Trust-Wert berechnet, dass Structured Data eine bessere Position garantiert oder dass eine generative Antwort die Organisation deshalb zitieren muss.

## Abschnitt: Unternehmen, Ort, Leistungen, Personen.

Fuer eine Unternehmenswebsite sollten unterschiedliche Arten von Information sauber auseinandergehalten und verbunden werden:

- **Organisation:** offizieller beziehungsweise verwendeter Name, Website, Logo, Kontaktinformationen und gegebenenfalls belastbare Identifier;
- **Ort:** Anschrift, Einzugsgebiet oder Standorte - jeweils in der tatsaechlich geltenden Bedeutung;
- **Leistungen:** konkrete Angebote und fuer wen sie gelten;
- **Personen:** Inhaber, Ansprechpartner, Autoren oder Teammitglieder nur dort, wo die Zuordnung sachlich stimmt;
- **Beziehungen:** zum Beispiel weitere offizielle Profile oder Reprasentationen, sofern sie tatsaechlich dieselbe Entitaet beschreiben.

Der Zweck ist nicht, moeglichst viele Signale zu produzieren. Der Zweck ist, dass die vorhandenen Angaben ein koharentes, wahres Bild ergeben.

## Abschnitt: Konsistenz ueber Quellen hinweg.

Widersprueche erhoehen den Klaerungsbedarf. Wenn auf der Website eine alte Adresse, in einem Profil eine neue Adresse und in einem weiteren Verzeichnis eine dritte Telefonnummer steht, kann ein Mensch oft noch herausfinden, was aktuell ist. Fuer automatisierte Systeme entsteht zusaetzliche Ambiguitaet.

Konsistenz ist deshalb eine Hygiene- und Klarheitsaufgabe: aktuelle Daten pflegen, Dubletten vermeiden, falsche Profile korrigieren und unterschiedliche reale Standorte oder Firmen nicht versehentlich zusammenziehen.

Diese Empfehlung darf nicht in die Behauptung kippen, identische NAP-Daten wuerden automatisch Rankings oder AI-Zitationen erhoehen. Die Research-Ergebnisse tragen diese Kausalitaet nicht. Konsistenz reduziert zunaechst Widerspruch und erleichtert eine korrekte Zuordnung.

## Abschnitt: Strukturierte Daten und externe Bestaetigung.

Strukturierte Daten machen bestimmte Informationen explizit maschinenlesbar. Fuer eine Organisation koennen je nach Anwendungsfall unter anderem Name, URL, Logo, Adresse, Kontaktinformationen, Identifier und Links zu weiteren Reprasentationen relevant sein. Die konkrete Auszeichnung muss zum sichtbaren Inhalt passen.

`sameAs` und aehnliche Verknuepfungen sind kein automatischer Identitaetsbeweis. Sie sind eine explizite Aussage des Publishers darueber, welche andere Repraesentation dieselbe Entitaet beschreibt. Falsche oder unpassende Verknuepfungen machen das Datenmodell nicht besser.

Externe Quellen koennen eine Organisation ebenfalls beschreiben. Sie liegen aber nicht vollstaendig unter Kontrolle des Websitebetreibers. Pixelkiez sollte deshalb zwei Ebenen getrennt bewerten:

1. **eigene Entity-Signale:** Was behauptet und strukturiert die Website selbst?
2. **externe Konsistenz:** Welche oeffentlichen Quellen bestaetigen, ergaenzen oder widersprechen diesen Angaben?

Auch hier gilt: externe Bestaetigung kann ein staerkeres Gesamtbild liefern, ist aber nicht gleichbedeutend mit einem nachweisbaren Ranking- oder Citation-Mechanismus.

## Abschnitt: Beobachtbar oder erschlossen.

Bei einer Diagnose koennen wir direkt beobachten:

- welche Organisationsdaten sichtbar auf der Website stehen;
- welche strukturierten Daten vorhanden sind;
- ob sichtbarer Text und Markup zusammenpassen;
- ob zentrale Angaben innerhalb der Website widerspruechlich sind;
- ob ausgewaehlte externe Profile dieselbe oder eine andere Organisation beschreiben;
- ob eine konkrete Plattform eine Organisation in einem beobachtbaren Ergebnis eindeutig zuordnet.

Nicht direkt beobachtbar ist ein allgemeiner "Vertrauenswert" im Inneren fremder Systeme. Ebenso wenig duerfen wir aus einer sauberen Entity-Struktur automatisch auf Ranking, Zitierung oder Umsatz schliessen.

Pixelkiez sollte deshalb nicht fragen: "Wie hoch ist Ihr Entity Trust?" Sondern: **"Wie eindeutig und widerspruchsfrei sind Unternehmen, Leistungen, Standort und relevante Personen fuer Menschen und Maschinen beschrieben?"**

## Scene-4 caption - approved revision

**Szene 4 - Verstreute Angaben, ein gemeinsames Bild.** Name, Website, strukturierte Organisationsdaten, Standort und weitere Reprasentationen koennen einem System helfen, Angaben derselben Organisation zuzuordnen. Widersprueche erhoehen die Ambiguitaet. Die Szene beschreibt Entity Clarity - keinen Trust-, Ranking- oder Citation-Score.

## Public source note

Recommended visible sources:

1. Google - `Organization structured data` (`SRC-GGL-007`)
2. Google - `Intro to Structured Data` (`SRC-GGL-008`)

Scientific entity-resolution literature may be added later for a deeper methodology note, but is not required to make the current customer-facing claims.

## Implementation guardrails

- Publication should not keep `Entity Trust` as an unqualified technical mechanism.
- Route migration is a separate decision; title/copy correction can happen first.
- Do not claim NAP consistency, sameAs or Organization schema improves ranking/citation by itself.
- Keep the page about identity clarity and ambiguity, not reputation scoring.
