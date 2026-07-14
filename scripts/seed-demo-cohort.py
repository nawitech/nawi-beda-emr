#!/usr/bin/env python3
"""Generates the demo patient cohort and its encounters.

The cohort is modelled on a Maryland local health department panel: a mix of Baltimore
City and surrounding counties, spanning the age range a public clinic actually sees,
and carrying US Core race and ethnicity extensions. A demo population that is uniformly
young, uniformly one ethnicity, or uniformly urban reads as synthetic to anyone who
works in the state, and the reports built on it look synthetic too.

Deterministic: rerunning produces identical files.
"""
import os

ROOT = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "resources", "fhir-seeds-demo")

US_CORE_RACE = "http://hl7.org/fhir/us/core/StructureDefinition/us-core-race"
US_CORE_ETHNICITY = "http://hl7.org/fhir/us/core/StructureDefinition/us-core-ethnicity"
US_CORE_BIRTHSEX = "http://hl7.org/fhir/us/core/StructureDefinition/us-core-birthsex"
RACE_CS = "urn:oid:2.16.840.1.113883.6.238"

RACE = {
    "white": ("2106-3", "White"),
    "black": ("2054-5", "Black or African American"),
    "asian": ("2028-9", "Asian"),
    "amerind": ("1002-5", "American Indian or Alaska Native"),
    "hawaiian": ("2076-8", "Native Hawaiian or Other Pacific Islander"),
    "other": ("2131-1", "Other Race"),
}
ETHNICITY = {
    "hispanic": ("2135-2", "Hispanic or Latino"),
    "not_hispanic": ("2186-5", "Not Hispanic or Latino"),
}

LANGUAGE = {
    "en": ("en", "English"),
    "es": ("es", "Spanish"),
    "zh": ("zh", "Chinese"),
    "fr": ("fr", "French"),
    "am": ("am", "Amharic"),
    "ko": ("ko", "Korean"),
}


def write(subdir, name, body):
    d = os.path.join(ROOT, subdir)
    os.makedirs(d, exist_ok=True)
    with open(os.path.join(d, name + ".yaml"), "w") as f:
        f.write(body.lstrip("\n"))


def race_ext(race_key):
    code, display = RACE[race_key]
    return f"""  - url: {US_CORE_RACE}
    extension:
      - url: ombCategory
        valueCoding:
          system: {RACE_CS}
          code: "{code}"
          display: {display}
      - url: text
        valueString: {display}"""


def ethnicity_ext(eth_key):
    code, display = ETHNICITY[eth_key]
    return f"""  - url: {US_CORE_ETHNICITY}
    extension:
      - url: ombCategory
        valueCoding:
          system: {RACE_CS}
          code: "{code}"
          display: {display}
      - url: text
        valueString: {display}"""


def birthsex_ext(sex):
    return f"""  - url: {US_CORE_BIRTHSEX}
    valueCode: {sex}"""


# family, given, gender, birthsex, dob, race, ethnicity, language, city, county, postal
COHORT = [
    ("Carroll",    "Denise",   "female", "F", "1967-03-14", "black",    "not_hispanic", "en", "Baltimore",     "Baltimore City",     "21213"),
    ("Whitfield",  "Marcus",   "male",   "M", "1972-01-30", "black",    "not_hispanic", "en", "Baltimore",     "Baltimore City",     "21215"),
    ("Delgado",    "Rosa",     "female", "F", "1965-12-19", "other",    "hispanic",     "es", "Langley Park",  "Prince George's",    "20783"),
    ("Nguyen",     "Thanh",    "male",   "M", "1958-06-12", "asian",    "not_hispanic", "en", "Catonsville",   "Baltimore County",   "21228"),
    ("O'Sullivan", "Bridget",  "female", "F", "1949-04-23", "white",    "not_hispanic", "en", "Dundalk",       "Baltimore County",   "21222"),
    ("Achebe",     "Ngozi",    "female", "F", "1983-07-11", "black",    "not_hispanic", "en", "Silver Spring", "Montgomery",         "20904"),
    ("Kowalski",   "Piotr",    "male",   "M", "1977-02-14", "white",    "not_hispanic", "en", "Essex",         "Baltimore County",   "21221"),
    ("Ramirez",    "Aaliyah",  "female", "F", "1995-10-02", "other",    "hispanic",     "es", "Hyattsville",   "Prince George's",    "20781"),
    ("Begay",      "Leonard",  "male",   "M", "1961-03-27", "amerind",  "not_hispanic", "en", "Cumberland",    "Allegany",           "21502"),
    ("Haddad",     "Yasmin",   "female", "F", "1988-11-08", "white",    "not_hispanic", "en", "Towson",        "Baltimore County",   "21204"),
    ("Donnelly",   "Sean",     "male",   "M", "1954-08-16", "white",    "not_hispanic", "en", "Glen Burnie",   "Anne Arundel",       "21061"),
    ("Tesfaye",    "Meseret",  "female", "F", "1979-05-21", "black",    "not_hispanic", "am", "Silver Spring", "Montgomery",         "20910"),
    ("Petrov",     "Anton",    "male",   "M", "1968-12-01", "white",    "not_hispanic", "en", "Rockville",     "Montgomery",         "20850"),
    ("Coleman",    "Danielle", "female", "F", "1992-06-29", "black",    "not_hispanic", "en", "Baltimore",     "Baltimore City",     "21217"),
    ("Alvarez",    "Hector",   "male",   "M", "1946-09-13", "other",    "hispanic",     "es", "Salisbury",     "Wicomico",           "21801"),
    ("Park",       "Ji-woo",   "female", "F", "1974-04-04", "asian",    "not_hispanic", "ko", "Ellicott City", "Howard",             "21042"),
    ("Boateng",    "Kwame",    "male",   "M", "2001-09-17", "black",    "not_hispanic", "en", "Baltimore",     "Baltimore City",     "21205"),
    ("Kaleo",      "Malia",    "female", "F", "1990-02-08", "hawaiian", "not_hispanic", "en", "Annapolis",     "Anne Arundel",       "21401"),
    ("Fitzgerald", "Ruth",     "female", "F", "1937-11-30", "white",    "not_hispanic", "en", "Frederick",     "Frederick",          "21701"),
    ("Okonkwo",    "Emeka",    "male",   "M", "2015-05-19", "black",    "not_hispanic", "en", "Baltimore",     "Baltimore City",     "21224"),
]

STREETS = [
    "1412 N Chester St", "3320 Reisterstown Rd", "8104 New Hampshire Ave",
    "615 Frederick Rd", "27 Shipping Pl", "9812 Colesville Rd", "412 Eastern Blvd",
    "5507 Baltimore Ave", "104 Virginia Ave", "800 Kenilworth Dr", "76 Crain Hwy",
    "1201 East-West Hwy", "255 Rockville Pike", "1919 Druid Hill Ave", "310 Snow Hill Rd",
    "3600 St Johns Ln", "1700 E Monument St", "88 West St", "196 Thomas Johnson Dr",
    "2600 Boston St",
]


def patient_id(i):
    return "pt-denise-carroll" if i == 0 else f"pt-{COHORT[i][0].lower().replace(chr(39), '')}"


for i, (family, given, gender, birthsex, dob, race, eth, lang, city, county, postal) in enumerate(COHORT):
    pid = patient_id(i)
    lang_code, lang_display = LANGUAGE[lang]
    mrn = f"PLHD-{4821 + i * 137:06d}"

    # Denise carries the transposed date of birth that causes her claims to bounce; the
    # payer's eligibility record holds the correct one.
    identifier = f"""identifier:
  - use: usual
    type:
      coding:
        - system: http://terminology.hl7.org/CodeSystem/v2-0203
          code: MR
          display: Medical Record Number
    system: http://patapscohealth.example.org/mrn
    value: {mrn}"""

    write("Patient", pid, f"""
id: {pid}
resourceType: Patient
active: true
extension:
{race_ext(race)}
{ethnicity_ext(eth)}
{birthsex_ext(birthsex)}
name:
  - use: official
    family: {family}
    given:
      - {given}
{identifier}
telecom:
  - system: phone
    value: "+1-410-555-{1000 + i * 7:04d}"
    use: mobile
gender: {gender}
birthDate: "{dob}"
address:
  - use: home
    line:
      - {STREETS[i]}
    city: {city}
    district: {county}
    state: MD
    postalCode: "{postal}"
    country: US
communication:
  - language:
      coding:
        - system: urn:ietf:bcp:47
          code: {lang_code}
          display: {lang_display}
    preferred: true
managingOrganization:
  reference: Organization/org-1001
  display: Patapsco County Health Department
""")

# Encounters spread across the report window, rotated over the clinical staff so the
# per-clinician breakdown has real spread.
STAFF = ["prac-okafor", "prac-1000", "prac-1002"]
DATES = [
    "2026-06-16", "2026-06-18", "2026-06-22", "2026-06-24", "2026-06-26",
    "2026-06-29", "2026-07-01", "2026-07-02", "2026-07-06", "2026-07-08",
    "2026-07-09", "2026-07-13",
]
VISIT_TYPES = [
    ("162673000", "Chronic disease follow-up"),
    ("185349003", "Encounter for check up"),
    ("270427003", "Patient-initiated encounter"),
    ("390906007", "Follow-up encounter"),
]

enc_total = 0
for i in range(1, len(COHORT)):  # Denise's encounters are authored by hand
    pid = patient_id(i)
    for j in range(2 + (i % 3)):
        date = DATES[(i * 3 + j * 5) % len(DATES)]
        staff = STAFF[(i + j) % len(STAFF)]
        code, display = VISIT_TYPES[(i + j) % len(VISIT_TYPES)]
        write("Encounter", f"enc-{pid}-{j}", f"""
id: enc-{pid}-{j}
resourceType: Encounter
status: finished
class:
  system: http://terminology.hl7.org/CodeSystem/v3-ActCode
  code: AMB
  display: ambulatory
type:
  - coding:
      - system: http://snomed.info/sct
        code: "{code}"
        display: {display}
    text: {display}
subject:
  reference: Patient/{pid}
participant:
  - individual:
      reference: Practitioner/{staff}
period:
  start: "{date}T09:00:00Z"
  end: "{date}T09:25:00Z"
serviceProvider:
  reference: Organization/org-1001
  display: Patapsco County Health Department
""")
        enc_total += 1

# Every patient must be in the List the gateway's access checker reads, or they are
# invisible to the application.
entries = "\n".join(
    f"  - item:\n      reference: Patient/{patient_id(i)}" for i in range(len(COHORT))
)
write("List", "list-patient-1", f"""
id: list-patient-1
resourceType: List
status: current
mode: working
title: Patient panel — Patapsco County Health Department
entry:
{entries}
""")

print(f"patients          : {len(COHORT)}")
print(f"filler encounters : {enc_total}")
ages = [2026 - int(c[4][:4]) for c in COHORT]
print(f"age range         : {min(ages)}–{max(ages)}")
races = {c[5] for c in COHORT}
print(f"race categories   : {len(races)} ({', '.join(sorted(races))})")
print(f"hispanic/latino   : {sum(1 for c in COHORT if c[6] == 'hispanic')}")
print(f"languages         : {', '.join(sorted({c[7] for c in COHORT}))}")
print(f"counties          : {len({c[9] for c in COHORT})}")
