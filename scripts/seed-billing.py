#!/usr/bin/env python3
"""Generates the billing seeds: coverage, submitted claims, and the clearinghouse
rejections a biller works through.

The rejection that matters is Denise Carroll's. Her date of birth was transposed at
registration (1967-03-14 for 1967-03-04), the claim was assembled correctly from that
bad data, and the payer rejects it because it disagrees with their eligibility record.
"""
import os

ROOT = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "resources", "fhir-seeds-demo")
PT = "Patient/pt-denise-carroll"


def write(subdir, name, body):
    d = os.path.join(ROOT, subdir)
    os.makedirs(d, exist_ok=True)
    with open(os.path.join(d, name + ".yaml"), "w") as f:
        f.write(body.lstrip("\n"))


write("Organization", "payer-chc", """
id: payer-chc
resourceType: Organization
active: true
name: Chesapeake Health Choice (Maryland Medical Assistance)
type:
  - coding:
      - system: http://terminology.hl7.org/CodeSystem/organization-type
        code: pay
        display: Payer
""")

write("Coverage", "cov-denise", f"""
id: cov-denise
resourceType: Coverage
status: active
type:
  coding:
    - system: http://terminology.hl7.org/CodeSystem/v3-ActCode
      code: PUBLICPOL
      display: public healthcare
subscriber:
  reference: {PT}
subscriberId: MDMA-8830-114-02
beneficiary:
  reference: {PT}
relationship:
  coding:
    - system: http://terminology.hl7.org/CodeSystem/subscriber-relationship
      code: self
      display: Self
period:
  start: "2025-01-01"
payor:
  - reference: Organization/payer-chc
    display: Chesapeake Health Choice
""")

LINE_ITEMS = [
    ("99211", "Office/outpatient visit, established patient", 28.00),
    ("83036", "Hemoglobin A1c", 42.00),
    ("80053", "Comprehensive metabolic panel", 71.00),
    ("82043", "Microalbumin, urine", 45.00),
]
items = "\n".join(f"""  - sequence: {n}
    productOrService:
      coding:
        - system: http://www.ama-assn.org/go/cpt
          code: "{code}"
          display: {display}
    servicedDate: "2026-07-09"
    net:
      value: {amount}
      currency: USD""" for n, (code, display, amount) in enumerate(LINE_ITEMS, 1))

write("Claim", "clm-denise-0709", f"""
id: clm-denise-0709
resourceType: Claim
status: active
type:
  coding:
    - system: http://terminology.hl7.org/CodeSystem/claim-type
      code: professional
      display: Professional
use: claim
patient:
  reference: {PT}
created: "2026-07-10"
provider:
  reference: Organization/org-1001
  display: Patapsco County Health Department
priority:
  coding:
    - system: http://terminology.hl7.org/CodeSystem/processpriority
      code: normal
insurance:
  - sequence: 1
    focal: true
    coverage:
      reference: Coverage/cov-denise
billablePeriod:
  start: "2026-07-09"
  end: "2026-07-09"
# The subscriber demographic as transmitted. It agrees with the patient master file:
# the claim was assembled correctly, from bad data.
supportingInfo:
  - sequence: 1
    category:
      coding:
        - system: http://terminology.hl7.org/CodeSystem/claiminformationcategory
          code: info
    valueString: "Subscriber date of birth as submitted: 1967-03-14"
item:
{items}
total:
  value: 186.00
  currency: USD
""")

# code, statusCode, entity, text, payer date of birth (None when not a DOB rejection)
DOB_TEXT = "A7:21:QC — Subscriber/patient date of birth does not match payer eligibility record."
MEMBER_TEXT = "A7:500:IL — Subscriber/insured member number is missing or invalid."

REJECTIONS = [
    ("clm-denise-0709", "clmr-denise-0709", "A7", "21", "QC", DOB_TEXT, "1967-03-04"),
]

# Two further rejections so the queue is not a single row.
OTHERS = [
    ("clm-whitfield", "pt-whitfield", "2026-07-08", 214.00, "99213",
     "Office/outpatient visit, established patient", "A7", "21", "QC", DOB_TEXT, "1972-01-03"),
    ("clm-ramirez", "pt-ramirez", "2026-07-06", 96.00, "99214",
     "Office/outpatient visit, established patient", "A7", "500", "IL", MEMBER_TEXT, None),
]

for cid, pid, dos, amount, cpt, cpt_display, cat, code, ent, text, payer_dob in OTHERS:
    write("Claim", cid, f"""
id: {cid}
resourceType: Claim
status: active
type:
  coding:
    - system: http://terminology.hl7.org/CodeSystem/claim-type
      code: professional
      display: Professional
use: claim
patient:
  reference: Patient/{pid}
created: "{dos}"
provider:
  reference: Organization/org-1001
  display: Patapsco County Health Department
priority:
  coding:
    - system: http://terminology.hl7.org/CodeSystem/processpriority
      code: normal
billablePeriod:
  start: "{dos}"
  end: "{dos}"
item:
  - sequence: 1
    productOrService:
      coding:
        - system: http://www.ama-assn.org/go/cpt
          code: "{cpt}"
          display: {cpt_display}
    servicedDate: "{dos}"
    net:
      value: {amount}
      currency: USD
total:
  value: {amount}
  currency: USD
""")
    REJECTIONS.append((cid, f"{cid}-response", cat, code, ent, text, payer_dob))

for claim_id, response_id, cat, code, ent, text, payer_dob in REJECTIONS:
    note = ""
    if payer_dob:
        note = f"""
processNote:
  - number: 1
    type: display
    text: "Payer eligibility record: subscriber date of birth {payer_dob}." """.rstrip()

    write("ClaimResponse", response_id, f"""
id: {response_id}
resourceType: ClaimResponse
status: active
type:
  coding:
    - system: http://terminology.hl7.org/CodeSystem/claim-type
      code: professional
      display: Professional
use: claim
patient:
  reference: {PT if claim_id == 'clm-denise-0709' else 'Patient/' + claim_id.replace('clm-', 'pt-')}
created: "2026-07-13"
insurer:
  reference: Organization/payer-chc
  display: Chesapeake Health Choice
request:
  reference: Claim/{claim_id}
outcome: error
disposition: >-
  Rejected by clearinghouse front-end edit. The claim was not forwarded to the payer.
error:
  - code:
      coding:
        - system: https://x12.org/codes/claim-status-category-codes
          code: {cat}
        - system: https://x12.org/codes/claim-status-codes
          code: "{code}"
        - system: https://x12.org/codes/entity-identifier-codes
          code: {ent}
      text: {text}{note}
""")

# Claims not yet sent, so "Ready to submit" is a real queue rather than a fixed zero.
DRAFTS = [
    ("clm-draft-nguyen", "pt-nguyen", 132.00),
    ("clm-draft-achebe", "pt-achebe", 88.00),
    ("clm-draft-donnelly", "pt-donnelly", 204.00),
    ("clm-draft-park", "pt-park", 59.00),
    ("clm-draft-tesfaye", "pt-tesfaye", 147.00),
]
for cid, pid, amount in DRAFTS:
    write("Claim", cid, f"""
id: {cid}
resourceType: Claim
status: draft
type:
  coding:
    - system: http://terminology.hl7.org/CodeSystem/claim-type
      code: professional
      display: Professional
use: claim
patient:
  reference: Patient/{pid}
created: "2026-07-14"
provider:
  reference: Organization/org-1001
  display: Patapsco County Health Department
priority:
  coding:
    - system: http://terminology.hl7.org/CodeSystem/processpriority
      code: normal
billablePeriod:
  start: "2026-07-14"
  end: "2026-07-14"
item:
  - sequence: 1
    productOrService:
      coding:
        - system: http://www.ama-assn.org/go/cpt
          code: "99213"
          display: Office/outpatient visit, established patient
    servicedDate: "2026-07-14"
    net:
      value: {amount}
      currency: USD
total:
  value: {amount}
  currency: USD
""")

print(f"rejections    : {len(REJECTIONS)}")
print(f"draft claims  : {len(DRAFTS)}")
print(f"dollars at risk: {186.00 + 214.00 + 96.00:.2f}")
